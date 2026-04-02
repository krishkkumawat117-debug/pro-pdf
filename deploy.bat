@echo off
echo 🚀 PDF Tools Suite - Android Deployment Script
echo ==============================================

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Installing Vercel CLI...
    npm install -g vercel
)

REM Check if user is logged in to Vercel
echo 🔐 Checking Vercel login...
vercel whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo Please login to Vercel:
    vercel login
    if %errorlevel% neq 0 (
        echo Login failed. Please try again.
        pause
        exit /b 1
    )
)

REM Deploy to Vercel
echo 🚀 Deploying to Vercel...
vercel --prod

echo.
echo ✅ Deployment complete!
echo 📱 Your app is now available for Android installation!
echo 📖 Check ANDROID_INSTALL.md for installation instructions
pause