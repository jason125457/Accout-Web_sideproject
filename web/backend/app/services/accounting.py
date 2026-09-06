from typing import List, Dict, Tuple, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..models import Account, Transaction, DailyPrice, ExchangeRate
from ..schemas import (
    HoldingItem, BankBalanceItem, StrategyAllocation, DashboardSummary, ChartDataPoint
)

TICKER_METADATA: Dict[str, Dict[str, str]] = {
    # 核心大盤 ETF
    "0050": {"name": "元大台灣50", "category": "CORE_ETF", "market": "TW"},
    "00692": {"name": "富邦公司治理", "category": "CORE_ETF", "market": "TW"},
    "006208": {"name": "富邦台50", "category": "CORE_ETF", "market": "TW"},
    "00631L": {"name": "元大台灣50正2", "category": "CORE_ETF", "market": "TW"},
    "VTI": {"name": "Vanguard整體股市ETF", "category": "CORE_ETF", "market": "US"},
    "QQQM": {"name": "Invesco納斯達克100 ETF", "category": "CORE_ETF", "market": "US"},

    # 衛星個股與主題 - 美股
    "TSLA": {"name": "特斯拉", "category": "SATELLITE", "market": "US"},
    "GOOG": {"name": "Alphabet Class A", "category": "SATELLITE", "market": "US"},
    "MSFT": {"name": "微軟", "category": "SATELLITE", "market": "US"},
    "NVDA": {"name": "輝達", "category": "SATELLITE", "market": "US"},
    "INTC": {"name": "英特爾", "category": "SATELLITE", "market": "US"},
    "SPCX": {"name": "Procure Space ETF", "category": "SATELLITE", "market": "US"},

    # 衛星個股與主題 - 台股
    "2327": {"name": "國巨", "category": "SATELLITE", "market": "TW"},
    "2330": {"name": "台積電", "category": "SATELLITE", "market": "TW"},
    "2351": {"name": "順德", "category": "SATELLITE", "market": "TW"},
    "2449": {"name": "京元電子", "category": "SATELLITE", "market": "TW"},
    "2472": {"name": "立隆電", "category": "SATELLITE", "market": "TW"},
    "2845": {"name": "遠東銀", "category": "SATELLITE", "market": "TW"},
    "3044": {"name": "健鼎", "category": "SATELLITE", "market": "TW"},
    "3211": {"name": "順達", "category": "SATELLITE", "market": "TW"},
    "6026": {"name": "福邦證", "category": "SATELLITE", "market": "TW"},
    "6274": {"name": "台燿", "category": "SATELLITE", "market": "TW"},
    "1234": {"name": "黑松", "category": "SATELLITE", "market": "TW"},
    "5388": {"name": "中磊", "category": "SATELLITE", "market": "TW"},
    "1432": {"name": "大魯閣", "category": "SATELLITE", "market": "TW"},
    "3689": {"name": "湧德", "category": "SATELLITE", "market": "TW"},
}

def get_ticker_meta(ticker: str) -> Dict[str, str]:
    if ticker in TICKER_METADATA:
        return TICKER_METADATA[ticker]
    # 自動推斷市場
    is_tw = ticker.isdigit() or (len(ticker) <= 6 and any(c.isdigit() for c in ticker))
    return {
        "name": ticker,
        "category": "SATELLITE",
        "market": "TW" if is_tw else "US"
    }

def get_latest_usd_rate(db: Session, target_date: Optional[str] = None) -> float:
    """取得最新有效美元匯率（支援休市/週末 Fallback）"""
    query = db.query(ExchangeRate).filter(
        ExchangeRate.from_currency == "USD",
        ExchangeRate.to_currency == "TWD"
    )
    if target_date:
        query = query.filter(ExchangeRate.date <= target_date)
    rate_record = query.order_by(desc(ExchangeRate.date)).first()
    return rate_record.rate if rate_record else 31.70

def get_latest_price(db: Session, ticker: str, target_date: Optional[str] = None) -> float:
    """
    查詢標的之最新有效收盤價（Latest Available Price）
    若週末或休市日無資料，自動取小於等於當前日期的最新收盤價，絕不返回 0。
    """
    query = db.query(DailyPrice).filter(DailyPrice.ticker == ticker)
    if target_date:
        query = query.filter(DailyPrice.date <= target_date)
    record = query.order_by(desc(DailyPrice.date)).first()
    return record.close_price if record else 0.0

