import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from datetime import timedelta

def generate_forecast(df: pd.DataFrame) -> list:
    """
    Predict next month's spending by category using linear regression 
    over historical daily aggregate data.
    """
    if df.empty or len(df) < 5:
        return []

    # Group by category and date to get daily spend per category
    daily_spend = df.groupby(['category', df['date'].dt.date])['amount'].sum().reset_index()
    daily_spend['date'] = pd.to_datetime(daily_spend['date'])
    
    forecasts = []
    
    categories = daily_spend['category'].unique()
    
    for category in categories:
        cat_data = daily_spend[daily_spend['category'] == category].sort_values('date')
        
        # We need at least a few data points to run a regression
        if len(cat_data) < 3:
            continue
            
        # Prepare data for regression: x = days since first transaction, y = amount
        min_date = cat_data['date'].min()
        cat_data['days_since'] = (cat_data['date'] - min_date).dt.days
        
        X = cat_data[['days_since']].values
        y = cat_data['amount'].values
        
        model = LinearRegression()
        model.fit(X, y)
        
        # Predict next 30 days
        last_day = cat_data['days_since'].max()
        future_days = np.array([[last_day + i] for i in range(1, 31)])
        predictions = model.predict(future_days)
        
        # Ensure no negative predictions for expenses
        predictions = np.maximum(predictions, 0)
        
        total_forecast_30_days = float(np.sum(predictions))
        
        if total_forecast_30_days > 0:
            forecasts.append({
                "category": category,
                "forecasted_amount": round(total_forecast_30_days, 2),
                "trend": "increasing" if model.coef_[0] > 0 else "decreasing"
            })
            
    # Sort by highest forecasted amount
    forecasts = sorted(forecasts, key=lambda x: x['forecasted_amount'], reverse=True)
    
    return forecasts
