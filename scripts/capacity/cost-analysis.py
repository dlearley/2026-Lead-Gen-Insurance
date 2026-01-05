#!/usr/bin/env python3
import argparse
import json

# Estimated Monthly Costs (Mock AWS Prices)
COSTS = {
    "vcpu_per_month": 30.0,
    "ram_gb_per_month": 5.0,
    "db_xlarge_per_month": 400.0,
    "db_2xlarge_per_month": 800.0,
    "redis_node_per_month": 150.0,
    "data_transfer_per_tb": 90.0
}

def calculate_monthly_cost(users, leads_per_day):
    # Logic similar to capacity model
    vcpu_needed = (users * 0.008) + (leads_per_day / 24 / 60 * 3 * 0.002)
    ram_needed = users * 0.016
    
    # Compute costs
    compute_cost = (vcpu_needed * COSTS["vcpu_per_month"]) + (ram_needed * COSTS["ram_gb_per_month"])
    
    # DB Cost based on user count
    if users < 1000:
        db_cost = COSTS["db_xlarge_per_month"] * 2 # Primary + 1 replica
    else:
        db_cost = COSTS["db_2xlarge_per_month"] * 3 # Primary + 2 replicas
        
    # Redis Cost
    redis_nodes = 6 if users < 1000 else 9
    redis_cost = redis_nodes * COSTS["redis_node_per_month"]
    
    total = compute_cost + db_cost + redis_cost
    
    return {
        "compute": round(compute_cost, 2),
        "database": round(db_cost, 2),
        "redis": round(redis_cost, 2),
        "total": round(total, 2)
    }

def main():
    projections = {
        "current (500 users)": calculate_monthly_cost(500, 50000),
        "3_months (2000 users)": calculate_monthly_cost(2000, 200000),
        "12_months (10000 users)": calculate_monthly_cost(10000, 1000000)
    }
    
    print("Projected Monthly Infrastructure Costs:")
    print(json.dumps(projections, indent=2))

if __name__ == "__main__":
    main()
