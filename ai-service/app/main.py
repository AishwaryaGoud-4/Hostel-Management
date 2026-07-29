from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import triage, analytics

app = FastAPI(
    title="SHMS AI Analytics Service",
    description="AI-powered analytics for Smart Hostel Management System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(triage.router, prefix="/ai", tags=["AI Triage"])
app.include_router(analytics.router, prefix="/ai", tags=["AI Analytics"])


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "SHMS AI Analytics"}
