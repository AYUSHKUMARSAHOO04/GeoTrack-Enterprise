# Deployment

## Overview

GeoTrack Enterprise is designed for deployment across multiple platforms:

- **Frontend** → Vercel (Next.js optimized)
- **Backend** → Render (Dockerized FastAPI)
- **Database** → Render PostgreSQL (with PostGIS)
- **Redis** → Upstash Redis or Render Redis

## Prerequisites

- Vercel account
- Render account
- GitHub repository with the codebase

## Frontend Deployment (Vercel)

1. Import the repository into Vercel
2. Configure build settings:
   - **Framework**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
3. Set environment variables:
   ```
   NEXT_PUBLIC_API_BASE_URL=https://your-backend.onrender.com/api/v1
   NEXT_PUBLIC_WS_BASE_URL=wss://your-backend.onrender.com/api/v1/ws
   ```
4. Deploy

## Backend Deployment (Render)

1. Create a new Web Service on Render
2. Configure:
   - **Environment**: Docker
   - **Dockerfile Path**: `./backend/Dockerfile`
   - **Docker Context**: `./backend`
3. Set environment variables:
   ```
   DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/geotrack
   DATABASE_URL_SYNC=postgresql+psycopg2://user:pass@host:5432/geotrack
   REDIS_URL=redis://host:6379/0
   SECRET_KEY=<generate-a-secure-key>
   JWT_ALGORITHM=HS256
   JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
   JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
   CORS_ORIGINS=https://your-frontend.vercel.app
   ENVIRONMENT=production
   ```
4. Deploy
5. Run migrations: `alembic upgrade head`

## Database Deployment

### Render PostgreSQL

1. Create a PostgreSQL instance on Render
2. Enable PostGIS extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. Note the connection string for the backend

## Docker Compose (Self-Hosted)

```bash
# Production
docker compose -f docker-compose.yml up -d --build

# Development (infra only)
docker compose -f docker-compose.dev.yml up -d
```

## CI/CD Pipeline

GitHub Actions workflows handle:

1. **Frontend CI** — Lint, type check, build on every push/PR
2. **Backend CI** — Lint, type check, test with PostgreSQL + Redis services

Deployments are triggered on merge to `main`:
- Frontend auto-deploys to Vercel
- Backend auto-deploys to Render

## Health Checks

- Frontend: `GET /` (200 OK)
- Backend: `GET /api/v1/health` → `{"status": "healthy"}`
- Database: `pg_isready`
- Redis: `redis-cli ping`

## Environment Checklist

- [ ] `SECRET_KEY` is a 256-bit random string
- [ ] `CORS_ORIGINS` only includes production domains
- [ ] `ENVIRONMENT=production`
- [ ] PostGIS extension enabled
- [ ] Alembic migrations applied
- [ ] Redis instance accessible
- [ ] WebSocket connections allowed through load balancer
