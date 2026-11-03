import json
import pandas as pd

def generate_summary_csv():
    with open('ml/model/metrics.json', 'r') as f:
        metrics = json.load(f)

    model_rows = [
        {'Category': 'Model Architecture', 'Parameter / Metric': 'Algorithm', 'Value': metrics['model_name'], 'Details': 'Scikit-Learn RandomForestClassifier'},
        {'Category': 'Model Architecture', 'Parameter / Metric': 'Task', 'Value': metrics['task'], 'Details': 'Binary Delay Risk Classification (is_delayed = 0 or 1)'},
        {'Category': 'Model Architecture', 'Parameter / Metric': 'Model Version', 'Value': metrics.get('model_version', 'rf-delay-v1.0'), 'Details': 'Production Random Forest Model Version'},
        {'Category': 'Model Architecture', 'Parameter / Metric': 'Pipeline Composition', 'Value': 'ColumnTransformer + RandomForestClassifier', 'Details': 'OneHotEncoder(cat) + SimpleImputer/StandardScaler(num)'},
        {'Category': 'Model Hyperparameters', 'Parameter / Metric': 'n_estimators (Trees)', 'Value': '150', 'Details': '150 Decision Trees in ensemble'},
        {'Category': 'Model Hyperparameters', 'Parameter / Metric': 'max_depth', 'Value': '12', 'Details': 'Maximum depth per tree to prevent overfitting'},
        {'Category': 'Model Hyperparameters', 'Parameter / Metric': 'min_samples_split', 'Value': '4', 'Details': 'Minimum samples required to split an internal node'},
        {'Category': 'Model Hyperparameters', 'Parameter / Metric': 'class_weight', 'Value': 'balanced', 'Details': 'Balanced weighting inversely proportional to class frequencies'},
        {'Category': 'Model Hyperparameters', 'Parameter / Metric': 'random_state', 'Value': '42', 'Details': 'Fixed seed for 100% reproducibility'},
        {'Category': 'Risk Level Calibration', 'Parameter / Metric': 'HIGH DELAY RISK Threshold', 'Value': '>= 65%', 'Details': 'Predicted Delay Probability >= 0.65'},
        {'Category': 'Risk Level Calibration', 'Parameter / Metric': 'MEDIUM DELAY RISK Threshold', 'Value': '35% - 64%', 'Details': '0.35 <= Predicted Delay Probability < 0.65'},
        {'Category': 'Risk Level Calibration', 'Parameter / Metric': 'LOW DELAY RISK Threshold', 'Value': '< 35%', 'Details': 'Predicted Delay Probability < 0.35'},
        {'Category': 'Dataset Split', 'Parameter / Metric': 'Total Records', 'Value': str(metrics['dataset_records_total']), 'Details': 'Synthetic domain-engineered biomedical waste delay records'},
        {'Category': 'Dataset Split', 'Parameter / Metric': 'Training Set (80%)', 'Value': str(metrics['training_records']), 'Details': 'Stratified training set'},
        {'Category': 'Dataset Split', 'Parameter / Metric': 'Testing Set (20%)', 'Value': str(metrics['testing_records']), 'Details': 'Stratified unseen test set'},
        {'Category': 'Test Performance (20% Unseen)', 'Parameter / Metric': 'Test Accuracy', 'Value': f"{metrics['metrics']['accuracy']*100:.2f}%", 'Details': 'Overall accuracy on unseen test samples'},
        {'Category': 'Test Performance (20% Unseen)', 'Parameter / Metric': 'ROC-AUC Score', 'Value': f"{metrics['metrics']['roc_auc']*100:.2f}%", 'Details': 'Area Under Receiver Operating Characteristic Curve'},
        {'Category': 'Test Performance (20% Unseen)', 'Parameter / Metric': 'Delay F1-Score', 'Value': f"{metrics['metrics']['f1']*100:.2f}%", 'Details': 'Harmonic mean of precision and recall for delayed class'},
        {'Category': 'Test Performance (20% Unseen)', 'Parameter / Metric': 'Delay Precision', 'Value': f"{metrics['metrics']['precision']*100:.2f}%", 'Details': 'True positive rate for predicted delays'},
        {'Category': 'Test Performance (20% Unseen)', 'Parameter / Metric': 'Delay Recall', 'Value': f"{metrics['metrics']['recall']*100:.2f}%", 'Details': 'Sensitivity / actual delay detection rate'},
        {'Category': 'Test Performance (20% Unseen)', 'Parameter / Metric': 'Weighted F1-Score', 'Value': f"{metrics['metrics']['f1_weighted']*100:.2f}%", 'Details': 'Weighted harmonic mean across both classes'}
    ]

    for cls in ['On-Time', 'Delayed']:
        c_data = metrics['classification_report'].get(cls, {})
        model_rows.append({
            'Category': f'Class-wise Metric ({cls})',
            'Parameter / Metric': f'{cls} - Precision',
            'Value': f"{c_data.get('precision', 0)*100:.2f}%",
            'Details': f'Positive predictive rate for {cls}'
        })
        model_rows.append({
            'Category': f'Class-wise Metric ({cls})',
            'Parameter / Metric': f'{cls} - Recall',
            'Value': f"{c_data.get('recall', 0)*100:.2f}%",
            'Details': f'True positive capture rate for {cls}'
        })
        model_rows.append({
            'Category': f'Class-wise Metric ({cls})',
            'Parameter / Metric': f'{cls} - F1 Score',
            'Value': f"{c_data.get('f1-score', 0)*100:.2f}%",
            'Details': f'Harmonic mean for {cls}'
        })
        model_rows.append({
            'Category': f'Class-wise Metric ({cls})',
            'Parameter / Metric': f'{cls} - Test Samples',
            'Value': str(c_data.get('support', 0)),
            'Details': f'Actual test set sample count for {cls}'
        })

    for f_item in metrics.get('feature_importances', []):
        model_rows.append({
            'Category': 'Feature Importance Weight',
            'Parameter / Metric': f_item['feature'],
            'Value': f"{f_item['importance']*100:.2f}%",
            'Details': 'Relative Gini-importance contribution in tree splits'
        })

    df = pd.DataFrame(model_rows)
    df.to_csv('ml/data/model_summary_and_metrics.csv', index=False)
    print(f"Exported {len(df)} rows to ml/data/model_summary_and_metrics.csv")

if __name__ == '__main__':
    generate_summary_csv()
