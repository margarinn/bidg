from fastapi import FastAPI
import sqlite3
import pandas as pd
import os
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Analytics API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "olist_analytics.db")

@app.get("/api/v1/kpi")
def get_kpis():
    conn = sqlite3.connect(DB_PATH)
    total_sales = pd.read_sql("SELECT SUM(payment_value) as total FROM analytics_base", conn).iloc[0]['total']
    total_customers = pd.read_sql("SELECT COUNT(DISTINCT customer_unique_id) as total FROM analytics_base", conn).iloc[0]['total']
    total_orders = pd.read_sql("SELECT COUNT(DISTINCT order_id) as total FROM analytics_base", conn).iloc[0]['total']
    conn.close()
    return {
        "total_revenue": round(float(total_sales), 2),
        "total_customers": int(total_customers),
        "total_orders": int(total_orders)
    }

@app.get("/api/v1/clusters")
def get_clusters():
    conn = sqlite3.connect(DB_PATH)
    # We sample for performance in the showcase
    df = pd.read_sql("SELECT total_transaction_customer, total_payment_customer, cluster FROM analytics_base LIMIT 5000", conn)
    conn.close()
    return df.to_dict(orient="records")

@app.get("/api/v1/geospatial")
def get_geospatial():
    conn = sqlite3.connect(DB_PATH)
    # Aggregate sales by state
    df = pd.read_sql("SELECT customer_state, SUM(payment_value) as value FROM analytics_base GROUP BY customer_state", conn)
    conn.close()
    return df.to_dict(orient="records")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
