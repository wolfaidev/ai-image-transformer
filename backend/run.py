import os
import sys
import platform
import subprocess

def main():
    # Check if virtual environment exists
    venv_dir = "venv"
    if not os.path.exists(venv_dir):
        print("Virtual environment not found. Please run setup.py first.")
        sys.exit(1)
    
    # Determine the uvicorn path based on platform
    if platform.system() == "Windows":
        uvicorn_path = os.path.join(venv_dir, "Scripts", "uvicorn")
    else:
        uvicorn_path = os.path.join(venv_dir, "bin", "uvicorn")
    
    # Start the server
    print("Starting AI Image Transformer backend...")
    try:
        subprocess.run([uvicorn_path, "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"])
    except KeyboardInterrupt:
        print("\nServer stopped.")
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 