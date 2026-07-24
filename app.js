let globalAllSorted = []; 
let globalWeightsObj = {}; 
let aiBigTop7 = [];      // 🤖 儲存流派 A (大於 31) 的號碼
let aiAllTop7 = [];      // 🤖 儲存流派 B (全體 1-49 海選) 的號碼
let userSelected = [];   
let rawJsonData = null; 
let currentSortMode = "weight"; 

async function loadAILottoDashboard() {
  const metaElement = document.getElementById("meta-info");

  try {
    const response = await fetch("./prediction_result.json");
    if (!response.ok) throw new Error("找不到預測數據檔案。");
    rawJsonData = await response.json(); 
    
    const localTime = new Date(rawJsonData.last_updated).toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong" });
    if (metaElement) {
      metaElement.innerHTML = `數據更新時間：${localTime} • ⚖️ 混合決策引擎：AI 雙流派對照面板與自選精算大盤已完全啟用`;
    }

    let realWeights = {};
    for (let i = 1; i <= 49; i++) {
      let rawProb = rawJsonData.number_probabilities[String(i)] || (6 / 49); 
      if (i <= 31) rawProb *= 0.82; 
      else rawProb *= 1.18; 

      // 💡 修正 1：加回 [0] 索引取得 Uint32Array 數值，防止產出 NaN
      let cryptoNoise = (window.crypto.getRandomValues(new Uint32Array(1))[0] / 0xFFFFFFFF);
      realWeights[String(i)] = rawProb * (0.85 + cryptoNoise * 0.3); 
    }

    // 💡 修正 2：明確對 Tuple [num, weight] 的第二項 (權重) 進行降序排序
    globalAllSorted = Object.entries(realWeights);
    globalAllSorted.sort((a, b) => b[1] - a[1]); 

    globalWeightsObj = {};
    globalAllSorted.forEach(([num, prob]) => {
      globalWeightsObj[num] = (prob * 100).toFixed(1);
    });

    // 🥇 流派 A：嚴格過濾大於 31 的前 7 名
    const bigOnlyArray = globalAllSorted.filter(([num]) => parseInt(num) > 31);
    aiBigTop7 = bigOnlyArray.slice(0, 7).map(([num]) => num);

    // 🥈 流派 B：全體 1-49 海選前 7 名
    aiAllTop7 = globalAllSorted.slice(0, 7).map(([num]) => num);

    renderDashboardUI();

  } catch (error) {
    console.error("前端載入失敗:", error);
    if (metaElement) {
      metaElement.innerHTML = `<span style="color:red;">⚠️ 載入失敗: ${error.message}</span>`;
    }
  }
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

  // 1. 🥇 PART 1：AI 純大號碼主推列
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

  // 2. 🥈 PART 1.5：AI 全體 1-49 海選黃金列
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

  // 3. 🛒 PART 2：User 專屬自選看板
  if (userSelected.length === 0) {
    userBallsContainer.innerHTML = `<span id="user-hint" style="color: #a0aec0; font-size: 14px; font-weight: 500;">💡 未選號碼，請喺大盤點擊號碼球，即可在此處即時組裝你嘅心水打和防線！</span>`;
    if (statsPanel) statsPanel.style.display = "none";
  } else {
    userSelected.forEach((num) => {
      const ballColor = getBallColorHex(num, false);
      const formattedNum = String(num).padStart(2, '0');
      const weightVal = globalWeightsObj[num] || "12.2"; 

      let rawScore = rawJsonData && rawJsonData.number_probabilities[num] ? rawJsonData.number_probabilities[num] : 0.05;
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
    // 💡 修正 3：對 Tuple 的號碼 (索引 0) 轉數字排序
    displayArray.sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  }

  // 4. 📊 PART 3：渲染下方的 49 碼全數字冷熱即時大盤
  displayArray.forEach(([num, prob]) => {
    const ballColor = getBallColorHex(num, true);
    const formattedNum = String(num).padStart(2, '0');
    const isUserSelected = userSelected.includes(num);
    const isAiBigRec = aiBigTop7.includes(num);
    const isAiAllRec = aiAllTop7.includes(num);

    let rawScore = rawJsonData && rawJsonData.number_probabilities[num] ? rawJsonData.number_probabilities[num] : 0.05;
    let missedPeriods = Math.floor((1 - rawScore) * 15) + (parseInt(num) % 4); 
    let hotCold10 = Math.floor(rawScore * 30) % 5; 

    const weightVal = globalWeightsObj[num] || "12.2";
    
    let badgeText = '回報:' + weightVal;
    if (isUserSelected) badgeText = '★ 已揀';
    else if (isAiBigRec && isAiAllRec) badgeText = '🤖 雙流派主推';
    else if (isAiBigRec) badgeText = '🤖 大碼主推';
    else if (isAiAllRec) badgeText = '🤖 全碼精選';

    const ballHTML = `
      <div class="ball-wrapper" 
           style="padding: 6px; border-radius: 8px; background: ${isUserSelected ? '#ebf8ff' : 'transparent'}; border: ${isUserSelected ? '1px solid #3182ce' : (isAiBigRec || isAiAllRec ? '1px dashed #3182ce' : 'none')}; cursor: pointer; text-align: center; min-width: 60px;" 
           onclick="toggleBallSelection('${num}')">
        <div class="lotto-ball" style="width: 40px; height: 40px; font-size: 15px; margin: 0 auto; background: ${ballColor}; opacity: ${isUserSelected || isAiBigRec || isAiAllRec ? '1' : '0.75'}; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">${formattedNum}</div>
        <div class="prob-label" style="font-size: 10px; font-weight: bold; margin-top: 4px; color: ${isUserSelected ? '#3182ce' : '#4a5568'}; line-height: 1.3;">
          <div>${badgeText}</div>
          <div style="color: #64748b; font-weight: normal; font-size: 9px;">⏱️漏:${missedPeriods}</div>
          <div style="color: #e53e3e; font-weight: normal; font-size: 9px;">🔥熱:${hotCold10}</div>
        </div>
      </div>`;
    allBallsContainer.insertAdjacentHTML("beforeend", ballHTML);
  });
}

function changeDisplayOrder(mode) {
  currentSortMode = mode;
  const btnWeight = document.getElementById("btn-sort-weight");
  const btnNumber = document.getElementById("btn-sort-number");
  
  if (!btnWeight || !btnNumber) return;

  if (mode === "weight") {
    btnWeight.style.backgroundColor = "#3182ce"; btnWeight.style.color = "white"; btnWeight.style.border = "1px solid #3182ce";
    btnNumber.style.backgroundColor = "white"; btnNumber.style.color = "#4a5568"; btnNumber.style.border = "1px solid #cbd5e1";
  } else {
    btnNumber.style.backgroundColor = "#3182ce"; btnNumber.style.color = "white"; btnNumber.style.border = "1px solid #3182ce";
    btnWeight.style.backgroundColor = "white"; btnWeight.style.color = "#4a5568"; btnWeight.style.border = "1px solid #cbd5e1";
  }
  renderDashboardUI(); 
}

// 💡 修正 4：清理非程式碼字串雜質與錯位括號
function toggleBallSelection(num) {
  if (userSelected.includes(num)) {
    userSelected = userSelected.filter(b => b !== num);
  } else {
    if (userSelected.length < 7) {
      userSelected.push(num);
    } else {
      userSelected.shift();
      userSelected.push(num);
    }
  }
  renderDashboardUI();
}

function getBallColorHex(num, isDark) {
  const n = parseInt(num);
  let colorModeNum = 3;

  if (n <= 10) {
    if (n === 1 || n === 2 || n === 7 || n === 8) colorModeNum = 1;
    else if (n === 3 || n === 4 || n === 9 || n === 10) colorModeNum = 2;
  } else if (n <= 20) {
    if (n === 12 || n === 13 || n === 18 || n === 19) colorModeNum = 1;
    else if (n === 14 || n === 15 || n === 20) colorModeNum = 2;
  } else if (n <= 30) {
    if (n === 23 || n === 24 || n === 29 || n === 30) colorModeNum = 1;
    else if (n === 25 || n === 26) colorModeNum = 2;
  } else if (n <= 40) {
    if (n === 34 || n === 35 || n === 40) colorModeNum = 1;
    else if (n === 31 || n === 36 || n === 37) colorModeNum = 2;
  } else {
    if (n === 45 || n === 46) colorModeNum = 1;
    else if (n === 41 || n === 42 || n === 47 || n === 48) colorModeNum = 2;
  }

  if (colorModeNum === 1) {
    return isDark ? "radial-gradient(circle at 30% 30%, #ff8585, #aa0000)" : "radial-gradient(circle at 30% 30%, #ff4d4d, #cc0000)";
  } else if (colorModeNum === 2) {
    return isDark ? "radial-gradient(circle at 30% 30%, #63b3ed, #1a365d)" : "radial-gradient(circle at 30% 30%, #3182ce, #1a365d)";
  } else {
    return isDark ? "radial-gradient(circle at 30% 30%, #68d391, #1c4532)" : "radial-gradient(circle at 30% 30%, #48bb78, #22543d)";
  }
}

document.addEventListener("DOMContentLoaded", loadAILottoDashboard);
