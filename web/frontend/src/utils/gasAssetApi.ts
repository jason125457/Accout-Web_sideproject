import type { DashboardSummary, HoldingItem, BankBalanceItem, ChartDataPoint } from '../api';
import { formatStockTicker } from './formatters';

export interface GasAssetResponse {
  status: 'success' | 'error';
  message?: string;
  data?: {
    dashboard: DashboardSummary;
    holdings: HoldingItem[];
    banks: BankBalanceItem[];
    chart: ChartDataPoint[];
  };
  updatedAt?: string;
}

export async function fetchFromGas(webAppUrl: string, secretToken: string = ''): Promise<{
  success: boolean;
  data?: {
    dashboard: DashboardSummary;
    holdings: HoldingItem[];
    banks: BankBalanceItem[];
    chart: ChartDataPoint[];
  };
  message?: string;
}> {
  if (!webAppUrl || !webAppUrl.trim()) {
    return { success: false, message: '尚未提供 Google Apps Script 網頁應用程式 URL' };
  }

  try {
    const urlObj = new URL(webAppUrl.trim());
    if (secretToken && secretToken.trim()) {
      urlObj.searchParams.set('token', secretToken.trim());
    }

    const res = await fetch(urlObj.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      return { success: false, message: `伺服器回應錯誤 HTTP ${res.status}: ${res.statusText}` };
    }

    const json: GasAssetResponse = await res.json();

    if (json.status === 'error' || !json.data) {
      return { success: false, message: json.message || 'Google 試算表回傳格式錯誤或存取遭拒' };
    }

    // 自動校正與補齊台股代號前導零（如 50 -> 0050, 692 -> 00692, 6208 -> 006208）
    const sanitizedHoldings = (json.data.holdings || []).map((h) => ({
      ...h,
      ticker: formatStockTicker(h.ticker, h.market, h.name),
    }));

    return {
      success: true,
      data: {
        ...json.data,
        holdings: sanitizedHoldings,
      },
    };
  } catch (err: any) {
    return { success: false, message: `連線失敗: ${err.message || String(err)}` };
  }
}
