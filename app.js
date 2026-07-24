let globalAllSorted = [];
let currentTop7 = [];

async function loadAILottoDashboard() {
  const metaElement = document.getElementById("meta-info");

  try {
    const response = await fetch("./prediction_result.json");
    if (!response.ok) throw new Error("找不到預測數據檔案。");
    const data = await response.json();
    
    const localTime = new Date(data.last_updated).toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong" });
    metaElement.innerHTML = `數據更新時間：${localTime} • 🖱️ 系統已升級：動態互動選號面板已啟用`;

    let realWeights = {};
    for (let i = 1; i <= 49; i++) {
      let rawProb = data.number_probabilities[String(i)] || (6 / 49); 
      
      if (i <= 31) {
        rawProb *= 0.82; 
      } else {
        rawProb *= 1.18; 
      }

      let cryptoNoise = (window.crypto.getRandomValues(new Uint32Array(1)) / 0xFFFFFFFF);
      realWeights[i] = rawProb * (0.85 + cryptoNoise * 0.3); 
    }

    // 儲存全局排序
    globalAllSorted = Object.entries(realWeights);
    globalAllSorted.sort((a, b) => b - a); 

    // 初始化：預設抓取大過 31 的前 7 名
    const bigOnlyArray = globalAllSorted.filter(([num, prob]) => parseInt(num) > 31);
    currentTop7 = bigOnlyArray.slice(0, 7).map(([num]) => num);

    // 呼叫動態渲染畫面的函式
    renderDashboardUI();

    // 修正儀表板圖表
    const realImportances = { missed_periods: 0.0, hot_cold_10: 0.0, recent_tracks: 0.0, odd_even_split: 35.0, color_bands_trend: 15.0, anti_clash_filter: 50.0 };
    renderNativeChart(realImportances);

  } catch (error) {
    console.error("前端載入失敗:", error);
    metaElement.innerHTML = `<span style="color:red;">⚠️ 載入失敗: ${error.message}</span>`;
  }
}

// 🏆 核心互動渲染器：負責即時重繪球體狀態
function renderDashboardUI() {
  const ballsContainer = document.getElementById("top-balls");
  const allBallsContainer = document.getElementById("all-49-balls");
  
  if (!ballsContainer || !allBallsContainer) return;
  
  ballsContainer.innerHTML = "";
  allBallsContainer.innerHTML = "";

  // 1. 渲染上方的 Top 7 號碼（可能包含用戶手動點選換進來的號碼）
  currentTop7.forEach((num) => {
    const ballColor = getBallColorHex(num, false);
    const formattedNum = String(num).padStart(2, '0');
    const ballHTML = `
      <div class="ball-wrapper" style="cursor: pointer;" onclick="removeBallFromTop('${num}')" title="點擊將此號碼移出主推組合">
        <div class="lotto-ball" style="background: ${ballColor};">${formattedNum}</div>
        <div class="prob-label" style="color: #2b6cb0; font-weight: bold;">已選定 ❌</div>
      </div>`;
    ballsContainer.insertAdjacentHTML("beforeend", ballHTML);
  });

  // 2. 渲染下方的 49 碼大盤（支援點擊互動）
  globalAllSorted.forEach(([num, prob], index) => {
    const ballColor = getBallColorHex(num, true);
    const formattedNum = String(num).padStart(2, '0');
    const isSelected = currentTop7.includes(num);

    const ballHTML = `
      <div class="ball-wrapper" 
           style="padding: 5px; border-radius: 8px; background: ${isSelected ? '#ebf8ff' : 'transparent'}; border: ${isSelected ? '1px solid #3182ce' : 'none'}; cursor: pointer;" 
           onclick="toggleBallSelection('${num}')"
           title="${isSelected ? '已在組合中' : '點擊將此號碼換入上方組合'}">
        <div class="lotto-ball" style="width: 40px; height: 40px; font-size: 15px; margin: 0 auto; background: ${ballColor}; opacity: ${isSelected ? '1' : '0.8'}; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">${formattedNum}</div>
        <div class="prob-label" style="font-size: 11px; font-weight: bold; margin-top: 4px; color: ${isSelected ? '#3182ce' : '#4a5568'};">
          ${isSelected ? '★ 已選碼' : '權重: ' + (prob * 100).toFixed(0)}
        </div>
      </div>`;
    allBallsContainer.insertAdjacentHTML("beforeend", ballHTML);
  });
}

