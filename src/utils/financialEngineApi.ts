// API Client for the Python Financial Analysis Engine

export interface FinancialForecast {
  category: string;
  forecasted_amount: number;
  trend: 'increasing' | 'decreasing';
}

export interface FinancialAnomaly {
  id: string;
  category: string;
  amount: number;
  date: string;
  title: string;
  reason: string;
}

export interface AnalysisResult {
  forecast: FinancialForecast[];
  anomalies: FinancialAnomaly[];
  insights: string[];
}

// In production, this would be your deployed FastAPI URL (e.g., https://api.yourdomain.com)
const API_BASE_URL = 'http://localhost:8000';

export const analyzeFinancialData = async (
  transactions: any[],
  currency: string = 'USD'
): Promise<AnalysisResult | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactions: transactions.map(t => ({
          id: t.id || Math.random().toString(),
          amount: t.amount,
          type: t.type,
          category: t.category,
          date: new Date(t.date).toISOString(),
          title: t.title || ''
        })),
        currency
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch financial analysis:', error);
    return null;
  }
};
