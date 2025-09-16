@echo off
REM OrderFlow Architect - Production Launcher
REM ========================================
REM 
REM This batch file handles the complete production launch process
REM for the OrderFlow Architect trading platform.
REM
REM Usage: launch.bat [dev|prod|clean|health]
REM   dev   - Launch in development mode
REM   prod  - Launch in production mode
REM   clean - Clean and reset the environment
REM   health - Run health check
REM

setlocal enabledelayedexpansion

REM Set colors for output
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "RESET=[0m"

REM Default mode
set "MODE=dev"

REM Parse command line arguments
if "%1"=="" (
    set "MODE=dev"
) else (
    set "MODE=%1"
)

REM Display header
echo %BLUE%╔══════════════════════════════════════════════════════════════╗%RESET%
echo %BLUE%║%RESET% %GREEN%OrderFlow Architect - Production Launcher%RESET%                      %BLUE%║%RESET%
echo %BLUE%║%RESET% %YELLOW%Advanced Trading Platform Deployment System%RESET%                    %BLUE%║%RESET%
echo %BLUE%╚══════════════════════════════════════════════════════════════╝%RESET%
echo.

REM Check Node.js installation
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%❌ Node.js is not installed! Please install Node.js first.%RESET%
    pause
    exit /b 1
)

REM Check npm installation
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%❌ npm is not installed! Please install npm first.%RESET%
    pause
    exit /b 1
)

echo %GREEN%✅ Environment check passed%RESET%
echo %GREEN%✅ Node.js:%RESET% %YELLOW%node --version%RESET%
echo %GREEN%✅ npm:%RESET% %YELLOW%npm --version%RESET%
echo.

REM Handle different modes
if "%MODE%"=="clean" goto CLEAN
if "%MODE%"=="health" goto HEALTH
if "%MODE%"=="dev" goto DEVELOPMENT
if "%MODE%"=="prod" goto PRODUCTION

echo %RED%❌ Unknown mode: %MODE%%RESET%
echo %YELLOW%Usage: launch.bat [dev|prod|clean|health]%RESET%
pause
exit /b 1

:CLEAN
echo %YELLOW%🧹 Starting environment cleanup...%RESET%
echo.

REM Kill existing processes
echo %BLUE%Stopping existing processes...%RESET%
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM tsx.exe >nul 2>&1
taskkill /F /IM nodemon.exe >nul 2>&1

REM Clean up ports
echo %BLUE%Cleaning up ports...%RESET%
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM Remove build artifacts
echo %BLUE%Removing build artifacts...%RESET%
if exist ".next" rmdir /s /q ".next"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"
if exist "*.log" del *.log

REM Clean npm cache
echo %BLUE%Cleaning npm cache...%RESET%
npm cache clean --force >nul 2>&1

echo %GREEN%✅ Environment cleanup completed%RESET%
echo.
pause
exit /b 0

:HEALTH
echo %YELLOW%🔍 Running system health check...%RESET%
echo.

REM Check if server is running
curl -s http://localhost:3000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✅ Server is running and responding%RESET%
    
    REM Get detailed health status
    echo %BLUE%Detailed health status:%RESET%
    curl -s http://localhost:3000/api/health
    echo.
) else (
    echo %RED%❌ Server is not running or not responding%RESET%
    echo %YELLOW%Try launching the server first with: launch.bat dev%RESET%
)

REM Check database
echo %BLUE%Checking database...%RESET%
if exist "db\custom.db" (
    echo %GREEN%✅ Database file exists%RESET%
) else (
    echo %YELLOW%⚠️ Database file not found, will be created on first run%RESET%
)

REM Check dependencies
echo %BLUE%Checking dependencies...%RESET%
if exist "node_modules" (
    echo %GREEN%✅ Dependencies installed%RESET%
) else (
    echo %YELLOW%⚠️ Dependencies not installed, run npm install first%RESET%
)

echo.
pause
exit /b 0

:DEVELOPMENT
echo %YELLOW%🚀 Launching in DEVELOPMENT mode...%RESET%
echo.

REM Check dependencies
if not exist "node_modules" (
    echo %BLUE%Installing dependencies...%RESET%
    npm install
    if %errorlevel% neq 0 (
        echo %RED%❌ Failed to install dependencies%RESET%
        pause
        exit /b 1
    )
)

REM Check database setup
echo %BLUE%Setting up database...%RESET%
npm run db:push
if %errorlevel% neq 0 (
    echo %RED%❌ Failed to setup database%RESET%
    pause
    exit /b 1
)

REM Kill existing processes on port 3000
echo %BLUE%Cleaning up port 3000...%RESET%
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM Launch development server
echo %GREEN%🚀 Starting development server...%RESET%
echo %BLUE%Server will be available at: http://localhost:3000%RESET%
echo %BLUE%WebSocket server: ws://localhost:3000/api/socketio%RESET%
echo %YELLOW%Press Ctrl+C to stop the server%RESET%
echo.

REM Start the development server with logging
npm run dev

echo.
echo %GREEN%✅ Development server stopped%RESET%
pause
exit /b 0

:PRODUCTION
echo %YELLOW%🚀 Launching in PRODUCTION mode...%RESET%
echo.

REM Check if this is a production build
if not exist ".next" (
    echo %BLUE%Building for production...%RESET%
    npm run build
    if %errorlevel% neq 0 (
        echo %RED%❌ Production build failed%RESET%
        pause
        exit /b 1
    )
)

REM Check database setup
echo %BLUE%Setting up database...%RESET%
npm run db:push
if %errorlevel% neq 0 (
    echo %RED%❌ Failed to setup database%RESET%
    pause
    exit /b 1
)

REM Kill existing processes on port 3000
echo %BLUE%Cleaning up port 3000...%RESET%
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM Set production environment
set "NODE_ENV=production"

REM Launch production server
echo %GREEN%🚀 Starting production server...%RESET%
echo %BLUE%Server will be available at: http://localhost:3000%RESET%
echo %BLUE%WebSocket server: ws://localhost:3000/api/socketio%RESET%
echo %YELLOW%Press Ctrl+C to stop the server%RESET%
echo.

REM Start the production server with logging
npm run start

echo.
echo %GREEN%✅ Production server stopped%RESET%
pause
exit /b 0

:end
echo %BLUE%Thank you for using OrderFlow Architect!%RESET%
echo %GREEN%Happy Trading! 🚀%RESET%
echo.
pause