// 🖱️ 互動邏輯 A：點擊大盤球的切換行為
function toggleBallSelection(num) {
  if (currentTop7.includes(num)) {
    // 如果已經選了，就移除它
    removeBallFromTop(num);
  } else {
    // 如果沒選，且目前少於 7 個，就直接加進去
    if (currentTop7.length < 7) {
      currentTop7.push(num);
    } else {
      // 如果已經滿 7 個，點擊新號碼時，自動把第一個「主推大號」擠掉（實現替換）
      currentTop7.shift();
      currentTop7.push(num);
    }
    renderDashboardUI(); // 重新整理畫面
  }
}

// 🖱️ 互動邏輯 B：移除選定狀態
function removeBallFromTop(num) {
  currentTop7 = currentTop7.filter(b => b !== num);
  renderDashboardUI(); // 重新整理畫面
}

// 純數學波色判定函數
function getBallColorHex(num, isDark) {
  const n = parseInt(num);
  let colorType = "green"; 
  if (n === 1 || n === 2 || n === 7 || n === 8 || n === 12 || n === 13 || n === 18 || n === 19 || n === 23 || n === 24 || n === 29 || n === 30 || n === 34 || n === 35 || n === 40 || n === 45 || n === 46) {
    colorType = "red";
  } else if (n === 3 || n === 4 || n === 9 || n === 10 || n === 14 || n === 15 || n === 20 || n === 25 || n === 26 || n === 31 || n === 36 || n === 37 || n === 41 || n === 42 || n === 47 || n === 48) {
    colorType = "blue";
  }
  if (colorType === "red") {
    return isDark ? "radial-gradient(circle at 30% 30%, #ff8585, #aa0000)" : "radial-gradient(circle at 30% 30%, #ff4d4d, #cc0000)";
  } else if (colorType === "blue") {
    return isDark ? "radial-gradient(circle at 30% 30%, #63b3ed, #1a365d)" : "radial-gradient(circle at 30% 30%, #3182ce, #1a365d)";
  } else {
    return isDark ? "radial-gradient(circle at 30% 30%, #68d391, #1c4532)" : "radial-gradient(circle at 30% 30%, #48bb78, #22543d)";
  }
}

function renderNativeChart(importances) {
  const container = document.getElementById("native-chart-container");
  if (!container) return;
  container.innerHTML = "";
  const features = [
    { label: "❌ 歷史遺漏期數 (微觀噪音)", value: importances.missed_periods },
    { label: "❌ 近 10 期冷熱度 (微觀噪音)", value: importances.hot_cold_10 },
    { label: "❌ 近期開出軌跡 (微觀噪音)", value: importances.recent_tracks },
    { label: "⚖️ 奇偶比例常態限制 (數學宏觀)", value: importances.odd_even_split },
    { label: "🎨 三門波段常態走勢 (數學宏觀)", value: importances.color_bands_trend },
    { label: "🧠 心理學反撞號期望值優化 (綜合)", value: importances.anti_clash_filter }
  ];
  features.forEach(f => {
    const valPercent = f.value.toFixed(2);
    const fillColor = f.value === 0 ? "#cbd5e1" : "linear-gradient(90deg, #3182ce, #1a365d)";
    const rowHTML = `
      <div class="bar-row">
        <div class="bar-label" style="${f.value === 0 ? 'color:#94a3b8;' : ''}">${f.label}</div>
        <div class="bar-track"><div class="bar-fill" style="width: ${valPercent}%; background: ${fillColor};"></div></div>
        <div class="bar-value" style="${f.value === 0 ? 'color:#94a3b8;' : ''}">${valPercent}%</div>
      </div>`;
    container.insertAdjacentHTML("beforeend", rowHTML);
  });
}

document.addEventListener("DOMContentLoaded", loadAILottoDashboard);
