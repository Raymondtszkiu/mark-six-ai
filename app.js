let rawJsonData = null;
let globalAllSorted = [];
let globalWeightsObj = {};
let aiBigTop7 = [];
let aiAllTop7 = [];
let userSelected = []; 
let currentSortMode = "weight";

const RED_BALLS = [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46];
const BLUE_BALLS = [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48];

window.onload = function() {
    loadAILottoDashboard();
};

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

async function loadAILottoDashboard() { 
    const metaElement = document.getElementById("meta-info"); 
    try { 
        if (!rawJsonData) { 
            const response = await fetch("./prediction_result.json"); 
            if (!response.ok) throw new Error("找不到預測數據檔案。"); 
            rawJsonData = await response.json(); 
        } 
        
        const updateDate = new Date(rawJsonData.last_updated);
        const localTime = updateDate.toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong" }); 
        
        const now = new Date();
        const diffHours = (now - updateDate) / (1000 * 60 * 60);
        
        // 設定今日夜晚 21:30 的死線邊界 (馬會開獎時間)
        const todayDrawTime = new Date();
        todayDrawTime.setHours(21, 30, 0, 0);

        let alertBadge = "";
        
        // 🔴 情境 1：硬性超時 (GitHub Action 炒咗 / 爬蟲 API 死咗)
        if (diffHours > 24) {
            alertBadge = `<br><span style="display: inline-block; margin-top: 5px; padding: 4px 8px; background-color: #fff5f5; color: #e53e3e; border: 1px solid #feb2b2; border-radius: 6px; font-weight: bold; font-size: 13px;">⚠️ 系統提示：目前顯示為 ${diffHours.toFixed(0)} 小時前之歷史數據</span>`;
            setTimeout(() => {
                alert(`⚠️ 系統警告\n\n偵測到最新數據爬取失敗！\n目前大盤顯示為 ${diffHours.toFixed(0)} 小時前之歷史快取數據。`);
            }, 500);
        } 
        // 🟠 情境 2：開獎空窗期 (過咗 21:30，但 AI 仲未喺 22:15 自動更新)
        else if (now >= todayDrawTime && updateDate < todayDrawTime) {
            alertBadge = `<br><span style="display: inline-block; margin-top: 5px; padding: 4px 8px; background-color: #fffaf0; color: #dd6b20; border: 1px solid #fbd38d; border-radius: 6px; font-weight: bold; font-size: 13px;">⏳ 數據更新中：等待 22:15 系統排程擷取最新結果</span>`;
            setTimeout(() => {
                alert(`⏳ 更新空窗期提示\n\n馬會啱啱已經開獎！\nAI 系統排程將於 22:15 自動擷取最新結果，目前大盤仍為「上一期」數據。`);
            }, 500);
        }

        if (metaElement) { 
            metaElement.innerHTML = `數據更新時間：${localTime} • ⚖️ 混合決策引擎：<b>📈 嚴格歸一化與 EV 最大化模式</b>${alertBadge}`; 
        } 
        
        let realWeights = {}; 
        for (let i = 1; i <= 49; i++) { 
            let rawProb = rawJsonData.number_probabilities[String(i)] || (7 / 49); 
            realWeights[String(i)] = rawProb; 
        } 
        processWeightsAndRender(realWeights); 
        updateEngineUI("fixed");
    } catch (error) { 
        console.error("前端載入失敗:", error); 
        if (metaElement) { 
            metaElement.innerHTML = `<span style="color:red; font-weight: bold;">⚠️ 載入失敗: ${error.message}</span>`; 
        } 
    } 
}

function rerollWithNoise() { 
    if (!rawJsonData) return; 
    const metaElement = document.getElementById("meta-info"); 
    const localTime = new Date(rawJsonData.last_updated).toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong" }); 
    if (metaElement) { 
        metaElement.innerHTML = `數據更新時間：${localTime} • ⚖️ 混合決策引擎：<b>🎲 量子隨機噪訊抽樣模式 (微擾注入中)</b>`; 
    } 
    let realWeights = {}; 
    for (let i = 1; i <= 49; i++) { 
        let rawProb = rawJsonData.number_probabilities[String(i)] || (7 / 49); 
        let cryptoNoise = (window.crypto.getRandomValues(new Uint32Array(1))[0] / 0xFFFFFFFF); 
        realWeights[String(i)] = rawProb * (0.85 + cryptoNoise * 0.3); 
    } 
    processWeightsAndRender(realWeights); 
    updateEngineUI("noise");
} 

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

// 🎯 解析真實 JSON 特徵 (取代偽造算術邏輯)
function parseRealMetrics(numStr) {
    const num = String(numStr);
    const rolling = rawJsonData?.rolling_features?.[num] || {};
    const prob = rawJsonData?.number_probabilities?.[num] || (7 / 49);
    
    return {
        probPercent: (prob * 100).toFixed(1),
        missedPeriods: rolling.missed ?? 0,
        r10Count: Math.round((rolling.r10 || 0) * 10),
        r20Count: Math.round((rolling.r20 || 0) * 20),
        r30Count: Math.round((rolling.r30 || 0) * 30),
        momentum: rolling.momentum || 1.0
    };
}

