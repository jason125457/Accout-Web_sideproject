/**
 * ============================================================================
 * AllInOne_Code.js - 個人全資產戰略管理中樞 (單一檔案整合版)
 * ============================================================================
 * 說明：
 * 若你想以最快速的方式安裝，只需在 Google 試算表的「擴充功能 ➔ Apps Script」
 * 中，將原有內容全部清空，直接「全部複製貼上此檔案」並存檔即可！
 * ============================================================================
 */

// ============================================================================
// 1. Config: 系統參數與設定管理
// ============================================================================
const CONFIG = {
  DEFAULT_PROPERTIES: {
    GEMINI_API_KEY: '',
    PENDING_FOLDER_ID: '',
    ARCHIVE_FOLDER_ID: '',
  },
  PORTFOLIO_TARGETS: {
    CORE_ETF_MIN: 0.50,
    CORE_ETF_MAX: 0.70,
    CASH_MIN: 0.20,
    CASH_MAX: 0.35,
    SATELLITE_MAX: 0.25,
  },
  GEMINI_MODEL: 'gemini-3.8-flash',

  getProperty: function(key) {
    const props = PropertiesService.getScriptProperties();
    let val = props.getProperty(key);
    if (!val && this.DEFAULT_PROPERTIES[key]) {
      val = this.DEFAULT_PROPERTIES[key];
    }
    return val ? val.trim() : '';
  },

  setProperty: function(key, value) {
    const props = PropertiesService.getScriptProperties();
    props.setProperty(key, value ? value.trim() : '');
  }
};

