# AI Image Transformer API

A FastAPI backend that supports transforming images using OpenAI's GPT-4 Vision model with different styles.

## Setup

1. Create a virtual environment and activate it:
```bash
python -m venv venv
# On Windows
venv\Scripts\activate
# On Unix or MacOS
source venv/bin/activate
```

2. Install the required packages:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file based on the `env.example` file and add your OpenAI API key:
```
OPENAI_API_KEY=your_openai_api_key_here
OUTPUT_DIR=./output/images
```

## Running the API

```bash
uvicorn main:app --reload
```

The API will be available at http://localhost:8000. You can access the API documentation at http://localhost:8000/docs.

## Style Configuration

Transformation styles are defined in `styles.json`. Each style has the following properties:
- `label`: Display name of the style
- `style_id`: Unique identifier (used in filenames and URLs)
- `prompt`: The prompt text sent to the OpenAI API

To add or modify styles, simply edit the `styles.json` file. You can reload styles without restarting the server by calling the `/styles/reload` endpoint.

## Pricing

The API estimates costs based on quality settings:
- Low quality: $0.011 per image
- Medium quality: $0.042 per image
- High quality: $0.167 per image

Non-square sizes (portrait or landscape) have a 50% surcharge.

## API Endpoints

### POST /generate

Process an uploaded image with multiple styles.

**Request Body**:
- `image`: Image file (multipart/form-data)
- `styles`: Array of style names (form data)
- `quality`: Image quality - "auto", "low", "medium", or "high" (form data)
- `size`: Image size - "square", "portrait", or "landscape" (form data)

**Response**:
```json
{
  "images": [
    {
      "style": "string",
      "style_id": "string",
      "url": "string",
      "timestamp": "datetime",
      "processing_time": 0
    }
  ],
  "original_image": "string",
  "total_cost": 0,
  "generation_time": 0
}
```

### GET /styles

Get all available transformation styles.

**Response**:
```json
[
  {
    "label": "Studio Ghibli",
    "style_id": "ghibli",
    "prompt": "Transform this image into a soft, pastel-toned Studio Ghibli style illustration..."
  }
]
```

### POST /styles/reload

Reload styles from the `styles.json` file.

**Response**:
```json
{
  "message": "Successfully reloaded 11 styles"
}
```

### GET /history

Retrieve the history of all image transformations.

**Response**:
```json
{
  "generations": [
    {
      "id": "string",
      "timestamp": "string",
      "request": {
        "styles": ["string"],
        "quality": "string",
        "size": "string"
      },
      "response": {
        "images": [
          {
            "style": "string",
            "style_id": "string",
            "url": "string",
            "timestamp": "string",
            "processing_time": 0
          }
        ],
        "original_image": "string",
        "total_cost": 0,
        "generation_time": 0
      }
    }
  ]
}
```

## File Storage

Generated images are stored in the `output/images` directory (or the directory specified in the `OUTPUT_DIR` environment variable). Each image has a unique filename based on the style_id and timestamp.

Generation metadata is logged to `output/images/logs/generation_history.json` for tracking and analytics purposes. 