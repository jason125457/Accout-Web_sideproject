@echo off
title GitHub 推送工具
color 0a
cd /d "%~dp0"

echo =======================================================
echo   Personal Asset Hub - GitHub Auto Push
echo =======================================================
echo.
echo [1/2] 正在檢查並打包變更 (git add & commit)...
git add .
git commit -m "update: sync changes" >nul 2>nul

echo [2/2] 正在推送至 GitHub (git push)...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo =======================================================
    echo [OK] 專案已成功推送到 GitHub！
    echo Cloudflare Pages 正在自動部署最新版本。
    echo =======================================================
) else (
    echo.
    echo [Notice] 推送過程中若有錯誤，請檢查網路或權限。
)
pause
