@echo off
chcp 65001 >nul
title 同步 Excel 持股設定檔至資產庫

cd /d "%~dp0web\backend"
set "PYTHONIOENCODING=utf-8"
set "PYTHONPATH=%~dp0web\backend;%PYTHONPATH%"

echo ===================================================
echo   正在將 持股明細設定檔.csv 同步至資產資料庫...
echo ===================================================

python import_holdings_csv.py

echo.
echo ===================================================
echo 同步完成！請回到瀏覽器按 F5 重新整理查看最新持倉。
echo ===================================================
pause
