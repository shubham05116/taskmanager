#!/bin/sh
set -e

echo "Waiting for database..."
sleep 3

echo "Starting TaskManager API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