def calculate_holdings(db: Session, target_date: Optional[str] = None) -> List[HoldingItem]:
    """
    會計核心：依時序回放 transactions，採用「移動加權平均成本法」動態計算所有持倉
    """
    usd_rate = get_latest_usd_rate(db, target_date)

    query = db.query(Transaction).filter(
        Transaction.action.in_(["BUY", "SELL"])
    )
    if target_date:
        query = query.filter(Transaction.date <= target_date)
    txs = query.order_by(Transaction.date.asc(), Transaction.id.asc()).all()

    # 以 ticker 分組回放
    ticker_txs: Dict[str, List[Transaction]] = {}
    for tx in txs:
        ticker_txs.setdefault(tx.ticker, []).append(tx)

    holdings: List[HoldingItem] = []

    for ticker, tx_list in ticker_txs.items():
        meta = get_ticker_meta(ticker)
        market = meta["market"]
        currency = "USD" if market == "US" else "TWD"

        current_shares = 0.0
        total_cost_twd = 0.0
        total_cost_original = 0.0

        for tx in tx_list:
            if tx.action == "BUY":
                buy_shares = tx.shares
                buy_amount_original = tx.total_amount
                # 若有指定 settlement_amount（台幣扣款總額），優先使用；否則依成交匯率折算
                if tx.settlement_amount and tx.settlement_amount > 0:
                    buy_amount_twd = tx.settlement_amount
                elif tx.currency == "USD":
                    fx = tx.exchange_rate if (tx.exchange_rate and tx.exchange_rate > 0) else usd_rate
                    buy_amount_twd = buy_amount_original * fx
                else:
                    buy_amount_twd = buy_amount_original

                current_shares += buy_shares
                total_cost_twd += buy_amount_twd
                total_cost_original += buy_amount_original

            elif tx.action == "SELL":
                sell_shares = tx.shares
                if current_shares > 0:
                    # 移動加權平均成本等比例扣減
                    sell_ratio = min(1.0, sell_shares / current_shares)
                    total_cost_twd -= (total_cost_twd * sell_ratio)
                    total_cost_original -= (total_cost_original * sell_ratio)
                    current_shares = max(0.0, current_shares - sell_shares)
                    if current_shares <= 1e-6:
                        current_shares = 0.0
                        total_cost_twd = 0.0
                        total_cost_original = 0.0

        # 若目前仍有持股，加入持倉清單
        if current_shares > 1e-6:
            avg_cost = total_cost_original / current_shares if current_shares > 0 else 0.0
            
            # 取得最新收盤價 (支援週末 Fallback)
            latest_price = get_latest_price(db, ticker, target_date)
            if latest_price <= 0:
                latest_price = avg_cost # 尚未抓到行情前暫以成本計

            if market == "US":
                current_val_twd = current_shares * latest_price * usd_rate
            else:
                current_val_twd = current_shares * latest_price

            pnl_twd = current_val_twd - total_cost_twd
            ret_rate = (pnl_twd / total_cost_twd * 100) if total_cost_twd > 0 else 0.0

            holdings.append(HoldingItem(
                ticker=ticker,
                name=meta["name"],
                market=market,
                category=meta["category"],
                shares=round(current_shares, 5),
                avg_cost=round(avg_cost, 4),
                current_price=round(latest_price, 4),
                total_cost_original=round(total_cost_original, 2),
                total_cost_twd=round(total_cost_twd, 2),
                current_value_twd=round(current_val_twd, 2),
                unrealized_pnl_twd=round(pnl_twd, 2),
                return_rate=round(ret_rate, 2),
                currency=currency
            ))

    # 排序：核心大盤 ETF 優先，台股在前美股在後
    holdings.sort(key=lambda h: (0 if h.category == "CORE_ETF" else 1, 0 if h.market == "TW" else 1, -h.current_value_twd))
    return holdings

