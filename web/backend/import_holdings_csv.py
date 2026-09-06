import os
import sys
import csv
from datetime import datetime

# Windows 終端編碼相容
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.database import engine, Base, SessionLocal
from app.models import Account, Transaction, DailyPrice, ExchangeRate
from app.services.market_data import sync_all_prices

CSV_PATH = os.path.abspath(os.path.join(BACKEND_DIR, "..", "..", "持股明細設定檔.csv"))

def import_csv():
    if not os.path.exists(CSV_PATH):
        print(f"[Error] 找不到持股設定檔：{CSV_PATH}")
        return

    print(f"[Import] 正在自 CSV 同步持股資料：{CSV_PATH}")
    db = SessionLocal()

    # 取得或建立預設券商帳戶
    brokerage = db.query(Account).filter(Account.category == "BROKERAGE").first()
    if not brokerage:
        brokerage = Account(name="綜合證券庫存", category="BROKERAGE", currency="TWD")
        db.add(brokerage)
        db.flush()

    # 1. 清除舊有的股票買賣日誌（保留現金帳戶交易）
    db.query(Transaction).filter(Transaction.ticker != "CASH").delete()

    today_str = datetime.now().strftime("%Y-%m-%d")

    # 2. 讀取 CSV 並寫入新建倉日誌
    count = 0
    with open(CSV_PATH, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            ticker = row["股號"].strip().upper()
            shares = float(row["總持股數"].replace(",", "").strip())
            cost = float(row["投入總成本"].replace(",", "").strip())
            currency = row.get("計價幣別", "TWD").strip().upper()
            notes = row.get("備註說明", "").strip()

            price = round(cost / shares, 4) if shares > 0 else 0.0
            tx = Transaction(
                date=today_str,
                account_id=brokerage.id,
                ticker=ticker,
                action="BUY",
                shares=shares,
                price=price,
                total_amount=cost,
                fee=0.0,
                currency=currency,
                exchange_rate=31.70 if currency == "USD" else 1.0,
                settlement_currency="TWD",
                settlement_amount=round(cost * 31.70, 2) if currency == "USD" else cost,
                notes=notes
            )
            db.add(tx)
            count += 1

    db.commit()
    print(f"[Success] 已成功同步 {count} 檔持股記錄！正在更新最新即時行情...")
    try:
        sync_all_prices(db)
        print("[Success] 行情同步完成！請重新整理瀏覽器網頁。")
    except Exception as e:
        print(f"[Notice] 行情更新略過：{e}")
    db.close()

if __name__ == "__main__":
    import_csv()
