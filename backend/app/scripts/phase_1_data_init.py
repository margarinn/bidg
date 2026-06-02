import os
import kagglehub
import pandas as pd
from kagglehub import KaggleDatasetAdapter
from sklearn.preprocessing import LabelEncoder, MinMaxScaler
from sklearn.cluster import KMeans
from pyspark.sql import SparkSession
from pyspark.sql.functions import col
from pyspark.sql.types import DoubleType

def main():
    print("--- Phase 1: Data Acquisition & Processing ---")
    
    # 1. Download Dataset
    print("Downloading Olist dataset from Kaggle...")
    # We use pandas adapter as per the user's provided snippet
    # For Olist, we need multiple files, but for the cluster model, 
    # we'll simulate the merge logic from the notebook.
    
    # In practice, kagglehub.load_dataset with PANDAS adapter usually 
    # handles specific files or the whole archive.
    # For now, let's fetch the local path and read the CSVs.
    path = kagglehub.dataset_download("olistbr/brazilian-ecommerce")
    print(f"Dataset downloaded to: {path}")

    # 2. Load and Merge
    print("Loading and merging CSVs...")
    customers = pd.read_csv(os.path.join(path, "olist_customers_dataset.csv"))
    orders = pd.read_csv(os.path.join(path, "olist_orders_dataset.csv"))
    payments = pd.read_csv(os.path.join(path, "olist_order_payments_dataset.csv"))
    # (Simplified merge for Phase 1 validation)
    df = orders.merge(customers, on="customer_id", how="left")
    df = df.merge(payments, on="order_id", how="left")

    # 3. Data Cleaning (Simplified from Notebook)
    print("Cleaning data...")
    df = df.drop_duplicates()
    df = df.dropna(subset=["customer_id", "order_id", "payment_value"])
    
    # 4. Feature Engineering
    print("Engineering features...")
    df["total_transaction_customer"] = df.groupby("customer_unique_id")["order_id"].transform("count")
    df["total_payment_customer"] = df.groupby("customer_unique_id")["payment_value"].transform("sum")

    # 5. Clustering (K-Means)
    print("Running K-Means Clustering...")
    cluster_features = df[["total_transaction_customer", "total_payment_customer"]]
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    df["cluster"] = kmeans.fit_predict(cluster_features)

    # 6. Save as Analytical File (SQLite for Corporate Reliability)
    print("Saving processed data to SQLite...")
    import sqlite3
    db_path = "/home/margarine/Documents/c/gemini/olist-showcase/backend/data/olist_analytics.db"
    conn = sqlite3.connect(db_path)
    
    # We drop complex timestamp objects for the simple showcase storage
    df_storage = df.copy()
    for col_name in df_storage.select_dtypes(include=['datetime64[ns]', 'object']).columns:
        df_storage[col_name] = df_storage[col_name].astype(str)
        
    df_storage.to_sql("analytics_base", conn, if_exists="replace", index=False)
    conn.close()
    
    print(f"Phase 1 Complete. Database saved at: {db_path}")

if __name__ == "__main__":
    main()
