/**
 * ============================================================================
 * GeminiService.gs - Gemini 2.5 Flash 多模態解析服務
 * ============================================================================
 * 說明：
 * 讀取 Google Drive 截圖並轉換為 Base64，發送至 Gemini API。
 * 使用 Structured Outputs (JSON Schema) 強制 AI 回傳精確結構，避免數值幻覺。
 */

const GeminiService = {
  /**
   * 解析給定的圖片檔案陣列
   * @param {Array<GoogleAppsScript.Drive.File>} imageFiles - 圖片檔案清單
   * @returns {Object} 解析後的結構化資料
   */
  parseAssetImages: function(imageFiles) {
    const apiKey = CONFIG.getProperty('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('未設定 Gemini API Key！請在試算表上方選單點選「🚀 資產管理 ➔ ⚙️ 設定系統參數」完成設定。');
    }

    if (!imageFiles || imageFiles.length === 0) {
      throw new Error('「待處理截圖」資料夾中沒有找到任何圖片檔案！');
    }

    // 1. 將圖片轉為 Gemini API 接受的 inlineData 格式
    const parts = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const blob = file.getBlob();
      const mimeType = blob.getContentType();
      
      // 支援常見圖片格式
      if (!mimeType.startsWith('image/')) {
        continue;
      }
      
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

    // 2. 組合投資專業提示詞與分類規則
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

    // 3. 定義嚴格的 JSON Schema (Structured Outputs)
    const jsonSchema = {
      type: "OBJECT",
      properties: {
        exchange_rate_usd_twd: {
          type: "NUMBER",
          description: "參考美元兌台幣匯率，例如 31.70 或 31.83"
        },
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
              account_source: { type: "STRING", description: "帳戶來源，如 台股帳戶一, 美股帳戶二(網頁端複委託), 永豐金豐存股" },
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
              description: "具體的後續行動與再平衡建議清單（例如加碼方向、碎股處理建議等）"
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

  /**
   * 具備自動重試與多模型降級備援的呼叫引擎
   * 優先順序：gemini-3.8-flash (第1順位) -> gemini-3.5-flash-lite (第2順位) -> gemini-3.1-flash-lite (第3順位)
   */
  fetchWithFallback: function(parts, jsonSchema, apiKey) {
    const defaultModel = CONFIG.GEMINI_MODEL || CONFIG.getProperty('GEMINI_MODEL') || 'gemini-3.8-flash';
    const fallbackList = [
      defaultModel,
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite'
    ];
    // 去除重複模型並保持順序
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

      // 每個模型最多重試 2 次 (針對 503 尖峰塞車做退避)
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

          // 若遇到 503 (過載) 或 429 (頻率限制)，等待後重試
          if (statusCode === 503 || statusCode === 429) {
            Logger.log(`模型 ${modelName} 遭遇 HTTP ${statusCode}，稍候重試...`);
            if (attempt < 2) {
              Utilities.sleep(attempt * 2500); // 指數退避等待 2.5 秒
              continue;
            }
          }

          lastError = new Error(`[${modelName}] 請求失敗 (HTTP ${statusCode}): ${responseBody}`);
          break; // 跳出此模型重試，進入下一個備援模型
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
