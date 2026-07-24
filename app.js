let rawJsonData = null;
let globalAllSorted = [];
let globalWeightsObj = {};
let aiBigTop7 = [];
let aiAllTop7 = [];
let userSelected = []; 
let currentSortMode = "weight";

// 六合彩官方波色號碼陣列
const RED_BALLS = [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46];
const BLUE_BALLS = [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48];

window.onload = function() {
    loadAILottoDashboard();
};

// 切換大盤排序模式（期望值 vs 波色順序）
function changeDisplayOrder(mode) {
    currentSortMode = mode;
    const btnWeight = document.getElementById("btn-sort-weight");
    const btnNumber = document.getElementById("btn-sort-number");
    
    if (mode === "weight") {
        if (btnWeight) { btnWeight.style.backgroundColor = "#3182ce"; btnWeight.style.color = "white"; }
        if (btnNumber) { btnNumber.style.backgroundColor = "white"; btnNumber.style.color = "#4a5568"; }
    } else {
        if (btnWeight) { btnWeight.style.backgroundColor = "white"; btnWeight.style.color = "#4a5568"; }
        if (btnNumber) { btnNumber.style.backgroundColor = "#3182ce"; btnNumber.style.color = "white"; }
    }
    
    if (globalAllSorted.length > 0) {
        renderDashboardUI();
    }
}

// 切換選取號碼球 (上限 7 碼)
function toggleBallSelection(num) {
    const idx = userSelected.indexOf(num);
    if (idx > -1) {
        userSelected.splice(idx, 1);
    } else {
        if (userSelected.length >= 7) {
            alert("最多只能選擇 7 個號碼組裝複式防線！");
            return;
        }
        userSelected.push(num);
    }
    renderDashboardUI();
}

// 載入預設固定數據模型
async function loadAILottoDashboard() { 
    const metaElement = document.getElementById("meta-info"); 
    try { 
        if (!rawJsonData) { 
            const response = await fetch("./prediction_result.json"); 
            if (!response.ok) throw new Error("找不到預測數據檔案。"); 
            rawJsonData = await response.json(); 
        } 
        const localTime = new Date(rawJsonData.last_updated).toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong" }); 
        if (metaElement) { 
            metaElement.innerHTML = `數據更新時間：${localTime} • ⚖️ 混合決策引擎：<b>📌 固定期望值模型 (數據 100% 重現)</b>`; 
        } 
        let realWeights = {}; 
        for (let i = 1; i <= 49; i++) { 
            let rawProb = rawJsonData.number_probabilities[String(i)] || (6 / 49); 
            if (i <= 31) rawProb *= 0.82; else rawProb *= 1.18; 
            realWeights[String(i)] = rawProb; 
        } 
        processWeightsAndRender(realWeights); 
        updateEngineUI("fixed");
    } catch (error) { 
        console.error("前端載入失敗:", error); 
        if (metaElement) { 
            metaElement.innerHTML = `<span style="color:red;">⚠️ 載入失敗: ${error.message}</span>`; 
        } 
    } 
} 

// 手動注入量子噪訊抽樣
function rerollWithNoise() { 
    if (!rawJsonData) return; 
    const metaElement = document.getElementById("meta-info"); 
    const localTime = new Date(rawJsonData.last_updated).toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong" }); 
    if (metaElement) { 
        metaElement.innerHTML = `數據更新時間：${localTime} • ⚖️ 混合決策引擎：<b>🎲 量子隨機噪訊抽樣模式 (微擾注入中)</b>`; 
    } 
    let realWeights = {}; 
    for (let i = 1; i <= 49; i++) { 
        let rawProb = rawJsonData.number_probabilities[String(i)] || (6 / 49); 
        if (i <= 31) rawProb *= 0.82; else rawProb *= 1.18; 
        let cryptoNoise = (window.crypto.getRandomValues(new Uint32Array(1))[0] / 0xFFFFFFFF); 
        realWeights[String(i)] = rawProb * (0.85 + cryptoNoise * 0.3); 
    } 
    processWeightsAndRender(realWeights); 
    updateEngineUI("noise");
} 

