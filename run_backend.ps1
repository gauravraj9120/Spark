Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "   Spark Dating Web App - Starting Python Backend     " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "Serving app locally at: http://localhost:8000" -ForegroundColor Green
Write-Host "Press Ctrl+C to shut down the server." -ForegroundColor Yellow
Write-Host ""

& "C:\Users\Gaurav Rajput\AppData\Local\Python\pythoncore-3.14-64\python.exe" -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
