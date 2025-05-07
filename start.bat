@echo off
echo Starting AI Image Transformer Application...

echo Starting backend server...
start cmd /k "cd backend && python run.py"

echo Starting frontend development server...
start cmd /k "cd frontend && pnpm dev"

echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Press any key to close all servers...
pause

echo Stopping servers...
taskkill /FI "WINDOWTITLE eq backend*" /F
taskkill /FI "WINDOWTITLE eq frontend*" /F

echo Done. 