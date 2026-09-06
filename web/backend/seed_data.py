import os
from datetime import datetime
from app.database import engine, Base, SessionLocal
from app.models import Account, Transaction, DailyPrice, ExchangeRate

def seed_database(force_reset: bool = False):
    if force_reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if not force_reset and db.query(Account).count() > 0:
        print("[Init] 資料庫已有帳戶資料，略過初始化。")
        db.close()
        return

    print("[Init] 正在植入公開示範帳戶資料...")

    banks = [
        {"name": "主要高利數位帳戶 (範例)", "category": "BANK", "currency": "TWD", "note": "活存日常調度", "balance": 500000.0},
        {"name": "證券交割專用帳戶 (範例)", "category": "BANK", "currency": "TWD", "note": "每月定期定額專用", "balance": 200000.0},
        {"name": "外幣美元活存帳戶 (範例)", "category": "BANK", "currency": "USD", "note": "外幣活存備用金", "balance": 3000.0},
    ]

    brokerages = [
        {"name": "示範台股證券", "category": "BROKERAGE", "currency": "TWD", "note": "台股庫存"},
        {"name": "示範美股證券", "category": "BROKERAGE", "currency": "USD", "note": "美股庫存"},
    ]

    account_map = {}
    for b in banks:
        acc = Account(name=b["name"], category=b["category"], currency=b["currency"], note=b["note"])
        db.add(acc)
        db.flush()
        account_map[b["name"]] = acc.id

        init_cash_tx = Transaction(
            date="2026-09-01",
            account_id=acc.id,
            ticker="CASH",
            action="CASH_IN",
            shares=0.0,
            price=0.0,
            total_amount=b["balance"],
            fee=0.0,
            currency=b["currency"],
            notes="示範初始現金"
        )
        db.add(init_cash_tx)

    for br in brokerages:
        acc = Account(name=br["name"], category=br["category"], currency=br["currency"], note=br["note"])
        db.add(acc)
        db.flush()
        account_map[br["name"]] = acc.id

    tw_sec_id = account_map["示範台股證券"]
    us_sec_id = account_map["示範美股證券"]

    stock_initial_txs = [
        {"date": "2026-09-01", "account_id": tw_sec_id, "ticker": "0050", "action": "BUY", "shares": 1000.0, "price": 85.0, "total_amount": 85000.0, "currency": "TWD", "settlement_currency": "TWD", "settlement_amount": 85000.0, "notes": "元大台灣50"},
        {"date": "2026-09-01", "account_id": tw_sec_id, "ticker": "006208", "action": "BUY", "shares": 1000.0, "price": 70.0, "total_amount": 70000.0, "currency": "TWD", "settlement_currency": "TWD", "settlement_amount": 70000.0, "notes": "富邦台50"},
        {"date": "2026-09-01", "account_id": tw_sec_id, "ticker": "2330", "action": "BUY", "shares": 100.0, "price": 1850.0, "total_amount": 185000.0, "currency": "TWD", "settlement_currency": "TWD", "settlement_amount": 185000.0, "notes": "台積電"},
        {"date": "2026-09-01", "account_id": us_sec_id, "ticker": "VTI", "action": "BUY", "shares": 10.0, "price": 320.0, "total_amount": 3200.0, "currency": "USD", "exchange_rate": 31.70, "settlement_currency": "TWD", "settlement_amount": 101440.0, "notes": "Vanguard整體股市ETF"},
        {"date": "2026-09-01", "account_id": us_sec_id, "ticker": "TSLA", "action": "BUY", "shares": 10.0, "price": 290.0, "total_amount": 2900.0, "currency": "USD", "exchange_rate": 31.70, "settlement_currency": "TWD", "settlement_amount": 91930.0, "notes": "特斯拉"},
    ]

    for tx_data in stock_initial_txs:
        tx = Transaction(**tx_data)
        db.add(tx)

    sample_dates = ["2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05", "2026-09-06"]
    actual_prices = {
        "0050": 107.90,
        "006208": 247.25,
        "2330": 2410.00,
        "VTI": 379.73,
        "TSLA": 354.08,
    }

    for idx, d_str in enumerate(sample_dates):
        rate_rec = ExchangeRate(date=d_str, from_currency="USD", to_currency="TWD", rate=31.70)
        db.merge(rate_rec)

        mult = 1.0 - (6 - idx) * 0.002
        for ticker, base_p in actual_prices.items():
            market = "US" if ticker in ["VTI", "TSLA"] else "TW"
            dp = DailyPrice(
                date=d_str,
                ticker=ticker,
                market=market,
                close_price=round(base_p * mult, 2)
            )
            db.merge(dp)

    db.commit()
    print("[Success] 示範公開資產清單已植入資料庫！")
    db.close()

if __name__ == "__main__":
    seed_database(force_reset=True)
