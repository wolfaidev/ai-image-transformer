# AI Image Transformer

A web application that transforms uploaded images into different artistic styles using OpenAI's gpt-image-1 model. The application consists of a NextJS frontend and a FastAPI backend.

## Features

- Upload images and transform them into multiple artistic styles
- Parallel processing of image transformations
- Customizable quality and size options
- Cost estimation based on image parameters
- History of previous transformations
- Local storage of generated images

## Project Structure

- `frontend/`: NextJS frontend with a modern UI
- `backend/`: FastAPI backend with OpenAI integration

## Getting Started

1. **Clone the repository**

```bash
git clone <repository-url>
cd ai-image-transformer
```

2. **Set up the backend**

```bash
cd backend
python setup.py
# Edit the .env file with your OpenAI API key
```

3. **Set up the frontend**

```bash
cd frontend
pnpm install
```

4. **Run the application**

In one terminal, start the backend:
```bash
cd backend
python run.py
```

In another terminal, start the frontend:
```bash
cd frontend
pnpm dev
```

5. **Access the application**

Open your browser and navigate to http://localhost:3000

## Integration

For details on how the frontend and backend interact, see [INTEGRATION.md](INTEGRATION.md).

## Technologies Used

- **Frontend**:
  - Next.js
  - React
  - Tailwind CSS
  - shadcn/ui components

- **Backend**:
  - FastAPI
  - Python
  - OpenAI API
  - Async processing

## License

MIT 