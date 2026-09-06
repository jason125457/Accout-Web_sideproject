import os
import sys
import webbrowser
import threading
import time

# 處理 Windows 終端編碼
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# 確保 backend 目錄在 Python 模組搜尋路徑第一位
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import uvicorn

def open_browser():
    time.sleep(1.5)
    print("[Browser] 自動開啟瀏覽器：http://localhost:8000")
    try:
        webbrowser.open("http://localhost:8000")
    except Exception:
        pass

if __name__ == "__main__":
    print("===================================================")
    print("  個人全資產戰略管理中樞 (Web Asset Hub)")
    print("===================================================")
    print("[Server] 正在啟動本地 Web 伺服器...")

    # 背景啟動瀏覽器
    threading.Thread(target=open_browser, daemon=True).start()

    # 啟動 Uvicorn 服務
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False, log_level="info")
