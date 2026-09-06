from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..database import get_db
from ..models import Transaction, Account
from ..schemas import TransactionCreate, TransactionOut, CashQuickUpdateIn, HoldingAdjustIn

router = APIRouter(prefix="/api", tags=["Transactions"])

@router.get("/transactions", response_model=List[TransactionOut])
def list_transactions(limit: int = 50, db: Session = Depends(get_db)):
    txs = db.query(Transaction).order_by(desc(Transaction.date), desc(Transaction.id)).limit(limit).all()
    return txs

@router.post("/transactions", response_model=TransactionOut)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == payload.account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="找不到指定帳戶")

    tx = Transaction(
        date=payload.date,
        account_id=payload.account_id,
        ticker=payload.ticker.upper().strip(),
        action=payload.action.upper().strip(),
        shares=payload.shares,
        price=payload.price,
        total_amount=payload.total_amount,
        fee=payload.fee,
        currency=payload.currency.upper().strip(),
        exchange_rate=payload.exchange_rate,
        settlement_currency=payload.settlement_currency,
        settlement_amount=payload.settlement_amount,
        notes=payload.notes
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx

@router.post("/cash/quick-update")
def quick_update_cash_balance(payload: CashQuickUpdateIn, db: Session = Depends(get_db)):
    """
    10秒現金快速校對 API：
    計算公式：diff = 使用者輸入的最新網銀餘額 - 該帳戶目前歷史總和
    系統只需寫入一筆 CASH_ADJUST 差額日誌，即可 100% 精準對齊網銀餘額。
    """
    account = db.query(Account).filter(Account.id == payload.account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="找不到指定銀行帳戶")

    # 1. 查詢該帳戶歷史總和
    history_txs = db.query(Transaction).filter(
        Transaction.account_id == payload.account_id,
        Transaction.action.in_(["CASH_IN", "CASH_OUT", "CASH_ADJUST"])
    ).all()

    current_historical_sum = 0.0
    for tx in history_txs:
        if tx.action in ["CASH_IN", "CASH_ADJUST"]:
            current_historical_sum += tx.total_amount
        elif tx.action == "CASH_OUT":
            current_historical_sum -= tx.total_amount

    # 2. 計算差額 (diff)
    diff = payload.current_balance - current_historical_sum

    # 若差額極小，無須寫入異動
    if abs(diff) < 0.01:
        return {
            "status": "unchanged",
            "message": "帳戶餘額與系統記錄一致，無需調整",
            "current_balance": payload.current_balance
        }

    # 3. 寫入一筆 CASH_ADJUST
    date_str = payload.date if payload.date else datetime.now().strftime("%Y-%m-%d")
    adjust_tx = Transaction(
        date=date_str,
        account_id=payload.account_id,
        ticker="CASH",
        action="CASH_ADJUST",
        shares=0.0,
        price=0.0,
        total_amount=diff,
        fee=0.0,
        currency=account.currency,
        notes=payload.notes or f"10秒現金快速校準 (原 {current_historical_sum:,.2f} -> 新 {payload.current_balance:,.2f})"
    )
    db.add(adjust_tx)
    db.commit()

    return {
        "status": "success",
        "account_id": payload.account_id,
        "account_name": account.name,
        "previous_balance": round(current_historical_sum, 2),
        "adjusted_balance": round(payload.current_balance, 2),
        "diff_amount": round(diff, 2)
    }

@router.post("/holdings/adjust")
def adjust_holding(payload: HoldingAdjustIn, db: Session = Depends(get_db)):
    """
    持倉快速校對 API：
    直接將某檔標的的目前持股數與總成本對齊為目標值，自動由日誌計算並寫入校正。
    """
    from ..services.accounting import calculate_holdings, get_ticker_meta, get_latest_usd_rate
    ticker = payload.ticker.strip().upper()
    meta = get_ticker_meta(ticker)
    curr = payload.currency or ("USD" if meta["market"] == "US" else "TWD")
    usd_rate = get_latest_usd_rate(db)

    # 1. 取得目前該標的持倉
    holdings = calculate_holdings(db)
    current_item = next((h for h in holdings if h.ticker == ticker), None)

    current_shares = current_item.shares if current_item else 0.0
    current_cost_orig = current_item.total_cost_original if current_item else 0.0
    current_cost_twd = current_item.total_cost_twd if current_item else 0.0

    target_shares = payload.target_shares
    target_cost_orig = payload.target_total_cost
    target_cost_twd = target_cost_orig * usd_rate if curr == "USD" else target_cost_orig

    diff_shares = target_shares - current_shares
    diff_cost_orig = target_cost_orig - current_cost_orig
    diff_cost_twd = target_cost_twd - current_cost_twd

    # 取得或建立券商帳戶
    brokerage = db.query(Account).filter(Account.category == "BROKERAGE").first()
    if not brokerage:
        brokerage = Account(name="綜合證券庫存", category="BROKERAGE", currency=curr)
        db.add(brokerage)
        db.flush()

    today_str = datetime.now().strftime("%Y-%m-%d")

    # 若目標股數為 0，視為全數賣出清倉
    if target_shares <= 1e-6 and current_shares > 0:
        tx = Transaction(
            date=today_str,
            account_id=brokerage.id,
            ticker=ticker,
            action="SELL",
            shares=current_shares,
            price=0.0,
            total_amount=0.0,
            currency=curr,
            notes="持倉校對全數清倉"
        )
        db.add(tx)
    elif diff_shares > 0 or diff_cost_orig > 0:
        # 加碼或向上補正
        shares_to_add = max(0.0, diff_shares)
        amount_to_add = max(0.0, diff_cost_orig)
        amount_twd_to_add = max(0.0, diff_cost_twd)
        unit_price = (amount_to_add / shares_to_add) if shares_to_add > 0 else (target_cost_orig / target_shares if target_shares > 0 else 0.0)
        tx = Transaction(
            date=today_str,
            account_id=brokerage.id,
            ticker=ticker,
            action="BUY",
            shares=shares_to_add,
            price=round(unit_price, 4),
            total_amount=amount_to_add,
            currency=curr,
            exchange_rate=usd_rate if curr == "USD" else 1.0,
            settlement_currency="TWD",
            settlement_amount=round(amount_twd_to_add, 2),
            notes=payload.notes or f"持倉校準 (調至 {target_shares} 股, 成本 {curr} {target_cost_orig})"
        )
        db.add(tx)
    elif diff_shares < 0:
        # 部分賣出扣減
        tx = Transaction(
            date=today_str,
            account_id=brokerage.id,
            ticker=ticker,
            action="SELL",
            shares=abs(diff_shares),
            price=0.0,
            total_amount=0.0,
            currency=curr,
            notes=payload.notes or f"持倉校準減碼 (調至 {target_shares} 股)"
        )
        db.add(tx)

    db.commit()
    return {
        "status": "success",
        "ticker": ticker,
        "previous_shares": current_shares,
        "adjusted_shares": target_shares,
        "adjusted_cost": target_cost_orig
    }

