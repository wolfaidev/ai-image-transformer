from fastapi import FastAPI, File, Form, UploadFile, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List, Optional, Dict, Any
import httpx
import os
import uuid
import aiofiles
import asyncio
from datetime import datetime
import json
from dotenv import load_dotenv
from pydantic import BaseModel
import shutil
from pathlib import Path

# Custom JSON encoder to handle datetime objects
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

# Load environment variables
load_dotenv()

# Constants
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./output/images")
INPUT_DIR = os.getenv("INPUT_DIR", "./output/inputs")  # Separate directory for input images
API_URL = "https://api.openai.com/v1/images/edits"
STYLES_FILE = os.path.join(os.path.dirname(__file__), "styles.json")

# Create output and input directories if they don't exist
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(INPUT_DIR, exist_ok=True)
os.makedirs(os.path.join(OUTPUT_DIR, "logs"), exist_ok=True)

# Create app
app = FastAPI(title="Image Transformer API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (generated images)
app.mount("/images", StaticFiles(directory=OUTPUT_DIR), name="images")
# Serve input images
app.mount("/inputs", StaticFiles(directory=INPUT_DIR), name="inputs")

# Load styles from JSON file
def load_styles():
    try:
        with open(STYLES_FILE, 'r') as f:
            styles = json.load(f)
        return styles
    except Exception as e:
        print(f"Error loading styles: {e}")
        return []

# Get styles data
STYLES = load_styles()

# Create style mappings
STYLE_PROMPTS = {style["label"]: style["prompt"] for style in STYLES}
STYLE_IDS = {style["label"]: style["style_id"] for style in STYLES}

# Map size string to actual dimensions
SIZE_MAPPINGS = {
    "square": "1024x1024",
    "portrait": "1024x1536", 
    "landscape": "1536x1024"
}

# Models for responses
class ImageResponse(BaseModel):
    style: str
    style_id: str
    url: str
    timestamp: datetime
    processing_time: float
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }

class GenerationResponse(BaseModel):
    images: List[ImageResponse]
    original_image: Optional[str] = None
    total_cost: float
    generation_time: float

class HistoryItem(BaseModel):
    id: str
    timestamp: str
    request: Dict[str, Any]
    response: Dict[str, Any]

class HistoryResponse(BaseModel):
    generations: List[HistoryItem]

class Style(BaseModel):
    label: str
    style_id: str
    prompt: str

# Backend file logging to keep track of generated images
async def log_generation(request_data, response_data):
    """Log generation metadata to a JSON file for history tracking"""
    log_dir = os.path.join(OUTPUT_DIR, "logs")
    os.makedirs(log_dir, exist_ok=True)
    
    log_file = os.path.join(log_dir, "generation_history.json")
    
    # Initialize data structure
    data = {"generations": []}
    
    # Read existing data if file exists and has content
    if os.path.exists(log_file) and os.path.getsize(log_file) > 0:
        try:
            async with aiofiles.open(log_file, "r") as f:
                content = await f.read()
                data = json.loads(content)
        except (json.JSONDecodeError, Exception) as e:
            print(f"Error reading history file: {str(e)}. Creating new history.")
    
    # Add new entry
    data["generations"].append({
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now().isoformat(),
        "request": {
            "styles": request_data["styles"],
            "quality": request_data["quality"],
            "size": request_data["size"],
        },
        "response": {
            "images": [img.dict() for img in response_data.images],
            "original_image": response_data.original_image,
            "total_cost": response_data.total_cost,
            "generation_time": response_data.generation_time
        }
    })
    
    # Write updated data
    try:
        async with aiofiles.open(log_file, "w") as f:
            await f.write(json.dumps(data, indent=2, cls=DateTimeEncoder))
    except Exception as e:
        print(f"Error writing history file: {str(e)}")

# Calculate cost based on quality and size
def calculate_cost(quality: str, size: str, num_images: int) -> float:
    """Calculate the cost of image generation based on quality, size and number of images"""
    # Updated pricing based on requirements
    if quality == "low":
        base_cost = 0.011  # $0.011 per image for low quality
    elif quality == "medium":
        base_cost = 0.042  # $0.042 per image for medium quality
    elif quality == "high":
        base_cost = 0.167  # $0.167 per image for high quality
    else:  # auto
        base_cost = 0.042  # Default to medium price for auto quality
    
    # Adjust for size
    if size in ["portrait", "landscape"]:
        base_cost *= 1.5  # 50% more for non-square
    
    return base_cost * num_images

