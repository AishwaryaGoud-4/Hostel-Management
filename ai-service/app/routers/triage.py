from fastapi import APIRouter
from app.models.schemas import TriageRequest, TriageResponse
import re

router = APIRouter()

# Emergency keywords that trigger auto-escalation
EMERGENCY_KEYWORDS = [
    "fire", "smoke", "flood", "gas leak", "electric shock", "electrocution",
    "collapse", "attack", "assault", "theft", "robbery", "emergency",
    "danger", "critical", "urgent", "injury", "injured", "bleeding",
    "unconscious", "accident", "explosion", "break-in", "stalking", "harassment",
    "snake", "short circuit", "sparks", "burning", "suffocating",
]

# Category keyword mapping
CATEGORY_KEYWORDS = {
    "ELECTRICAL": ["electric", "power", "switch", "socket", "wire", "fan", "light", "bulb", "ac", "air conditioner",
                   "short circuit", "sparks", "voltage", "fuse", "mcb", "inverter", "charging point"],
    "PLUMBING": ["water", "pipe", "tap", "leak", "drain", "toilet", "bathroom", "shower", "geyser", "sewage",
                 "blocked", "clog", "overflow", "tank", "pump", "plumber"],
    "FURNITURE": ["bed", "chair", "table", "desk", "wardrobe", "cupboard", "door", "window", "lock", "handle",
                  "broken", "crack", "hinge", "shelf", "mirror", "drawer", "mattress"],
    "INTERNET": ["wifi", "internet", "network", "router", "connection", "slow", "lan", "ethernet",
                 "disconnect", "signal", "bandwidth", "cable"],
    "CLEANING": ["clean", "dirty", "dust", "sweep", "mop", "garbage", "trash", "pest", "cockroach", "rat",
                 "mosquito", "ant", "spider", "hygiene", "smell", "stain", "wash"],
    "SECURITY": ["security", "cctv", "camera", "gate", "lock", "key", "theft", "suspicious", "stranger",
                 "missing", "unauthorized", "trespass", "guard", "patrol"],
    "NOISE": ["noise", "loud", "music", "party", "disturb", "sound", "quiet", "silence", "peaceful",
              "shouting", "construction"],
}


def classify_category(text: str) -> tuple:
    """Classify complaint into category based on keyword matching with confidence."""
    text_lower = text.lower()
    scores = {}

    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scores[category] = score

    if not scores:
        return "OTHER", 0.3

    best_category = max(scores, key=scores.get)
    total_possible = len(CATEGORY_KEYWORDS[best_category])
    confidence = min(0.95, 0.4 + (scores[best_category] / total_possible) * 0.55)

    return best_category, round(confidence, 2)


def detect_emergency(text: str) -> tuple:
    """Check if complaint contains emergency keywords."""
    text_lower = text.lower()
    found = [kw for kw in EMERGENCY_KEYWORDS if kw in text_lower]
    return len(found) > 0, found


def determine_priority(category: str, is_emergency: bool, confidence: float) -> str:
    """Determine suggested priority based on classification."""
    if is_emergency:
        return "CRITICAL"
    if category in ["ELECTRICAL", "SECURITY"]:
        return "HIGH"
    if category in ["PLUMBING", "INTERNET"]:
        return "MEDIUM"
    return "LOW"


@router.post("/triage-complaint", response_model=TriageResponse)
async def triage_complaint(request: TriageRequest):
    """AI-powered complaint triage: classifies category and detects emergencies."""
    combined_text = f"{request.title} {request.description}"

    category, confidence = classify_category(combined_text)
    is_emergency, emergency_keywords = detect_emergency(combined_text)

    # Extract general keywords
    words = re.findall(r'\b[a-zA-Z]{3,}\b', combined_text.lower())
    all_category_kws = [kw for kwlist in CATEGORY_KEYWORDS.values() for kw in kwlist]
    matched_keywords = list(set(w for w in words if w in all_category_kws or w in EMERGENCY_KEYWORDS))[:10]

    priority = determine_priority(category, is_emergency, confidence)

    if is_emergency:
        confidence = max(confidence, 0.85)

    return TriageResponse(
        category=category,
        confidence=confidence,
        is_emergency=is_emergency,
        keywords=matched_keywords + emergency_keywords,
        suggested_priority=priority,
    )
