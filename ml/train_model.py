"""
Smart Medical-Waste Collection System
Machine Learning Model Training Script: Pickup Delay Risk Prediction
File: ml/train_model.py

Trains a Random Forest Classifier on the medical waste pickup delay dataset
using an 80/20 stratified train/test split and a full Scikit-learn Pipeline.
Target: 'is_delayed' (binary 0 or 1)
Evaluates Test Accuracy, Precision, Recall, F1-score, ROC-AUC, and Confusion Matrix.
Serializes model to pickup_delay_risk_model.joblib and metrics to metrics.json.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)

def train_and_save_model(
    data_path: str = "ml/data/medical_waste_pickup_delay_dataset.csv",
    model_dir: str = "ml/model"
):
    print("==================================================")
    print("Starting ML Model Training Pipeline: Delay Risk...")
    print(f"Loading dataset from: {data_path}")
    
    if not os.path.exists(data_path):
        from generate_dataset import generate_dataset
        generate_dataset(output_path=data_path)
        
    df = pd.read_csv(data_path)
    print(f"Loaded {len(df)} records with {df.shape[1]} columns.")
    
    # Define features and target
    target_col = 'is_delayed'
    X = df.drop(columns=[target_col])
    y = df[target_col]
    
    categorical_features = ['waste_category']
    numerical_features = [
        'waste_quantity',
        'storage_duration_hours',
        'request_waiting_hours',
        'waste_risk_level',
        'pickup_distance_km',
        'previous_delay_hours',
        'hospital_request_frequency',
        'collector_availability',
        'day_of_week',
        'time_of_day'
    ]
    
    # 80/20 Stratified Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.20,
        random_state=42,
        stratify=y
    )
    
    print(f"Training set: {len(X_train)} samples ({len(X_train)/len(df)*100:.1f}%)")
    print(f"Testing set:  {len(X_test)} samples ({len(X_test)/len(df)*100:.1f}%)")
    
    # Preprocessing Pipeline
    numerical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    
    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ])
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numerical_transformer, numerical_features),
            ('cat', categorical_transformer, categorical_features)
        ]
    )
    
    # Classifier definition: Random Forest Classifier
    classifier = RandomForestClassifier(
        n_estimators=150,
        max_depth=12,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        class_weight='balanced',
        n_jobs=-1
    )
    
    # Full end-to-end Pipeline
    model_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', classifier)
    ])
    
    print("\nTraining Random Forest Classifier on delay risk...")
    model_pipeline.fit(X_train, y_train)
    print("Model fitting complete.")
    
    # Evaluate strictly on unseen 20% test set
    y_pred = model_pipeline.predict(X_test)
    y_proba = model_pipeline.predict_proba(X_test)
    # Probability of delay is column index 1
    delay_prob_test = y_proba[:, 1]
    
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    prec_weighted = precision_score(y_test, y_pred, average='weighted', zero_division=0)
    rec_weighted = recall_score(y_test, y_pred, average='weighted', zero_division=0)
    f1_weighted = f1_score(y_test, y_pred, average='weighted', zero_division=0)
    roc_auc = roc_auc_score(y_test, delay_prob_test)
    
    classes_numeric = [0, 1]
    class_names = ["On-Time", "Delayed"]
    cm = confusion_matrix(y_test, y_pred, labels=classes_numeric)
    clf_report = classification_report(y_test, y_pred, target_names=class_names, output_dict=True)
    clf_report_text = classification_report(y_test, y_pred, target_names=class_names)
    
    print("\n==================================================")
    print("EVALUATION RESULTS ON TEST SET (20% Unseen Data):")
    print(f"Test Accuracy:     {acc * 100:.2f}%")
    print(f"ROC-AUC Score:     {roc_auc * 100:.2f}%")
    print(f"Delay F1-Score:    {f1 * 100:.2f}%")
    print(f"Delay Precision:   {prec * 100:.2f}%")
    print(f"Delay Recall:      {rec * 100:.2f}%")
    print(f"Weighted F1:       {f1_weighted * 100:.2f}%")
    print("\nClassification Report:\n", clf_report_text)
    print("Confusion Matrix (0=On-Time, 1=Delayed):\n", cm)
    print("==================================================")
    
    # Extract feature importances
    try:
        cat_encoder = model_pipeline.named_steps['preprocessor'].named_transformers_['cat'].named_steps['onehot']
        cat_feature_names = list(cat_encoder.get_feature_names_out(categorical_features))
        all_feature_names = numerical_features + cat_feature_names
        importances = model_pipeline.named_steps['classifier'].feature_importances_
        feature_importance_dict = [
            {"feature": name, "importance": round(float(imp), 4)}
            for name, imp in sorted(zip(all_feature_names, importances), key=lambda x: x[1], reverse=True)
        ]
    except Exception as e:
        feature_importance_dict = []
    
    # Save Model Artifacts
    os.makedirs(model_dir, exist_ok=True)
    delay_model_file = os.path.join(model_dir, "pickup_delay_risk_model.joblib")
    joblib.dump(model_pipeline, delay_model_file)
    print(f"Model saved to: {delay_model_file}")
    
    # Backwards compatibility fallback file
    legacy_model_file = os.path.join(model_dir, "pickup_priority_model.joblib")
    joblib.dump(model_pipeline, legacy_model_file)
    
    metrics_data = {
        "model_name": "Random Forest Classifier",
        "task": "Medical Waste Pickup Delay Risk Prediction",
        "model_version": "rf-delay-v1.0",
        "target": "is_delayed",
        "classes": ["On-Time", "Delayed"],
        "risk_levels": ["LOW DELAY RISK", "MEDIUM DELAY RISK", "HIGH DELAY RISK"],
        "thresholds": {
            "high_risk_min": 0.65,
            "medium_risk_min": 0.35,
            "low_risk_max": 0.35
        },
        "dataset_records_total": int(len(df)),
        "training_records": int(len(X_train)),
        "testing_records": int(len(X_test)),
        "features": {
            "categorical": categorical_features,
            "numerical": numerical_features
        },
        "metrics": {
            "accuracy": round(float(acc), 4),
            "roc_auc": round(float(roc_auc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1": round(float(f1), 4),
            "precision_weighted": round(float(prec_weighted), 4),
            "recall_weighted": round(float(rec_weighted), 4),
            "f1_weighted": round(float(f1_weighted), 4)
        },
        "confusion_matrix": {
            "labels": class_names,
            "matrix": cm.tolist()
        },
        "classification_report": clf_report,
        "feature_importances": feature_importance_dict
    }
    
    metrics_file = os.path.join(model_dir, "metrics.json")
    with open(metrics_file, "w") as f:
        json.dump(metrics_data, f, indent=2)
    print(f"Metrics saved to: {metrics_file}")
    
    # Save test set for evaluate_model.py
    test_df = X_test.copy()
    test_df[target_col] = y_test
    test_df.to_csv("ml/data/test_set.csv", index=False)
    print("Test set saved to: ml/data/test_set.csv")
    
    return metrics_data

if __name__ == "__main__":
    train_and_save_model()
