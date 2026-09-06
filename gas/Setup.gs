/**
 * Setup.gs - 示範結構 (展示用途，非真實個資)
 */
function initSpreadsheet() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('初始化示範結構', '即將建立範例分頁，是否繼續？', ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sampleData = {
    exchange_rate_usd_twd: 31.70,
    banks: [
      { institution: "主要高利數位帳戶 (範例)", currency: "TWD", original_amount: 500000, note: "生活調度範例" },
      { institution: "證券交割專用帳戶 (範例)", currency: "TWD", original_amount: 200000, note: "證券扣款範例" },
      { institution: "外幣美元活存帳戶 (範例)", currency: "USD", original_amount: 3000.0, note: "外幣備用金範例" }
    ],
    stocks: [
      { market: "TW", account_source: "示範券商", ticker: "0050", name: "元大台灣50 (範例)", category: "CORE_ETF", shares: 1000, total_cost: 85000, current_value: 107900, unrealized_pnl: 22900, return_rate: 26.94 },
      { market: "TW", account_source: "示範券商", ticker: "006208", name: "富邦台50 (範例)", category: "CORE_ETF", shares: 1000, total_cost: 70000, current_value: 247250, unrealized_pnl: 177250, return_rate: 253.21 },
      { market: "US", account_source: "示範券商", ticker: "VTI", name: "整體股市 ETF (範例)", category: "CORE_ETF", shares: 10, total_cost: 3200.0, current_value: 3797.3, unrealized_pnl: 597.3, return_rate: 18.67 }
    ],
    monthly_insights: {
      overall_evaluation: "範例資產配置健康，攻守兼備。",
      core_satellite_analysis: "核心被動投資持續發揮長期穩健增長作用。",
      cash_defense_status: "流動性充沛。",
      actionable_recommendations: [
        "持續定期定額大盤核心 ETF",
        "保持充足現金防禦部位"
      ]
    }
  };

  SheetWriter.writeAll(ss, sampleData);
}
