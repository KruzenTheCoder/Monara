from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
from datetime import datetime

from forecasting import generate_forecast
from anomalies import detect_anomalies
from insights import generate_insights

app = FastAPI(title="Financial Analysis Engine", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Transaction(BaseModel):
    id: str
    amount: float
    type: str  # "income" or "expense"
    category: str
    date: str
    title: Optional[str] = ""

class AnalyzeRequest(BaseModel):
    transactions: List[Transaction]
    currency: str = "USD"

@app.get("/")
def read_root():
    return {"message": "Financial Analysis Engine API is running"}

@app.post("/api/v1/analyze")
def analyze_transactions(req: AnalyzeRequest):
    if not req.transactions:
        return {
            "forecast": [],
            "anomalies": [],
            "insights": ["No transaction data available for analysis."]
        }
        
    try:
        # Convert transactions to pandas DataFrame
        df = pd.DataFrame([t.dict() for t in req.transactions])
        
        # Ensure dates are datetime objects
        df['date'] = pd.to_datetime(df['date'])
        
        # Only process expenses for anomalies and forecasts (mostly)
        expenses_df = df[df['type'] == 'expense']
        
        # Run analysis modules
        forecast_results = generate_forecast(expenses_df)
        anomaly_results = detect_anomalies(expenses_df)
        insight_results = generate_insights(df, req.currency, forecast_results, anomaly_results)
        
        return {
            "forecast": forecast_results,
            "anomalies": anomaly_results,
            "insights": insight_results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
