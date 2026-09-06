const API_BASE = import.meta.env.VITE_API_BASE || '';
import { formatStockTicker } from './utils/formatters';

export interface StrategyAllocation {
  core_value_twd: number;
  core_ratio: number;
  core_status: string;
  cash_value_twd: number;
  cash_ratio: number;
  cash_status: string;
  satellite_value_twd: number;
  satellite_ratio: number;
  satellite_status: string;
}

export interface DashboardSummary {
  total_net_worth_twd: number;
  total_stock_value_twd: number;
  total_stock_cost_twd: number;
  total_stock_pnl_twd: number;
  stock_return_rate: number;
  total_cash_twd: number;
  usd_twd_rate: number;
  latest_date: string;
  strategy: StrategyAllocation;
}

export interface HoldingItem {
  ticker: string;
  name: string;
  market: string;
  category: string;
  shares: number;
  avg_cost: number;
  current_price: number;
  total_cost_original?: number;
  total_cost_twd: number;
  current_value_twd: number;
  unrealized_pnl_twd: number;
  return_rate: number;
  currency: string;
}

export interface BankBalanceItem {
  account_id: number;
  name: string;
  currency: string;
  current_balance: number;
  twd_amount: number;
  weight: number;
  note?: string;
}

export interface ChartDataPoint {
  date: string;
  total_net_worth: number;
  stock_value: number;
  cash_value: number;
  daily_change_twd?: number;
  daily_change_pct?: number;
}

export interface TransactionCreatePayload {
  date: string;
  account_id: number;
  ticker: string;
  action: string;
  shares: number;
  price: number;
  total_amount: number;
  fee?: number;
  currency?: string;
  exchange_rate?: number;
  settlement_currency?: string;
  settlement_amount?: number;
  notes?: string;
}

export interface TransactionItem extends TransactionCreatePayload {
  id: number;
}

export const api = {
  async getDashboard(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE}/api/dashboard`);
    if (!res.ok) throw new Error('無法取得儀表板數據');
    return res.json();
  },

  async getHoldings(): Promise<HoldingItem[]> {
    const res = await fetch(`${API_BASE}/api/holdings`);
    if (!res.ok) throw new Error('無法取得持倉明細');
    const data: HoldingItem[] = await res.json();
    return data.map((h) => ({
      ...h,
      ticker: formatStockTicker(h.ticker, h.market, h.name),
    }));
  },

  async getBanks(): Promise<BankBalanceItem[]> {
    const res = await fetch(`${API_BASE}/api/banks`);
    if (!res.ok) throw new Error('無法取得銀行明細');
    return res.json();
  },

  async getChart(): Promise<ChartDataPoint[]> {
    const res = await fetch(`${API_BASE}/api/chart`);
    if (!res.ok) throw new Error('無法取得歷史淨值曲線');
    return res.json();
  },

  async getTransactions(): Promise<TransactionItem[]> {
    const res = await fetch(`${API_BASE}/api/transactions`);
    if (!res.ok) throw new Error('無法取得交易記錄');
    return res.json();
  },

  async quickUpdateCash(accountId: number, currentBalance: number, notes?: string) {
    const res = await fetch(`${API_BASE}/api/cash/quick-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: accountId, current_balance: currentBalance, notes })
    });
    if (!res.ok) throw new Error('現金校對更新失敗');
    return res.json();
  },

  async createTransaction(payload: TransactionCreatePayload) {
    const res = await fetch(`${API_BASE}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('新增交易失敗');
    return res.json();
  },

  async adjustHolding(ticker: string, targetShares: number, targetTotalCost: number, currency?: string) {
    const res = await fetch(`${API_BASE}/api/holdings/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker,
        target_shares: targetShares,
        target_total_cost: targetTotalCost,
        currency
      })
    });
    if (!res.ok) throw new Error('持倉校對更新失敗');
    return res.json();
  },

  async syncMarket(): Promise<any> {
    const res = await fetch(`${API_BASE}/api/market/sync`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('行情同步失敗');
    return res.json();
  }
};
