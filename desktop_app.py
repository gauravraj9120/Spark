import threading
import time
import webview
import uvicorn
from main import app

def start_backend_server():
    try:
        # Launch the FastAPI app programmatically on localhost port 8000
        uvicorn.run(app, host="127.0.0.1", port=8000, log_level="error")
    except Exception as e:
        print(f"Failed to start local FastAPI server: {e}")

if __name__ == '__main__':
    # Start the backend server on a daemon thread
    server_thread = threading.Thread(target=start_backend_server, daemon=True)
    server_thread.start()
    
    # Wait a second for port binding to finish
    time.sleep(1.0)
    
    # Create the native desktop window matching mobile proportions
    window = webview.create_window(
        'Spark Dating App',
        'http://127.0.0.1:8000/',
        width=420,
        height=820,
        resizable=True,
        min_size=(380, 700)
    )
    
    # Launch pywebview GUI loop (utilizes WebView2 Chromium engine on Windows)
    webview.start()
