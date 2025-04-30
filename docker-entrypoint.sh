#!/bin/bash
set -e

# Wait for the database to be ready
if [ "$DATABASE_HOST" ]; then
  echo "Waiting for database..."
  while ! nc -z $DATABASE_HOST $DATABASE_PORT; do
    sleep 0.1
  done
  echo "Database is up!"
fi

# Apply database migrations
echo "Applying database migrations..."
cd project
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Start gunicorn server
echo "Starting server..."
gunicorn project.wsgi:application --bind 0.0.0.0:8000 --workers 4

exec "$@" 