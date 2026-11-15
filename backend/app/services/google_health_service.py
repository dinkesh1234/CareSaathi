"""Google Health API and Android Health Connect integration adapter for CareSaathi.

Architectural Analysis:
- The legacy Google Fit REST API was deprecated on December 31, 2024, and decommissioned in 2025.
- The modern Google platform standard is Health Connect by Android (androidx.health.connect),
  which operates on-device on Android 14+ devices.
- Web applications consume health data via companion mobile client synchronization.
- This adapter standardizes health vitals (Blood Pressure, Heart Rate, Glucose, SpO2, Steps),
  preserves source device provenance, timestamps, and units, and enforces deduplication.
"""

from datetime import datetime, timezone
import hashlib
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.config import settings

# In-memory storage for imported measurements: hash -> record
_IMPORTED_HEALTH_METRICS: Dict[str, Dict[str, Any]] = {}


class HealthMetricRecord(BaseModel):
    """Normalized health measurement record preserving device provenance and units."""
    metric_id: str
    family_id: str
    profile_id: str
    metric_type: str = Field(..., description="e.g. blood_pressure, heart_rate, blood_glucose, steps, oxygen_saturation")
    value: Any = Field(..., description="Numeric value or compound dict (e.g. {'systolic': 128, 'diastolic': 82})")
    unit: str = Field(..., description="Physical measurement unit (e.g. mmHg, bpm, mg/dL, %, count)")
    source_device: str = Field(..., description="Original hardware sensor or sync source")
    recorded_at: str = Field(..., description="ISO 8601 measurement timestamp from sensor")
    synced_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    sync_hash: str


class GoogleHealthAdapter:
    """Adapter for Google Health data exchange, provenance tracking, and deduplication."""

    def __init__(self) -> None:
        self.project_number = settings.GOOGLE_HEALTH_PROJECT_NUMBER

    def check_connection_status(self) -> Dict[str, Any]:
        """Report genuine connection and platform readiness status."""
        return {
            "platform": "Android Health Connect",
            "connected": False,
            "status": "adapter_ready_awaiting_bridge",
            "project_number": self.project_number or "Not specified",
            "deprecated_apis": ["Google Fit REST API (Turned down by Google in 2025)"],
            "supported_data_types": [
                "BloodPressureRecord (mmHg)",
                "HeartRateRecord (bpm)",
                "BloodGlucoseRecord (mg/dL)",
                "OxygenSaturationRecord (%)",
                "StepsRecord (count)",
            ],
            "message": (
                "Adapter ready and schemas validated. Live device sync requires an Android companion application "
                "with androidx.health.connect.client permissions. No fake sync is claimed."
            ),
        }

    def compute_sync_hash(self, profile_id: str, metric_type: str, recorded_at: str, source_device: str) -> str:
        """Compute unique deduplication fingerprint for a sensor reading."""
        raw = f"{profile_id}:{metric_type}:{recorded_at}:{source_device}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def import_sensor_reading(
        self,
        family_id: str,
        profile_id: str,
        metric_type: str,
        value: Any,
        unit: str,
        source_device: str,
        recorded_at: str,
    ) -> Dict[str, Any]:
        """Import a health measurement with duplicate prevention and unit preservation."""
        sync_hash = self.compute_sync_hash(profile_id, metric_type, recorded_at, source_device)

        if sync_hash in _IMPORTED_HEALTH_METRICS:
            return {
                "success": True,
                "duplicate_prevented": True,
                "metric_id": _IMPORTED_HEALTH_METRICS[sync_hash]["metric_id"],
                "message": "Measurement reading already recorded (duplicate prevented).",
            }

        metric_id = f"vital_{sync_hash[:12]}"
        record = HealthMetricRecord(
            metric_id=metric_id,
            family_id=family_id,
            profile_id=profile_id,
            metric_type=metric_type,
            value=value,
            unit=unit,
            source_device=source_device,
            recorded_at=recorded_at,
            sync_hash=sync_hash,
        )

        _IMPORTED_HEALTH_METRICS[sync_hash] = record.model_dump()

        return {
            "success": True,
            "duplicate_prevented": False,
            "metric_id": metric_id,
            "record": record.model_dump(),
            "message": "Measurement recorded with full source attribution.",
        }

    def list_imported_metrics(self, profile_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve stored imported measurements."""
        records = list(_IMPORTED_HEALTH_METRICS.values())
        if profile_id:
            records = [r for r in records if r["profile_id"] == profile_id]
        return records


google_health_adapter = GoogleHealthAdapter()
