"""Admin endpoints for database management"""
from fastapi import APIRouter, HTTPException, Header
from app.core.config import settings
import subprocess
import sys

router = APIRouter()


@router.post("/seed-demo-data")
def seed_demo_data(x_admin_secret: str = Header(None)):
    """
    Seed demo data into the database.
    Requires INTERNAL_JOB_SECRET header for security.
    
    Usage:
    curl -X POST https://your-api.onrender.com/api/v1/admin/seed-demo-data \
         -H "X-Admin-Secret: your-internal-job-secret"
    """
    # Security check
    if x_admin_secret != settings.INTERNAL_JOB_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")
    
    try:
        # Run the seed script
        result = subprocess.run(
            [sys.executable, "seed_production_data.py"],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "errors": result.stderr if result.returncode != 0 else None
        }
    
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Seed script timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error running seed script: {str(e)}")
