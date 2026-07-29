from pydantic import BaseModel
from typing import Optional, List


class TriageRequest(BaseModel):
    title: str
    description: str


class TriageResponse(BaseModel):
    category: str
    confidence: float
    is_emergency: bool
    keywords: List[str]
    suggested_priority: str


class EnergyData(BaseModel):
    room_id: str
    room_number: str
    floor: int
    electricity: float
    water: float


class EnergyAnomalyRequest(BaseModel):
    rooms: List[EnergyData]


class AnomalyResult(BaseModel):
    room_id: str
    room_number: str
    floor: int
    electricity: float
    water: float
    electricity_zscore: float
    water_zscore: float
    is_anomaly: bool
    anomaly_type: str


class OccupancyData(BaseModel):
    date: str
    occupied: int
    total: int


class OccupancyForecastRequest(BaseModel):
    history: List[OccupancyData]
    forecast_days: int = 30


class FeeRiskRequest(BaseModel):
    student_id: str
    total_amount: float
    paid_amount: float
    days_overdue: int
    previous_late_payments: int
    attendance_percentage: float
    year: int
