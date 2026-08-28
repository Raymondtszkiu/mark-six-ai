import sys
import json
import requests
import numpy as np

MIN_NUM = 1
MAX_NUM = 49

def fetch_and_clean_data():
    # 馬會官方 GraphQL Endpoint (精準對應你截圖右側的請求網址)
    TARGET_URL = "https://info.cld.hkjc.com/graphql/base/"
    
    # 構造 GraphQL Query (拉取最近開獎結果，足夠覆蓋歷史數據)
    payload = {
        "query": """
            query {
              lotteryDraws(lottoType: "MK6", pageSize: 200) {
                id
                drawDate
                drawResult {
                  drawNo
                  xDrawNo
                }
              }
            }
        """
    }
    
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Origin": "https://bet.hkjc.com",
        "Referer": "https://bet.hkjc.com/"
    }
    
    try:
        response = requests.post(TARGET_URL, json=payload, headers=headers, timeout=15)
        response.raise_for_status()
        result = response.json()
        
        draws_data = result.get("data", {}).get("lotteryDraws", [])
        if not draws_data:
            raise ValueError("GraphQL 回傳的 lotteryDraws 陣列為空。")
            
        cleaned_draws = []
        for draw in draws_data:
            res = draw.get("drawResult")
            if not res:
                continue # 略過尚未開彩的期數
                
            regular_nums = res.get("drawNo", [])
            special_num = res.get("xDrawNo")
            
            if len(regular_nums) == 6 and special_num is not None:
                # 組合成完整的 7 碼陣列 (6正碼 + 1特碼)
                full_draw = [int(n) for n in regular_nums] + [int(special_num)]
                # 嚴格驗證數字範圍
                if all(MIN_NUM <= n <= MAX_NUM for n in full_draw):
                    cleaned_draws.append(full_draw)
                    
        if not cleaned_draws:
            raise ValueError("無法從 GraphQL JSON 中解析出有效的開獎組合。")
            
        # 馬會 API 通常回傳由新到舊，反轉陣列讓舊到新排列供演算使用
        return cleaned_draws[::-1]
        
    except Exception as e:
        print(f"❌ 馬會官方 API 擷取失敗: {e}")
        sys.exit(1)

def generate_calibrated_ev_matrix(draws):
    counts = np.zeros(MAX_NUM)
    for d in draws:
        for num in d:
            if MIN_NUM <= num <= MAX_NUM:
                counts[num - 1] += 1
                
    raw_freq = (counts + 1) / (len(draws) + MAX_NUM)
    ev_weights = np.where(np.arange(1, MAX_NUM + 1) > 31, 1.25, 0.8)
    raw_ev_probs = raw_freq * ev_weights
    calibrated_probs = (raw_ev_probs / raw_ev_probs.sum()) * 7.0
    return calibrated_probs

def main():
    print("🔄 開始透過馬會官方 GraphQL API 同步最新開獎數據...")
    draws = fetch_and_clean_data()
    print(f"✅ 成功獲取 {len(draws)} 期官方真實歷史數據！")
    
    probs = generate_calibrated_ev_matrix(draws)
    
    rolling_output = {}
    for num in range(MIN_NUM, MAX_NUM + 1):
        recent_10 = draws[-10:] if len(draws) >= 10 else draws
        recent_20 = draws[-20:] if len(draws) >= 20 else draws
        recent_30 = draws[-30:] if len(draws) >= 30 else draws
        
        r10 = sum(1 for d in recent_10 if num in d) / (len(recent_10) or 1)
        r20 = sum(1 for d in recent_20 if num in d) / (len(recent_20) or 1)
        r30 = sum(1 for d in recent_30 if num in d) / (len(recent_30) or 1)
        
        missed = 0
        for d in reversed(draws):
            if num in d:
                break
            missed += 1
            
        momentum = round((r10 + 1e-5) / (r30 + 1e-5), 2)
            
        rolling_output[str(num)] = {
            "r10": round(r10, 4),
            "r20": round(r20, 4),
            "r30": round(r30, 4),
            "missed": missed,
            "momentum": momentum
        }

    output_data = {
        "last_updated": str(np.datetime64('now') + np.timedelta64(8, 'h')),
        "total_periods_trained": len(draws),
        "number_probabilities": {str(i+1): round(float(probs[i]), 4) for i in range(MAX_NUM)},
        "rolling_features": rolling_output,
        "feature_importances": {
            "ev_anti_collision_weight": 0.60,
            "macro_distribution_filter": 0.40
        }
    }
    
    with open("prediction_result.json", "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
        
    print("🎉 預測更新成功！官方數據已成功寫入 prediction_result.json")

if __name__ == "__main__":
    main()