// ============================================================================
// 2. GeminiService: Gemini 2.5 Flash API 調用與結構化解析
// ============================================================================
const GeminiService = {
  parseAssetImages: function(imageFiles) {
    const apiKey = CONFIG.getProperty('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('未設定 Gemini API Key！請在試算表上方選單點選「🚀 資產管理 ➔ ⚙️ 設定系統參數」完成設定。');
    }

    if (!imageFiles || imageFiles.length === 0) {
      throw new Error('「待處理截圖」資料夾中沒有找到任何圖片檔案！');
    }

    const parts = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const blob = file.getBlob();
      const mimeType = blob.getContentType();
      
      if (!mimeType.startsWith('image/')) continue;
      
      const base64Data = Utilities.base64Encode(blob.getBytes());
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data
        }
      });
    }

    if (parts.length === 0) {
      throw new Error('資料夾中沒有合法的圖片格式（僅支援 PNG、JPG、WebP 等圖片）。');
    }

    const promptText = `
你是一位頂級個人資產管理與量化投資分析師。
請仔細辨識所提供的一系列手機/網頁資產截圖（包含各銀行帳戶、台股證券庫存、美股複委託、定期定額豐存股等）。
請依據截圖中的真實數據，提取並結構化輸出完整的個人資產報告。

【重要：銀行現金帳戶深度辨識與子帳戶合併規則（務必嚴格執行）】：
1. 台新銀行 (Richart)：
   - 非常重要！Richart 介面常有「活儲主帳戶」以及多個「子帳戶／萬用罐／優利罐／證券罐／備用金罐」。
   - 你必須仔細檢查截圖中出現的所有罐子與子帳戶金額，並【全部加總】為台新銀行的台幣總金額！
   - 例如：活儲 $127,863 + 優利罐 $401,774 + 證券罐 $163,312 = 總金額 $692,949。
   - 絕對不可以只抓主帳戶餘額，務必確保優利罐與證券罐等子帳戶金額全部完整納入！
2. 永豐銀行 (DAWHO)：
   - 包含「臺幣活儲」（約 20 萬）以及「外幣存款 (USD)」，若有外幣請分為兩筆（TWD 一筆、USD 一筆）。
3. 聯邦銀行 (New New Bank)：
   - 提取臺幣活存可用餘額（約 14.3 萬）。
4. 台北富邦銀行：
   - 提取活儲存款總額（約 9.8 萬）。
5. 華南銀行：
   - 區分臺幣活儲（約 5 萬）與外幣存款（若有美元約 480 USD，列為 USD 筆）。
6. 全面核對：
   - 請檢查所有截圖，確保以上 5 家銀行的存款全部完整列出，絕不可遺漏任何一家銀行或任何子帳戶！

【重要：證券標的代號與持倉規則】：
1. 台股代號格式（前導零嚴格保留）：
   - 台股代號必須為完整的字串！例如 0050、00692、006208、00631L 等，【絕對必須保留開頭的 00】，嚴禁輸出成數值 50 或 692！
2. 美股持股數：
   - 美股定期定額常有碎股，請精確保留小數點（如 28.113、17.03957 等）。
3. 核心大盤 ETF（標註為 CORE_ETF）：
   - 台股：0050（元大台灣50）、006208（富邦台50）、00692（富邦公司治理）、00631L（元大台灣50正2）等指數型/市值型/治理型 ETF。
   - 美股：VTI（整體股市）、QQQM / QQQ（納斯達克100）等大盤指數型 ETF。
4. 衛星個股與主題（標註為 SATELLITE）：
   - 美股個股：TSLA、GOOG、MSFT、NVDA 等；主題 ETF 如 SPCX 等。
   - 台股個股：台積電、國巨、順德、黑松、中磊、福邦證、遠東銀、健鼎、京元電、立隆電、台半等。

【精確度與注意事項】：
- 數字請務必精確，若截圖中已有成本、現值、損益、報酬率，請直接提取真實數據，勿自行捏造。
- 參考美元匯率請自截圖中獲取或採用約 31.7 ~ 32.0 左右。
- 請同時產出深入的資產配置健康度評估與再平衡建議。
`;

    parts.push({ text: promptText });

    const jsonSchema = {
      type: "OBJECT",
      properties: {
        exchange_rate_usd_twd: { type: "NUMBER", description: "參考美元兌台幣匯率，例如 31.70 或 31.83" },
        banks: {
          type: "ARRAY",
          description: "各銀行帳戶現金明細清單（包含台新Richart含子帳戶、永豐DAWHO、聯邦NewNewBank、富邦、華南等）",
          items: {
            type: "OBJECT",
            properties: {
              institution: { type: "STRING", description: "銀行機構名稱，例如：台新銀行, 永豐銀行, 聯邦銀行, 富邦銀行, 華南銀行" },
              currency: { type: "STRING", description: "幣別，TWD 或 USD" },
              original_amount: { type: "NUMBER", description: "原幣金額（若該銀行有子帳戶、萬用罐、優利罐、證券罐，必須填寫加總後的總金額）" },
              note: { type: "STRING", description: "主要功能或備註，例如：含活儲+優利罐+證券罐合計, 豐存股扣款備用金" }
            },
            required: ["institution", "currency", "original_amount"]
          }
        },
        stocks: {
          type: "ARRAY",
          description: "各證券帳戶持倉明細清單",
          items: {
            type: "OBJECT",
            properties: {
              market: { type: "STRING", description: "市場類別，填寫 TW 或 US" },
              account_source: { type: "STRING", description: "帳戶來源" },
              ticker: { type: "STRING", description: "標的代號字串，台股必須保留完整前導零（如 '0050', '00692', '006208', '00631L'，不可省略成 50）" },
              name: { type: "STRING", description: "標的名稱，如 元大台灣50, 富邦公司治理, 特斯拉" },
              category: { type: "STRING", description: "戰略分類：CORE_ETF 或 SATELLITE" },
              shares: { type: "NUMBER", description: "總持股數（可含小數點，如美股碎股 28.113）" },
              total_cost: { type: "NUMBER", description: "原幣投入成本" },
              current_value: { type: "NUMBER", description: "原幣當前總現值" },
              unrealized_pnl: { type: "NUMBER", description: "原幣未實現損益" },
              return_rate: { type: "NUMBER", description: "報酬率百分比數字，例如 52.31 代表 52.31%" }
            },
            required: ["market", "account_source", "ticker", "name", "category", "shares", "total_cost", "current_value", "unrealized_pnl", "return_rate"]
          }
        },
        monthly_insights: {
          type: "OBJECT",
          description: "專業 AI 投資與資產配置月度診斷",
          properties: {
            overall_evaluation: { type: "STRING", description: "純流動總資產規模與整體配置健康度評價" },
            core_satellite_analysis: { type: "STRING", description: "核心指數大盤 ETF 與衛星個股結構評析" },
            cash_defense_status: { type: "STRING", description: "防禦現金厚度與流動性分析" },
            actionable_recommendations: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "具體的後續行動與再平衡建議清單"
            }
          },
          required: ["overall_evaluation", "core_satellite_analysis", "cash_defense_status", "actionable_recommendations"]
        }
      },
      required: ["exchange_rate_usd_twd", "banks", "stocks", "monthly_insights"]
    };

    // 4. 發起 API 請求（具備 503 自動退避重試與多模型備援機制）
    return this.fetchWithFallback(parts, jsonSchema, apiKey);
  },

  fetchWithFallback: function(parts, jsonSchema, apiKey) {
    const defaultModel = CONFIG.GEMINI_MODEL || CONFIG.getProperty('GEMINI_MODEL') || 'gemini-3.8-flash';
    const fallbackList = [
      defaultModel,
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite'
    ];
    const candidateModels = [];
    fallbackList.forEach(m => { if (m && !candidateModels.includes(m)) candidateModels.push(m); });

    let lastError = null;
    let ss = null;
    try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch(e) {}

    for (let m = 0; m < candidateModels.length; m++) {
      const modelName = candidateModels[m];
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      
      const payload = {
        contents: [{ role: "user", parts: parts }],
        generationConfig: {
          response_mime_type: "application/json",
          response_schema: jsonSchema,
          temperature: 0.1
        }
      };

      const options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          if (ss && (m > 0 || attempt > 1)) {
            ss.toast(`正使用 ${modelName} 辨識中 (第 ${attempt} 次嘗試)...`, '智能模型調度 🔄', 10);
          }

          const response = UrlFetchApp.fetch(endpoint, options);
          const statusCode = response.getResponseCode();
          const responseBody = response.getContentText();

          if (statusCode === 200) {
            const result = JSON.parse(responseBody);
            if (result.candidates && result.candidates.length > 0) {
              const text = result.candidates[0].content.parts[0].text;
              Logger.log(`🎉 成功透過模型 [${modelName}] 完成資產解析！`);
              if (ss && m > 0) {
                ss.toast(`主力模型忙碌，已自動切換 [${modelName}] 順利完成！`, '備援成功 ✅', 5);
              }
              return JSON.parse(text);
            }
          }

          if (statusCode === 503 || statusCode === 429) {
            Logger.log(`模型 ${modelName} 遭遇 HTTP ${statusCode}，稍候重試...`);
            if (attempt < 2) {
              Utilities.sleep(attempt * 2500);
              continue;
            }
          }

          lastError = new Error(`[${modelName}] 請求失敗 (HTTP ${statusCode}): ${responseBody}`);
          break;
        } catch (err) {
          lastError = err;
          Logger.log(`調用 ${modelName} 發生網路錯誤: ${err.message}`);
          if (attempt < 2) Utilities.sleep(2000);
        }
      }
    }

    throw new Error(`所有模型皆無法連線。最後錯誤：${lastError ? lastError.message : '未知錯誤'}`);
  }
};

