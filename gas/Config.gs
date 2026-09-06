/**
 * ============================================================================
 * Config.gs - 系統參數與設定管理
 * ============================================================================
 * 說明：
 * 提供 API Key、Google Drive 資料夾 ID 與資產配置目標比例的管理功能。
 * 敏感資訊（如 Gemini API Key）優先存放在 Google Apps Script 的「指令碼屬性 (Script Properties)」，
 * 避免 API Key 外洩。
 */

const CONFIG = {
  // 預設設定：若未在指令碼屬性中設定，會提示使用者輸入
  DEFAULT_PROPERTIES: {
    GEMINI_API_KEY: '',          // 請在試算表設定選單中輸入，或於指令碼屬性中設定
    PENDING_FOLDER_ID: '',       // 「待處理截圖」Google Drive 資料夾 ID
    ARCHIVE_FOLDER_ID: '',       // 「歷史截圖封存」Google Drive 資料夾 ID
  },

  // 投資組合戰略目標配置比例（用於儀表板健康度診斷）
  PORTFOLIO_TARGETS: {
    CORE_ETF_MIN: 0.50,          // 核心大盤 ETF 目標下限 50%
    CORE_ETF_MAX: 0.70,          // 核心大盤 ETF 目標上限 70%
    CASH_MIN: 0.20,              // 防禦性現金目標下限 20%
    CASH_MAX: 0.35,              // 防禦性現金目標上限 35%
    SATELLITE_MAX: 0.25,         // 衛星個股目標上限 25%
  },

  // 預設使用的 Gemini 模型（首選第一順位：Gemini 3.8 Flash）
  GEMINI_MODEL: 'gemini-3.8-flash',

  // 取得屬性（優先自 PropertiesService 讀取）
  getProperty: function(key) {
    const props = PropertiesService.getScriptProperties();
    let val = props.getProperty(key);
    if (!val && this.DEFAULT_PROPERTIES[key]) {
      val = this.DEFAULT_PROPERTIES[key];
    }
    return val ? val.trim() : '';
  },

  // 儲存屬性
  setProperty: function(key, value) {
    const props = PropertiesService.getScriptProperties();
    props.setProperty(key, value ? value.trim() : '');
  }
};
