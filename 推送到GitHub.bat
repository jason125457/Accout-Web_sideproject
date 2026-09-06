@echo off
chcp 65001 >nul
title 推送專案至 GitHub
color 0a
cd /d "%~dp0"

echo =======================================================
echo   個人全資產戰略管理中樞 - GitHub 一鍵推送工具
echo =======================================================
echo.
echo [資安確認]
echo 本地資料庫 (app.db)、Excel 原檔、設定檔皆已在 .gitignore 嚴格排除。
echo 推送至 GitHub 的內容僅包含純淨的前端介面、Google Apps Script 模板與文檔。
echo.

git remote get-url origin >nul 2>nul
if %errorlevel% equ 0 (
    echo [現有遠端倉庫]
    git remote -v
    echo.
    echo 正在推送至 GitHub...
    git push -u origin main
    goto END
)

echo 請至 GitHub 建立一個新的空白 Repository (例如: myasset 或 asset-hub)
echo 網址範例: https://github.com/jason125457/myasset.git
echo.
set /p REPO_URL=請貼上您的 GitHub 倉庫 URL: 

if "%REPO_URL%"=="" (
    echo [錯誤] 未輸入網址，已取消。
    pause
    exit /b
)

git remote add origin %REPO_URL%
git branch -M main
echo 正在推送至 %REPO_URL% ...
git push -u origin main

:END
if %errorlevel% equ 0 (
    echo.
    echo =======================================================
    echo [成功] 專案已成功推送到 GitHub！
    echo 現在您可以前往 Cloudflare Pages 綁定此 GitHub 倉庫自動部署。
    echo =======================================================
) else (
    echo.
    echo [提示] 推送過程中若需登入，請依瀏覽器或終端機指示完成 GitHub 授權。
)
pause