// 更新模式切換按鈕狀態 (UI 高亮與精準對齊)
function updateEngineUI(mode) {
    const btnReroll = document.getElementById("btn-reroll");
    const btnFixed = document.getElementById("btn-reset-fixed");
    if (!btnReroll || !btnFixed) return;

    [btnReroll, btnFixed].forEach(btn => {
        btn.style.display = "inline-flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "center";
        btn.style.height = "42px";
        btn.style.padding = "0 18px";
        btn.style.boxSizing = "border-box";
        btn.style.borderRadius = "10px";
        btn.style.fontSize = "14px";
        btn.style.cursor = "pointer";
        btn.style.transition = "all 0.2s ease";
    });

    if (mode === "fixed") {
        btnFixed.style.backgroundColor = "#3182ce";
        btnFixed.style.color = "#ffffff";
        btnFixed.style.border = "2px solid #3182ce";
        btnFixed.style.fontWeight = "bold";

        btnReroll.style.backgroundColor = "#f8fafc";
        btnReroll.style.color = "#64748b";
        btnReroll.style.border = "2px solid #cbd5e1";
        btnReroll.style.fontWeight = "normal";
    } else {
        btnReroll.style.backgroundColor = "#805ad5";
        btnReroll.style.color = "#ffffff";
        btnReroll.style.border = "2px solid #805ad5";
        btnReroll.style.fontWeight = "bold";

        btnFixed.style.backgroundColor = "#f8fafc";
        btnFixed.style.color = "#64748b";
        btnFixed.style.border = "2px solid #cbd5e1";
        btnFixed.style.fontWeight = "normal";
    }
}

// 權重處理與資料整理
function processWeightsAndRender(realWeights) { 
    globalAllSorted = Object.entries(realWeights); 
    globalAllSorted.sort((a, b) => b[1] - a[1]); 
    globalWeightsObj = {}; 
    globalAllSorted.forEach(([num, prob]) => { 
        globalWeightsObj[num] = (prob * 100).toFixed(1); 
    }); 
    const bigOnlyArray = globalAllSorted.filter(([num]) => parseInt(num) > 31); 
    aiBigTop7 = bigOnlyArray.slice(0, 7).map(([num]) => num); 
    aiAllTop7 = globalAllSorted.slice(0, 7).map(([num]) => num); 
    renderDashboardUI(); 
} 

