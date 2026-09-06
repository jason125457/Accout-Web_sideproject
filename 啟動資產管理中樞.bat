@echo off
chcp 65001 >nul
title 個人全資產戰略管理中樞 (Web Asset Hub)

:: 移動至 backend 目錄
cd /d "%~dp0web\backend"

:: 設定 UTF-8 編碼與 PYTHONPATH
set "PYTHONIOENCODING=utf-8"
set "PYTHONPATH=%~dp0web\backend;%PYTHONPATH%"

echo ===================================================
echo   個人全資產戰略管理中樞 (Web Asset Hub)
echo ===================================================
echo 正在啟動本地 Web 服務...

python run.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [Error] 啟動發生異常，請檢查上方錯誤訊息。
    pause
)
