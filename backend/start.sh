#!/bin/bash
# Startup script for Render deployment
# Runs migrations and seeds demo data (if needed) before starting the server

set -e  # Exit on error

echo "🚀 Starting Property Rental API..."

# Run database migrations
echo "📦 Running database migrations..."
python -m alembic upgrade head

# Seed demo data (only if it doesn't exist)
echo "🌱 Seeding demo data (if needed)..."
python seed_production_data.py || echo "⚠️  Seed script skipped or data already exists"

# Start the server
echo "✅ Starting uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1
