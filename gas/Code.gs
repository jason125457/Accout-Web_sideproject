/**
 * ==============================================================================
 * 🏛️ 個人全資產戰略管理中樞 (Web Asset Hub) - Google Apps Script 後端
 * ==============================================================================
 * 
 * 核心功能：
 * 1. 【doGet】提供 Cloudflare Pages 前端儀表板透過 HTTP GET 讀取所有資產資料
 * 2. 【Token 驗證】比對 API_SECRET_TOKEN，無效者拒絕存取（保護財務隱私）
 * 3. 【GOOGLEFINANCE 自動連動】支援利用試算表公式自動抓取台股、美股收盤價與美元匯率
 * 4. 【一鍵初始化】提供 setupSheets() 函式，首次執行自動建立 3 張表格並匯入預設數據
 * ==============================================================================
 */

// ==============================================================================
// 1. 核心參數設定區（支援由「專案設定」->「指令碼屬性」讀取）
// ==============================================================================
function getSecret(key, defaultValue = '') {
  try {
    const prop = PropertiesService.getScriptProperties().getProperty(key);
    return (prop && prop.trim() !== '') ? prop.trim() : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

const CONFIG = {
  // Google 試算表 ID（留空代表綁定當前打開的試算表）
  SPREADSHEET_ID: getSecret('SPREADSHEET_ID', ''),

  // 前端儀表板存取密鑰 Token（優先讀取「指令碼屬性」，若無則使用預設值）
  API_SECRET_TOKEN: getSecret('API_SECRET_TOKEN', 'myasset_secret_2026')
};

function getSpreadsheet() {
  if (CONFIG.SPREADSHEET_ID && CONFIG.SPREADSHEET_ID.trim() !== '') {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID.trim());
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

// ==============================================================================
// 2. 前端儀表板 API 介面 (doGet)
// ==============================================================================
function doGet(e) {
  try {
    // 1. 驗證金鑰
    if (CONFIG.API_SECRET_TOKEN && CONFIG.API_SECRET_TOKEN.trim() !== '') {
      const incomingToken = e && e.parameter ? (e.parameter.token || '').trim() : '';
      if (incomingToken !== CONFIG.API_SECRET_TOKEN.trim()) {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          message: '403 Forbidden: 驗證密鑰錯誤，存取遭拒。'
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    const ss = getSpreadsheet();
    const holdingsSheet = ss.getSheetByName('持倉明細');
    const banksSheet = ss.getSheetByName('現金帳戶');
    const historySheet = ss.getSheetByName('每日歷史');

    if (!holdingsSheet || !banksSheet) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: '工作表未初始化，請在 Apps Script 執行一次 setupSheets() 函式。'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. 取得 USD/TWD 匯率（從試算表讀取或預設 31.70）
    let usdRate = 31.70;
    try {
      const rateRange = holdingsSheet.getRange('L2').getValue();
      const parsedRate = parseFloat(rateRange);
      if (!isNaN(parsedRate) && parsedRate > 20 && parsedRate < 50) {
        usdRate = parsedRate;
      }
    } catch (err) {
      usdRate = 31.70;
    }

    // 3. 解析「持倉明細」
    const holdingsData = holdingsSheet.getDataRange().getValues();
    const holdings = [];
    let totalStockValueTwd = 0;
    let totalStockCostTwd = 0;
    let coreValueTwd = 0;
    let satelliteValueTwd = 0;

    for (let i = 1; i < holdingsData.length; i++) {
      const row = holdingsData[i];
      const ticker = String(row[0] || '').trim();
      if (!ticker) continue;

      const name = String(row[1] || ticker).trim();
      const market = String(row[2] || 'TW').trim().toUpperCase();
      const category = String(row[3] || 'CORE_ETF').trim().toUpperCase();
      const currency = String(row[4] || 'TWD').trim().toUpperCase();
      const shares = Number(row[5]) || 0;
      const avgCost = Number(row[6]) || 0;
      let currentPrice = Number(row[7]) || avgCost;
      const totalCostOriginal = Number(row[8]) || (shares * avgCost);

      if (currentPrice <= 0) currentPrice = avgCost;

      const rate = (currency === 'USD') ? usdRate : 1.0;
      const currentValueTwd = shares * currentPrice * rate;
      const totalCostTwd = totalCostOriginal * rate;
      const unrealizedPnlTwd = currentValueTwd - totalCostTwd;
      const returnRate = totalCostTwd > 0 ? (unrealizedPnlTwd / totalCostTwd) * 100 : 0;

      totalStockValueTwd += currentValueTwd;
      totalStockCostTwd += totalCostTwd;

      if (category === 'CORE_ETF') {
        coreValueTwd += currentValueTwd;
      } else {
        satelliteValueTwd += currentValueTwd;
      }

      holdings.push({
        ticker: ticker,
        name: name,
        market: market,
        category: category,
        currency: currency,
        shares: shares,
        avg_cost: Math.round(avgCost * 10000) / 10000,
        current_price: Math.round(currentPrice * 10000) / 10000,
        total_cost_original: Math.round(totalCostOriginal * 100) / 100,
        total_cost_twd: Math.round(totalCostTwd * 100) / 100,
        current_value_twd: Math.round(currentValueTwd * 100) / 100,
        unrealized_pnl_twd: Math.round(unrealizedPnlTwd * 100) / 100,
        return_rate: Math.round(returnRate * 100) / 100
      });
    }

    // 4. 解析「現金帳戶」
    const banksData = banksSheet.getDataRange().getValues();
    const banks = [];
    let totalCashTwd = 0;

    for (let i = 1; i < banksData.length; i++) {
      const row = banksData[i];
      const name = String(row[0] || '').trim();
      if (!name) continue;

      const currency = String(row[1] || 'TWD').trim().toUpperCase();
      const currentBalance = Number(row[2]) || 0;
      const note = String(row[3] || '').trim();

      const rate = (currency === 'USD') ? usdRate : 1.0;
      const twdAmount = currentBalance * rate;
      totalCashTwd += twdAmount;

      banks.push({
        account_id: i,
        name: name,
        currency: currency,
        current_balance: Math.round(currentBalance * 100) / 100,
        twd_amount: Math.round(twdAmount * 100) / 100,
        weight: 0,
        note: note
      });
    }

    // 計算各現金帳戶比重
    for (let b of banks) {
      b.weight = totalCashTwd > 0 ? Math.round((b.twd_amount / totalCashTwd) * 1000) / 10 : 0;
    }

    // 5. 總淨值與戰略配置計算
    const totalNetWorthTwd = totalStockValueTwd + totalCashTwd;
    const totalStockPnlTwd = totalStockValueTwd - totalStockCostTwd;
    const stockReturnRate = totalStockCostTwd > 0 ? (totalStockPnlTwd / totalStockCostTwd) * 100 : 0;

    const coreRatio = totalNetWorthTwd > 0 ? coreValueTwd / totalNetWorthTwd : 0;
    const satelliteRatio = totalNetWorthTwd > 0 ? satelliteValueTwd / totalNetWorthTwd : 0;
    const cashRatio = totalNetWorthTwd > 0 ? totalCashTwd / totalNetWorthTwd : 0;

    const strategy = {
      core_value_twd: Math.round(coreValueTwd * 100) / 100,
      core_ratio: Math.round(coreRatio * 10000) / 10000,
      core_status: `目前 ${Math.round(coreRatio * 100)}% (目標 50% 核心全市場 ETF)`,
      cash_value_twd: Math.round(totalCashTwd * 100) / 100,
      cash_ratio: Math.round(cashRatio * 10000) / 10000,
      cash_status: `目前 ${Math.round(cashRatio * 100)}% (安全防禦邊際活存)`,
      satellite_value_twd: Math.round(satelliteValueTwd * 100) / 100,
      satellite_ratio: Math.round(satelliteRatio * 10000) / 10000,
      satellite_status: `目前 ${Math.round(satelliteRatio * 100)}% (衛星進攻成長個股)`
    };

    // 6. 解析「每日歷史」
    let chart = [];
    if (historySheet) {
      const historyData = historySheet.getDataRange().getValues();
      const rawPoints = [];

      for (let i = 1; i < historyData.length; i++) {
        const row = historyData[i];
        let dateVal = row[0];
        if (!dateVal) continue;

        let dateStr = '';
        if (dateVal instanceof Date) {
          dateStr = Utilities.formatDate(dateVal, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');
        } else {
          dateStr = String(dateVal).trim().slice(0, 10);
        }

        const netWorth = Number(row[1]) || 0;
        const stockVal = Number(row[2]) || 0;
        const cashVal = Number(row[3]) || 0;

        if (netWorth > 0) {
          rawPoints.push({
            date: dateStr,
            total_net_worth: Math.round(netWorth * 100) / 100,
            stock_value: Math.round(stockVal * 100) / 100,
            cash_value: Math.round(cashVal * 100) / 100
          });
        }
      }

      // 依日期遞增排序
      rawPoints.sort((a, b) => a.date.localeCompare(b.date));

      for (let i = 0; i < rawPoints.length; i++) {
        let diff = 0;
        let pct = 0;
        if (i > 0) {
          const prev = rawPoints[i - 1].total_net_worth;
          diff = rawPoints[i].total_net_worth - prev;
          pct = prev > 0 ? (diff / prev) * 100 : 0;
        }
        chart.push({
          date: rawPoints[i].date,
          total_net_worth: rawPoints[i].total_net_worth,
          stock_value: rawPoints[i].stock_value,
          cash_value: rawPoints[i].cash_value,
          daily_change_twd: Math.round(diff * 100) / 100,
          daily_change_pct: Math.round(pct * 100) / 100
        });
      }
    }

    const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');

    // 冷啟動或歷史不足時，至少確保有當前點
    if (chart.length === 0) {
      chart = [{
        date: todayStr,
        total_net_worth: Math.round(totalNetWorthTwd * 100) / 100,
        stock_value: Math.round(totalStockValueTwd * 100) / 100,
        cash_value: Math.round(totalCashTwd * 100) / 100,
        daily_change_twd: 0,
        daily_change_pct: 0
      }];
    }

    const responsePayload = {
      status: 'success',
      data: {
        dashboard: {
          total_net_worth_twd: Math.round(totalNetWorthTwd * 100) / 100,
          total_stock_value_twd: Math.round(totalStockValueTwd * 100) / 100,
          total_stock_cost_twd: Math.round(totalStockCostTwd * 100) / 100,
          total_stock_pnl_twd: Math.round(totalStockPnlTwd * 100) / 100,
          stock_return_rate: Math.round(stockReturnRate * 100) / 100,
          total_cash_twd: Math.round(totalCashTwd * 100) / 100,
          usd_twd_rate: Math.round(usdRate * 100) / 100,
          latest_date: todayStr,
          strategy: strategy
        },
        holdings: holdings,
        banks: banks,
        chart: chart
      },
      updatedAt: new Date().toISOString()
    };

    return ContentService.createTextOutput(JSON.stringify(responsePayload))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: '執行失敗: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==============================================================================
// 3. 一鍵建立表格與匯入預設範例標的 (展示用範例，非真實個資)
// ==============================================================================
function setupSheets() {
  const ss = getSpreadsheet();

  // 1. 建立「持倉明細」
  let hSheet = ss.getSheetByName('持倉明細');
  if (!hSheet) {
    hSheet = ss.insertSheet('持倉明細');
  } else {
    hSheet.clear();
  }

  // 匯率欄位
  hSheet.getRange('K1').setValue('美元匯率');
  hSheet.getRange('L1').setValue('即時數值');
  hSheet.getRange('K2').setValue('USD/TWD');
  hSheet.getRange('L2').setFormula('=IFERROR(GOOGLEFINANCE("CURRENCY:USDTWD"), 31.70)');

  // 表頭
  const hHeaders = [
    ['代號', '標的名稱', '市場', '戰略板塊', '幣別', '持有股數', '加權成本', '最新現價(公式/數值)', '投入成本(原幣)', '備註']
  ];
  hSheet.getRange('A1:J1').setValues(hHeaders).setFontWeight('bold').setBackground('#0D9488').setFontColor('#ffffff');

  // 初始範例標的數據 (展示示範範例，保護個人隱私)
  const initialHoldings = [
    ['0050', '元大台灣50 (範例)', 'TW', 'CORE_ETF', 'TWD', 1000, 85.0, '=IFERROR(GOOGLEFINANCE("TPE:0050"), 107.9)', 85000, '核心指數 ETF 範例'],
    ['006208', '富邦台50 (範例)', 'TW', 'CORE_ETF', 'TWD', 1000, 70.0, '=IFERROR(GOOGLEFINANCE("TPE:006208"), 247.25)', 70000, '低內扣核心範例'],
    ['VTI', 'Vanguard全市場 (範例)', 'US', 'CORE_ETF', 'USD', 10.0, 320.0, '=IFERROR(GOOGLEFINANCE("VTI"), 379.73)', 3200, '美股全市場核心範例'],
    ['2330', '台積電 (範例)', 'TW', 'SATELLITE', 'TWD', 100, 1850.0, '=IFERROR(GOOGLEFINANCE("TPE:2330"), 2410.0)', 185000, '衛星成長個股範例'],
    ['TSLA', '特斯拉 (範例)', 'US', 'SATELLITE', 'USD', 10.0, 290.0, '=IFERROR(GOOGLEFINANCE("TSLA"), 354.08)', 2900, '美股衛星個股範例']
  ];
  hSheet.getRange(2, 1, initialHoldings.length, 10).setValues(initialHoldings);

  // 2. 建立「現金帳戶」
  let bSheet = ss.getSheetByName('現金帳戶');
  if (!bSheet) {
    bSheet = ss.insertSheet('現金帳戶');
  } else {
    bSheet.clear();
  }

  const bHeaders = [['帳戶名稱', '幣別', '目前餘額', '備註']];
  bSheet.getRange('A1:D1').setValues(bHeaders).setFontWeight('bold').setBackground('#0D9488').setFontColor('#ffffff');

  const initialBanks = [
    ['主要高利數位帳戶 (範例)', 'TWD', 500000, '日常備用金與生活調度範例'],
    ['證券交割專用帳戶 (範例)', 'TWD', 200000, '證券扣款專用戶範例'],
    ['外幣美元活存帳戶 (範例)', 'USD', 3000.0, '外幣流動資產備用範例']
  ];
  bSheet.getRange(2, 1, initialBanks.length, 4).setValues(initialBanks);

  // 3. 建立「每日歷史」
  let histSheet = ss.getSheetByName('每日歷史');
  if (!histSheet) {
    histSheet = ss.insertSheet('每日歷史');
  } else {
    histSheet.clear();
  }

  const histHeaders = [['日期', '純流動總淨值', '證券市值', '防禦現金', '備註']];
  histSheet.getRange('A1:E1').setValues(histHeaders).setFontWeight('bold').setBackground('#0D9488').setFontColor('#ffffff');

  const initialHistory = [
    ['2026-09-01', 1200000, 400000, 800000, '範例起始淨值'],
    ['2026-09-02', 1210000, 410000, 800000, '範例行情波動'],
    ['2026-09-03', 1205000, 405000, 800000, '範例行情波動'],
    ['2026-09-04', 1220000, 420000, 800000, '範例行情波動'],
    ['2026-09-05', 1225000, 425000, 800000, '範例行情波動'],
    ['2026-09-06', 1230000, 430000, 800000, '目前示範最新淨值']
  ];
  histSheet.getRange(2, 1, initialHistory.length, 5).setValues(initialHistory);

  Logger.log('🎉 恭喜！範例試算表工作表與示範數據初始化完成！');
}
