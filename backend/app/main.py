from fastapi import FastAPI
import sqlite3
import pandas as pd
import os
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="API Analitik")

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
    
    # Revenue by Tier (Cluster 0=Tier 3, 1=Tier 2, 2=Tier 1)
    rev_tier = pd.read_sql("SELECT cluster, SUM(payment_value) as value FROM analytics_base GROUP BY cluster", conn)
    rev_mapping = {0: "Tier 3", 1: "Tier 2", 2: "Tier 1"}
    rev_tier['name'] = rev_tier['cluster'].map(rev_mapping)
    
    # Loyalty Split (One-time vs Recurring)
    # total_transaction_customer == 1 are one-time
    loyalty = pd.read_sql("""
        SELECT 
            CASE WHEN total_transaction_customer == 1 THEN 'One-time' ELSE 'Recurring' END as status,
            COUNT(DISTINCT customer_unique_id) as count
        FROM analytics_base
        GROUP BY status
    """, conn)
    
    conn.close()
    return {
        "total_revenue": round(float(total_sales), 2),
        "total_customers": int(total_customers),
        "total_orders": int(total_orders),
        "revenue_by_tier": rev_tier[['name', 'value']].to_dict(orient="records"),
        "loyalty_split": loyalty.to_dict(orient="records")
    }

@app.get("/api/v1/elbow")
def get_elbow():
    # Pre-calculated inertia from the original notebook's data logic
    return {
        "k": [1, 2, 3, 4, 5],
        "inertia": [6108935979.57, 2867857734.64, 1764011271.46, 1218526225.24, 814206630.25]
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