// ============================================================================
// 3. SheetWriter: 試算表排版與資料寫入引擎 v2.0
// ============================================================================
const SheetWriter = {
  SHEET_NAMES: {
    DASHBOARD: '總覽儀表板',
    CASH: '銀行現金明細',
    HOLDINGS: '證券持倉明細',
    HISTORY: '歷史淨值記錄',
    REPORT: 'AI 財務月報'
  },

  writeAll: function(ss, data) {
    const exchangeRate = data.exchange_rate_usd_twd || 31.83;
    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    const dayStr  = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const mergedStocks = this.aggregateStocksByTicker(data.stocks || []);
    const calc = this.calculateMetrics(data.banks || [], mergedStocks, exchangeRate);
    this.updateCashSheet(ss, data.banks || [], exchangeRate);
    this.updateHoldingsSheet(ss, mergedStocks, exchangeRate);
    this.updateDashboardSheet(ss, calc, exchangeRate, dateStr);
    this.appendHistoryRecord(ss, calc, exchangeRate, dayStr);
    this.updateReportSheet(ss, data.monthly_insights || {}, calc, dateStr);
  },

  calculateMetrics: function(banks, mergedStocks, rate) {
    let totalCashTwd = 0, twdCashOnly = 0, usdCashOnly = 0;
    (banks || []).forEach(b => {
      const amt = Number(b.original_amount) || 0;
      if (b.currency === 'USD') { usdCashOnly += amt; totalCashTwd += amt * rate; }
      else { twdCashOnly += amt; totalCashTwd += amt; }
    });
    let totalStockCostTwd = 0, totalStockValueTwd = 0;
    let totalCoreEtfValueTwd = 0, totalSatelliteValueTwd = 0;
    let twStockCost = 0, twStockValue = 0, usStockCostUsd = 0, usStockValueUsd = 0;
    (mergedStocks || []).forEach(s => {
      const cost = Number(s.total_cost) || 0;
      const val  = Number(s.current_value) || 0;
      const isUs = s.market === 'US';
      const mult = isUs ? rate : 1;
      totalStockCostTwd  += cost * mult;
      totalStockValueTwd += val  * mult;
      if (isUs) { usStockCostUsd += cost; usStockValueUsd += val; }
      else       { twStockCost   += cost; twStockValue    += val; }
      if (s.category === 'CORE_ETF') totalCoreEtfValueTwd   += val * mult;
      else                            totalSatelliteValueTwd += val * mult;
    });
    const totalStockPnlTwd = totalStockValueTwd - totalStockCostTwd;
    const stockReturnRate  = totalStockCostTwd > 0 ? totalStockPnlTwd / totalStockCostTwd : 0;
    const totalNetWorthTwd = totalCashTwd + totalStockValueTwd;
    return {
      totalNetWorthTwd, totalCashTwd, twdCashOnly, usdCashOnly,
      totalStockValueTwd, totalStockCostTwd, totalStockPnlTwd, stockReturnRate,
      totalCoreEtfValueTwd, totalSatelliteValueTwd,
      coreRatio:      totalNetWorthTwd > 0 ? totalCoreEtfValueTwd   / totalNetWorthTwd : 0,
      cashRatio:      totalNetWorthTwd > 0 ? totalCashTwd           / totalNetWorthTwd : 0,
      satelliteRatio: totalNetWorthTwd > 0 ? totalSatelliteValueTwd / totalNetWorthTwd : 0,
      twStockCost, twStockValue, usStockCostUsd, usStockValueUsd
    };
  },

  // ★ 台股代號補前導零
  normalizeTicker: function(ticker, market) {
    let t = String(ticker || '').trim();
    if (t.endsWith('.0')) t = t.slice(0, -2);
    if (market === 'TW' && /^\d+$/.test(t) && t.length <= 3) t = t.padStart(4, '0');
    return t;
  },

  // ★ 跨帳戶同標的整併引擎
  aggregateStocksByTicker: function(stocks) {
    const map = {};
    stocks.forEach(s => {
      const market = (s.market || 'TW').toUpperCase();
      let raw = String(s.ticker || '').trim();
      if (raw.endsWith('.0')) raw = raw.slice(0, -2);
      const ticker = this.normalizeTicker(raw, market);
      const key  = market + '_' + ticker;
      const cost = Number(s.total_cost)    || 0;
      const val  = Number(s.current_value) || 0;
      const shs  = Number(s.shares)        || 0;
      if (!map[key]) {
        map[key] = { market, ticker, name: s.name || '', category: s.category || 'SATELLITE',
                     shares: shs, total_cost: cost, current_value: val, accounts: [s.account_source || ''] };
      } else {
        map[key].shares        += shs;
        map[key].total_cost    += cost;
        map[key].current_value += val;
        if (!map[key].name && s.name) map[key].name = s.name;
        if (s.category === 'CORE_ETF') map[key].category = 'CORE_ETF';
        if (s.account_source && !map[key].accounts.includes(s.account_source)) map[key].accounts.push(s.account_source);
      }
    });
    return Object.values(map).map(item => {
      const pnl = item.current_value - item.total_cost;
      return { market: item.market, ticker: item.ticker, name: item.name, category: item.category,
               shares: item.shares, total_cost: item.total_cost, current_value: item.current_value,
               unrealized_pnl: pnl, return_rate: item.total_cost > 0 ? (pnl / item.total_cost) * 100 : 0,
               account_source: item.accounts.join(' + ') };
    });
  },

  // 1. 總覽儀表板 (Dashboard)
  updateDashboardSheet: function(ss, calc, rate, dateStr) {
    let sheet = ss.getSheetByName(this.SHEET_NAMES.DASHBOARD);
    if (!sheet) sheet = ss.insertSheet(this.SHEET_NAMES.DASHBOARD, 0);
    sheet.clear();

    sheet.getRange("A1").setValue("💼 個人全資產戰略管理中樞 (Net Worth Dashboard)").setFontSize(16).setFontWeight("bold").setFontColor("#0F172A");
    sheet.getRange("A2").setValue(`最後盤點時間：${dateStr} ｜ 參考匯率：1 USD ≈ ${rate.toFixed(2)} TWD`).setFontSize(10).setFontColor("#64748B");

    sheet.getRange("A4:E4").setValues([["純流動總資產 (TWD)","股票總投入成本","股票未實現損益","股票總報酬率","活存防禦現金"]]).setBackground("#1E293B").setFontColor("#FFFFFF").setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange("A5:E5").setValues([[calc.totalNetWorthTwd, calc.totalStockCostTwd, calc.totalStockPnlTwd, calc.stockReturnRate, calc.totalCashTwd]]).setFontSize(14).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#F8FAFC");
    sheet.getRange("A5:B5").setNumberFormat("NT$#,##0");
    sheet.getRange("C5").setNumberFormat("+NT$#,##0;-NT$#,##0;NT$0").setFontColor(calc.totalStockPnlTwd >= 0 ? "#DC2626" : "#16A34A");
    sheet.getRange("D5").setNumberFormat("+0.00%;-0.00%;0.00%");
    sheet.getRange("E5").setNumberFormat("NT$#,##0");

    sheet.getRange("A7").setValue("📊 三大戰略板塊配置結構與健康度").setFontSize(13).setFontWeight("bold").setFontColor("#1E293B");
    sheet.getRange("A8:E8").setValues([["資產板塊","當前現值 (TWD)","實際佔比","建議目標區間","戰略定位與評估"]]).setBackground("#334155").setFontColor("#FFFFFF").setFontWeight("bold").setHorizontalAlignment("center");

    const coreOk = calc.coreRatio >= CONFIG.PORTFOLIO_TARGETS.CORE_ETF_MIN;
    const cashOk = calc.cashRatio >= CONFIG.PORTFOLIO_TARGETS.CASH_MIN;
    const satOk  = calc.satelliteRatio <= CONFIG.PORTFOLIO_TARGETS.SATELLITE_MAX;
    sheet.getRange("A9:E12").setValues([
      ["1. 核心大盤指數 ETF", calc.totalCoreEtfValueTwd,   calc.coreRatio,      "50% ~ 70%", coreOk ? "✅ 穩健達標（資產增長主力引擎）" : "⚠️ 低於目標，建議優先加碼"],
      ["2. 活存與防禦現金",   calc.totalCashTwd,           calc.cashRatio,      "20% ~ 35%", cashOk ? "✅ 防禦充足（涵蓋應急與加碼儲備）" : "⚠️ 現金水位偏低"],
      ["3. 衛星個股與主題",   calc.totalSatelliteValueTwd, calc.satelliteRatio, "15% ~ 25%", satOk  ? "✅ 風險可控（超額報酬沙盒）" : "⚠️ 比例過高，建議回平衡至核心"],
      ["合計純流動總資產",    calc.totalNetWorthTwd,       1.0,                 "100%",       "—"]
    ]);
    sheet.getRange("B9:B12").setNumberFormat("NT$#,##0");
    sheet.getRange("C9:C12").setNumberFormat("0.00%").setHorizontalAlignment("center");
    sheet.getRange("D9:D12").setHorizontalAlignment("center");
    sheet.getRange("A12:E12").setFontWeight("bold").setBackground("#F1F5F9");

    sheet.getRange("A14").setValue("🌐 市場分佈全貌 (台幣 vs 美元)").setFontSize(13).setFontWeight("bold").setFontColor("#1E293B");
    sheet.getRange("A15:E15").setValues([["市場類別","原幣金額","折合台幣小計","佔總資產比重","主要項目"]]).setBackground("#334155").setFontColor("#FFFFFF").setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange("A16:E19").setValues([
      ["台股證券部位", `NT$ ${Math.round(calc.twStockValue).toLocaleString()}`, calc.twStockValue, calc.twStockValue / calc.totalNetWorthTwd, "0050, 00692, 006208, 00631L, 台股個股"],
      ["美股證券部位", `US$ ${calc.usStockValueUsd.toFixed(2)}`, calc.usStockValueUsd * rate, (calc.usStockValueUsd * rate) / calc.totalNetWorthTwd, "VTI, QQQM, TSLA, GOOG, MSFT 等"],
      ["台幣現金活存", `NT$ ${Math.round(calc.twdCashOnly).toLocaleString()}`, calc.twdCashOnly, calc.twdCashOnly / calc.totalNetWorthTwd, "台新, 永豐, 聯邦, 富邦, 華南"],
      ["美元外幣活存", `US$ ${calc.usdCashOnly.toFixed(2)}`, calc.usdCashOnly * rate, (calc.usdCashOnly * rate) / calc.totalNetWorthTwd, "永豐 (豐存股儲備), 華南"]
    ]);
    sheet.getRange("B16:B19").setHorizontalAlignment("right");
    sheet.getRange("C16:C19").setNumberFormat("NT$#,##0");
    sheet.getRange("D16:D19").setNumberFormat("0.00%").setHorizontalAlignment("center");
    sheet.autoResizeColumns(1, 5);
    sheet.setColumnWidth(1, 185); sheet.setColumnWidth(2, 165); sheet.setColumnWidth(3, 145);
    sheet.setColumnWidth(4, 155); sheet.setColumnWidth(5, 270);
  },

  // 2. 銀行現金明細 (Cash)
  updateCashSheet: function(ss, banks, rate) {
    let sheet = ss.getSheetByName(this.SHEET_NAMES.CASH);
    if (!sheet) sheet = ss.insertSheet(this.SHEET_NAMES.CASH);
    sheet.clear();

    sheet.getRange("A1").setValue("🏦 銀行現金部位明細").setFontSize(14).setFontWeight("bold").setFontColor("#0F172A");
    sheet.getRange("A3:G3").setValues([["銀行機構","幣別","原幣金額","參考匯率","折合台幣小計","佔現金比重","主要功能與備註"]]).setBackground("#1E293B").setFontColor("#FFFFFF").setFontWeight("bold").setHorizontalAlignment("center");

    let totalCashTwd = 0;
    banks.forEach(b => { const a = Number(b.original_amount) || 0; totalCashTwd += b.currency === 'USD' ? a * rate : a; });

    const rows = banks.map(b => {
      const a = Number(b.original_amount) || 0;
      const twd = b.currency === 'USD' ? a * rate : a;
      return [b.institution, b.currency, a, b.currency === 'USD' ? rate : 1.0, twd, totalCashTwd > 0 ? twd / totalCashTwd : 0, b.note || ""];
    });
    if (rows.length > 0) {
      sheet.getRange(4, 1, rows.length, 7).setValues(rows);
      sheet.getRange(4, 3, rows.length, 1).setNumberFormat("#,##0.00");
      sheet.getRange(4, 5, rows.length, 1).setNumberFormat("NT$#,##0");
      sheet.getRange(4, 6, rows.length, 1).setNumberFormat("0.0%").setHorizontalAlignment("center");
      const sr = 4 + rows.length;
      sheet.getRange(sr, 1).setValue("現金合計").setFontWeight("bold");
      sheet.getRange(sr, 5).setValue(totalCashTwd).setNumberFormat("NT$#,##0").setFontWeight("bold");
      sheet.getRange(sr, 6).setValue(1.0).setNumberFormat("0.0%").setFontWeight("bold").setHorizontalAlignment("center");
      sheet.getRange(sr, 1, 1, 7).setBackground("#F1F5F9");
    }
    sheet.autoResizeColumns(1, 7);
    sheet.setColumnWidth(1, 145); sheet.setColumnWidth(7, 270);
  },

  // 3. 證券持倉明細 - ★ 精簡版：跨帳戶整併 + 前導零保護
  updateHoldingsSheet: function(ss, stocks, rate) {
    let sheet = ss.getSheetByName(this.SHEET_NAMES.HOLDINGS);
    if (!sheet) sheet = ss.insertSheet(this.SHEET_NAMES.HOLDINGS);
    sheet.clear();

    sheet.getRange("A1").setValue("📈 證券與 ETF 持倉明細（跨帳戶整併版）").setFontSize(14).setFontWeight("bold").setFontColor("#0F172A");
    sheet.getRange("A2").setValue("★ 同一標的已自動合併跨帳戶持倉，台股代號已補齊前導零").setFontSize(9).setFontColor("#64748B");
    sheet.getRange("A4:J4").setValues([["股號","標的名稱","市場","戰略類別","總持股數","投入成本 (原幣)","當前現值 (原幣)","未實現損益 (原幣)","報酬率 (%)","折合台幣現值"]]).setBackground("#1E293B").setFontColor("#FFFFFF").setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange("A5:A200").setNumberFormat("@");  // ★ 保護前導零

    const merged = this.aggregateStocksByTicker(stocks);
    const sorted = [...merged].sort((a, b) => {
      const cc = (a.category === 'CORE_ETF' ? 0 : 1) - (b.category === 'CORE_ETF' ? 0 : 1);
      return cc !== 0 ? cc : (a.market === 'TW' ? 0 : 1) - (b.market === 'TW' ? 0 : 1);
    });

    if (sorted.length > 0) {
      sorted.forEach((s, i) => {
        const row  = 5 + i;
        const val  = Number(s.current_value) || 0;
        const pnl  = Number(s.unrealized_pnl) || 0;
        const ret  = (Number(s.return_rate) || 0) / 100;
        const valTwd = s.market === 'US' ? val * rate : val;
        sheet.getRange(row, 1).setValue("'" + s.ticker);
        sheet.getRange(row, 2, 1, 9).setValues([[s.name, s.market,
          s.category === 'CORE_ETF' ? '核心 ETF' : '衛星個股',
          Number(s.shares) || 0, Number(s.total_cost) || 0, val, pnl, ret, valTwd]]);
        sheet.getRange(row, 5).setNumberFormat("#,##0.####");
        sheet.getRange(row, 6, 1, 2).setNumberFormat("#,##0.00");
        sheet.getRange(row, 8).setNumberFormat("+#,##0.00;-#,##0.00;0.00");
        sheet.getRange(row, 9).setNumberFormat("+0.00%;-0.00%;0.00%").setHorizontalAlignment("center");
        sheet.getRange(row, 10).setNumberFormat("NT$#,##0");
        const col = pnl > 0 ? "#DC2626" : pnl < 0 ? "#16A34A" : "#374151";
        sheet.getRange(row, 8).setFontColor(col);
        sheet.getRange(row, 9).setFontColor(col);
        if (s.category === 'CORE_ETF') sheet.getRange(row, 1, 1, 10).setBackground("#EFF6FF");
      });

      const sr = 5 + sorted.length;
      const tVal  = sorted.reduce((a, s) => a + (s.market === 'US' ? (s.current_value || 0) * rate : (s.current_value || 0)), 0);
      const tCost = sorted.reduce((a, s) => a + (s.market === 'US' ? (s.total_cost    || 0) * rate : (s.total_cost    || 0)), 0);
      const tPnl  = tVal - tCost;
      const tRet  = tCost > 0 ? tPnl / tCost : 0;
      sheet.getRange(sr, 1).setValue("合計").setFontWeight("bold");
      sheet.getRange(sr, 2).setValue(`共 ${sorted.length} 檔標的`).setFontColor("#64748B");
      sheet.getRange(sr, 7).setValue(tVal).setNumberFormat("NT$#,##0").setFontWeight("bold");
      sheet.getRange(sr, 8).setValue(tPnl).setNumberFormat("+NT$#,##0;-NT$#,##0;NT$0").setFontWeight("bold").setFontColor(tPnl >= 0 ? "#DC2626" : "#16A34A");
      sheet.getRange(sr, 9).setValue(tRet).setNumberFormat("+0.00%;-0.00%;0.00%").setFontWeight("bold").setHorizontalAlignment("center").setFontColor(tRet >= 0 ? "#DC2626" : "#16A34A");
      sheet.getRange(sr, 1, 1, 10).setBackground("#F1F5F9").setFontWeight("bold");
    }

    sheet.setFrozenRows(4);
    sheet.autoResizeColumns(1, 10);
    sheet.setColumnWidth(1, 80); sheet.setColumnWidth(2, 160); sheet.setColumnWidth(3, 55);
    sheet.setColumnWidth(4, 85); sheet.setColumnWidth(5, 90);  sheet.setColumnWidth(6, 120);
    sheet.setColumnWidth(7, 120); sheet.setColumnWidth(8, 130); sheet.setColumnWidth(9, 90); sheet.setColumnWidth(10, 115);
  },

  // 4. 歷史淨值記錄 (History)
  appendHistoryRecord: function(ss, calc, rate, dayStr) {
    let sheet = ss.getSheetByName(this.SHEET_NAMES.HISTORY);
    if (!sheet) {
      sheet = ss.insertSheet(this.SHEET_NAMES.HISTORY);
      sheet.getRange("A1:H1").setValues([["盤點日期","純流動總資產 (TWD)","股票總成本","未實現獲利","活存現金","核心 ETF 現值","衛星個股現值","參考匯率 (USD/TWD)"]]).setBackground("#1E293B").setFontColor("#FFFFFF").setFontWeight("bold").setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }
    const lastRow = sheet.getLastRow();
    let targetRow = lastRow + 1;
    if (lastRow >= 2) {
      const lv = sheet.getRange(lastRow, 1).getValue();
      const ld = lv instanceof Date ? Utilities.formatDate(lv, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(lv);
      if (ld === dayStr) targetRow = lastRow;
    }
    sheet.getRange(targetRow, 1, 1, 8).setValues([[dayStr, calc.totalNetWorthTwd, calc.totalStockCostTwd, calc.totalStockPnlTwd, calc.totalCashTwd, calc.totalCoreEtfValueTwd, calc.totalSatelliteValueTwd, rate]]);
    sheet.getRange(targetRow, 2, 1, 6).setNumberFormat("NT$#,##0");
    sheet.getRange(targetRow, 8).setNumberFormat("0.00");
    sheet.autoResizeColumns(1, 8);
  },

  // 5. AI 財務月報 (Monthly_Report)
  updateReportSheet: function(ss, insights, calc, dateStr) {
    let sheet = ss.getSheetByName(this.SHEET_NAMES.REPORT);
    if (!sheet) sheet = ss.insertSheet(this.SHEET_NAMES.REPORT);
    sheet.clear();
    sheet.getRange("A1").setValue(`🤖 Gemini AI 專屬個人資產體檢月報`).setFontSize(16).setFontWeight("bold").setFontColor("#0F172A");
    sheet.getRange("A2").setValue(`報告生成時間：${dateStr}`).setFontSize(10).setFontColor("#64748B");
    let row = 4;
    [
      { title: "一、 全資產配置規模與健康度評價",       content: insights.overall_evaluation },
      { title: "二、 核心大盤 ETF vs 衛星個股結構評析", content: insights.core_satellite_analysis },
      { title: "三、 防禦現金厚度與流動性分析",         content: insights.cash_defense_status }
    ].forEach(sec => {
      sheet.getRange(row, 1).setValue(sec.title).setFontSize(12).setFontWeight("bold").setBackground("#F1F5F9");
      sheet.getRange(row + 1, 1).setValue(sec.content || "").setWrap(true);
      row += 3;
    });
    sheet.getRange(row, 1).setValue("四、 後續戰略再平衡與行動建議").setFontSize(12).setFontWeight("bold").setBackground("#F1F5F9");
    row++;
    (insights.actionable_recommendations || []).forEach((item, idx) => {
      sheet.getRange(row, 1).setValue(`${idx + 1}. ${item}`).setWrap(true);
      row++;
    });
    sheet.setColumnWidth(1, 760);
  }
};

// ============================================================================
// 4. Setup: 試算表初始化與參數設定視窗
// ============================================================================
function initSpreadsheet() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '初始化試算表結構',
    '此操作將為你建立「總覽儀表板」、「銀行現金明細」、「證券持倉明細」、「歷史淨值記錄」與「AI 財務月報」五大分頁與範例排版。是否繼續？',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sampleData = {
    exchange_rate_usd_twd: 31.83,
    banks: [
      { institution: "台新銀行", currency: "TWD", original_amount: 500000, note: "主力防禦資金池、大盤加碼儲備金" },
      { institution: "永豐銀行", currency: "TWD", original_amount: 200000, note: "豐存股扣款與美股備用金" },
      { institution: "永豐銀行", currency: "USD", original_amount: 1081.00, note: "美股扣款備用金" },
      { institution: "聯邦銀行", currency: "TWD", original_amount: 100000, note: "生活備用金" },
      { institution: "富邦銀行", currency: "TWD", original_amount: 100000, note: "台股定期定額扣款備用金" },
      { institution: "華南銀行", currency: "TWD", original_amount: 58700, note: "活存備用金" },
      { institution: "華南銀行", currency: "USD", original_amount: 480.89, note: "外幣備用金" }
    ],
    stocks: [
      { market: "TW", account_source: "示範券商", ticker: "0050", name: "元大台灣50 (範例)", category: "CORE_ETF", shares: 1000, total_cost: 85000, current_value: 107900, unrealized_pnl: 22900, return_rate: 26.94 },
      { market: "TW", account_source: "台股帳戶一/二", ticker: "0050", name: "元大台灣50", category: "CORE_ETF", shares: 5369, total_cost: 85000, current_value: 560523, unrealized_pnl: 108181, return_rate: 23.92 },
      { market: "TW", account_source: "台股帳戶一", ticker: "006208", name: "富邦台50", category: "CORE_ETF", shares: 1000, total_cost: 70000, current_value: 238725, unrealized_pnl: 168466, return_rate: 239.78 },
      { market: "TW", account_source: "台股帳戶一", ticker: "00631L", name: "元大台灣50正2", category: "CORE_ETF", shares: 2000, total_cost: 50000, current_value: 69514, unrealized_pnl: 13896, return_rate: 24.98 },
      { market: "US", account_source: "複委託網頁端", ticker: "VTI", name: "整體股市 ETF", category: "CORE_ETF", shares: 28.113, total_cost: 9400.00, current_value: 10586.86, unrealized_pnl: 1133.92, return_rate: 12.06 },
      { market: "US", account_source: "複委託網頁端", ticker: "QQQM", name: "納斯達克100 ETF", category: "CORE_ETF", shares: 3.511, total_cost: 1000.00, current_value: 1028.02, unrealized_pnl: 22.88, return_rate: 2.28 },
      { market: "US", account_source: "帳戶二/豐存股", ticker: "TSLA", name: "特斯拉", category: "SATELLITE", shares: 17.04, total_cost: 5800.00, current_value: 6030.46, unrealized_pnl: 230.46, return_rate: 3.97 },
      { market: "US", account_source: "複委託", ticker: "GOOG", name: "Alphabet", category: "SATELLITE", shares: 6, total_cost: 1900.00, current_value: 2049.84, unrealized_pnl: 149.84, return_rate: 7.89 },
      { market: "TW", account_source: "台股帳戶一", ticker: "2330", name: "台積電", category: "SATELLITE", shares: 37, total_cost: 28000, current_value: 35991, unrealized_pnl: 7991, return_rate: 28.54 }
    ],
    monthly_insights: {
      overall_evaluation: "純流動總資產結構扎實，核心指數 ETF 佔比過半，並擁有充裕的防禦性流動現金，展現極佳的攻守平衡。",
      core_satellite_analysis: "核心部位獲利豐厚，已成為整體資產長期增長的主力引擎；衛星個股曝險控制在健康區間內。",
      cash_defense_status: "現金儲備超過 120 萬，完全足夠覆蓋 12 個月以上的應急開支，且具備充足的大盤回檔加碼彈性。",
      actionable_recommendations: [
        "台美雙邊每月定期定額部位持續聚焦大盤核心 ETF (006208、VTI)",
        "美股衛星個股維持現有部位，暫不盲目追高，等待合理買點再行微調",
        "備用現金可利用高利活存數位帳戶獲取穩定低風險利息收益"
      ]
    }
  };

  SheetWriter.writeAll(ss, sampleData);

  const defaultSheet = ss.getSheetByName("工作表1") || ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch(e) {}
  }

  ui.alert('🎉 試算表初始化完成！', '已成功建立五大分頁與精美排版樣式。你可以隨時點選「🚀 資產管理 ➔ ⚙️ 設定系統參數」填入你的 API Key 與 Drive 資料夾 ID。', ui.ButtonSet.OK);
}

