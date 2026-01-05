#!/usr/bin/env python3
import argparse
import json
import math

def calculate_capacity(concurrent_users, daily_leads):
    # Constants based on benchmarking
    CPU_PER_USER = 0.008  # vCPU
    RAM_PER_USER = 0.016  # GB
    CPU_PER_LEAD_PER_MIN = 0.002
    
    # Calculate requirements
    api_cpu = concurrent_users * CPU_PER_USER
    api_ram = concurrent_users * RAM_PER_USER
    
    leads_per_min = (daily_leads / 24 / 60) * 3 # 3x peak multiplier
    ds_cpu = leads_per_min * CPU_PER_LEAD_PER_MIN
    
    return {
        "api": {
            "total_vcpu": round(api_cpu, 2),
            "total_ram_gb": round(api_ram, 2),
            "suggested_replicas": math.ceil(api_cpu / 2) # assuming 2 vCPU per pod
        },
        "data_service": {
            "total_vcpu": round(ds_cpu, 2),
            "suggested_replicas": math.ceil(ds_cpu / 1) # assuming 1 vCPU per pod
        }
    }

def main():
    parser = argparse.ArgumentParser(description='Capacity Forecasting Model')
    parser.add_argument('--users', type=int, default=500, help='Target concurrent users')
    parser.add_argument('--leads', type=int, default=50000, help='Target daily leads')
    
    args = parser.parse_args()
    
    results = {
        "current": calculate_capacity(args.users, args.leads),
        "3_months": calculate_capacity(args.users * 4, args.leads * 4),
        "6_months": calculate_capacity(args.users * 10, args.leads * 10),
        "12_months": calculate_capacity(args.users * 20, args.leads * 20)
    }
    
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    main()
