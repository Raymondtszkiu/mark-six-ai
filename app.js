let weightChart = null;

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
        probArray.sort((a, b) => b[1] - a[1]);
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

        renderWeightChart(data.feature_importances);
    } catch (error) {
        console.error("前端載入失敗:", error);
        metaElement.innerHTML = `<span style="color:red;">⚠️ 載入失敗: ${error.message}</span>`;
    }
}

function renderWeightChart(importances) {
    const ctx = document.getElementById('weightChart').getContext('2d');
    const labels = ["歷史遺漏期數", "近10期冷熱度", "前1期開出(t-1)", "前2期", "前3期", "前4期", "前5期"];
    const dataValues = [
        importances.missed_periods * 100, importances.hot_cold_10 * 100,
        importances.t_1 * 100, importances.t_2 * 100, importances.t_3 * 100, importances.t_4 * 100, importances.t_5 * 100
    ];

    if (weightChart) weightChart.destroy();

    weightChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '影響開獎機率的特徵比重 (%)',
                data: dataValues,
                backgroundColor: 'rgba(26, 54, 93, 0.75)',
                borderColor: 'rgba(26, 54, 93, 1)',
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, title: { display: true, text: '權重比例 (%)' } } },
            plugins: { legend: { display: false } }
        }
    });
}

document.addEventListener("DOMContentLoaded", loadAILottoDashboard);
