#!/usr/bin/env python3
"""
Streamlit Attendance Management System
Run this script to start the web application
"""

import subprocess
import sys
import os

def main():
    """Start the Streamlit application"""
    print("🚀 Starting Attendance Management System...")
    print("📚 Streamlit Web Application")
    print("=" * 50)
    
    # Check if streamlit is installed
    try:
        import streamlit
        print("✅ Streamlit is installed")
    except ImportError:
        print("❌ Streamlit not found. Installing...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Streamlit installed successfully")
    
    # Start the application
    try:
        print("🌐 Starting web server...")
        print("📱 Open your browser and go to: http://localhost:8501")
        print("=" * 50)
        
        # Run streamlit
        subprocess.run([
            sys.executable, "-m", "streamlit", "run", 
            "streamlit_app.py",
            "--server.port=8501",
            "--server.headless=true"
        ])
        
    except KeyboardInterrupt:
        print("\n👋 Shutting down...")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
