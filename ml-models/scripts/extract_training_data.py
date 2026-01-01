#!/usr/bin/env python3
"""
Lead Scoring Model v2.0 - Data Extraction Script
Extracts historical lead and conversion data from PostgreSQL database for model training.
"""

import os
import sys
import json
import pandas as pd
import psycopg2
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()


def connect_to_db():
    """Connect to PostgreSQL database"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL environment variable not set")
    
    return psycopg2.connect(database_url)


def extract_lead_features(conn):
    """Extract lead features and labels from database"""
    print("Extracting lead features from database...")
    
    query = """
    SELECT 
        l.id as lead_id,
        l.source,
        l.email,
        l.phone,
        l."firstName",
        l."lastName",
        l.street,
        l.city,
        l.state,
        l."zipCode",
        l.country,
        l."insuranceType",
        l."qualityScore",
        l.status,
        l.metadata,
        l."createdAt",
        l."updatedAt",
        -- Conversion label (1 if converted, 0 otherwise)
        CASE WHEN l.status = 'CONVERTED' THEN 1 ELSE 0 END as converted,
        -- Time to conversion (in days)
        CASE 
            WHEN l.status = 'CONVERTED' THEN 
                EXTRACT(EPOCH FROM (l."updatedAt" - l."createdAt")) / 86400
            ELSE NULL
        END as days_to_conversion,
        -- Assignment data
        la.id as assignment_id,
        la."assignedAt",
        la."acceptedAt",
        la.status as assignment_status,
        -- Agent data
        a.id as agent_id,
        a."averageResponseTime" as agent_avg_response_time,
        a."conversionRate" as agent_conversion_rate,
        a.rating as agent_rating
    FROM "Lead" l
    LEFT JOIN "LeadAssignment" la ON l.id = la."leadId"
    LEFT JOIN "Agent" a ON la."agentId" = a.id
    WHERE l."createdAt" >= NOW() - INTERVAL '2 years'
    ORDER BY l."createdAt" DESC
    """
    
    df = pd.read_sql_query(query, conn)
    print(f"Extracted {len(df)} lead records")
    
    return df


def parse_metadata_features(df):
    """Parse JSON metadata column into separate features"""
    print("Parsing metadata features...")
    
    metadata_features = []
    for idx, row in df.iterrows():
        features = {}
        if row['metadata'] and isinstance(row['metadata'], (dict, str)):
            try:
                if isinstance(row['metadata'], str):
                    metadata = json.loads(row['metadata'])
                else:
                    metadata = row['metadata']
                
                # Extract common metadata features
                features['form_completed'] = int(metadata.get('form_completed', False))
                features['requested_quote'] = int(metadata.get('requested_quote', False))
                features['pages_visited'] = metadata.get('pages_visited', 0)
                features['time_on_site'] = metadata.get('time_on_site', 0)
                features['return_visitor'] = int(metadata.get('return_visitor', False))
                features['mobile_device'] = int(metadata.get('mobile_device', False))
                features['browser'] = metadata.get('browser', 'unknown')
                features['utm_source'] = metadata.get('utm_source', 'unknown')
                features['utm_medium'] = metadata.get('utm_medium', 'unknown')
                features['utm_campaign'] = metadata.get('utm_campaign', 'unknown')
            except:
                pass
        
        metadata_features.append(features)
    
    metadata_df = pd.DataFrame(metadata_features)
    
    # Fill NaN values with defaults
    metadata_df = metadata_df.fillna({
        'form_completed': 0,
        'requested_quote': 0,
        'pages_visited': 0,
        'time_on_site': 0,
        'return_visitor': 0,
        'mobile_device': 0,
        'browser': 'unknown',
        'utm_source': 'unknown',
        'utm_medium': 'unknown',
        'utm_campaign': 'unknown'
    })
    
    # Combine with original dataframe
    result_df = pd.concat([df, metadata_df], axis=1)
    
    return result_df


def engineer_features(df):
    """Engineer additional features from raw data"""
    print("Engineering features...")
    
    # Contact completeness features
    df['has_email'] = df['email'].notna().astype(int)
    df['has_phone'] = df['phone'].notna().astype(int)
    df['has_full_name'] = (df['firstName'].notna() & df['lastName'].notna()).astype(int)
    df['has_address'] = (df['street'].notna() & df['city'].notna() & df['state'].notna()).astype(int)
    df['has_zipcode'] = df['zipCode'].notna().astype(int)
    df['contact_completeness'] = (
        df['has_email'] + df['has_phone'] + df['has_full_name'] + 
        df['has_address'] + df['has_zipcode']
    ) / 5.0
    
    # Temporal features
    df['hour_of_day'] = pd.to_datetime(df['createdAt']).dt.hour
    df['day_of_week'] = pd.to_datetime(df['createdAt']).dt.dayofweek
    df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
    df['is_business_hours'] = ((df['hour_of_day'] >= 9) & (df['hour_of_day'] <= 17)).astype(int)
    df['month'] = pd.to_datetime(df['createdAt']).dt.month
    df['quarter'] = pd.to_datetime(df['createdAt']).dt.quarter
    
    # Source engagement features (based on typical engagement patterns)
    high_engagement_sources = ['referral', 'website', 'mobile_app']
    medium_engagement_sources = ['social_media', 'email_campaign', 'display_ad']
    low_engagement_sources = ['print_ad', 'billboard', 'cold_lead']
    
    df['source_engagement_level'] = df['source'].apply(
        lambda x: 3 if x in high_engagement_sources else (
            2 if x in medium_engagement_sources else (
                1 if x in low_engagement_sources else 0
            )
        )
    )
    
    # Email domain features
    df['email_domain'] = df['email'].apply(
        lambda x: x.split('@')[1] if pd.notna(x) and '@' in x else 'unknown'
    )
    df['is_generic_email'] = df['email_domain'].apply(
        lambda x: 1 if x in ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'] else 0
    )
    
    # State features (insurance regulations vary by state)
    df['state_encoded'] = df['state'].fillna('UNKNOWN')
    
    # Agent performance features
    df['agent_avg_response_time'] = df['agent_avg_response_time'].fillna(0)
    df['agent_conversion_rate'] = df['agent_conversion_rate'].fillna(0)
    df['agent_rating'] = df['agent_rating'].fillna(0)
    
    # Assignment timing features
    df['time_to_assignment'] = (
        pd.to_datetime(df['assignedAt']) - pd.to_datetime(df['createdAt'])
    ).dt.total_seconds() / 3600  # hours
    df['time_to_assignment'] = df['time_to_assignment'].fillna(-1)
    
    df['time_to_acceptance'] = (
        pd.to_datetime(df['acceptedAt']) - pd.to_datetime(df['assignedAt'])
    ).dt.total_seconds() / 3600  # hours
    df['time_to_acceptance'] = df['time_to_acceptance'].fillna(-1)
    
    return df


def save_training_data(df, output_path):
    """Save processed training data"""
    print(f"Saving training data to {output_path}...")
    
    # Create data directory if it doesn't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Save to parquet for efficient storage and loading
    df.to_parquet(output_path, index=False, engine='pyarrow')
    
    # Also save a CSV for easy inspection
    csv_path = output_path.replace('.parquet', '.csv')
    df.to_csv(csv_path, index=False)
    
    print(f"Saved {len(df)} records to {output_path}")
    print(f"Also saved CSV to {csv_path}")
    
    # Print data statistics
    print("\n=== Data Statistics ===")
    print(f"Total records: {len(df)}")
    print(f"Converted leads: {df['converted'].sum()} ({df['converted'].mean()*100:.2f}%)")
    print(f"Date range: {df['createdAt'].min()} to {df['createdAt'].max()}")
    
    if 'insuranceType' in df.columns:
        print("\nInsurance Type Distribution:")
        print(df['insuranceType'].value_counts())
    
    print("\nSource Distribution:")
    print(df['source'].value_counts().head(10))


def main():
    """Main execution function"""
    try:
        # Connect to database
        conn = connect_to_db()
        
        # Extract data
        df = extract_lead_features(conn)
        
        # Parse metadata
        df = parse_metadata_features(df)
        
        # Engineer features
        df = engineer_features(df)
        
        # Close connection
        conn.close()
        
        # Save training data
        output_path = os.path.join(
            os.path.dirname(__file__), 
            '..', 
            'data', 
            'training_data.parquet'
        )
        save_training_data(df, output_path)
        
        print("\n✅ Data extraction completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error during data extraction: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
