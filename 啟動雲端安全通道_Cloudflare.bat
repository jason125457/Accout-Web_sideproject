@echo off
chcp 65001 >nul
title Cloudflare 安全穿透通道 (Zero Trust Tunnel)
color 0b
cd /d "%~dp0"

echo =======================================================
echo   個人全資產戰略管理中樞 - Cloudflare 安全通道
echo =======================================================
echo.
echo [資安核心原則]
echo 1. 本地 SQLite 資料庫 100%% 留在您的硬碟，絕不上傳雲端
echo 2. 免開 FortiGate 與路由器 Port，外網無法掃描真實 IP
echo 3. 外網連線透過 Cloudflare 全程端對端加密
echo.

if not exist "%~dp0cloudflared.exe" goto DOWNLOAD_CF
goto RUN_TUNNEL

:DOWNLOAD_CF
echo [下載中] 正在從 Cloudflare 官方下載 cloudflared 工具...
powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '%~dp0cloudflared.exe'"
if not exist "%~dp0cloudflared.exe" (
    echo [錯誤] 下載失敗，請檢查網路連線。
    pause
    exit /b
)
echo [成功] 下載完成！
echo.

:RUN_TUNNEL
echo =======================================================
echo [啟動中] 正在建立 Cloudflare 安全加密通道...
echo 稍候視窗中將出現一串專屬的 HTTPS 網址:
echo https://xxxxxx.trycloudflare.com
echo.
echo 複製該網址貼到手機瀏覽器，即可隨時查閱您的全資產中樞！
echo 如需關閉外網通道，直接關閉本視窗即可。
echo =======================================================
echo.

"%~dp0cloudflared.exe" tunnel --url http://127.0.0.1:8000
pause