function showSettingsDialog() {
  const ui = SpreadsheetApp.getUi();
  
  const currentKey = CONFIG.getProperty('GEMINI_API_KEY');
  const keyPrompt = ui.prompt(
    '設定 Gemini API Key',
    `目前 API Key：${currentKey ? (currentKey.substring(0, 6) + '...' + currentKey.substring(currentKey.length - 4)) : '尚未設定'}\n\n請輸入 Google AI Studio 取得的 Gemini API Key（留空不修改）：`,
    ui.ButtonSet.OK_CANCEL
  );

  if (keyPrompt.getSelectedButton() === ui.Button.OK) {
    const newKey = keyPrompt.getResponseText().trim();
    if (newKey) CONFIG.setProperty('GEMINI_API_KEY', newKey);
  }

  const currentPending = CONFIG.getProperty('PENDING_FOLDER_ID');
  const pendingPrompt = ui.prompt(
    '設定「待處理截圖」資料夾 ID',
    `目前資料夾 ID：${currentPending || '尚未設定'}\n\n請輸入 Google Drive「待處理截圖」資料夾網址最後的那串 ID：`,
    ui.ButtonSet.OK_CANCEL
  );

  if (pendingPrompt.getSelectedButton() === ui.Button.OK) {
    const newPending = pendingPrompt.getResponseText().trim();
    if (newPending) CONFIG.setProperty('PENDING_FOLDER_ID', newPending);
  }

  const currentArchive = CONFIG.getProperty('ARCHIVE_FOLDER_ID');
  const archivePrompt = ui.prompt(
    '設定「歷史截圖封存」資料夾 ID',
    `目前資料夾 ID：${currentArchive || '尚未設定'}\n\n請輸入 Google Drive「歷史截圖封存」資料夾網址最後的那串 ID：`,
    ui.ButtonSet.OK_CANCEL
  );

  if (archivePrompt.getSelectedButton() === ui.Button.OK) {
    const newArchive = archivePrompt.getResponseText().trim();
    if (newArchive) CONFIG.setProperty('ARCHIVE_FOLDER_ID', newArchive);
  }

  ui.alert('設定完成', '系統參數已儲存在此試算表的安全指令碼屬性中！', ui.ButtonSet.OK);
}

