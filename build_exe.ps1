Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "   Spark Dating Web App - Standalone EXE Compiler     " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Installing pywebview and pyinstaller dependencies..." -ForegroundColor Yellow
& "C:\Users\Gaurav Rajput\AppData\Local\Python\pythoncore-3.14-64\python.exe" -m pip install pywebview pyinstaller

Write-Host ""
Write-Host "[2/3] Compiling desktop_app.py with PyInstaller (bundling assets internally)..." -ForegroundColor Yellow
& "C:\Users\Gaurav Rajput\AppData\Local\Python\pythoncore-3.14-64\Scripts\pyinstaller.exe" --noconsole --onefile --name="Spark" --add-data "index.html;." --add-data "style.css;." --add-data "app.js;." --add-data "manifest.json;." --add-data "service-worker.js;." --clean desktop_app.py

Write-Host ""
Write-Host "[3/3] Done! Executable compiled successfully." -ForegroundColor Green
Write-Host "Output located at: dist\Spark.exe" -ForegroundColor Green
