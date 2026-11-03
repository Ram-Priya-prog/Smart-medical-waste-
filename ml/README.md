# Machine Learning Pickup Delay Risk Prediction Engine

## Academic & Dataset Transparency Statement
> **Notice**: The training dataset (`medical_waste_pickup_delay_dataset.csv`) is an authentic synthetic dataset generated specifically for this project because real municipal biomedical waste logistics records are restricted by medical privacy and municipal operational confidentiality. The dataset is engineered according to Bio-Medical Waste Management Rules and realistic clinical logistics distributions.

---

## 1. Objective
Instead of simply assigning static priorities, the Machine Learning engine predicts the **risk of a medical-waste pickup being delayed**.
Each pickup request is classified into:
- 🔴 **HIGH DELAY RISK** (Predicted Delay Probability $\ge 0.65$ / $65\%$)
- 🟡 **MEDIUM DELAY RISK** ($0.35 \le$ Predicted Delay Probability $< 0.65$ / $35\% - 64\%$)
- 🟢 **LOW DELAY RISK** (Predicted Delay Probability $< 0.35$ / $< 35\%$)

This prediction enables the municipal administrator to proactively identify high-risk requests, prevent regulatory SLA breaches (>48h storage violation), and prioritize prompt manual assignment of nearby collection fleets.

---

## 2. Feature Definitions & Delay Drivers

| Feature Name | Type | Description / Range | Delay Impact |
| :--- | :--- | :--- | :--- |
| `waste_category` | Categorical | `Yellow`, `Red`, `White`, `Blue` | High biohazards (Yellow/White) require Hazmat containment protocols |
| `waste_quantity` | Numerical | Total weight in kilograms (2.0 - 180.0 kg) | Large quantities (>50 kg) increase loading time and truck payload limits |
| `storage_duration_hours` | Numerical | Hours stored in hospital area (1.0 - 72.0 hrs) | Approaching or exceeding 48h legal threshold compounds urgency |
| `request_waiting_hours` | Numerical | Hours since pickup ticket was created (0.2 - 48.0 hrs) | High queue wait times directly correlate with impending delay |
| `waste_risk_level` | Numerical | Biohazard risk score (Yellow/White=4, Red=3, Blue=2) | High risk requires specialized handling and disposal protocols |
| `pickup_distance_km` | Numerical | Distance between facility and depot (0.5 - 35.0 km) | Longer transit distances suffer greater traffic exposure |
| `previous_delay_hours` | Numerical | Logistical delays previously observed in sector (0.0 - 24.0 hrs) | Historic zone congestion predicts future delays |
| `hospital_request_frequency` | Numerical | Average weekly requests (1 - 10) | Proxy for hospital throughput and bed scale |
| `collector_availability` | Numerical | Available certified collectors in municipal sector (1 - 5) | Low availability is the strongest driver of dispatch bottlenecks |
| `day_of_week` | Numerical | Day of week integer (0 = Monday, 6 = Sunday) | Weekend staffing constraints (day $\ge 5$) increase delay risk |
| `time_of_day` | Numerical | Hour of day (0 - 23 hrs) | Peak rush hours (8-11h, 16-19h) create transit bottlenecks |
| `is_delayed` | Target (Binary) | 0 = On-Time / No Delay, 1 = Delayed | Supervised ground truth target variable |

---

## 3. Preprocessing & Model Architecture
- **Categorical Handling**: Scikit-Learn `OneHotEncoder(handle_unknown='ignore', sparse_output=False)` applied to `waste_category`.
- **Numerical Scaling & Imputation**: `SimpleImputer(strategy='median')` + `StandardScaler()`.
- **Classifier**: `RandomForestClassifier(n_estimators=150, max_depth=12, min_samples_split=4, min_samples_leaf=2, class_weight='balanced', random_state=42)`.
- **Validation**: 80% Training / 20% Stratified Testing split on unseen data.
- **Evaluation Metrics**: Accuracy, Precision, Recall, F1-Score, ROC-AUC, and Confusion Matrix.

---

## 4. Execution Commands

```bash
# 1. Generate Delay Dataset (>= 1,600 records)
python ml/generate_dataset.py

# 2. Train Model and Export Pipeline & Metrics
python ml/train_model.py

# 3. Evaluate Model on 20% Unseen Test Set
python ml/evaluate_model.py

# 4. Export Summary and Metrics CSV
python ml/export_model_csv.py
```
