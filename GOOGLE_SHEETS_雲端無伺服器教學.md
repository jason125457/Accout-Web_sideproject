# ☁️ Google 試算表 + Cloudflare Pages 雲端無伺服器架構教學

這是一套**完全不需要開電腦、不需要開 CMD、24 小時手機隨時隨地可看**的雲端資產戰略中樞架構（採用與您熟悉的 account_web 相同的頂級模式）。

---

## 一、 核心架構運作原理

1. **未授權者僅見 Demo 模式**：
   任何人若意外看到您的 Cloudflare Pages 網址，預設只會載入擬真的示範帳戶，完全接觸不到您一毛錢的真實資訊。
2. **零伺服器外洩**：
   您的 Google 試算表存取網址與 Token 僅儲存在您個人的手機/電腦瀏覽器快取中（localStorage），完全不經過任何外部伺服器。
3. **雲端全自動行情**：
   Google 試算表內建 GOOGLEFINANCE 公式，盤中與收盤價由 Google 伺服器自動抓取，完全擺脫本機 Python 爬蟲。

---

## 二、 5 步快速設定指南

### 步驟 1：建立 Google 試算表
1. 打開 Google 雲端硬碟 (Google Drive)。
2. 點擊「新增」->「Google 試算表」，將其命名為：個人全資產戰略管理中樞。

---

### 步驟 2：貼上 Apps Script 程式碼
1. 在試算表中點擊頂部選單「擴充功能」->「Apps Script」。
2. 將編輯器內原本的內容清空。
3. 打開本機的 gas/Code.gs，複製全部內容並貼上。
4. 在頂部的 CONFIG 區塊，您可以自訂專屬的金鑰 Token（例如 'myasset_secret_2026'）：
   const CONFIG = {
     SPREADSHEET_ID: '',
     API_SECRET_TOKEN: 'myasset_secret_2026'
   };
5. 點擊上方的儲存磁片圖示 (Ctrl + S)。

---

### 步驟 3：一鍵初始化表格（自動匯入 26 檔持股與 7 個帳戶）
1. 在 Apps Script 上方工具列的函式下拉選單中選擇 setupSheets。
2. 點擊旁邊的「執行」按鈕。
3. 第一次執行時，Google 會彈出權限審核：
   - 點擊「查看權限」-> 選擇您的帳號 ->「進階」->「前往『個人全資產戰略管理中樞』(不安全)」->「允許」。
4. 執行完畢後回到 Google 試算表，您會看到已經自動建好了：
   - 「持倉明細」（已填妥 26 檔台美股、股數、成本與自動報價公式）
   - 「現金帳戶」（已填妥 7 個帳戶）
   - 「每日歷史」（已填妥近期 6 天的淨值流水紀錄）

---

### 步驟 4：發布為網頁應用程式 (Web App)
1. 在 Apps Script 畫面右上角，點擊藍色按鈕「部署」->「新增部署作業」。
2. 種類選「網頁應用程式」。
3. 設定如下：
   - 說明：Asset Hub API
   - 執行身分：我 (您的帳號)
   - 誰可以存取：所有人 (重要：必須選所有人，前端才能透過帶 Token 的請求存取)
4. 點擊「部署」。
5. 複製產生的網頁應用程式網址 (Web App URL)，格式如：
   https://script.google.com/macros/s/AKfycbx.../exec

---

### 步驟 5：在前端儀表板綁定連線
1. 打開您的儀表板網頁（本地 http://localhost:8000 或部署在 Cloudflare Pages 的網址）。
2. 點擊右上角的「示範模式」或「雲端同步」按鈕。
3. 彈出設定視窗：
   - Web App URL：貼上步驟 4 複製的網址。
   - API 存取金鑰：輸入步驟 2 設定的 Token。
4. 點擊「測試連線」，確認出現綠色「連線成功！」。
5. 點擊「儲存並同步」！
6. 儀表板右上角立即亮起綠燈「雲端試算表已連線」，無縫呈現真實資產！

---

## 三、 將前端部署到 Cloudflare Pages（電腦關機也能看）

專案的 web/frontend/dist 已經建置完成，自帶 SPA 路由重定向設定。

### 部署方式（直接拖拉上傳）：
1. 登入 Cloudflare Dashboard。
2. 點擊左側選單 Workers & Pages -> Create application -> Pages 分頁。
3. 選擇 Upload assets（直接上傳）：
   - 取專案名稱（如 my-asset-hub）。
   - 將資料夾 web/frontend/dist 整個拖拉上傳。
   - 點擊 Deploy。
4. 幾秒鐘後即可取得永久網址（如 https://my-asset-hub.pages.dev）。
5. 用手機打開該網址 -> 點選「示範模式」輸入您的 GAS 網址與金鑰 -> 儲存！
6. 在手機瀏覽器「加入主畫面」，電腦關機也能隨時隨地查看！
