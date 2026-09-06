# Cloudflare Zero Trust 零洩漏安全上雲完整指南

這份指南說明如何將您的「個人全資產戰略管理中樞」透過 Cloudflare 穿透至外網（手機、外出筆電可隨時查閱），同時**達到最高等級資安防護，保證財務資料絕不外洩**。

---

## 核心資安原則：為什麼這套架構不會外洩？

1. **本地資料庫絕不上傳（0 Cloud DB）**：
   - 您的持股、銀行活存、交易紀錄全在本地的 SQLite（`app.db`），沒有任何雲端資料庫可被拖庫或遭勒索。
2. **免開家用路由器通訊埠（No Port Forwarding）**：
   - 不需要在家用 WiFi 分享器上開 Port 80 或 443，**您的家用真實 IP 永遠不被外界看見**。
   - `cloudflared` 是由本地主動往 Cloudflare 全球節點發出 Outbound 加密長連線。
3. **企業級身分驗證防護牆（Cloudflare Access 2FA）**：
   - 任何人開啟網址，必須先通過 **您的專屬 Gmail 帳號** 或 **Email 拋棄式 PIN 碼** 驗證。
   - 陌生人、爬蟲或駭客連登入介面後的任何頁面都看不到，直接在 Cloudflare 邊緣被擋下。

---

## 方案 A：30 秒快速體驗（免註冊網域、即開即測）

專案根目錄已為您建立了一鍵腳本：
`G:\Google Antigravity\myasset\啟動雲端安全通道_Cloudflare.bat`

1. 確保後端服務已在運行（瀏覽器打開 `http://localhost:8000` 正常）。
2. 雙擊執行 `啟動雲端安全通道_Cloudflare.bat`。
3. 腳本會自動從 Cloudflare 官方下載安全程式 `cloudflared.exe`，並顯示類似網址：
   ```text
   +--------------------------------------------------------------------------------------------+
   |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
   |  https://random-words-123.trycloudflare.com                                                |
   +--------------------------------------------------------------------------------------------+
   ```
4. 用手機開啟該 `https://...trycloudflare.com` 網址，即可在手機上檢視您的資產管理中樞！
5. **關閉黑底視窗，通道立即銷毀**，外網完全斷開，安全無負擔。

---

## 方案 B：永久固定網址 + Google 帳號 2FA 防護牆（推薦）

如果您想在外隨時用固定網址（例如 `https://asset.yourdomain.com`）查看，並加上 **只有我的 Google 帳號才能進入** 的防護牆：

### 步驟 1：註冊 Cloudflare（完全免費）
1. 前往 [Cloudflare 官網](https://www.cloudflare.com/) 註冊免費帳號。
2. 綁定一個自己的網域（或在 Cloudflare 購買每年約 10 美元的網域）。

### 步驟 2：建立 Cloudflare Tunnel（命名隧道）
1. 進入 Cloudflare 後台 > 左側選單點擊 **Zero Trust**。
2. 點擊 **Networks** > **Tunnels** > **Create a tunnel**。
3. 選擇 **Cloudflared**，為隧道取個名字（例如 `myasset-tunnel`）。
4. 系統會提供一段 Windows 安裝指令，將該指令貼入終端機執行一次即可常駐為 Windows 服務。
5. 在 **Public Hostnames** 設定：
   - **Subdomain**：`asset`
   - **Domain**：選擇您的網域（例如 `yourdomain.com`）
   - **Service Type**：`HTTP`
   - **URL**：`localhost:8000`
   - 點擊儲存！

### 步驟 3：掛上 Zero Trust Access 驗證牆（關鍵防護）
1. 在 Zero Trust 後台 > 點擊 **Access** > **Applications** > **Add an application**。
2. 選擇 **Self-hosted**。
3. 設定名稱：`個人資產中樞`，Application domain 輸入剛剛設定的 `asset.yourdomain.com`。
4. 在 **Policies** 設定存取規則：
   - Action：`Allow`
   - Include 條件：選擇 **Emails**，填入 **您個人的 Gmail 信箱**（例如 `yourname@gmail.com`）。
5. 點擊儲存！

### 完成效果：
- 當您在外面用手機打開 `https://asset.yourdomain.com` 時，Cloudflare 會跳出登入畫面，要求您登入您的 Google 帳號或輸入寄到您信箱的 6 位數安全碼。
- 只有通過驗證的您本人可以進入，其他人直接被阻擋在外面。
- 本地電腦上的 SQLite 資料庫與後端服務完全不對外公開，達成「隨處可用 + 絕對資安」！
