from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas import DashboardSummary, HoldingItem, BankBalanceItem, ChartDataPoint
from ..services.accounting import (
    calculate_dashboard_summary, calculate_holdings, calculate_bank_balances
)
from ..models import DailyPrice, Transaction

router = APIRouter(prefix="/api", tags=["Dashboard"])

@router.get("/dashboard", response_model=DashboardSummary)
def get_dashboard(db: Session = Depends(get_db)):
    return calculate_dashboard_summary(db)

@router.get("/holdings", response_model=List[HoldingItem])
def get_holdings(db: Session = Depends(get_db)):
    return calculate_holdings(db)

@router.get("/banks", response_model=List[BankBalanceItem])
def get_banks(db: Session = Depends(get_db)):
    items, _ = calculate_bank_balances(db)
    return items

@router.get("/chart", response_model=List[ChartDataPoint])
def get_chart_data(db: Session = Depends(get_db)):
    """
    產生歷史淨值曲線資料，並計算每日資產淨值增減（金額與百分比）。
    具備冷啟動防破圖設計：若歷史日期不足，自動產生基準點。
    """
    # 抓取所有出現在 daily_prices 中的不重複日期
    dates = [
        d[0] for d in db.query(DailyPrice.date).distinct().order_by(DailyPrice.date.asc()).all()
    ]

    raw_points: List[dict] = []
    for d in dates:
        # 計算該歷史日期的持倉與現金
        holdings = calculate_holdings(db, target_date=d)
        _, cash_twd = calculate_bank_balances(db, target_date=d)
        stock_val = sum(h.current_value_twd for h in holdings)
        total_net = cash_twd + stock_val
        
        # 排除尚未建立資產的初始 0 元空點
        if total_net > 0:
            raw_points.append({
                "date": d,
                "total_net_worth": round(total_net, 2),
                "stock_value": round(stock_val, 2),
                "cash_value": round(cash_twd, 2)
            })

    chart_points: List[ChartDataPoint] = []
    for i, pt in enumerate(raw_points):
        if i == 0:
            change_twd = 0.0
            change_pct = 0.0
        else:
            prev_net = raw_points[i - 1]["total_net_worth"]
            diff = pt["total_net_worth"] - prev_net
            pct = (diff / prev_net * 100.0) if prev_net > 0 else 0.0
            change_twd = round(diff, 2)
            change_pct = round(pct, 2)

        chart_points.append(ChartDataPoint(
            date=pt["date"],
            total_net_worth=pt["total_net_worth"],
            stock_value=pt["stock_value"],
            cash_value=pt["cash_value"],
            daily_change_twd=change_twd,
            daily_change_pct=change_pct
        ))

    # 冷啟動防破圖：若點數只有 0 或 1 個，使用當前即時數據呈現基準點
    if len(chart_points) <= 1:
        summary = calculate_dashboard_summary(db)
        cur_date = summary.latest_date
        chart_points = [
            ChartDataPoint(
                date=cur_date,
                total_net_worth=summary.total_net_worth_twd,
                stock_value=summary.total_stock_value_twd,
                cash_value=summary.total_cash_twd,
                daily_change_twd=0.0,
                daily_change_pct=0.0
            )
        ]

    return chart_points
