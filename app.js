async function loadAILottoDashboard() {
    const metaElement = document.getElementById("meta-info");
    const ballsContainer = document.getElementById("top-balls");

    try {
        // 讀取本地同目錄下的預測 JSON
        const response = await fetch("./prediction_result.json");
        if (!response.ok) throw new Error("找不到預測數據檔案，請確認後端自動排程是否已運行成功。");
        const data = await response.json();

        // 轉換並更新時間
        const localTime = new Date(data.last_updated).toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong" });
        metaElement.innerHTML = `數據更新時間：${localTime}  •  模型已研讀歷史總期數：${data.total_periods_trained} 期`;

        // 排序 49 個號碼的機率並找出前 6 高
        const probArray = Object.entries(data.number_probabilities);
        probArray.sort((a, b) => b[1] - a[1]); // 確保正確的數值降序排列
        const top6 = probArray.slice(0, 6);

        // 渲染號碼球
        ballsContainer.innerHTML = "";
        top6.forEach(([num, prob]) => {
            const percentage = (prob * 100).toFixed(2);
            const formattedNum = String(num).padStart(2, '0');
            const ballHTML = `
                <div class="ball-wrapper">
                    <div class="lotto-ball">${formattedNum}</div>
                    <div class="prob-label">機率: ${percentage}%</div>
                </div>`;
            ballsContainer.insertAdjacentHTML("beforeend", ballHTML);
        });

        // 呼叫原生圖表渲染，直接避開 Chart.js
        renderNativeChart(data.feature_importances);

    } catch (error) {
        console.error("前端載入失敗:", error);
        metaElement.innerHTML = `<span style="color:red;">⚠️ 載入失敗: ${error.message}</span>`;
    }
}

/**
 * 使用原生 HTML/CSS 渲染極速長條圖
 */
function renderNativeChart(importances) {
    const container = document.getElementById("native-chart-container");
    container.innerHTML = ""; // 清空

    // 設定特徵對應名與其權重數據
    const features = [
        { label: "歷史遺漏期數", value: importances.missed_periods * 100 },
        { label: "近10期冷熱度", value: importances.hot_cold_10 * 100 },
        { label: "前1期開出(t-1)", value: importances.t_1 * 100 },
        { label: "前2期開出(t-2)", value: importances.t_2 * 100 },
        { label: "前3期開出(t-3)", value: importances.t_3 * 100 },
        { label: "前4期開出(t-4)", value: importances.t_4 * 100 },
        { label: "前5期開出(t-5)", value: importances.t_5 * 100 }
    ];

    // 動態生成帶有過渡動畫的長條圖
    features.forEach(f => {
        const valPercent = f.value.toFixed(2);
        const rowHTML = `
            <div class="bar-row">
                <div class="bar-label">${f.label}</div>
                <div class="bar-track">
                    <div class="bar-fill" style="width: ${valPercent}%;"></div>
                </div>
                <div class="bar-value">${valPercent}%</div>
            </div>
        `;
        container.insertAdjacentHTML("beforeend", rowHTML);
    });
}

// 網頁載入完成後自動執行
document.addEventListener("DOMContentLoaded", loadAILottoDashboard);
