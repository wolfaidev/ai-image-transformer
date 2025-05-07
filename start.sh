#!/bin/bash
echo "Starting AI Image Transformer Application..."

# Start the backend server
echo "Starting backend server..."
cd backend && python run.py &
BACKEND_PID=$!

# Start the frontend
echo "Starting frontend development server..."
cd ../frontend && pnpm dev &
FRONTEND_PID=$!

echo ""
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all servers..."

# Wait for user to press Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait 