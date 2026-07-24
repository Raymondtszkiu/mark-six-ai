import os
import json
import numpy as np
import requests
from sklearn.ensemble import RandomForestClassifier

MIN_NUM = 1
MAX_NUM = 49
DATA_URL = "https://lottdata.com" 

def fetch_and_clean_data():
    try:
        response = requests.get(DATA_URL, timeout=15)
        if response.status_code == 200:
            raw_data = response.json()
            sorted_data = sorted(raw_data, key=lambda x: int(x.get('draw_id', x.get('id', 0))))
            cleaned_draws = []
            for period in sorted_data:
                res_key = 'result' if 'result' in period else 'numbers'
                sp_key = 'special' if 'special' in period else 'extra'
                cleaned_draws.append([int(n) for n in period[res_key]] + [int(period[sp_key])])
            return cleaned_draws
    except Exception as e:
        print(f"⚠️ API 異常: {e}")
    return [list(np.random.choice(range(1, 50), 7, replace=False)) for _ in range(100)]

def generate_features(draws, target_period_idx):
    past_data = draws[:target_period_idx]
    current_draw = draws[target_period_idx]
    recent_3_draws = past_data[-3:] if len(past_data) >= 3 else past_data
    
    red_zone_count = green_zone_count = blue_zone_count = odd_count_total = consecutive_pairs_count = 0
    for draw in recent_3_draws:
        sorted_main = sorted(draw[:6]) 
        for num in sorted_main:
            if 1 <= num <= 16: red_zone_count += 1
            elif 17 <= num <= 32: green_zone_count += 1
            elif 33 <= num <= 49: blue_zone_count += 1
            if num % 2 != 0: odd_count_total += 1
        for idx in range(len(sorted_main) - 1):
            if sorted_main[idx + 1] - sorted_main[idx] == 1:
                consecutive_pairs_count += 1
            
    total_counted = len(recent_3_draws) * 6 if len(recent_3_draws) > 0 else 1
    total_draws_len = len(recent_3_draws) if len(recent_3_draws) > 0 else 1
    
    red_ratio, green_ratio, blue_ratio = red_zone_count/total_counted, green_zone_count/total_counted, blue_zone_count/total_counted
    odd_ratio_macro = odd_count_total / total_counted
    consecutive_trend = consecutive_pairs_count / total_draws_len 

    features, labels = [], []
    for num in range(MIN_NUM, MAX_NUM + 1):
        missed_count = 0
        for draw in reversed(past_data):
            if num in draw: break
            missed_count += 1
            
        recent_10 = past_data[-10:] if len(past_data) >= 10 else past_data
        appearance_10 = sum(1 for draw in recent_10 if num in draw)
        
        recent_5 = past_data[-5:] if len(past_data) >= 5 else past_data
        track_5 = [1 if num in draw else 0 for draw in recent_5]
        while len(track_5) < 5: track_5.insert(0, 0)
            
        is_odd = 1 if num % 2 != 0 else 0
        in_red = 1 if 1 <= num <= 16 else 0
        in_green = 1 if 17 <= num <= 32 else 0
        in_blue = 1 if 33 <= num <= 49 else 0
        
        neighbor_count = 0
        for draw in recent_5:
            if (num - 1) in draw[:6] or (num + 1) in draw[:6]: neighbor_count += 1
        neighbor_ratio = neighbor_count / 5
        
        feature_vector = [
            missed_count, appearance_10, 
            track_5[0], track_5[1], track_5[2], track_5[3], track_5[4],
            is_odd, in_red, in_green, in_blue,
            red_ratio if in_red else (green_ratio if in_green else blue_ratio),
            odd_ratio_macro if is_odd else (1 - odd_ratio_macro),
            neighbor_ratio, 
            consecutive_trend 
        ]
        features.append(feature_vector)
        labels.append(1 if num in current_draw else 0)
    return features, labels

def main():
    historical_draws = fetch_and_clean_data()
    X_train, y_train = [], []
    for i in range(15, len(historical_draws)):
        X_period, y_period = generate_features(historical_draws, i)
        X_train.extend(X_period)
        y_train.extend(y_period)
        
    model = RandomForestClassifier(n_estimators=150, random_state=42)
    model.fit(np.array(X_train), np.array(y_train))
    
    current_features, _ = generate_features(historical_draws, len(historical_draws)-1)
    probabilities = model.predict_proba(current_features)[:, 1]
    
    # 🚀 核心新增：提取 10/20/30 期多時間窗口滾動特徵與動量比值 M
    rolling_features_output = {}
    eps = 1e-5
    past_data = historical_draws
    
    for num in range(MIN_NUM, MAX_NUM + 1):
        recent_10 = past_data[-10:] if len(past_data) >= 10 else past_data
        recent_20 = past_data[-20:] if len(past_data) >= 20 else past_data
        recent_30 = past_data[-30:] if len(past_data) >= 30 else past_data
        
        r10 = sum(1 for draw in recent_10 if num in draw) / (len(recent_10) or 1)
        r20 = sum(1 for draw in recent_20 if num in draw) / (len(recent_20) or 1)
        r30 = sum(1 for draw in recent_30 if num in draw) / (len(recent_30) or 1)
        
        # 動量比值 (10期熱度 / 30期熱度)
        momentum = round((r10 + eps) / (r30 + eps), 2)
        
        rolling_features_output[str(num)] = {
            "r10": round(r10, 4),
            "r20": round(r20, 4),
            "r30": round(r30, 4),
            "momentum": momentum
        }

    importances = model.feature_importances_
    output_data = {
        "last_updated": str(np.datetime64('now') + np.timedelta64(8, 'h')),
        "total_periods_trained": len(historical_draws),
        "number_probabilities": {str(num): float(prob) for num, prob in zip(range(MIN_NUM, MAX_NUM + 1), probabilities)},
        "rolling_features": rolling_features_output,  # 🚀 成功寫入滾動特徵數據
        "feature_importances": {
            "missed_periods": float(importances[0]),
            "hot_cold_10": float(importances[1]),
            "recent_tracks": float(sum(importances[2:7])),
            "odd_even_split": float(importances[7] + importances[12]), 
            "color_bands_trend": float(sum(importances[8:12])),
            "consecutive_analysis": float(importances[13] + importances[14])
        }
    }
    
    with open("prediction_result.json", "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    print("🎉 終極修復預測成功！滾動特徵已成功寫入 JSON。")

if __name__ == "__main__":
    main()
