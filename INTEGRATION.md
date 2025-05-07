# Frontend-Backend Integration Guide

This guide explains how to connect the NextJS frontend with the FastAPI backend for the AI Image Transformer application.

## Setup

1. **Backend Setup**:
   - Navigate to the `backend` directory
   - Run `python setup.py` to set up the virtual environment and install dependencies
   - Create a `.env` file with your OpenAI API key (or modify the one created by setup.py)
   - Start the backend server with `python run.py`
   - The backend will be running at http://localhost:8000

2. **Frontend Setup**:
   - Navigate to the `frontend` directory
   - Run `pnpm install` to install dependencies
   - Start the frontend development server with `pnpm dev`
   - The frontend will be running at http://localhost:3000

## Dynamic Styles

The backend now uses a `styles.json` file to define transformation styles. The frontend should fetch these styles from the `/styles` endpoint instead of hardcoding them. This approach provides several benefits:

1. Styles can be updated without changing the code
2. The backend and frontend share the same style definitions
3. New styles can be added by simply updating the JSON file

Example code to fetch styles from the backend:

```typescript
const [styles, setStyles] = useState<Array<{label: string, style_id: string, prompt: string}>>([]);

useEffect(() => {
  const fetchStyles = async () => {
    try {
      const response = await fetch('http://localhost:8000/styles');
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const data = await response.json();
      setStyles(data);
    } catch (error) {
      console.error('Error fetching styles:', error);
    }
  };
  
  fetchStyles();
}, []);
```

## API Integration

The frontend components should make requests to the backend endpoints:

1. **Image Upload and Transformation**:
   - In `frontend/components/image-transformer.tsx`, update the `handleGenerate` function to make a POST request to `/generate` on the backend.
   - Example code:

```typescript
const handleGenerate = async () => {
  if (!uploadedImage || selectedStyles.length === 0) return

  setIsGenerating(true)
  setProgress(0)

  try {
    // Convert the base64 image back to a file
    const base64Response = await fetch(uploadedImage);
    const imageBlob = await base64Response.blob();
    const imageFile = new File([imageBlob], fileName, { type: 'image/png' });

    // Create form data
    const formData = new FormData();
    formData.append('image', imageFile);
    selectedStyles.forEach(style => {
      formData.append('styles', style);
    });
    formData.append('quality', quality);
    formData.append('size', size);

    // Make API request
    const response = await fetch('http://localhost:8000/generate', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const result = await response.json();
    setGeneratedImages(result.images);
  } catch (error) {
    console.error('Error generating images:', error);
    // Handle error
  } finally {
    setIsGenerating(false);
  }
};
```

2. **History Display**:
   - Create a new component to fetch and display the generation history
   - Make a GET request to `/history` on the backend

```typescript
const fetchHistory = async () => {
  try {
    const response = await fetch('http://localhost:8000/history');
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    const data = await response.json();
    setHistory(data.generations);
  } catch (error) {
    console.error('Error fetching history:', error);
  }
};
```

3. **Displaying Generated Images**:
   - When displaying images from the backend, prefix the URLs with the backend base URL
   - Example: `<img src={`http://localhost:8000${image.url}`} alt={image.style} />`

## CORS Considerations

The backend is configured to allow CORS requests from any origin. For production, update the `allow_origins` in the backend's `main.py` to include only your frontend domain.

## Environment Configuration

For a production deployment, update the backend URL in the frontend code. You can use environment variables in Next.js to handle different environments:

1. Create a `.env.local` file in the frontend directory with:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

2. Use this environment variable in your fetch requests:
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const response = await fetch(`${apiUrl}/generate`, { ... });
``` 