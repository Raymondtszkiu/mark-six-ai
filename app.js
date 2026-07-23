async function loadAILottoDashboard() {
    const metaElement = document.getElementById("meta-info");
    const ballsContainer = document.getElementById("top-balls");

    try {
        const response = await fetch("./prediction_result.json");
        if (!response.ok) throw new Error("找不到預測數據檔案，請確認後端自動排程是否已運行成功。");
        const data = await response.json();

        const localTime = new Date(data.last_updated).toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong" });
        metaElement.innerHTML = `數據更新時間：${localTime}  •  模型已研讀歷史總期數：${data.total_periods_trained} 期`;

        const probArray = Object.entries(data.number_probabilities);
        probArray.sort((a, b) => b[1] - a[1]); // 精準降序排列
        const top6 = probArray.slice(0, 6);

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

        renderNativeChart(data.feature_importances);

    } catch (error) {
        console.error("前端載入失敗:", error);
        metaElement.innerHTML = `<span style="color:red;">⚠️ 載入失敗: ${error.message}</span>`;
    }
}

function renderNativeChart(importances) {
    const container = document.getElementById("native-chart-container");
    container.innerHTML = ""; 

    // 計算總權重以進行百分比歸一化顯示
    const total = importances.missed_periods + importances.hot_cold_10 + importances.recent_tracks + importances.odd_even_split + importances.color_bands_trend;

    const features = [
        { label: "歷史遺漏期數 (微觀)", value: (importances.missed_periods / total) * 100 },
        { label: "近 10 期冷熱度 (微觀)", value: (importances.hot_cold_10 / total) * 100 },
        { label: "近期開出軌跡 (微觀)", value: (importances.recent_tracks / total) * 100 },
        { label: "⚖️ 奇偶比例限制 (宏觀)", value: (importances.odd_even_split / total) * 100 },
        { label: "🎨 三門波段走勢 (宏觀)", value: (importances.color_bands_trend / total) * 100 }
    ];

    features.forEach(f => {
        const valPercent = f.value.toFixed(2);
        const rowHTML = `
            <div class="bar-row">
                <div class="bar-label" style="width: 170px;">${f.label}</div>
                <div class="bar-track">
                    <div class="bar-fill" style="width: ${valPercent}%;"></div>
                </div>
                <div class="bar-value">${valPercent}%</div>
            </div>
        `;
        container.insertAdjacentHTML("beforeend", rowHTML);
    });
}

document.addEventListener("DOMContentLoaded", loadAILottoDashboard);