async def process_image(
    image: UploadFile,
    style: str,
    quality: str,
    size: str,
    session: httpx.AsyncClient
) -> dict:
    """Process a single image with a specific style"""
    start_time = datetime.now()
    temp_file_handle = None
    temp_path = None
    
    try:
        # Get style ID for the style name
        style_id = STYLE_IDS.get(style, style.lower().replace(" ", "_"))
        
        # Create a unique filename for the processed image
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        image_id = f"{uuid.uuid4().hex[:8]}_{timestamp}"
        output_filename = f"{style_id}_{image_id}.png"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        
        # Save uploaded image to temp file
        temp_path = os.path.join(OUTPUT_DIR, f"temp_{image_id}.png")
        with open(temp_path, "wb") as temp_file:
            shutil.copyfileobj(image.file, temp_file)
        image.file.seek(0)  # Reset file pointer for potential reuse
        
        # Map size string to actual dimensions
        actual_size = SIZE_MAPPINGS.get(size, "1024x1024")
        
        # Get prompt for the style
        prompt = STYLE_PROMPTS.get(style, f"Transform this image into a {style} style illustration")
        
        # Prepare multipart form data exactly according to the curl format
        with open(temp_path, "rb") as img_file:
            files = {
                "image": (os.path.basename(temp_path), img_file, "image/png"),
            }
            
            data = {
                "prompt": prompt,
                "model": "gpt-image-1",
                "n": "1",
                "size": actual_size,
                "quality": quality
            }
            
            headers = {
                "Authorization": f"Bearer {OPENAI_API_KEY}"
            }
            
            print(f"Sending request to OpenAI for style '{style}' with size '{actual_size}' and quality '{quality}'")
            
            # Make API request using POST to the images/edits endpoint
            response = await session.post(
                API_URL, 
                headers=headers,
                data=data,
                files=files,
                timeout=60.0
            )
        
        # Check response
        if response.status_code != 200:
            error_detail = response.json() if response.headers.get("content-type") == "application/json" else response.text
            print(f"OpenAI API error for style '{style}': {error_detail}")
            raise HTTPException(status_code=response.status_code, detail=f"OpenAI API error: {error_detail}")
        
        # Parse response - debug the response structure but not the entire base64 content
        resp_data = response.json()
        print(f"OpenAI API response structure for style '{style}': {list(resp_data.keys())}")
        
        # Check if response contains the expected data structure
        if "data" not in resp_data or not resp_data["data"] or "b64_json" not in resp_data["data"][0]:
            print(f"Unexpected response format from OpenAI API: {resp_data}")
            raise HTTPException(status_code=500, detail=f"Unexpected response format from OpenAI API")
        
        # Get base64 data and save image
        image_data = resp_data["data"][0]["b64_json"]
        
        # Save the image
        import base64
        image_bytes = base64.b64decode(image_data)
        async with aiofiles.open(output_path, "wb") as out_file:
            await out_file.write(image_bytes)
            
        print(f"Successfully saved image for style '{style}' to {output_path}")
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Return the result
        return {
            "style": style,
            "style_id": style_id,
            "url": f"/images/{output_filename}",
            "timestamp": start_time,
            "processing_time": processing_time
        }
    
    except Exception as e:
        print(f"Detailed error processing '{style}' style: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")
    
    finally:
        # Clean up temp file with retries
        if temp_path and os.path.exists(temp_path):
            for _ in range(3):  # Retry up to 3 times
                try:
                    os.remove(temp_path)
                    break
                except Exception as e:
                    print(f"Warning: Failed to remove temp file {temp_path}: {str(e)}")
                    await asyncio.sleep(0.5)  # Wait a bit before retrying