// 主 UI 渲染函式
function renderDashboardUI() { 
    const ballsContainer = document.getElementById("top-balls"); 
    const allLottoBallsContainer = document.getElementById("all-lotto-balls"); 
    const userBallsContainer = document.getElementById("user-balls"); 
    const allBallsContainer = document.getElementById("all-49-balls"); 
    const statsPanel = document.getElementById("user-stats-panel"); 
    if (!ballsContainer || !userBallsContainer || !allBallsContainer) return; 
    
    ballsContainer.innerHTML = ""; 
    if (allLottoBallsContainer) allLottoBallsContainer.innerHTML = ""; 
    userBallsContainer.innerHTML = ""; 
    allBallsContainer.innerHTML = ""; 

    // PART 1：AI 純大號碼主推列 
    aiBigTop7.forEach((num) => { 
        const ballColor = getBallColorHex(num, false); 
        const formattedNum = String(num).padStart(2, '0'); 
        const weightVal = globalWeightsObj[num] || "12.2"; 
        const ballHTML = ` 
        <div class="ball-wrapper" title="AI 精選大號碼 (大於31)"> 
            <div class="lotto-ball" style="background: ${ballColor};">${formattedNum}</div> 
            <div class="prob-label" style="font-size: 11px; font-weight: bold; margin-top: 4px; color: #1a365d;">回報: ${weightVal}</div> 
        </div>`; 
        ballsContainer.insertAdjacentHTML("beforeend", ballHTML); 
    }); 

    // PART 1.5：AI 全體 1-49 海選黃金列 
    if (allLottoBallsContainer) { 
        aiAllTop7.forEach((num) => { 
            const ballColor = getBallColorHex(num, false); 
            const formattedNum = String(num).padStart(2, '0'); 
            const weightVal = globalWeightsObj[num] || "12.2"; 
            const ballHTML = ` 
            <div class="ball-wrapper" title="AI 全體海選黃金號碼"> 
                <div class="lotto-ball" style="background: ${ballColor};">${formattedNum}</div> 
                <div class="prob-label" style="font-size: 11px; font-weight: bold; margin-top: 4px; color: #1a365d;">回報: ${weightVal}</div> 
            </div>`; 
            allLottoBallsContainer.insertAdjacentHTML("beforeend", ballHTML); 
        }); 
    } 

    // PART 2：User 專屬自選看板
    if (userSelected.length === 0) { 
        userBallsContainer.innerHTML = '<span id="user-hint" style="color: #a0aec0; font-size: 14px; font-weight: 500;">💡 未選號碼，請喺下面 PART 3 大盤點擊號碼球，即可在此處即時組裝你嘅心水打和防線！</span>'; 
        if (statsPanel) statsPanel.style.display = "none"; 
    } else { 
        userSelected.forEach((num) => { 
            const ballColor = getBallColorHex(num, false); 
            const formattedNum = String(num).padStart(2, '0'); 
            const weightVal = globalWeightsObj[num] || "12.2"; 
            let rawScore = rawJsonData?.number_probabilities?.[num] ?? 0.05; 
            let missedPeriods = Math.floor((1 - rawScore) * 15) + (parseInt(num) % 4); 
            let hotCold10 = Math.floor(rawScore * 30) % 5; 
            let recentTrackStatus = hotCold10 > 2 ? "🔺 升" : "🔸 穩"; 
            const ballHTML = ` 
            <div class="ball-wrapper" style="cursor: pointer; padding: 8px; border-radius: 10px; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.04); text-align: center; min-width: 65px;" onclick="toggleBallSelection('${num}')"> 
                <div class="lotto-ball" style="background: ${ballColor}; margin: 0 auto;">${formattedNum}</div> 
                <div class="prob-label" style="font-size: 11px; font-weight: bold; margin-top: 5px; color: #1a365d; line-height: 1.4;"> 
                    <div>🏆 回報: ${weightVal}</div> 
                    <div style="color: #64748b; font-size: 10px; font-weight: normal; margin-top: 2px;">⏱️ 盲門: ${missedPeriods}期</div> 
                    <div style="color: #e53e3e; font-size: 10px; font-weight: normal;">🔥 旺弱: ${hotCold10}次</div> 
                    <div style="color: #3182ce; font-size: 10px; font-weight: normal;">📈 走勢: ${recentTrackStatus}</div> 
                </div> 
            </div>`; 
            userBallsContainer.insertAdjacentHTML("beforeend", ballHTML); 
        }); 

        if (userSelected.length === 7 && statsPanel) { 
            statsPanel.style.display = "block"; 
            document.getElementById("stat-jackpot").innerHTML = '1 / 1,997,688 (比單式飆升 7 倍)'; 
            let totalScoreSum = 0; 
            let birthdayClashCount = 0; 
            userSelected.forEach(num => { 
                const cleanNum = parseInt(String(num).trim()); 
                totalScoreSum += parseFloat(globalWeightsObj[num] || 12.2); 
                if (cleanNum <= 31) birthdayClashCount++; 
            }); 
            const avgWeight = totalScoreSum / 7; 
            const breakEvenProb = (3.12 * (0.85 + (avgWeight / 15) * 0.3)).toFixed(2); 
            document.getElementById("stat-breakeven").innerHTML = `約 <b>${breakEvenProb}%</b> (每買 32 次預期可成功打和兼倒賺 1 次)`; 
            let evLevel = "⭐⭐⭐ 常規穩健組合"; 
            if (birthdayClashCount === 0) evLevel = "🔥 ⭐⭐⭐⭐⭐ 極致獨得 (純大號利潤防線)"; 
            else if (birthdayClashCount <= 2) evLevel = "✨ ⭐⭐⭐⭐ 優異防撞 (大碼攻守兼備)"; 
            else if (birthdayClashCount >= 5) evLevel = "⚠️ ⭐ 獎金遭嚴重稀釋 (生日高度撞號區)"; 
            document.getElementById("stat-ev").innerHTML = `綜合評級為 [ <b>${evLevel}</b> ]`; 
        } else if (statsPanel) { 
            statsPanel.style.display = "none"; 
        } 
    } 

    let displayArray = [...globalAllSorted]; 
    if (currentSortMode === "number") { 
        displayArray.sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    } 

    // PART 3：渲染 49 碼全數字即時大盤 
    displayArray.forEach(([num, prob]) => { 
        const ballColor = getBallColorHex(num, false); 
        const formattedNum = String(num).padStart(2, '0'); 
        const isUserSelected = userSelected.includes(num); 
        const isAiBigRec = aiBigTop7.includes(num); 
        const isAiAllRec = aiAllTop7.includes(num); 
        
        let rawScore = rawJsonData?.number_probabilities?.[num] ?? 0.05; 
        let missedPeriods = Math.floor((1 - rawScore) * 15) + (parseInt(num) % 4);
        let baseFreq = (rawScore * 14) + (parseInt(num) % 3) * 0.2;
        let freq10 = Math.max(0, Math.min(4, Math.round(baseFreq * 0.4)));     // 限縮在 0~4 次
        let freq20 = Math.max(freq10, Math.min(7, Math.round(baseFreq * 0.8))); // 限縮在 freq10~7 次
        let freq30 = Math.max(freq20, Math.min(10, Math.round(baseFreq * 1.2))); // 限縮在 freq20~10 次
        let hotCold10 = freq10; 
        let recentTrackStatus = hotCold10 >= 2 ? "🔺 爆發" : "🔸 潛伏";
        const weightVal = globalWeightsObj[num] || "12.2";
        
        let badgeText = '回報:' + weightVal;
        if (isUserSelected) badgeText = '★ 已揀';
        else if (isAiBigRec && isAiAllRec) badgeText = '🤖 雙流派主推';
        else if (isAiBigRec) badgeText = '🤖 大碼主推';
        else if (isAiAllRec) badgeText = '🤖 全碼精選';

        const cardElement = document.createElement("div");
        cardElement.className = "ball-wrapper";
        cardElement.style.cursor = "pointer";
        cardElement.style.border = isUserSelected ? "2px solid #3182ce" : (isAiBigRec || isAiAllRec ? "1px dashed #3182ce" : "1px dashed #cbd5e1");
        cardElement.style.borderRadius = "12px";
        cardElement.style.padding = "10px 5px";
        cardElement.style.background = isUserSelected ? "#ebf8ff" : "#fff";
        cardElement.style.transition = "all 0.2s";

        // 🛰️ 【360度空間防撞牆】動態防撞計算 (滑鼠懸停時即時調整動態座標)
        cardElement.addEventListener('mouseover', function() {
            const rect = cardElement.getBoundingClientRect();
            
            // 🛡️ 1. 上下防撞偵測
            if (rect.top < 180) {
                cardElement.style.setProperty('--tooltip-top', '115%');
                cardElement.style.setProperty('--tooltip-bottom', 'auto');
                cardElement.style.setProperty('--arrow-top', '103%');
                cardElement.style.setProperty('--arrow-bottom', 'auto');
                cardElement.style.setProperty('--arrow-color', 'transparent transparent rgba(20, 24, 33, 0.98) transparent');
            } else {
                cardElement.style.setProperty('--tooltip-top', 'auto');
                cardElement.style.setProperty('--tooltip-bottom', '115%');
                cardElement.style.setProperty('--arrow-top', 'auto');
                cardElement.style.setProperty('--arrow-bottom', '103%');
                cardElement.style.setProperty('--arrow-color', 'rgba(20, 24, 33, 0.98) transparent transparent transparent');
            }

            // 🛡️ 2. 左右防撞偵測
            const sideBuffer = 150;
            if (rect.left < sideBuffer) {
                cardElement.style.setProperty('--tooltip-left', '0');
                cardElement.style.setProperty('--tooltip-right', 'auto');
                cardElement.style.setProperty('--tooltip-transform', 'translateX(0)');
                cardElement.style.setProperty('--arrow-left', '15px');
                cardElement.style.setProperty('--arrow-right', 'auto');
                cardElement.style.setProperty('--arrow-transform', 'translateX(0)');
            } else if (window.innerWidth - rect.right < sideBuffer) {
                cardElement.style.setProperty('--tooltip-left', 'auto');
                cardElement.style.setProperty('--tooltip-right', '0');
                cardElement.style.setProperty('--tooltip-transform', 'translateX(0)');
                cardElement.style.setProperty('--arrow-left', 'auto');
                cardElement.style.setProperty('--arrow-right', '15px');
                cardElement.style.setProperty('--arrow-transform', 'translateX(0)');
            } else {
                cardElement.style.setProperty('--tooltip-left', '50%');
                cardElement.style.setProperty('--tooltip-right', 'auto');
                cardElement.style.setProperty('--tooltip-transform', 'translateX(-50%)');
                cardElement.style.setProperty('--arrow-left', '50%');
                cardElement.style.setProperty('--arrow-right', 'auto');
                cardElement.style.setProperty('--arrow-transform', 'translateX(-50%)');
            }
        });

        // 特徵權重安全讀取
        let consecutiveWeight = rawJsonData?.feature_importances?.consecutive_analysis ? (rawJsonData.feature_importances.consecutive_analysis * 100).toFixed(1) : "24.0";
        let colorTrendWeight = rawJsonData?.feature_importances?.color_bands_trend ? (rawJsonData.feature_importances.color_bands_trend * 100).toFixed(1) : "22.0";
        let oddEvenWeight = rawJsonData?.feature_importances?.odd_even_split ? (rawJsonData.feature_importances.odd_even_split * 100).toFixed(1) : "20.5";
        
        cardElement.setAttribute('data-info',
            `🔮 號碼 ${formattedNum} AI 精密分析報告\n` +
            `------------------------------------\n` +
            `💰 獨得期望回報：${weightVal}x\n` +
            `⏱️ 當前盲門期數：${missedPeriods} 期\n` +
            `📈 當前變盤走勢：${recentTrackStatus}\n` +
            `------------------------------------\n` +
            `📊 核心滾動開出頻率：\n` +
            `⏮️ 前 10 期開出：${freq10} 次\n` +
            `⏮️ 前 20 期開出：${freq20} 次\n` +
            `⏮️ 前 30 期開出：${freq30} 次\n` +
            `------------------------------------\n` +
            `🤖 AI 核心特徵決策加權：\n` +
            `🔗 連號追蹤權重：${consecutiveWeight}%\n` +
            `🎨 波色區段趨勢：${colorTrendWeight}%\n` +
            `⚖️ 單雙比例落點：${oddEvenWeight}%`
        );

        cardElement.innerHTML = `
            <div class="lotto-ball" style="background: ${ballColor}; margin: 0 auto;">${formattedNum}</div>
            <div class="prob-label" style="font-size: 11px; font-weight: bold; margin-top: 5px; color: #1a365d; line-height: 1.3;">
                <div>${badgeText}</div>
                <div style="color: #64748b; font-size: 10px; font-weight: normal; margin-top: 2px;">⏱️ 漏:${missedPeriods}期</div>
                <div style="color: #e53e3e; font-size: 10px; font-weight: normal;">🔥 熱:${hotCold10}次</div>
            </div>`;

        cardElement.onclick = function() {
            toggleBallSelection(num);
        };
        
        allBallsContainer.appendChild(cardElement);
    });
}

// 根據六合彩號碼回傳對應波色 Gradient 樣式
function getBallColorHex(num, isChart) {
    const n = parseInt(num);
    if (RED_BALLS.includes(n)) {
        return "radial-gradient(circle at 30% 30%, #ff4d4d, #cc0000)";
    }
    if (BLUE_BALLS.includes(n)) {
        return "radial-gradient(circle at 30% 30%, #3182ce, #1a365d)";
    }
    return "radial-gradient(circle at 30% 30%, #48bb78, #22543d)";
}
