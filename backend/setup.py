import os
import sys
import venv
import subprocess
import platform
import shutil

# Define directories to create
directories = [
    os.path.join("output", "images"),
    os.path.join("output", "images", "logs")
]

def main():
    print("Setting up AI Image Transformer backend...")
    
    # Create directories
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"Created directory: {directory}")
    
    # Create virtual environment
    venv_dir = "venv"
    if not os.path.exists(venv_dir):
        print(f"Creating virtual environment in {venv_dir}...")
        venv.create(venv_dir, with_pip=True)
        print("Virtual environment created successfully.")
    else:
        print(f"Virtual environment already exists in {venv_dir}")
    
    # Determine the pip path based on platform
    if platform.system() == "Windows":
        pip_path = os.path.join(venv_dir, "Scripts", "pip")
        python_path = os.path.join(venv_dir, "Scripts", "python")
    else:
        pip_path = os.path.join(venv_dir, "bin", "pip")
        python_path = os.path.join(venv_dir, "bin", "python")
    
    # Install dependencies
    print("Installing dependencies...")
    subprocess.run([pip_path, "install", "-r", "requirements.txt"])
    print("Dependencies installed successfully.")
    
    # Check for .env file and create if doesn't exist
    if not os.path.exists(".env"):
        if os.path.exists("env.example"):
            print("Creating .env file from env.example...")
            shutil.copy("env.example", ".env")
            print(".env file created. Please update it with your OpenAI API key.")
        else:
            print("WARNING: env.example file not found. Please create a .env file manually.")
    else:
        print(".env file already exists.")
    
    print("\nSetup completed successfully!")
    print("\nTo start the backend server, run:")
    if platform.system() == "Windows":
        print("venv\\Scripts\\activate")
    else:
        print("source venv/bin/activate")
    print("uvicorn main:app --reload")

if __name__ == "__main__":
    main() 