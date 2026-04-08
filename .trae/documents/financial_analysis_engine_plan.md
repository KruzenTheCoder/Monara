# Financial Analysis Engine Architecture Plan

## 1. Summary
You asked whether your financial analysis engine is best built in JavaScript or Python to provide **proper future analysis insight** and the **most accurate logic possible**. 

**Recommendation: Python**
While your frontend is built in React Native (JavaScript/TypeScript), **Python is the undisputed industry standard for financial analysis, machine learning, and accurate time-series forecasting**. 
- **Why Python?** Libraries like `pandas` (for data manipulation), `scikit-learn` (for anomaly detection), and `Prophet` or `statsmodels` (for predicting future spending trends) will give you highly accurate, institutional-grade insights.
- **Why not JS?** JavaScript is great for basic aggregations (which you are already doing in `AnalyticsScreen.tsx`), but it lacks robust, native data-science libraries. Doing complex forecasting in JS often leads to reinventing the wheel and less accurate logic.

To implement this, we will build a lightweight Python backend microservice (using FastAPI) that your React Native app will communicate with to get future insights.

## 2. Current State Analysis
- **Frontend**: A React Native (Expo) app handling basic budgeting and visual analytics (`src/screens/AnalyticsScreen.tsx`).
- **Data Management**: Handled via adapters (`src/db/DatabaseAdapter.ts` using Supabase/Firebase/AsyncStorage). 
- **Current Analytics**: Purely descriptive and client-side (e.g., Month-over-Month expenses, daily averages). There is currently no predictive modeling or advanced anomaly detection.

## 3. Proposed Changes

### Step 1: Initialize the Python Microservice
- Create a new directory `financial-engine/` alongside or inside the current workspace.
- Set up a Python virtual environment and a `requirements.txt` including:
  - `fastapi`, `uvicorn` (for the API server)
  - `pandas`, `numpy` (for data processing)
  - `scikit-learn` (for categorization and anomaly detection)
  - `prophet` (for time-series forecasting of future expenses)
- **File**: `financial-engine/main.py` (Entry point for the FastAPI server).

### Step 2: Implement Core Analysis Logic
Create specific modules in the Python backend to handle accurate financial logic:
- **`forecasting.py`**: Takes historical transaction data and predicts next month's spending by category using time-series analysis.
- **`anomalies.py`**: Detects unusual spending behavior (e.g., "Your dining out expense is 40% higher than your historical average this week").
- **`insights.py`**: Generates natural language insights based on the data (e.g., "If you continue this trend, you will fall short of your savings goal by $150").

### Step 3: Expose API Endpoints
Define FastAPI routes that the React Native app can call:
- `POST /api/v1/analyze`: Accepts an array of user transactions and returns categorized insights and anomalies.
- `POST /api/v1/forecast`: Accepts historical transactions and returns a 30-day or 3-month future spending prediction.

### Step 4: Frontend Integration (React Native)
- **Create API Client**: Add `src/utils/financialEngineApi.ts` to handle HTTP requests to the new Python backend.
- **Update UI**: Enhance `AnalyticsScreen.tsx` and `AIAssistantScreen.tsx` to display the "Future Insights" and "Forecasted Budget" returned by the Python API. 

## 4. Assumptions & Decisions
- **Decision**: Python is selected to maximize the accuracy and capability of the financial modeling, as requested.
- **Architecture**: We will use a decoupled architecture (React Native frontend + Python FastAPI backend). 
- **Data Privacy**: The React Native app will send anonymized transaction data (amounts, dates, categories) to the Python API for on-the-fly analysis, meaning the Python backend doesn't necessarily need direct access to the main database if we want to keep it stateless.

## 5. Verification Steps
1. **Backend Tests**: Write `pytest` scripts in the Python engine to verify that the forecasting logic accurately predicts trends on mock financial data.
2. **API Tests**: Use tools or Swagger UI (built into FastAPI) to ensure the endpoints accept transaction payloads and return the correct insight schema.
3. **End-to-End**: Run the React Native app, log new transactions, and verify that the "Future Insights" UI updates accurately based on the Python engine's response.
