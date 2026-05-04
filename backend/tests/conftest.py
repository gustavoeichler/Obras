import sys
import os

# Ensure the backend/ directory is on sys.path so `from app import ...` works
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
