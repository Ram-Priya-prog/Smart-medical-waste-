"""
Smart Medical-Waste Collection System
Machine Learning Model Evaluation Script: Pickup Delay Risk Prediction
File: ml/evaluate_model.py

Loads the saved Random Forest model artifact and computes evaluation
metrics against the test dataset or custom dataset.
Target: 'is_delayed' (0 = On-Time, 1 = Delayed)
"""

import os
import json
import joblib
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)

def evaluate_saved_model(
    model_path: str = "ml/model/pickup_delay_risk_model.joblib",
    test_data_path: str = "ml/data/test_set.csv"
):
    print("==================================================")
    print("Evaluating Saved Delay Risk Prediction Pipeline...")
    print(f"Model path: {model_path}")
    print(f"Test data:  {test_data_path}")
    
    if not os.path.exists(model_path) or not os.path.exists(test_data_path):
        from train_model import train_and_save_model
        train_and_save_model()
        
    pipeline = joblib.load(model_path)
    df = pd.read_csv(test_data_path)
    
    target_col = 'is_delayed'
    X_test = df.drop(columns=[target_col])
    y_test = df[target_col]
    
    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)[:, 1]
    
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y_test, y_proba)
    
    class_names = ["On-Time", "Delayed"]
    cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
    clf_rep = classification_report(y_test, y_pred, target_names=class_names)
    
    print("\n---------------- MODEL METRICS ----------------")
    print(f"Model: Random Forest Classifier (150 estimators, balanced)")
    print(f"Test Accuracy:     {acc * 100:.2f}%")
    print(f"ROC-AUC Score:     {roc_auc * 100:.2f}%")
    print(f"Delay F1-Score:    {f1 * 100:.2f}%")
    print(f"Delay Precision:   {prec * 100:.2f}%")
    print(f"Delay Recall:      {rec * 100:.2f}%")
    print("\nClassification Report:\n", clf_rep)
    print("Confusion Matrix (0=On-Time, 1=Delayed):\n", cm)
    print("------------------------------------------------")
    print("Evaluation completed successfully.")
    print("==================================================")

if __name__ == "__main__":
    evaluate_saved_model()
