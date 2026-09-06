import csv
import io
from datetime import date
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.accounting import calculate_holdings, calculate_dashboard_summary

router = APIRouter(prefix="/api/export", tags=["export"])

@router.get("/csv", summary="Export CSV snapshot")
def export_csv(db: Session = Depends(get_db)):
    holdings = calculate_holdings(db)
    summary = calculate_dashboard_summary(db)
    today = date.today().isoformat()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["# Asset Snapshot", "Date:" + today])
    writer.writerow([])
    writer.writerow(["Total Net Worth TWD", "Stock Value TWD", "Stock Cost TWD", "PnL TWD", "Return %", "Cash TWD", "USD/TWD"])
    writer.writerow([
        round(summary.total_net_worth_twd),
        round(summary.total_stock_value_twd),
        round(summary.total_stock_cost_twd),
        round(summary.total_stock_pnl_twd),
        str(round(summary.stock_return_rate, 2)) + "%",
        round(summary.total_cash_twd),
        str(round(summary.usd_twd_rate, 4)),
    ])
    writer.writerow([])
    writer.writerow(["Ticker", "Name", "Market", "Category", "Currency", "Shares", "Avg Cost", "Price",
                     "Cost Original", "Cost TWD", "Value TWD", "PnL TWD", "Return %"])
    for h in holdings:
        writer.writerow([
            h.ticker, h.name, h.market, h.category, h.currency,
            h.shares, round(h.avg_cost, 4), round(h.current_price, 4),
            round(h.total_cost_original, 2), round(h.total_cost_twd),
            round(h.current_value_twd), round(h.unrealized_pnl_twd),
            str(round(h.return_rate, 2)) + "%",
        ])
    output.seek(0)
    bom = "\ufeff"
    return StreamingResponse(
        iter([bom + output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=asset_snapshot.csv"}
    )