@app.post("/generate", response_model=GenerationResponse)
async def generate_images(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    styles: List[str] = Form(...),
    quality: str = Form("auto"),
    size: str = Form("square")
):
    """Generate transformed images based on the uploaded image and selected styles"""
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")
    
    if not styles:
        raise HTTPException(status_code=400, detail="At least one style must be selected")
    
    if quality not in ["auto", "low", "medium", "high"]:
        raise HTTPException(status_code=400, detail="Invalid quality option")
    
    if size not in ["square", "portrait", "landscape"]:
        raise HTTPException(status_code=400, detail="Invalid size option")
    
    # Check if all styles exist
    available_styles = set(STYLE_PROMPTS.keys())
    for style in styles:
        if style not in available_styles:
            raise HTTPException(status_code=400, detail=f"Unknown style: {style}")
    
    start_time = datetime.now()
    original_path = None
    
    try:
        # Save original image
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        image_id = f"{uuid.uuid4().hex[:8]}_{timestamp}"
        original_filename = f"original_{image_id}.png"
        original_path = os.path.join(INPUT_DIR, original_filename)
        
        # Save the original image
        image.file.seek(0)  # Reset file pointer
        with open(original_path, "wb") as img_file:
            shutil.copyfileobj(image.file, img_file)
        image.file.seek(0)  # Reset file pointer for subsequent use
        
        # Process images in parallel, but limit concurrency to avoid file handle issues
        async with httpx.AsyncClient() as client:
            tasks = []
            for style in styles:
                image.file.seek(0)  # Reset file pointer before each use
                tasks.append(process_image(image, style, quality, size, client))
            
            # Run tasks in parallel with semaphore to limit concurrency
            semaphore = asyncio.Semaphore(3)  # Limit to 3 concurrent requests
            
            async def process_with_semaphore(task):
                async with semaphore:
                    return await task
            
            # Run tasks with limited concurrency
            results = await asyncio.gather(*[process_with_semaphore(task) for task in tasks], return_exceptions=True)
            
            # Handle errors
            processed_images = []
            for result in results:
                if isinstance(result, Exception):
                    # Log error but continue with other results
                    print(f"Error processing image: {str(result)}")
                else:
                    processed_images.append(ImageResponse(**result))
        
        # Calculate total processing time
        total_processing_time = (datetime.now() - start_time).total_seconds()
        
        # Calculate total cost
        total_cost = calculate_cost(quality, size, len(processed_images))
        
        # Create response
        response = GenerationResponse(
            images=processed_images,
            original_image=f"/inputs/{original_filename}",
            total_cost=total_cost,
            generation_time=total_processing_time
        )
        
        # Log generation asynchronously
        request_data = {
            "styles": styles,
            "quality": quality,
            "size": size
        }
        background_tasks.add_task(log_generation, request_data, response)
        
        return response
    
    except Exception as e:
        # Clean up original image in case of error
        if original_path and os.path.exists(original_path):
            try:
                os.remove(original_path)
            except Exception as cleanup_error:
                print(f"Error cleaning up original image: {cleanup_error}")
        
        raise HTTPException(status_code=500, detail=f"Error generating images: {str(e)}")

@app.get("/history", response_model=HistoryResponse)
async def get_history():
    """Get history of generated images"""
    log_file = os.path.join(OUTPUT_DIR, "logs", "generation_history.json")
    
    if not os.path.exists(log_file):
        print(f"History file not found at {log_file}")
        return HistoryResponse(generations=[])
    
    try:
        async with aiofiles.open(log_file, "r") as f:
            content = await f.read()
            if not content.strip():  # Check if file is empty
                print("History file is empty")
                return HistoryResponse(generations=[])
            try:
                data = json.loads(content)
                return HistoryResponse(**data)
            except json.JSONDecodeError as e:
                print(f"Error parsing history JSON: {e}")
                return HistoryResponse(generations=[])
    except Exception as e:
        print(f"Error reading history file: {e}")
        return HistoryResponse(generations=[])

@app.get("/styles", response_model=List[Style])
async def get_styles():
    """Get available transformation styles"""
    return STYLES

@app.post("/styles/reload")
async def reload_styles():
    """Reload styles from the JSON file"""
    global STYLES, STYLE_PROMPTS, STYLE_IDS
    try:
        STYLES = load_styles()
        STYLE_PROMPTS = {style["label"]: style["prompt"] for style in STYLES}
        STYLE_IDS = {style["label"]: style["style_id"] for style in STYLES}
        return {"message": f"Successfully reloaded {len(STYLES)} styles"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reloading styles: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Image Transformer API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 