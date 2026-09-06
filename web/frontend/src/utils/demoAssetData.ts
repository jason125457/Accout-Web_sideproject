import type { DashboardSummary, HoldingItem, BankBalanceItem, ChartDataPoint } from '../api';

export const DEMO_DASHBOARD: DashboardSummary = {
  total_net_worth_twd: 3865000,
  total_stock_value_twd: 2750000,
  total_stock_cost_twd: 1980000,
  total_stock_pnl_twd: 770000,
  stock_return_rate: 38.89,
  total_cash_twd: 1115000,
  usd_twd_rate: 31.70,
  latest_date: '2026-09-06',
  strategy: {
    core_value_twd: 1950000,
    core_ratio: 0.5045,
    core_status: '目前 50% (目標 50% 核心全市場 ETF)',
    cash_value_twd: 1115000,
    cash_ratio: 0.2885,
    cash_status: '目前 29% (安全防禦邊際活存)',
    satellite_value_twd: 800000,
    satellite_ratio: 0.2070,
    satellite_status: '目前 21% (衛星進攻成長個股)'
  }
};

export const DEMO_HOLDINGS: HoldingItem[] = [
  {
    ticker: '006208',
    name: '富邦台50 (示範)',
    market: 'TW',
    category: 'CORE_ETF',
    shares: 4000,
    avg_cost: 72.50,
    current_price: 247.25,
    total_cost_original: 290000,
    total_cost_twd: 290000,
    current_value_twd: 989000,
    unrealized_pnl_twd: 699000,
    return_rate: 241.03,
    currency: 'TWD'
  },
  {
    ticker: '0050',
    name: '元大台灣50 (示範)',
    market: 'TW',
    category: 'CORE_ETF',
    shares: 4500,
    avg_cost: 84.20,
    current_price: 107.90,
    total_cost_original: 378900,
    total_cost_twd: 378900,
    current_value_twd: 485550,
    unrealized_pnl_twd: 106650,
    return_rate: 28.15,
    currency: 'TWD'
  },
  {
    ticker: 'VTI',
    name: 'Vanguard全市場 (示範)',
    market: 'US',
    category: 'CORE_ETF',
    shares: 40.0,
    avg_cost: 320.00,
    current_price: 379.73,
    total_cost_original: 12800,
    total_cost_twd: 405760,
    current_value_twd: 481498,
    unrealized_pnl_twd: 75738,
    return_rate: 18.67,
    currency: 'USD'
  },
  {
    ticker: '2330',
    name: '台積電 (示範)',
    market: 'TW',
    category: 'SATELLITE',
    shares: 150,
    avg_cost: 1850.00,
    current_price: 2410.00,
    total_cost_original: 277500,
    total_cost_twd: 277500,
    current_value_twd: 361500,
    unrealized_pnl_twd: 84000,
    return_rate: 30.27,
    currency: 'TWD'
  },
  {
    ticker: 'TSLA',
    name: '特斯拉 (示範)',
    market: 'US',
    category: 'SATELLITE',
    shares: 25.0,
    avg_cost: 290.00,
    current_price: 354.08,
    total_cost_original: 7250,
    total_cost_twd: 229825,
    current_value_twd: 280608,
    unrealized_pnl_twd: 50783,
    return_rate: 22.10,
    currency: 'USD'
  },
  {
    ticker: 'NVDA',
    name: '輝達 (示範)',
    market: 'US',
    category: 'SATELLITE',
    shares: 22.0,
    avg_cost: 175.00,
    current_price: 230.36,
    total_cost_original: 3850,
    total_cost_twd: 122045,
    current_value_twd: 160655,
    unrealized_pnl_twd: 38610,
    return_rate: 31.64,
    currency: 'USD'
  }
];

export const DEMO_BANKS: BankBalanceItem[] = [
  {
    account_id: 1,
    name: '主力高利數位帳戶 (示範)',
    currency: 'TWD',
    current_balance: 650000,
    twd_amount: 650000,
    weight: 58.3,
    note: '緊急備用金與生活調度'
  },
  {
    account_id: 2,
    name: '證券交割專用帳戶 (示範)',
    currency: 'TWD',
    current_balance: 350000,
    twd_amount: 350000,
    weight: 31.4,
    note: '每月定期定額自動扣款'
  },
  {
    account_id: 3,
    name: '外幣美元活存帳戶 (示範)',
    currency: 'USD',
    current_balance: 3627.76,
    twd_amount: 115000,
    weight: 10.3,
    note: '海外證券備用款'
  }
];

export const DEMO_CHART: ChartDataPoint[] = [
  { date: '2026-09-01', total_net_worth: 3820000, stock_value: 2705000, cash_value: 1115000, daily_change_twd: 0, daily_change_pct: 0 },
  { date: '2026-09-02', total_net_worth: 3832000, stock_value: 2717000, cash_value: 1115000, daily_change_twd: 12000, daily_change_pct: 0.31 },
  { date: '2026-09-03', total_net_worth: 3845000, stock_value: 2730000, cash_value: 1115000, daily_change_twd: 13000, daily_change_pct: 0.34 },
  { date: '2026-09-04', total_net_worth: 3862000, stock_value: 2747000, cash_value: 1115000, daily_change_twd: 17000, daily_change_pct: 0.44 },
  { date: '2026-09-05', total_net_worth: 3858000, stock_value: 2743000, cash_value: 1115000, daily_change_twd: -4000, daily_change_pct: -0.10 },
  { date: '2026-09-06', total_net_worth: 3865000, stock_value: 2750000, cash_value: 1115000, daily_change_twd: 7000, daily_change_pct: 0.18 }
];
