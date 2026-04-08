import pandas as pd

def generate_insights(df: pd.DataFrame, currency: str, forecast_results: list, anomaly_results: list) -> list:
    """
    Generate natural language insights from the data and models.
    """
    insights = []
    
    if df.empty:
        return ["No transactions to analyze."]
        
    # Basic summary stats
    expenses = df[df['type'] == 'expense']['amount'].sum()
    income = df[df['type'] == 'income']['amount'].sum()
    
    if income > 0 and expenses > income:
        insights.append(f"Warning: Your total expenses ({currency} {expenses:.2f}) exceed your income ({currency} {income:.2f}). Consider reducing discretionary spending.")
    elif income > 0:
        savings_rate = ((income - expenses) / income) * 100
        insights.append(f"Great job! Your current savings rate is {savings_rate:.1f}%.")
        
    # Forecast insights
    if forecast_results:
        top_forecast = forecast_results[0]
        insights.append(f"Forecast: Your highest predicted expense for the next 30 days is in '{top_forecast['category']}', estimated at {currency} {top_forecast['forecasted_amount']:.2f}.")
        
        increasing_trends = [f['category'] for f in forecast_results if f['trend'] == 'increasing']
        if increasing_trends:
            insights.append(f"Trend Alert: Spending is trending upwards in: {', '.join(increasing_trends[:3])}.")
            
    # Anomaly insights
    if anomaly_results:
        insights.append(f"Detected {len(anomaly_results)} unusual transaction(s) that differ from your normal spending patterns.")
        
    return insights
