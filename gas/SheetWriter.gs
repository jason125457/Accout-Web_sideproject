/**
 * ============================================================================
 * SheetWriter.gs - 試算表排版、格式化與資料寫入引擎 v2.0
 * ============================================================================
 * 更新內容：
 * - 新增 aggregateStocksByTicker(): 跨帳戶同標的自動整併加總
 * - 新增 normalizeTicker(): 台股代號前導零補齊 (50 -> 0050)
 * - 持倉明細欄位精簡為 8 欄純淨版
 * - 股號欄位強制設為純文字格式，避免前導零被吃掉
 */

const SheetWriter = {
  SHEET_NAMES: {
    DASHBOARD: '總覽儀表板',
    CASH: '銀行現金明細',
    HOLDINGS: '證券持倉明細',
    HISTORY: '歷史淨值記錄',
    REPORT: 'AI 財務月報'
  },

  /**
   * 台股代號正規化：補齊前導零
   * 規則：純數字、長度 < 6 碼時，補齊至 4 碼（如 50 -> 0050, 692 -> 00692）
   * @param {string|number} ticker 原始代號
   * @param {string} market 'TW' 或 'US'
   * @returns {string} 正規化後的代號字串
   */
  normalizeTicker: function(ticker, market, name) {
    if (!ticker) return String(ticker || '');
    let t = String(ticker).trim();
    // 移除 JS 浮點數尾巴（如 "50.0" -> "50"）
    if (t.endsWith('.0')) t = t.slice(0, -2);

    if ((market || '').toUpperCase() === 'US') return t.toUpperCase();
    if (t.startsWith('00')) return t.toUpperCase();

    const n = String(name || '').toLowerCase();
    if (t === '6208' || n.indexOf('富邦台50') !== -1 || n.indexOf('006208') !== -1) {
      return '006208';
    }

    const match = t.match(/^(\d+)([A-Za-z]?)$/);
    if (match) {
      const digits = match[1];
      const suffix = match[2].toUpperCase();
      // 3 碼台股數字皆為 5 碼 ETF（以 00 開頭，如 692 -> 00692, 878 -> 00878）
      if (digits.length === 3) {
        return '00' + digits + suffix;
      }
      // 1~2 碼補齊至 4 碼（如 50 -> 0050, 56 -> 0056）
      if (digits.length <= 2) {
        return '00' + digits.padStart(2, '0') + suffix;
      }
    }
    return t.toUpperCase();
  },

  /**
   * 跨帳戶同標的持倉整併引擎
   * 將來自不同帳戶（豐存股、複委託、一般帳戶）的同一股號自動加總
   * @param {Array} stocks Gemini 解析出的原始持股陣列
   * @returns {Array} 整併後的持倉陣列（每個股號唯一一筆）
   */
  aggregateStocksByTicker: function(stocks) {
    const map = {}; // key: market + '_' + normalizedTicker

    stocks.forEach(s => {
      const market = (s.market || 'TW').toUpperCase();
      const rawTicker = String(s.ticker || '').trim();
      // 去除浮點尾巴（如 "50.0" -> "50"）
      const cleanTicker = rawTicker.endsWith('.0') ? rawTicker.slice(0, -2) : rawTicker;
      const ticker = this.normalizeTicker(cleanTicker, market, s.name);
      const key = market + '_' + ticker;

      const cost   = Number(s.total_cost)      || 0;
      const val    = Number(s.current_value)    || 0;
      const shares = Number(s.shares)           || 0;

      if (!map[key]) {
        map[key] = {
          market:    market,
          ticker:    ticker,
          name:      s.name || '',
          category:  s.category || 'SATELLITE',
          shares:    shares,
          total_cost:     cost,
          current_value:  val,
          accounts:  [s.account_source || '']
        };
      } else {
        // 同標的：累加股數、成本、現值
        map[key].shares        += shares;
        map[key].total_cost    += cost;
        map[key].current_value += val;
        // 保留名稱（取第一個有意義的）
        if (!map[key].name && s.name) map[key].name = s.name;
        // 若 category 有任何一筆為 CORE_ETF 則整體標記為 CORE_ETF
        if (s.category === 'CORE_ETF') map[key].category = 'CORE_ETF';
        // 記錄跨哪些帳戶
        if (s.account_source && !map[key].accounts.includes(s.account_source)) {
          map[key].accounts.push(s.account_source);
        }
      }
    });

    // 計算整併後的損益與報酬率
    return Object.values(map).map(item => {
      const pnl = item.current_value - item.total_cost;
      const returnRate = item.total_cost > 0 ? (pnl / item.total_cost) * 100 : 0;
      return {
        market:         item.market,
        ticker:         item.ticker,
        name:           item.name,
        category:       item.category,
        shares:         item.shares,
        total_cost:     item.total_cost,
        current_value:  item.current_value,
        unrealized_pnl: pnl,
        return_rate:    returnRate,
        account_source: item.accounts.join(' + ')
      };
    });
  },

  /**
   * 寫入完整的資產數據到試算表中
   */
  writeAll: function(ss, data) {
    const exchangeRate = data.exchange_rate_usd_twd || 31.83;
    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    const dayStr  = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    // 整併持股（跨帳戶 + 前導零修復）
    const mergedStocks = this.aggregateStocksByTicker(data.stocks || []);

    const calc = this.calculateMetrics(data.banks || [], mergedStocks, exchangeRate);

    this.updateCashSheet(ss, data.banks || [], exchangeRate);
    this.updateHoldingsSheet(ss, mergedStocks, exchangeRate);
    this.updateDashboardSheet(ss, calc, exchangeRate, dateStr);
    this.appendHistoryRecord(ss, calc, exchangeRate, dayStr);
    this.updateReportSheet(ss, data.monthly_insights || {}, calc, dateStr);
  },

  /**
   * 核心資產數據加總計算（接受整併後的 mergedStocks）
   */
  calculateMetrics: function(banks, mergedStocks, rate) {
    let totalCashTwd = 0;
    let twdCashOnly  = 0;
    let usdCashOnly  = 0;

    (banks || []).forEach(b => {
      const amt = Number(b.original_amount) || 0;
      if (b.currency === 'USD') {
        usdCashOnly  += amt;
        totalCashTwd += amt * rate;
      } else {
        twdCashOnly  += amt;
        totalCashTwd += amt;
      }
    });

    let totalStockCostTwd      = 0;
    let totalStockValueTwd     = 0;
    let totalCoreEtfValueTwd   = 0;
    let totalSatelliteValueTwd = 0;
    let twStockCost = 0, twStockValue = 0;
    let usStockCostUsd = 0, usStockValueUsd = 0;

    (mergedStocks || []).forEach(s => {
      const cost   = Number(s.total_cost)     || 0;
      const val    = Number(s.current_value)  || 0;
      const isUs   = s.market === 'US';
      const mult   = isUs ? rate : 1;

      totalStockCostTwd  += cost * mult;
      totalStockValueTwd += val  * mult;

      if (isUs) { usStockCostUsd += cost; usStockValueUsd += val; }
      else       { twStockCost   += cost; twStockValue    += val; }

      if (s.category === 'CORE_ETF') totalCoreEtfValueTwd   += val * mult;
      else                            totalSatelliteValueTwd += val * mult;
    });

    const totalStockPnlTwd  = totalStockValueTwd - totalStockCostTwd;
    const stockReturnRate   = totalStockCostTwd > 0 ? totalStockPnlTwd / totalStockCostTwd : 0;
    const totalNetWorthTwd  = totalCashTwd + totalStockValueTwd;

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

  // ============================================================
  // 1. 總覽儀表板 (Dashboard)
  // ============================================================
  updateDashboardSheet: function(ss, calc, rate, dateStr) {
    let sheet = ss.getSheetByName(this.SHEET_NAMES.DASHBOARD);
    if (!sheet) sheet = ss.insertSheet(this.SHEET_NAMES.DASHBOARD, 0);
    sheet.clear();

    sheet.getRange("A1").setValue("💼 個人全資產戰略管理中樞 (Net Worth Dashboard)")
      .setFontSize(16).setFontWeight("bold").setFontColor("#0F172A");
    sheet.getRange("A2").setValue(`最後盤點時間：${dateStr} ｜ 參考匯率：1 USD ≈ ${rate.toFixed(2)} TWD`)
      .setFontSize(10).setFontColor("#64748B");

    // KPI 卡片
    const kpiHeaders = ["純流動總資產 (TWD)", "股票總投入成本", "股票未實現損益", "股票總報酬率", "活存防禦現金"];
    const kpiValues  = [calc.totalNetWorthTwd, calc.totalStockCostTwd, calc.totalStockPnlTwd, calc.stockReturnRate, calc.totalCashTwd];
    sheet.getRange("A4:E4").setValues([kpiHeaders])
      .setBackground("#1E293B").setFontColor("#FFFFFF").setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange("A5:E5").setValues([kpiValues])
      .setFontSize(14).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#F8FAFC");
    sheet.getRange("A5:B5").setNumberFormat("NT$#,##0");
    sheet.getRange("C5").setNumberFormat("+NT$#,##0;-NT$#,##0;NT$0")
      .setFontColor(calc.totalStockPnlTwd >= 0 ? "#DC2626" : "#16A34A");
    sheet.getRange("D5").setNumberFormat("+0.00%;-0.00%;0.00%");
    sheet.getRange("E5").setNumberFormat("NT$#,##0");

    // 三大戰略板塊
    sheet.getRange("A7").setValue("📊 三大戰略板塊配置結構與健康度")
      .setFontSize(13).setFontWeight("bold").setFontColor("#1E293B");
    sheet.getRange("A8:E8").setValues([["資產板塊", "當前現值 (TWD)", "實際佔比", "建議目標區間", "戰略定位與評估"]])
      .setBackground("#334155").setFontColor("#FFFFFF").setFontWeight("bold").setHorizontalAlignment("center");

    const coreStatus = calc.coreRatio >= CONFIG.PORTFOLIO_TARGETS.CORE_ETF_MIN
      ? "✅ 穩健達標（資產增長主力引擎）" : "⚠️ 低於目標，建議優先加碼";
    const cashStatus = calc.cashRatio >= CONFIG.PORTFOLIO_TARGETS.CASH_MIN
      ? "✅ 防禦充足（涵蓋應急與加碼儲備）" : "⚠️ 現金水位偏低";
    const satStatus  = calc.satelliteRatio <= CONFIG.PORTFOLIO_TARGETS.SATELLITE_MAX
      ? "✅ 風險可控（超額報酬沙盒）" : "⚠️ 比例過高，建議回平衡至核心";

    sheet.getRange("A9:E12").setValues([
      ["1. 核心大盤指數 ETF", calc.totalCoreEtfValueTwd,   calc.coreRatio,      "50% ~ 70%", coreStatus],
      ["2. 活存與防禦現金",   calc.totalCashTwd,           calc.cashRatio,      "20% ~ 35%", cashStatus],
      ["3. 衛星個股與主題",   calc.totalSatelliteValueTwd, calc.satelliteRatio, "15% ~ 25%", satStatus],
      ["合計純流動總資產",    calc.totalNetWorthTwd,       1.0,                 "100%",       "—"]
    ]);
    sheet.getRange("B9:B12").setNumberFormat("NT$#,##0");
    sheet.getRange("C9:C12").setNumberFormat("0.00%").setHorizontalAlignment("center");
    sheet.getRange("D9:D12").setHorizontalAlignment("center");
    sheet.getRange("A12:E12").setFontWeight("bold").setBackground("#F1F5F9");

    // 市場分佈
    sheet.getRange("A14").setValue("🌐 市場分佈全貌 (台幣 vs 美元)")
      .setFontSize(13).setFontWeight("bold").setFontColor("#1E293B");
    sheet.getRange("A15:E15").setValues([["市場類別", "原幣金額", "折合台幣小計", "佔總資產比重", "主要項目"]])
      .setBackground("#334155").setFontColor("#FFFFFF").setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange("A16:E19").setValues([
      ["台股證券部位", `NT$ ${Math.round(calc.twStockValue).toLocaleString()}`,    calc.twStockValue,            calc.twStockValue / calc.totalNetWorthTwd,            "0050, 00692, 006208, 00631L, 台股個股"],
      ["美股證券部位", `US$ ${calc.usStockValueUsd.toFixed(2)}`,                  calc.usStockValueUsd * rate,  (calc.usStockValueUsd * rate) / calc.totalNetWorthTwd, "VTI, QQQM, TSLA, GOOG, MSFT 等"],
      ["台幣現金活存", `NT$ ${Math.round(calc.twdCashOnly).toLocaleString()}`,    calc.twdCashOnly,             calc.twdCashOnly / calc.totalNetWorthTwd,             "台新, 永豐, 聯邦, 富邦, 華南"],
      ["美元外幣活存", `US$ ${calc.usdCashOnly.toFixed(2)}`,                      calc.usdCashOnly * rate,      (calc.usdCashOnly * rate) / calc.totalNetWorthTwd,    "永豐 (豐存股儲備), 華南"]
    ]);
    sheet.getRange("B16:B19").setHorizontalAlignment("right");
    sheet.getRange("C16:C19").setNumberFormat("NT$#,##0");
    sheet.getRange("D16:D19").setNumberFormat("0.00%").setHorizontalAlignment("center");

    sheet.autoResizeColumns(1, 5);
    sheet.setColumnWidth(1, 185);
    sheet.setColumnWidth(2, 165);
    sheet.setColumnWidth(3, 145);
    sheet.setColumnWidth(4, 155);
    sheet.setColumnWidth(5, 270);
  },

  // ============================================================
  // 2. 銀行現金明細 (Cash)
  // ============================================================
  updateCashSheet: function(ss, banks, rate) {
    let sheet = ss.getSheetByName(this.SHEET_NAMES.CASH);
    if (!sheet) sheet = ss.insertSheet(this.SHEET_NAMES.CASH);
    sheet.clear();

    sheet.getRange("A1").setValue("🏦 銀行現金部位明細")
      .setFontSize(14).setFontWeight("bold").setFontColor("#0F172A");
    sheet.getRange("A3:G3").setValues([["銀行機構", "幣別", "原幣金額", "參考匯率", "折合台幣小計", "佔現金比重", "主要功能與備註"]])
      .setBackground("#1E293B").setFontColor("#FFFFFF").setFontWeight("bold").setHorizontalAlignment("center");

    let totalCashTwd = 0;
    banks.forEach(b => {
      const amt = Number(b.original_amount) || 0;
      totalCashTwd += b.currency === 'USD' ? amt * rate : amt;
    });

    const rows = banks.map(b => {
      const amt    = Number(b.original_amount) || 0;
      const twdAmt = b.currency === 'USD' ? amt * rate : amt;
      return [b.institution, b.currency, amt, b.currency === 'USD' ? rate : 1.0, twdAmt,
              totalCashTwd > 0 ? twdAmt / totalCashTwd : 0, b.note || ""];
    });

    if (rows.length > 0) {
      sheet.getRange(4, 1, rows.length, 7).setValues(rows);
      sheet.getRange(4, 3, rows.length, 1).setNumberFormat("#,##0.00");
      sheet.getRange(4, 5, rows.length, 1).setNumberFormat("NT$#,##0");
      sheet.getRange(4, 6, rows.length, 1).setNumberFormat("0.0%").setHorizontalAlignment("center");
      const sumRow = 4 + rows.length;
      sheet.getRange(sumRow, 1).setValue("現金合計").setFontWeight("bold");
      sheet.getRange(sumRow, 5).setValue(totalCashTwd).setNumberFormat("NT$#,##0").setFontWeight("bold");
      sheet.getRange(sumRow, 6).setValue(1.0).setNumberFormat("0.0%").setFontWeight("bold").setHorizontalAlignment("center");
      sheet.getRange(sumRow, 1, 1, 7).setBackground("#F1F5F9");
    }
    sheet.autoResizeColumns(1, 7);
    sheet.setColumnWidth(1, 145);
    sheet.setColumnWidth(7, 270);
  },

  // ============================================================
  // 3. 證券持倉明細 (Holdings) - 精簡 8 欄版 + 股號純文字保護
  // ============================================================
  updateHoldingsSheet: function(ss, mergedStocks, rate) {
    let sheet = ss.getSheetByName(this.SHEET_NAMES.HOLDINGS);
    if (!sheet) sheet = ss.insertSheet(this.SHEET_NAMES.HOLDINGS);
    sheet.clear();

    sheet.getRange("A1").setValue("📈 證券與 ETF 持倉明細（跨帳戶整併版）")
      .setFontSize(14).setFontWeight("bold").setFontColor("#0F172A");
    sheet.getRange("A2").setValue("★ 同一標的已自動合併跨帳戶持倉，台股代號已補齊前導零")
      .setFontSize(9).setFontColor("#64748B");

    const HEADERS = ["股號", "標的名稱", "市場", "戰略類別", "總持股數", "投入成本 (原幣)", "當前現值 (原幣)", "未實現損益 (原幣)", "報酬率 (%)", "折合台幣現值"];
    sheet.getRange("A4:J4").setValues([HEADERS])
      .setBackground("#1E293B").setFontColor("#FFFFFF").setFontWeight("bold").setHorizontalAlignment("center");

    // ★ 核心：先把股號欄（A 欄）設為純文字格式，避免前導零被解析為數字
    sheet.getRange("A5:A200").setNumberFormat("@");

    // 分類排序：核心 ETF 優先，然後衛星，各自按市場（TW 先 US 後）
    const sorted = [...mergedStocks].sort((a, b) => {
      const catA = a.category === 'CORE_ETF' ? 0 : 1;
      const catB = b.category === 'CORE_ETF' ? 0 : 1;
      if (catA !== catB) return catA - catB;
      const mktA = a.market === 'TW' ? 0 : 1;
      const mktB = b.market === 'TW' ? 0 : 1;
      return mktA - mktB;
    });

    if (sorted.length > 0) {
      // 股號欄單獨以 setValues 字串方式寫入，其餘欄位合併寫入
      sorted.forEach((s, i) => {
        const row     = 5 + i;
        const isUs    = s.market === 'US';
        const val     = Number(s.current_value) || 0;
        const valTwd  = isUs ? val * rate : val;
        const pnl     = Number(s.unrealized_pnl) || 0;
        const retRate = (Number(s.return_rate) || 0) / 100;
        const catLabel = s.category === 'CORE_ETF' ? '核心 ETF' : '衛星個股';

        // ★ 股號欄：直接 setValue 字串（不能 setValues 批次，否則會被 Excel 數值化）
        sheet.getRange(row, 1).setValue("'" + s.ticker);  // 前綴 ' 強制文字

        // 其餘欄位批次寫入
        sheet.getRange(row, 2, 1, 9).setValues([[
          s.name, s.market, catLabel,
          Number(s.shares) || 0,
          Number(s.total_cost) || 0,
          val, pnl, retRate, valTwd
        ]]);

        // 格式設定
        sheet.getRange(row, 5).setNumberFormat("#,##0.####");           // 持股數
        sheet.getRange(row, 6, 1, 2).setNumberFormat("#,##0.00");       // 成本、現值
        sheet.getRange(row, 8).setNumberFormat("+#,##0.00;-#,##0.00;0.00"); // 損益
        sheet.getRange(row, 9).setNumberFormat("+0.00%;-0.00%;0.00%").setHorizontalAlignment("center"); // 報酬率
        sheet.getRange(row, 10).setNumberFormat("NT$#,##0");            // 折合台幣

        // 報酬率顏色（台股紅漲綠跌）
        const color = pnl > 0 ? "#DC2626" : pnl < 0 ? "#16A34A" : "#374151";
        sheet.getRange(row, 8).setFontColor(color);
        sheet.getRange(row, 9).setFontColor(color);

        // 核心 ETF 列背景底色淡藍，衛星白底
        if (s.category === 'CORE_ETF') {
          sheet.getRange(row, 1, 1, 10).setBackground("#EFF6FF");
        }
      });

      // 合計列
      const sumRow   = 5 + sorted.length;
      const totalCostTwd  = sorted.reduce((acc, s) => acc + (s.market === 'US' ? (s.total_cost || 0) * rate : (s.total_cost || 0)), 0);
      const totalValTwd   = sorted.reduce((acc, s) => acc + (s.market === 'US' ? (s.current_value || 0) * rate : (s.current_value || 0)), 0);
      const totalPnlTwd   = totalValTwd - totalCostTwd;
      const totalRetRate  = totalCostTwd > 0 ? totalPnlTwd / totalCostTwd : 0;

      sheet.getRange(sumRow, 1).setValue("合計").setFontWeight("bold");
      sheet.getRange(sumRow, 2).setValue(`共 ${sorted.length} 檔標的`).setFontColor("#64748B");
      sheet.getRange(sumRow, 7).setValue(totalValTwd).setNumberFormat("NT$#,##0").setFontWeight("bold");
      sheet.getRange(sumRow, 8).setValue(totalPnlTwd).setNumberFormat("+NT$#,##0;-NT$#,##0;NT$0").setFontWeight("bold")
        .setFontColor(totalPnlTwd >= 0 ? "#DC2626" : "#16A34A");
      sheet.getRange(sumRow, 9).setValue(totalRetRate).setNumberFormat("+0.00%;-0.00%;0.00%").setFontWeight("bold")
        .setHorizontalAlignment("center").setFontColor(totalRetRate >= 0 ? "#DC2626" : "#16A34A");
      sheet.getRange(sumRow, 1, 1, 10).setBackground("#F1F5F9").setFontWeight("bold");
    }

    sheet.setFrozenRows(4);
    sheet.autoResizeColumns(1, 10);
    sheet.setColumnWidth(1, 80);
    sheet.setColumnWidth(2, 160);
    sheet.setColumnWidth(3, 55);
    sheet.setColumnWidth(4, 85);
    sheet.setColumnWidth(5, 90);
    sheet.setColumnWidth(6, 120);
    sheet.setColumnWidth(7, 120);
    sheet.setColumnWidth(8, 130);
    sheet.setColumnWidth(9, 90);
    sheet.setColumnWidth(10, 115);
  },

  // ============================================================
  // 4. 歷史淨值記錄 (History)
  // ============================================================
  appendHistoryRecord: function(ss, calc, rate, dayStr) {
    let sheet = ss.getSheetByName(this.SHEET_NAMES.HISTORY);
    if (!sheet) {
      sheet = ss.insertSheet(this.SHEET_NAMES.HISTORY);
      sheet.getRange("A1:H1").setValues([["盤點日期", "純流動總資產 (TWD)", "股票總成本", "未實現獲利", "活存現金", "核心 ETF 現值", "衛星個股現值", "參考匯率 (USD/TWD)"]])
        .setBackground("#1E293B").setFontColor("#FFFFFF").setFontWeight("bold").setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }
    const lastRow = sheet.getLastRow();
    let targetRow = lastRow + 1;
    if (lastRow >= 2) {
      const lastDateVal = sheet.getRange(lastRow, 1).getValue();
      const lastDate = lastDateVal instanceof Date
        ? Utilities.formatDate(lastDateVal, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(lastDateVal);
      if (lastDate === dayStr) targetRow = lastRow;
    }
    sheet.getRange(targetRow, 1, 1, 8).setValues([[
      dayStr, calc.totalNetWorthTwd, calc.totalStockCostTwd, calc.totalStockPnlTwd,
      calc.totalCashTwd, calc.totalCoreEtfValueTwd, calc.totalSatelliteValueTwd, rate
    ]]);
    sheet.getRange(targetRow, 2, 1, 6).setNumberFormat("NT$#,##0");
    sheet.getRange(targetRow, 8).setNumberFormat("0.00");
    sheet.autoResizeColumns(1, 8);
  },

  // ============================================================
  // 5. AI 財務月報 (Monthly_Report)
  // ============================================================
  updateReportSheet: function(ss, insights, calc, dateStr) {
    let sheet = ss.getSheetByName(this.SHEET_NAMES.REPORT);
    if (!sheet) sheet = ss.insertSheet(this.SHEET_NAMES.REPORT);
    sheet.clear();

    sheet.getRange("A1").setValue("🤖 Gemini AI 專屬個人資產體檢月報")
      .setFontSize(16).setFontWeight("bold").setFontColor("#0F172A");
    sheet.getRange("A2").setValue(`報告生成時間：${dateStr}`)
      .setFontSize(10).setFontColor("#64748B");

    let row = 4;
    const sections = [
      { title: "一、 全資產配置規模與健康度評價",       content: insights.overall_evaluation },
      { title: "二、 核心大盤 ETF vs 衛星個股結構評析", content: insights.core_satellite_analysis },
      { title: "三、 防禦現金厚度與流動性分析",         content: insights.cash_defense_status }
    ];
    sections.forEach(sec => {
      sheet.getRange(row, 1).setValue(sec.title)
        .setFontSize(12).setFontWeight("bold").setBackground("#F1F5F9");
      sheet.getRange(row + 1, 1).setValue(sec.content || "").setWrap(true);
      row += 3;
    });

    sheet.getRange(row, 1).setValue("四、 後續戰略再平衡與行動建議")
      .setFontSize(12).setFontWeight("bold").setBackground("#F1F5F9");
    row++;
    if (insights.actionable_recommendations && insights.actionable_recommendations.length > 0) {
      insights.actionable_recommendations.forEach((item, idx) => {
        sheet.getRange(row, 1).setValue(`${idx + 1}. ${item}`).setWrap(true);
        row++;
      });
    }
    sheet.setColumnWidth(1, 760);
  }
};
