import logging
import requests
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..models import DailyPrice, ExchangeRate
from ..database import SessionLocal

logger = logging.getLogger(__name__)

TWSE_URL = "https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY_ALL"

def get_last_trading_day() -> str:
    """計算台股最近的交易日（若週末則退至週五）"""
    today = date.today()
    if today.weekday() == 5: # 週六
        last_day = today - timedelta(days=1)
    elif today.weekday() == 6: # 週日
        last_day = today - timedelta(days=2)
    else:
        # 週一至週五：若當前時間小於 14:00，盤後資料可能尚未發布，取前一營業日
        now_hour = datetime.now().hour
        if now_hour < 14:
            if today.weekday() == 0: # 週一上午取週五
                last_day = today - timedelta(days=3)
            else:
                last_day = today - timedelta(days=1)
        else:
            last_day = today
    return last_day.strftime("%Y-%m-%d")

def fetch_twse_prices(target_tickers: List[str]) -> Dict[str, float]:
    """
    從 TWSE 官方 JSON 端點獲取全市場收盤價，並嚴格清洗千分位與異常符號
    """
    prices: Dict[str, float] = {}
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        resp = requests.get(TWSE_URL, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            rows = data.get("data", [])
            target_set = set(target_tickers)
            for row in rows:
                if len(row) >= 8:
                    ticker = str(row[0]).strip()
                    if ticker in target_set:
                        raw_price = str(row[7]).replace(",", "").strip()
                        try:
                            price = float(raw_price)
                            prices[ticker] = price
                        except (ValueError, TypeError):
                            logger.warning(f"TWSE 標的 {ticker} 收盤價非數值: {raw_price}")
    except Exception as e:
        logger.error(f"連線 TWSE 官方端點失敗: {e}")
    return prices

def fetch_us_prices_and_rate(target_tickers: List[str]) -> tuple[Dict[str, float], Optional[float]]:
    """透過 yfinance 獲取美股收盤價與 USD/TWD 匯率"""
    import yfinance as yf
    prices: Dict[str, float] = {}
    usd_twd_rate: Optional[float] = None

    # 抓取 USD/TWD 匯率
    try:
        fx = yf.Ticker("TWD=X")
        hist = fx.history(period="5d")
        if not hist.empty:
            usd_twd_rate = float(hist["Close"].iloc[-1])
    except Exception as e:
        logger.error(f"yfinance 獲取匯率失敗: {e}")

    # 抓取美股標的
    for ticker in target_tickers:
        try:
            t = yf.Ticker(ticker)
            hist = t.history(period="5d")
            if not hist.empty:
                prices[ticker] = float(hist["Close"].iloc[-1])
        except Exception as e:
            logger.error(f"yfinance 獲取 {ticker} 失敗: {e}")

    return prices, usd_twd_rate

# 型別別名
Tuple_Dict_US = tuple[Dict[str, float], Optional[float]]

def upsert_daily_prices(db: Session, date_str: str, prices_map: Dict[str, tuple[float, str]]):
    """
    使用 SQLite INSERT OR REPLACE 複合唯一鍵 Upsert，杜絕資料庫膨脹
    """
    sql = text("""
        INSERT INTO daily_prices (date, ticker, market, close_price, updated_at)
        VALUES (:date, :ticker, :market, :close_price, :updated_at)
        ON CONFLICT(date, ticker) DO UPDATE SET
            close_price = excluded.close_price,
            updated_at = excluded.updated_at
    """)
    now_ts = datetime.utcnow()
    for ticker, (price, market) in prices_map.items():
        db.execute(sql, {
            "date": date_str,
            "ticker": ticker,
            "market": market,
            "close_price": price,
            "updated_at": now_ts
        })
    db.commit()

# 型別別名
Tuple_Price_Market = tuple[float, str]

def upsert_exchange_rate(db: Session, date_str: str, rate: float):
    sql = text("""
        INSERT INTO exchange_rates (date, from_currency, to_currency, rate, updated_at)
        VALUES (:date, 'USD', 'TWD', :rate, :updated_at)
        ON CONFLICT(date, from_currency, to_currency) DO UPDATE SET
            rate = excluded.rate,
            updated_at = excluded.updated_at
    """)
    db.execute(sql, {
        "date": date_str,
        "rate": rate,
        "updated_at": datetime.utcnow()
    })
    db.commit()

def sync_all_prices(db: Session) -> Dict[str, str]:
    """主動 / 手動強制觸發全市場行情同步"""
    from ..models import Transaction
    # 取得目前交易紀錄中所有持有的標的
    tx_tickers = db.query(Transaction.ticker).filter(Transaction.ticker != "CASH").distinct().all()
    all_tickers = [t[0] for t in tx_tickers]
    if not all_tickers:
        # 預設核心清單
        all_tickers = ["0050", "00692", "006208", "00631L", "VTI", "QQQM", "TSLA", "GOOG"]

    tw_tickers = [t for t in all_tickers if t.isdigit() or (len(t) <= 6 and any(c.isdigit() for c in t))]
    us_tickers = [t for t in all_tickers if t not in tw_tickers]

    today_str = datetime.now().strftime("%Y-%m-%d")
    trading_day = get_last_trading_day()

    prices_to_save: Dict[str, Tuple_Price_Market] = {}

    # 1. 抓台股
    tw_prices = fetch_twse_prices(tw_tickers)
    for ticker, p in tw_prices.items():
        prices_to_save[ticker] = (p, "TW")

    # 若 TWSE 未開市或無回應，以 yfinance 備援抓取台股 (如 0050.TW)
    missing_tw = [t for t in tw_tickers if t not in prices_to_save]
    if missing_tw:
        import yfinance as yf
        for t in missing_tw:
            try:
                yf_ticker = f"{t}.TW"
                hist = yf.Ticker(yf_ticker).history(period="5d")
                if not hist.empty:
                    prices_to_save[t] = (float(hist["Close"].iloc[-1]), "TW")
            except Exception:
                pass

    # 2. 抓美股與匯率
    us_prices, usd_rate = fetch_us_prices_and_rate(us_tickers)
    for ticker, p in us_prices.items():
        prices_to_save[ticker] = (p, "US")

    # 3. 寫入資料庫 (Upsert)
    if prices_to_save:
        upsert_daily_prices(db, trading_day, prices_to_save)
    if usd_rate:
        upsert_exchange_rate(db, trading_day, usd_rate)

    return {
        "status": "success",
        "trading_day": trading_day,
        "updated_tickers": list(prices_to_save.keys()),
        "usd_twd_rate": f"{usd_rate:.2f}" if usd_rate else "31.70"
    }

def sync_market_data_if_needed(db: Session):
    """被動檢查機制：若最新價格日期落後於最近營業日，背景自動同步"""
    target_day = get_last_trading_day()
    record = db.query(DailyPrice).filter(DailyPrice.date == target_day).first()
    if not record:
        logger.info(f"偵測到本地資料庫缺少最近交易日 ({target_day}) 行情，正在背景更新...")
        sync_all_prices(db)
