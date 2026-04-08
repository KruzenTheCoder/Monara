import pandas as pd
from sklearn.ensemble import IsolationForest

def detect_anomalies(df: pd.DataFrame) -> list:
    """
    Detect unusual spending amounts or frequencies using Isolation Forest.
    """
    if df.empty or len(df) < 10:
        return []

    anomalies = []
    
    categories = df['category'].unique()
    
    for category in categories:
        cat_data = df[df['category'] == category].copy()
        
        if len(cat_data) < 5:
            continue
            
        # Fit Isolation Forest
        X = cat_data[['amount']].values
        
        # Adjust contamination rate (percentage of data expected to be anomalies)
        model = IsolationForest(contamination=0.1, random_state=42)
        cat_data['anomaly'] = model.fit_predict(X)
        
        # -1 means anomaly
        anomaly_rows = cat_data[cat_data['anomaly'] == -1]
        
        for _, row in anomaly_rows.iterrows():
            anomalies.append({
                "id": row['id'],
                "category": category,
                "amount": float(row['amount']),
                "date": row['date'].strftime('%Y-%m-%d'),
                "title": row.get('title', ''),
                "reason": f"Unusually high or low amount for {category}"
            })
            
    return anomalies