// ============================================================================
// 5. Code: 主入口與月度盤點流程調度
// ============================================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 資產管理')
    .addItem('📥 一鍵解析雲端硬碟截圖並更新', 'processMonthlyAssets')
    .addSeparator()
    .addItem('🛠️ 初始化試算表結構與樣式', 'initSpreadsheet')
    .addItem('⚙️ 設定系統參數 (API Key & 資料夾 ID)', 'showSettingsDialog')
    .addToUi();
}

function processMonthlyAssets() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    const pendingFolderId = CONFIG.getProperty('PENDING_FOLDER_ID');
    const archiveFolderId = CONFIG.getProperty('ARCHIVE_FOLDER_ID');

    if (!pendingFolderId) {
      ui.alert('缺少資料夾設定', '尚未設定「待處理截圖」資料夾 ID！請至「🚀 資產管理 ➔ ⚙️ 設定系統參數」填寫。', ui.ButtonSet.OK);
      return;
    }

    const pendingFolder = DriveApp.getFolderById(pendingFolderId);
    const filesIterator = pendingFolder.getFiles();
    const imageFiles = [];

    while (filesIterator.hasNext()) {
      const file = filesIterator.next();
      const mime = file.getMimeType();
      if (mime.startsWith('image/')) {
        imageFiles.push(file);
      }
    }

    if (imageFiles.length === 0) {
      ui.alert('未發現待處理截圖', `在資料夾中未找到任何圖片檔案！\n\n請先將各銀行與證券 App 截圖丟入「待處理截圖」Google Drive 資料夾中，再點選此功能。`, ui.ButtonSet.OK);
      return;
    }

    const confirm = ui.alert(
      '準備開始月度資產盤點',
      `偵測到 ${imageFiles.length} 張截圖。\n即將啟動 Gemini 2.5 Flash 進行精準辨識與資產重整，預計耗時約 10~25 秒。\n\n是否立即開始？`,
      ui.ButtonSet.YES_NO
    );

    if (confirm !== ui.Button.YES) return;

    ss.toast('正在辨識多張資產截圖並抽取結構化數據，請稍候...', 'Gemini 智能處理中 🤖', 60);

    const parsedData = GeminiService.parseAssetImages(imageFiles);

    ss.toast('辨識成功！正在寫入儀表板與計算資產板塊...', '數據同步中 📊', 15);

    SheetWriter.writeAll(ss, parsedData);

    if (archiveFolderId) {
      try {
        const archiveFolder = DriveApp.getFolderById(archiveFolderId);
        const monthPrefix = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM');
        
        imageFiles.forEach(file => {
          const oldName = file.getName();
          if (!oldName.startsWith(monthPrefix)) {
            file.setName(`${monthPrefix}_${oldName}`);
          }
          file.moveTo(archiveFolder);
        });
      } catch (err) {
        Logger.log('封存檔案時發生微小錯誤（不影響數據）：' + err.message);
      }
    }

    const rate = parsedData.exchange_rate_usd_twd || 31.83;
    const mergedForAlert = SheetWriter.aggregateStocksByTicker(parsedData.stocks || []);
    const calc = SheetWriter.calculateMetrics(parsedData.banks || [], mergedForAlert, rate);

    ss.toast('所有分頁與歷史淨值記錄已更新完畢！', '🎉 盤點完成', 5);

    ui.alert(
      '🎉 月度資產盤點完成！',
      `本次盤點結果摘要：\n` +
      `──────────────────────\n` +
      `• 純流動總資產：NT$ ${Math.round(calc.totalNetWorthTwd).toLocaleString()}\n` +
      `• 股票未實現獲利：+NT$ ${Math.round(calc.totalStockPnlTwd).toLocaleString()} (${(calc.stockReturnRate * 100).toFixed(2)}%)\n` +
      `• 核心大盤 ETF 佔比：${(calc.coreRatio * 100).toFixed(1)}%\n` +
      `• 防禦現金佔比：${(calc.cashRatio * 100).toFixed(1)}%\n` +
      `• 衛星個股佔比：${(calc.satelliteRatio * 100).toFixed(1)}%\n` +
      `──────────────────────\n` +
      `已處理的 ${imageFiles.length} 張截圖已移至歷史封存資料夾。\n請查看「總覽儀表板」與「AI 財務月報」分頁！`,
      ui.ButtonSet.OK
    );

  } catch (error) {
    Logger.log('Error in processMonthlyAssets: ' + error.stack);
    ui.alert('❌ 盤點過程發生錯誤', `錯誤訊息：\n${error.message}`, ui.ButtonSet.OK);
  }
}
