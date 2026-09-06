from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.market_data import sync_all_prices, get_last_trading_day
from ..models import DailyPrice, ExchangeRate
from sqlalchemy import desc

router = APIRouter(prefix="/api/market", tags=["Market Data"])

@router.post("/sync")
def trigger_market_sync(db: Session = Depends(get_db)):
    """手動強制立即拉取最新全市場行情 (TWSE + yfinance) 與匯率"""
    result = sync_all_prices(db)
    return result

@router.get("/status")
def get_market_sync_status(db: Session = Depends(get_db)):
    """查詢當前本地快取狀態與最新日期"""
    latest_price = db.query(DailyPrice).order_by(desc(DailyPrice.date)).first()
    latest_fx = db.query(ExchangeRate).order_by(desc(ExchangeRate.date)).first()
    target_day = get_last_trading_day()

    return {
        "latest_price_date": latest_price.date if latest_price else None,
        "latest_fx_date": latest_fx.date if latest_fx else None,
        "latest_fx_rate": latest_fx.rate if latest_fx else 31.70,
        "target_trading_day": target_day,
        "is_up_to_date": (latest_price.date == target_day) if latest_price else False
    }
