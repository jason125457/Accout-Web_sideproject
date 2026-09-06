from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, PrimaryKeyConstraint
)
from sqlalchemy.orm import relationship
from .database import Base

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)           # 如：台新 Richart、永豐 DAWHO
    category = Column(String, nullable=False)       # BANK 或 BROKERAGE
    currency = Column(String, default="TWD")        # TWD 或 USD
    note = Column(String, nullable=True)            # 備註
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("Transaction", back_populates="account")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, nullable=False, index=True) # YYYY-MM-DD
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    ticker = Column(String, nullable=False, index=True) # 0050, TSLA, 或 CASH
    action = Column(String, nullable=False)            # BUY, SELL, DIVIDEND, CASH_IN, CASH_OUT, CASH_ADJUST
    shares = Column(Float, default=0.0)                # 異動股數
    price = Column(Float, default=0.0)                 # 原幣單價
    total_amount = Column(Float, nullable=False)       # 原幣總金額
    fee = Column(Float, default=0.0)                   # 手續費/稅費
    currency = Column(String, default="TWD")           # 交易幣別 (TWD 或 USD)
    
    # 多幣別支援與成交匯率 (解決美股扣款換匯成本追蹤)
    exchange_rate = Column(Float, nullable=True)       # 成交當下匯率 (例如 31.70)
    settlement_currency = Column(String, default="TWD")# 實際扣款幣別 (例如 TWD)
    settlement_amount = Column(Float, nullable=True)   # 實際扣款金額 (例如 15,800 TWD)
    
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    account = relationship("Account", back_populates="transactions")

class DailyPrice(Base):
    __tablename__ = "daily_prices"

    date = Column(String, nullable=False)              # YYYY-MM-DD
    ticker = Column(String, nullable=False)            # 標的代號
    market = Column(String, nullable=False)            # TW 或 US
    close_price = Column(Float, nullable=False)        # 收盤價
    updated_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        PrimaryKeyConstraint("date", "ticker"),        # 複合主鍵，防止重複與膨脹
    )

class ExchangeRate(Base):
    __tablename__ = "exchange_rates"

    date = Column(String, nullable=False)              # YYYY-MM-DD
    from_currency = Column(String, nullable=False)     # USD
    to_currency = Column(String, nullable=False)       # TWD
    rate = Column(Float, nullable=False)               # 匯率 (如 31.72)
    updated_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        PrimaryKeyConstraint("date", "from_currency", "to_currency"),
    )