// 🎯 組合層級統計驗證
function validateCombinationStructure(selectedArray) {
    if (selectedArray.length < 6) return { isValid: false, reason: "號碼不足" };
    
    const nums = selectedArray.map(n => parseInt(n));
    const sum = nums.reduce((a, b) => a + b, 0);
    const oddCount = nums.filter(n => n % 2 !== 0).length;
    
    // 六合彩 6 碼總和常態分佈：115 ~ 185
    const isSumValid = sum >= 115 && sum <= 185;
    // 單雙比過濾：排除全單或全雙極端值
    const isOddEvenValid = oddCount > 0 && oddCount < nums.length;

    return {
        isValid: isSumValid && isOddEvenValid,
        sum: sum,
        oddEvenRatio: `${oddCount}:${nums.length - oddCount}`
    };
}

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
        const weightVal = globalWeightsObj[num] || "14.2"; 
        const ballHTML = ` 
        <div class="ball-wrapper" title="AI 精選大號碼 (大於31)"> 
            <div class="lotto-ball" style="background: ${ballColor};">${formattedNum}</div> 
            <div class="prob-label" style="font-size: 11px; font-weight: bold; margin-top: 4px; color: #1a365d;">機率: ${weightVal}%</div> 
        </div>`; 
        ballsContainer.insertAdjacentHTML("beforeend", ballHTML); 
    }); 

    // PART 1.5：AI 全體 1-49 海選黃金列 
    if (allLottoBallsContainer) { 
        aiAllTop7.forEach((num) => { 
            const ballColor = getBallColorHex(num, false); 
            const formattedNum = String(num).padStart(2, '0'); 
            const weightVal = globalWeightsObj[num] || "14.2"; 
            const ballHTML = ` 
            <div class="ball-wrapper" title="AI 全體海選黃金號碼"> 
                <div class="lotto-ball" style="background: ${ballColor};">${formattedNum}</div> 
                <div class="prob-label" style="font-size: 11px; font-weight: bold; margin-top: 4px; color: #1a365d;">機率: ${weightVal}%</div> 
            </div>`; 
            allLottoBallsContainer.insertAdjacentHTML("beforeend", ballHTML); 
        }); 
    } 

    // PART 2：User 專屬自選看板
    if (userSelected.length === 0) { 
        userBallsContainer.innerHTML = '<span id="user-hint" style="color: #a0aec0; font-size: 14px; font-weight: 500;">💡 未選號碼，請喺下面 PART 3 大盤點擊號碼球，即可在此處即時組裝你嘅心水防線！</span>'; 
        if (statsPanel) statsPanel.style.display = "none"; 
    } else { 
        userSelected.forEach((num) => { 
            const ballColor = getBallColorHex(num, false); 
            const formattedNum = String(num).padStart(2, '0'); 
            const metrics = parseRealMetrics(num);
            
            let recentTrackStatus = metrics.r10Count > 2 ? "🔺 活躍" : (metrics.r10Count === 0 ? "❄️ 冰封" : "🔸 穩健"); 
            
            const ballHTML = ` 
            <div class="ball-wrapper" style="cursor: pointer; padding: 8px; border-radius: 10px; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.04); text-align: center; min-width: 65px;" onclick="toggleBallSelection('${num}')"> 
                <div class="lotto-ball" style="background: ${ballColor}; margin: 0 auto;">${formattedNum}</div> 
                <div class="prob-label" style="font-size: 11px; font-weight: bold; margin-top: 5px; color: #1a365d; line-height: 1.4;"> 
                    <div>🏆 機率: ${metrics.probPercent}%</div> 
                    <div style="color: #64748b; font-size: 10px; font-weight: normal; margin-top: 2px;">⏱️ 漏: ${metrics.missedPeriods}期</div> 
                    <div style="color: #e53e3e; font-size: 10px; font-weight: normal;">🔥 10期: ${metrics.r10Count}次</div> 
                    <div style="color: #3182ce; font-size: 10px; font-weight: normal;">📈 走勢: ${recentTrackStatus}</div> 
                </div> 
            </div>`; 
            userBallsContainer.insertAdjacentHTML("beforeend", ballHTML); 
        }); 

        if (userSelected.length === 7 && statsPanel) { 
            statsPanel.style.display = "block"; 
            
            const structure = validateCombinationStructure(userSelected);
            let bigNumCount = userSelected.filter(n => parseInt(n) > 31).length;
            
            let evLevel = "常規穩健組合";
            if (bigNumCount >= 5 && structure.isValid) {
                evLevel = "🔥 ⭐⭐⭐⭐⭐ 極致獨得 (高 EV + 巨觀結構合規)";
            } else if (bigNumCount >= 3) {
                evLevel = "✨ ⭐⭐⭐⭐ 優異防撞 (大碼攻守兼備)";
            } else {
                evLevel = "⚠️ ⭐ 獎金易遭稀釋 (生日高度撞號區)";
            }
            
            document.getElementById("stat-jackpot").innerHTML = '1 / 1,997,688 (複式 7 碼中獎率)'; 
            
            const breakEvenElem = document.getElementById("stat-breakeven");
            if (breakEvenElem) {
                breakEvenElem.innerHTML = `總和: <b>${structure.sum}</b> | 單雙比: <b>${structure.oddEvenRatio}</b> <br>(結構狀態: ${structure.isValid ? '<span style="color:green;">✅ 合規 (符合常態分佈)</span>' : '<span style="color:red;">❌ 偏離常態</span>'})`;
            }
            
            document.getElementById("stat-ev").innerHTML = `綜合評級：[ <b>${evLevel}</b> ]`; 
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
        
        const metrics = parseRealMetrics(num);
        let recentTrackStatus = metrics.r10Count >= 2 ? "🔺 活躍" : (metrics.r10Count === 0 ? "❄️ 冰封" : "🔸 穩健");
        
        let badgeText = '機率:' + metrics.probPercent + '%';
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

        // 🛰️ 【360度空間防撞牆】動態計算上下與左右邊界
        cardElement.addEventListener('mouseover', function() {
            const rect = cardElement.getBoundingClientRect();
            
            // 🛡️ 1. 【上下防撞偵測】若頂部視口距離小於 340px 則強制向下彈出
            if (rect.top < 340) {
                cardElement.style.setProperty('--tooltip-top', '115%');
                cardElement.style.setProperty('--tooltip-bottom', 'auto');
                cardElement.style.setProperty('--arrow-top', '-12px');
                cardElement.style.setProperty('--arrow-bottom', 'auto');
                cardElement.style.setProperty('--arrow-color', 'transparent transparent rgba(20, 24, 33, 0.98) transparent');
            } else {
                cardElement.style.setProperty('--tooltip-top', 'auto');
                cardElement.style.setProperty('--tooltip-bottom', '115%');
                cardElement.style.setProperty('--arrow-top', 'auto');
                cardElement.style.setProperty('--arrow-bottom', '-12px');
                cardElement.style.setProperty('--arrow-color', 'rgba(20, 24, 33, 0.98) transparent transparent transparent');
            }

            // 🛡️ 2. 【左右防撞偵測】
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

        // 讀取真實特徵權重或給予預設值
        let evWeight = rawJsonData?.feature_importances?.ev_anti_collision_weight ? (rawJsonData.feature_importances.ev_anti_collision_weight * 100).toFixed(1) : "60.0";
        let macroFilter = rawJsonData?.feature_importances?.macro_distribution_filter ? (rawJsonData.feature_importances.macro_distribution_filter * 100).toFixed(1) : "40.0";
        
        cardElement.setAttribute('data-info',
            `🔮 號碼 ${formattedNum} AI 真實特徵報告\n` +
            `------------------------------------\n` +
            `💰 模型分配機率：${metrics.probPercent}%\n` +
            `⏱️ 真實盲門期數：${metrics.missedPeriods} 期\n` +
            `📈 當前變盤走勢：${recentTrackStatus}\n` +
            `------------------------------------\n` +
            `📊 歷史滾動開出次數 (真實數據)：\n` +
            `⏮️ 前 10 期開出：${metrics.r10Count} 次\n` +
            `⏮️ 前 20 期開出：${metrics.r20Count} 次\n` +
            `⏮️ 前 30 期開出：${metrics.r30Count} 次\n` +
            `------------------------------------\n` +
            `🤖 EV 期望值決策權重：\n` +
            `🛡️ 避撞號 EV 加權：${evWeight}%\n` +
            `⚖️ 巨觀分佈過濾：${macroFilter}%`
        );

        cardElement.innerHTML = `
            <div class="lotto-ball" style="background: ${ballColor}; margin: 0 auto;">${formattedNum}</div>
            <div class="prob-label" style="font-size: 11px; font-weight: bold; margin-top: 5px; color: #1a365d; line-height: 1.3;">
                <div>${badgeText}</div>
                <div style="color: #64748b; font-size: 10px; font-weight: normal; margin-top: 2px;">⏱️ 漏:${metrics.missedPeriods}期</div>
                <div style="color: #e53e3e; font-size: 10px; font-weight: normal;">🔥 10期:${metrics.r10Count}次</div>
            </div>`;

        cardElement.onclick = function() {
            toggleBallSelection(num);
        };
        
        allBallsContainer.appendChild(cardElement);
    });
}

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
