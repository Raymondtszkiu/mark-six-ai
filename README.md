# 🇭🇰 香港六合彩 AI 預測儀表板 (HK MarkSix AI Dashboard) v4.0.0

## 1. 系統架構與資料流 (System Architecture & Data Flow)
* **自動化排程 (CI/CD):** 透過 GitHub Actions 設定 Cron Job (`15 14 * * *`)，於香港時間每日 22:15 自動觸發。
* **數據擷取 (Scraping):** Python 腳本對 `lotto-8.com` 發起迴圈分頁請求 (Pagination Loop)，穩定提取最新 4 頁（約 100 期）的實體開獎數據。
* **特徵打包 (Data Pipeline):** 後端計算各號碼的統計特徵與權重後，將靜態結構化資料匯出至 `prediction_result.json`。
* **靜態託管 (Frontend):** 透過 GitHub Pages 部署純 HTML/JS/CSS，前端以異步 Fetch 讀取 JSON 並渲染，實現零伺服器成本營運。

---

## 2. 核心演算法與博弈策略 (Core Algorithms & Strategies)
* **嚴格歸一化與 EV 最大化 (EV Maximization):**
    * **邏輯:** 六合彩所有號碼單注物理中獎率皆為 $1/13,983,816$。
    * **操作:** 將 $>31$ 的號碼基礎發生頻率乘上 1.25 倍加權，$\le 31$ 的號碼維持 0.8 倍加權。
    * **目的:** 避開 1-31 的「人類生日/紀念日高度撞號區」，極大化中獎時的獨得期望回報值 (Expected Value)。
* **宏觀滾動特徵 (Rolling Statistical Features):**
    * `missed` (盲門期數): 追蹤單一號碼自上次開出至今的遺漏期數。
    * `r10` / `r20` / `r30`: 計算近 10/20/30 期的開出頻率。
    * `momentum` (動能指標): 公式為 `r10 / r30`，大於 1 代表近期走勢活躍，等於 0 代表陷入冰封。
* **量子隨機噪訊抽樣 (Quantum Noise Injection):**
    * 透過 Web Crypto API (`window.crypto.getRandomValues`) 為原有機率注入 $\pm 15\%$ 的動態微擾亂數，強制打破長線統計慣性。

---

## 3. 核心模組與檔案清單 (Core Modules)

### A. `update_model.py` (後端資料引擎)
* 利用 `requests` 與 `BeautifulSoup` 解析 DOM，配合 Regex `\b([0-9]{1,2})\b` 精準提取 7 碼組合。
* 負責防禦資料污染：若提取不到完整 7 碼組合，腳本觸發 `sys.exit(1)` 強制中斷，避免破壞現有 `prediction_result.json`。
* 輸出包含 `latest_draw_result`，將最新一期原始開獎陣列直接派發給前端作 QA 核對。

### B. `app.js` (前端業務邏輯)
* **動態生命週期 (Lifecycle):** `window.onload` 觸發 `loadAILottoDashboard()`，異步解析 JSON。
* **降級與防呆 (Graceful Degradation):**
    * 偵測 `diffHours > 24`: 顯示「硬性超時警告（系統可能中斷）」。
    * 偵測當前時間介於 21:30 至 22:15 且未有新數據: 顯示「等待系統排程擷取空窗期」。
* **UI 互動與渲染:**
    * 生成 360 度動態防撞 Tooltips (透過 `getBoundingClientRect` 計算視口邊界，自動切換上下左右箭頭)。
    * 執行自選防線驗證 (Validation)：總和需落在常態分佈 `115 - 185` 區間，並計算單雙比例。

### C. `index.html` (前端介面視圖)
* **頂層看板:** 呈現 `latest_draw_result` 作為即時數據更新的信任錨點。
* **PART 1 & 1.5:** 展示 AI 演算之「純大碼 EV 推介」與「全碼海選推介」。
* **PART 2:** 使用者點擊大盤生成的自選 7 碼複式組合看板，即時計算該組合的 EV 評級與結構合規性。
* **PART 3:** 49 碼全數字即時大盤，支援「依獨得回報率 (Weight)」或「號碼波色順序 (Number)」一鍵排序。
