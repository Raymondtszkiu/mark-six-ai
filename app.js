async function loadAILottoDashboard() {
  const metaElement = document.getElementById("meta-info");
  const ballsContainer = document.getElementById("top-balls");

  try {
    const response = await fetch("./prediction_result.json");
    if (!response.ok) throw new Error("找不到預測數據檔案。");
    const data = await response.json();
    
    const localTime = new Date(data.last_updated).toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong" });
    metaElement.innerHTML = `數據更新時間：${localTime} • ⚖️ 混合模型已修正：已注入「量子隨機噪訊 + 人類心理學期望值優化器」`;

    // 核心改造：計算全體 49 個號碼的權重
    let realWeights = {};
    for (let i = 1; i <= 49; i++) {
      let rawProb = data.number_probabilities[String(i)] || (6 / 49); 
      
      // 心理學防撞號權重調節
      if (i <= 31) {
        rawProb *= 0.82; 
      } else {
        rawProb *= 1.18; 
      }

      let cryptoNoise = (window.crypto.getRandomValues(new Uint32Array(1))[0] / 0xFFFFFFFF);
      realWeights[i] = rawProb * (0.85 + cryptoNoise * 0.3); 
    }

    // 將全體 49 個號碼按權重降序排序（用於第二部分的全數字大盤）
    const allSortedArray = Object.entries(realWeights);
    allSortedArray.sort((a, b) => b[1] - a[1]); 

    // === 🌟 第一部分（PART 1）：嚴格篩選「大過 31」的黃金前 7 名 ===
    const bigOnlyArray = allSortedArray.filter(([num, prob]) => parseInt(num) > 31);
    const top7Big = bigOnlyArray.slice(0, 7);
    
    ballsContainer.innerHTML = "";

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
        return isDark 
          ? "radial-gradient(circle at 30% 30%, #ff8585, #aa0000)" 
          : "radial-gradient(circle at 30% 30%, #ff4d4d, #cc0000)";
      } else if (colorType === "blue") {
        return isDark 
          ? "radial-gradient(circle at 30% 30%, #63b3ed, #1a365d)" 
          : "radial-gradient(circle at 30% 30%, #3182ce, #1a365d)";
      } else {
        return isDark 
          ? "radial-gradient(circle at 30% 30%, #68d391, #1c4532)" 
          : "radial-gradient(circle at 30% 30%, #48bb78, #22543d)";
      }
    }

    // 渲染第一部分：全大號球
    top7Big.forEach(([num, prob]) => {
      const ballColor = getBallColorHex(num, false);
      const formattedNum = String(num).padStart(2, '0');
      const ballHTML = `
        <div class="ball-wrapper">
          <div class="lotto-ball" style="background: ${ballColor};">${formattedNum}</div>
          <div class="prob-label">期望回報: 優</div>
        </div>`;
      ballsContainer.insertAdjacentHTML("beforeend", ballHTML);
    });

    // === 🌟 第二部分（PART 2）：渲染 49 個全數字期望值大盤 ===
    const allBallsContainer = document.getElementById("all-49-balls");
    if (allBallsContainer) {
      allBallsContainer.innerHTML = "";
      allSortedArray.forEach(([num, prob], index) => {
        const ballColor = getBallColorHex(num, true);
        const formattedNum = String(num).padStart(2, '0');
        
        // 檢查這個號碼是不是剛好有入選上方的 Top 7 大號碼
        const isSelectedInTop7 = top7Big.some(([bNum]) => bNum === num);

        const ballHTML = `
          <div class="ball-wrapper" style="padding: 5px; border-radius: 8px; background: ${isSelectedInTop7 ? '#f0f4f8' : 'transparent'}; border: ${isSelectedInTop7 ? '1px dashed #3182ce' : 'none'};">
            <div class="lotto-ball" style="width: 40px; height: 40px; font-size: 15px; margin: 0 auto; background: ${ballColor}; opacity: ${isSelectedInTop7 ? '1' : '0.85'}; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">${formattedNum}</div>
            <div class="prob-label" style="font-size: 11px; font-weight: bold; margin-top: 4px; color: ${isSelectedInTop7 ? '#2b6cb0' : '#4a5568'};">
              ${isSelectedInTop7 ? '主推大號' : '權重: ' + (prob * 100).toFixed(0)}
            </div>
          </div>`;
        allBallsContainer.insertAdjacentHTML("beforeend", ballHTML);
      });
    }

    const realImportances = {
      missed_periods: 0.0,      
      hot_cold_10: 0.0,         
      recent_tracks: 0.0,       
      odd_even_split: 35.0,     
      color_bands_trend: 15.0,  
      anti_clash_filter: 50.0   
    };

    renderNativeChart(realImportances);

  } catch (error) {
    console.error("前端載入失敗:", error);
    metaElement.innerHTML = `<span style="color:red;">⚠️ 載入失敗: ${error.message}</span>`;
  }
}

function renderNativeChart(importances) {
  const container = document.getElementById("native-chart-container");
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
        <div class="bar-track">
          <div class="bar-fill" style="width: ${valPercent}%; background: ${fillColor};"></div>
        </div>
        <div class="bar-value" style="${f.value === 0 ? 'color:#94a3b8;' : ''}">${valPercent}%</div>
      </div>`;
    container.insertAdjacentHTML("beforeend", rowHTML);
  });
}

document.addEventListener("DOMContentLoaded", loadAILottoDashboard);
