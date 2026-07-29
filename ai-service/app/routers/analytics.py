from fastapi import APIRouter
from app.models.schemas import (
    EnergyAnomalyRequest, AnomalyResult,
    OccupancyForecastRequest, OccupancyData,
    FeeRiskRequest,
)
from typing import List
import numpy as np
from datetime import datetime, timedelta

router = APIRouter()


@router.post("/energy-anomalies", response_model=List[AnomalyResult])
async def detect_energy_anomalies(request: EnergyAnomalyRequest):
    """Detect rooms with abnormal utility consumption (>= 2.5 sigma above mean)."""
    if len(request.rooms) < 3:
        return []

    electricity_vals = np.array([r.electricity for r in request.rooms])
    water_vals = np.array([r.water for r in request.rooms])

    elec_mean, elec_std = np.mean(electricity_vals), np.std(electricity_vals)
    water_mean, water_std = np.mean(water_vals), np.std(water_vals)

    # Avoid division by zero
    if elec_std == 0:
        elec_std = 1
    if water_std == 0:
        water_std = 1

    results = []
    for room in request.rooms:
        elec_z = (room.electricity - elec_mean) / elec_std
        water_z = (room.water - water_mean) / water_std

        is_anomaly = abs(elec_z) >= 2.5 or abs(water_z) >= 2.5
        anomaly_type = ""
        if abs(elec_z) >= 2.5 and abs(water_z) >= 2.5:
            anomaly_type = "BOTH"
        elif abs(elec_z) >= 2.5:
            anomaly_type = "ELECTRICITY"
        elif abs(water_z) >= 2.5:
            anomaly_type = "WATER"

        if is_anomaly:
            results.append(AnomalyResult(
                room_id=room.room_id,
                room_number=room.room_number,
                floor=room.floor,
                electricity=room.electricity,
                water=room.water,
                electricity_zscore=round(float(elec_z), 2),
                water_zscore=round(float(water_z), 2),
                is_anomaly=True,
                anomaly_type=anomaly_type,
            ))

    return sorted(results, key=lambda x: max(abs(x.electricity_zscore), abs(x.water_zscore)), reverse=True)


@router.post("/occupancy-forecast")
async def forecast_occupancy(request: OccupancyForecastRequest):
    """Time-series occupancy forecasting using linear trend + seasonality."""
    if len(request.history) < 7:
        return {"error": "Need at least 7 days of history", "forecast": []}

    occupancy_rates = [h.occupied / max(h.total, 1) for h in request.history]
    n = len(occupancy_rates)
    x = np.arange(n)
    y = np.array(occupancy_rates)

    # Linear trend
    coeffs = np.polyfit(x, y, 1)
    trend_slope = coeffs[0]
    trend_intercept = coeffs[1]

    # Weekly seasonality (simple)
    residuals = y - (trend_slope * x + trend_intercept)
    weekly_pattern = np.zeros(7)
    weekly_counts = np.zeros(7)
    for i in range(n):
        day = i % 7
        weekly_pattern[day] += residuals[i]
        weekly_counts[day] += 1
    weekly_pattern = np.where(weekly_counts > 0, weekly_pattern / weekly_counts, 0)

    # Generate forecast
    total_capacity = request.history[-1].total if request.history else 100
    last_date = datetime.strptime(request.history[-1].date, "%Y-%m-%d")

    forecast = []
    for i in range(request.forecast_days):
        future_x = n + i
        trend = trend_slope * future_x + trend_intercept
        seasonal = weekly_pattern[future_x % 7]
        predicted_rate = np.clip(trend + seasonal, 0.05, 0.98)

        forecast_date = last_date + timedelta(days=i + 1)
        predicted_occupied = int(round(predicted_rate * total_capacity))

        forecast.append({
            "date": forecast_date.strftime("%Y-%m-%d"),
            "predicted_occupancy_rate": round(float(predicted_rate), 3),
            "predicted_occupied": predicted_occupied,
            "total_capacity": total_capacity,
            "confidence_lower": round(float(max(0, predicted_rate - 0.1)), 3),
            "confidence_upper": round(float(min(1, predicted_rate + 0.1)), 3),
        })

    return {
        "trend_direction": "increasing" if trend_slope > 0.001 else "decreasing" if trend_slope < -0.001 else "stable",
        "trend_slope": round(float(trend_slope), 4),
        "forecast": forecast,
    }


@router.post("/fee-risk-score")
async def calculate_fee_risk(request: FeeRiskRequest):
    """Predict probability of delayed fee payment using weighted scoring."""
    # Feature weights (simulating a trained model)
    risk_score = 0.0

    # Payment ratio (higher unpaid = higher risk)
    if request.total_amount > 0:
        unpaid_ratio = 1 - (request.paid_amount / request.total_amount)
        risk_score += unpaid_ratio * 0.3

    # Days overdue factor
    if request.days_overdue > 0:
        overdue_factor = min(1.0, request.days_overdue / 90)
        risk_score += overdue_factor * 0.25

    # Previous late payment history
    late_factor = min(1.0, request.previous_late_payments / 5)
    risk_score += late_factor * 0.2

    # Low attendance correlation
    if request.attendance_percentage < 75:
        attendance_risk = (75 - request.attendance_percentage) / 75
        risk_score += attendance_risk * 0.15

    # Year factor (first years slightly higher risk)
    if request.year == 1:
        risk_score += 0.05
    elif request.year >= 4:
        risk_score -= 0.05

    risk_score = round(min(max(risk_score, 0.0), 1.0), 3)

    risk_level = "LOW" if risk_score < 0.3 else "MEDIUM" if risk_score < 0.6 else "HIGH" if risk_score < 0.8 else "CRITICAL"

    return {
        "student_id": request.student_id,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "factors": {
            "payment_ratio_impact": round(risk_score * 0.3, 3),
            "overdue_impact": round(min(1.0, request.days_overdue / 90) * 0.25, 3),
            "history_impact": round(late_factor * 0.2, 3),
            "attendance_impact": round(max(0, (75 - request.attendance_percentage) / 75) * 0.15, 3),
        },
        "recommendation": (
            "No action needed" if risk_level == "LOW"
            else "Send reminder" if risk_level == "MEDIUM"
            else "Contact guardian" if risk_level == "HIGH"
            else "Escalate to administration"
        ),
    }
