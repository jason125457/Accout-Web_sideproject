import os
import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .database import engine, Base, SessionLocal
from .models import * # 載入所有 ORM 模型以建立表格
from .routes import dashboard, transactions, market, export
from .services.market_data import sync_market_data_if_needed

# 建立所有資料表（若不存在）
Base.metadata.create_all(bind=engine)

def background_sync():
    """啟動時被動檢查行情更新"""
    try:
        db = SessionLocal()
        sync_market_data_if_needed(db)
        db.close()
    except Exception as e:
        print(f"背景同步行情失敗 (不影響系統啟動): {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 啟動時在背景執行被動行情檢查
    thread = threading.Thread(target=background_sync, daemon=True)
    thread.start()
    yield

app = FastAPI(
    title="個人全資產戰略管理中樞 (Web Asset Hub)",
    version="2.0.0",
    lifespan=lifespan
)

# 支援 CORS (開發階段)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 註冊 API 路由
app.include_router(dashboard.router)
app.include_router(transactions.router)
app.include_router(market.router)
app.include_router(export.router)

# 單一端口託管前端靜態檔案 (dist)
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "frontend", "dist")
FRONTEND_DIST = os.path.abspath(FRONTEND_DIST)

if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
else:
    @app.get("/")
    def root():
        return {
            "message": "Asset Hub API 服務已就緒！",
            "api_docs": "/docs",
            "frontend_status": "前端靜態資源正在建置中，請稍候..."
        }
