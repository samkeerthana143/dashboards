"""
Main application entry point for Arshith Connect Backend.
Allows running via:
  - uvicorn main:app --reload
  - uvicorn app.main:app --reload
  - python main.py
"""
import uvicorn
from app.main import app

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

