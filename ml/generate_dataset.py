"""
Smart Medical-Waste Collection System
Machine Learning Dataset Generation Script: Pickup Delay Risk Prediction
File: ml/generate_dataset.py

Generates a realistic synthetic dataset simulating medical-waste pickup scenarios
focusing on operational and logistical factors that cause pickup delays.
Target variable: 'is_delayed' (0 = No Delay / On Time, 1 = Delayed)
"""

import os
import numpy as np
import pandas as pd

def generate_dataset(
    num_records: int = 1800,
    random_seed: int = 42,
    output_path: str = "ml/data/medical_waste_pickup_delay_dataset.csv"
) -> pd.DataFrame:
    np.random.seed(random_seed)
    
    # 1. Categories & risk levels according to Bio-Medical Waste Management Rules
    categories = np.random.choice(
        ['Yellow', 'Red', 'White', 'Blue'],
        size=num_records,
        p=[0.35, 0.35, 0.15, 0.15]
    )
    
    risk_mapping = {
        'Yellow': 4,
        'White': 4,
        'Red': 3,
        'Blue': 2
    }
    waste_risk_level = np.array([risk_mapping[c] for c in categories])
    
    # 2. Waste Quantity (kg) - skewed distribution between 2kg and 180kg
    waste_quantity = np.round(np.clip(np.random.gamma(shape=3.5, scale=8.0, size=num_records) + 3.0, 2.0, 180.0), 1)
    
    # 3. Storage Duration in hospital containment area (hours)
    storage_duration_hours = np.round(np.clip(np.random.exponential(scale=18.0, size=num_records) + 2.0, 1.0, 72.0), 1)
    
    # 4. Request Waiting Hours since pickup ticket was created
    request_waiting_hours = np.round(np.clip(np.random.exponential(scale=6.5, size=num_records) + 0.5, 0.2, 48.0), 1)
    
    # 5. Distance from available collector cluster to hospital (km)
    pickup_distance_km = np.round(np.clip(np.random.normal(loc=7.5, scale=4.0, size=num_records), 0.5, 35.0), 2)
    
    # 6. Previous operational delay hours in the hospital zone
    previous_delay_hours = np.round(np.clip(np.random.exponential(scale=2.5, size=num_records), 0.0, 24.0), 1)
    
    # 7. Hospital Request Frequency (pickups per week, indicator of hospital bed scale)
    hospital_request_frequency = np.random.randint(1, 10, size=num_records)
    
    # 8. Available collectors within zone (1-5)
    collector_availability = np.random.choice([1, 2, 3, 4, 5], size=num_records, p=[0.18, 0.32, 0.28, 0.14, 0.08])
    
    # 9. Temporal factors: Day of Week (0=Mon, 6=Sun) and Time of Day (0-23 hr)
    day_of_week = np.random.randint(0, 7, size=num_records)
    
    # Rush hours: 8-11am and 16-19pm traffic peaks
    tod_weights = np.array([
        1, 1, 1, 1, 2, 3,
        6, 9, 12, 12, 10, 8,
        7, 7, 8, 9, 12, 12,
        9, 6, 4, 2, 1, 1
    ], dtype=float)
    tod_probs = tod_weights / tod_weights.sum()
    time_of_day = np.random.choice(np.arange(0, 24), size=num_records, p=tod_probs)
    
    is_peak_hour = np.isin(time_of_day, [8, 9, 10, 11, 16, 17, 18, 19]).astype(float)
    is_weekend = (day_of_week >= 5).astype(float)
    
    latent_delay_score = (
        (request_waiting_hours * 0.12) +
        (storage_duration_hours * 0.038) +
        (pickup_distance_km * 0.075) +
        (waste_quantity * 0.012) +
        (previous_delay_hours * 0.14) -
        (collector_availability * 0.72) +
        (is_peak_hour * 0.60) +
        (is_weekend * 0.50) +
        (waste_risk_level * 0.22) +
        np.where(np.isin(categories, ['Yellow', 'White']), 0.35, 0.0) -
        2.6 # Well-calibrated intercept
    )
    
    # Logistic probability of delay
    delay_prob = 1.0 / (1.0 + np.exp(-latent_delay_score))
    
    # Probabilistic sampling of binary target is_delayed (0 or 1)
    noise = np.random.uniform(0.0, 1.0, size=num_records)
    is_delayed = (noise < delay_prob).astype(int)
    
    df = pd.DataFrame({
        'waste_category': categories,
        'waste_quantity': waste_quantity,
        'storage_duration_hours': storage_duration_hours,
        'request_waiting_hours': request_waiting_hours,
        'waste_risk_level': waste_risk_level,
        'pickup_distance_km': pickup_distance_km,
        'previous_delay_hours': previous_delay_hours,
        'hospital_request_frequency': hospital_request_frequency,
        'collector_availability': collector_availability,
        'day_of_week': day_of_week,
        'time_of_day': time_of_day,
        'is_delayed': is_delayed
    })
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    
    delayed_count = int(is_delayed.sum())
    ontime_count = int(num_records - delayed_count)
    
    print("==================================================")
    print("Medical Waste Pickup Delay Dataset Generated Successfully.")
    print(f"Total Records:      {len(df)}")
    print(f"Delayed (1):        {delayed_count} ({delayed_count / len(df) * 100:.1f}%)")
    print(f"On-Time / No Delay: {ontime_count} ({ontime_count / len(df) * 100:.1f}%)")
    print(f"Output File:        {output_path}")
    print("==================================================")
    
    return df

if __name__ == "__main__":
    generate_dataset()
