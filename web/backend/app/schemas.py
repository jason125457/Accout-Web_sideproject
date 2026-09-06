from typing import Optional, List
from pydantic import BaseModel

class AccountOut(BaseModel):
    id: int
    name: str
    category: str
    currency: str
    note: Optional[str] = None

    class Config:
        from_attributes = True

class TransactionCreate(BaseModel):
    date: str
    account_id: int
    ticker: str
    action: str  # BUY, SELL, DIVIDEND, CASH_IN, CASH_OUT, CASH_ADJUST
    shares: float = 0.0
    price: float = 0.0
    total_amount: float
    fee: float = 0.0
    currency: str = "TWD"
    exchange_rate: Optional[float] = None
    settlement_currency: Optional[str] = "TWD"
    settlement_amount: Optional[float] = None
    notes: Optional[str] = None

class TransactionOut(TransactionCreate):
    id: int

    class Config:
        from_attributes = True

class CashQuickUpdateIn(BaseModel):
    account_id: int
    current_balance: float
    date: Optional[str] = None
    notes: Optional[str] = "10秒快速校準"

class HoldingAdjustIn(BaseModel):
    ticker: str
    target_shares: float
    target_total_cost: float
    currency: Optional[str] = None
    notes: Optional[str] = "持倉股數與成本快速校對"

class HoldingItem(BaseModel):
    ticker: str
    name: str
    market: str
    category: str  # CORE_ETF 或 SATELLITE
    shares: float
    avg_cost: float
    current_price: float
    total_cost_original: float = 0.0
    total_cost_twd: float
    current_value_twd: float
    unrealized_pnl_twd: float
    return_rate: float
    currency: str

class BankBalanceItem(BaseModel):
    account_id: int
    name: str
    currency: str
    current_balance: float
    twd_amount: float
    weight: float
    note: Optional[str] = None

class StrategyAllocation(BaseModel):
    core_value_twd: float
    core_ratio: float
    core_status: str
    cash_value_twd: float
    cash_ratio: float
    cash_status: str
    satellite_value_twd: float
    satellite_ratio: float
    satellite_status: str

class DashboardSummary(BaseModel):
    total_net_worth_twd: float
    total_stock_value_twd: float
    total_stock_cost_twd: float
    total_stock_pnl_twd: float
    stock_return_rate: float
    total_cash_twd: float
    usd_twd_rate: float
    latest_date: str
    strategy: StrategyAllocation

class ChartDataPoint(BaseModel):
    date: str
    total_net_worth: float
    stock_value: float
    cash_value: float
    daily_change_twd: float = 0.0
    daily_change_pct: float = 0.0