def calculate_bank_balances(db: Session, target_date: Optional[str] = None) -> Tuple[List[BankBalanceItem], float]:
    """計算所有銀行現金餘額（由日誌回放得出）與折合台幣總和"""
    usd_rate = get_latest_usd_rate(db, target_date)
    accounts = db.query(Account).filter(Account.category == "BANK").all()

    items: List[BankBalanceItem] = []
    total_cash_twd = 0.0

    for acc in accounts:
        query = db.query(Transaction).filter(
            Transaction.account_id == acc.id,
            Transaction.action.in_(["CASH_IN", "CASH_OUT", "CASH_ADJUST"])
        )
        if target_date:
            query = query.filter(Transaction.date <= target_date)
        txs = query.all()

        balance = 0.0
        for tx in txs:
            if tx.action in ["CASH_IN", "CASH_ADJUST"]:
                balance += tx.total_amount
            elif tx.action == "CASH_OUT":
                balance -= tx.total_amount

        twd_val = balance * usd_rate if acc.currency == "USD" else balance
        total_cash_twd += twd_val

        items.append(BankBalanceItem(
            account_id=acc.id,
            name=acc.name,
            currency=acc.currency,
            current_balance=round(balance, 2),
            twd_amount=round(twd_val, 2),
            weight=0.0, # 稍後填入
            note=acc.note
        ))

    for item in items:
        item.weight = round(item.twd_amount / total_cash_twd, 4) if total_cash_twd > 0 else 0.0

    return items, total_cash_twd

def calculate_dashboard_summary(db: Session) -> DashboardSummary:
    """計算總覽儀表板所有 KPI 與戰略配置健康度"""
    now_str = datetime.now().strftime("%Y-%m-%d")
    usd_rate = get_latest_usd_rate(db)
    holdings = calculate_holdings(db)
    _, total_cash_twd = calculate_bank_balances(db)

    total_stock_cost_twd = sum(h.total_cost_twd for h in holdings)
    total_stock_value_twd = sum(h.current_value_twd for h in holdings)
    total_stock_pnl_twd = total_stock_value_twd - total_stock_cost_twd
    stock_return_rate = (total_stock_pnl_twd / total_stock_cost_twd * 100) if total_stock_cost_twd > 0 else 0.0

    total_net_worth_twd = total_cash_twd + total_stock_value_twd

    # 戰略板塊分佈
    core_val = sum(h.current_value_twd for h in holdings if h.category == "CORE_ETF")
    sat_val = sum(h.current_value_twd for h in holdings if h.category == "SATELLITE")

    core_ratio = core_val / total_net_worth_twd if total_net_worth_twd > 0 else 0.0
    cash_ratio = total_cash_twd / total_net_worth_twd if total_net_worth_twd > 0 else 0.0
    sat_ratio = sat_val / total_net_worth_twd if total_net_worth_twd > 0 else 0.0

    core_status = "穩健達標（資產增長主力引擎）" if core_ratio >= 0.50 else "⚠️ 低於50%目標，建議優先加碼"
    cash_status = "防禦充足（涵蓋應急與儲備）" if cash_ratio >= 0.20 else "⚠️ 現金水位低於20%，注意流動性"
    sat_status = "風險可控（超額報酬沙盒）" if sat_ratio <= 0.25 else "⚠️ 高於25%，建議獲利了結再平衡"

    strategy = StrategyAllocation(
        core_value_twd=round(core_val, 2),
        core_ratio=round(core_ratio, 4),
        core_status=core_status,
        cash_value_twd=round(total_cash_twd, 2),
        cash_ratio=round(cash_ratio, 4),
        cash_status=cash_status,
        satellite_value_twd=round(sat_val, 2),
        satellite_ratio=round(sat_ratio, 4),
        satellite_status=sat_status
    )

    return DashboardSummary(
        total_net_worth_twd=round(total_net_worth_twd, 2),
        total_stock_value_twd=round(total_stock_value_twd, 2),
        total_stock_cost_twd=round(total_stock_cost_twd, 2),
        total_stock_pnl_twd=round(total_stock_pnl_twd, 2),
        stock_return_rate=round(stock_return_rate, 2),
        total_cash_twd=round(total_cash_twd, 2),
        usd_twd_rate=round(usd_rate, 2),
        latest_date=now_str,
        strategy=strategy
    )
