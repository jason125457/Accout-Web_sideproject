/**
 * 格式化與代號正規化工具庫
 */

/**
 * 台股代號前導零智慧修復函式
 * 解決 Google 試算表或 Excel 自動將純數字代號轉為數值（0050 -> 50, 00692 -> 692, 006208 -> 6208）的問題
 */
export function formatStockTicker(rawTicker: string | number | undefined | null, market: string = 'TW', name: string = ''): string {
  if (rawTicker === undefined || rawTicker === null) return '';
  let t = String(rawTicker).trim();
  if (!t) return '';

  // 去除可能出現的浮點數結尾（如 "50.0" -> "50"）
  if (t.endsWith('.0')) t = t.slice(0, -2);

  // 美股直接轉大寫返回（如 VTI, TSLA, AAPL）
  if (market.toUpperCase() === 'US') {
    return t.toUpperCase();
  }

  // 若已經是 00 開頭（如 0050, 00692, 006208, 00631L）直接保留
  if (t.startsWith('00')) {
    return t.toUpperCase();
  }

  const n = (name || '').toLowerCase();

  // 特殊 ETF 特例修復：富邦台50 (006208)
  if (t === '6208' || n.includes('富邦台50') || n.includes('006208')) {
    return '006208';
  }

  // 匹配純數字 + 可選英文字母後綴（例如 "692", "50", "631L", "0050"）
  const match = t.match(/^(\d+)([A-Za-z]?)$/);
  if (match) {
    const digits = match[1];
    const suffix = match[2].toUpperCase();

    // 台股 3 碼數字（如 692, 878, 713, 919, 929, 940, 631 等）在台股全為 5 碼 ETF（以 00 開頭）
    // 例如 692 -> 00692, 631L -> 00631L, 878 -> 00878
    if (digits.length === 3) {
      return `00${digits}${suffix}`;
    }

    // 台股 1~2 碼數字（如 50, 56 等）補齊至 4 碼
    // 例如 50 -> 0050, 56 -> 0056
    if (digits.length <= 2) {
      return `00${digits.padStart(2, '0')}${suffix}`;
    }
  }

  return t.toUpperCase();
}

/**
 * 格式化貨幣金額，支援隱私遮罩
 */
export function formatCurrency(
  val: number | undefined | null,
  isMasked: boolean = false,
  prefix: string = ''
): string {
  if (isMasked) return '••••••';
  if (val === undefined || val === null || isNaN(val)) return '0';
  const formatted = Math.round(val).toLocaleString();
  return prefix ? `${prefix} ${formatted}` : formatted;
}

/**
 * 動態時段問候語
 */
export function getGreeting(): { text: string; icon: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return { text: '早安', icon: '☕' };
  } else if (hour >= 12 && hour < 18) {
    return { text: '午安', icon: '☀️' };
  } else {
    return { text: '晚安', icon: '🌙' };
  }
}
