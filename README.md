# GeoTrack Enterprise

Multi-tenant GPS fleet tracking SaaS platform with real-time location pipeline.

## Architecture

- **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI + SQLAlchemy (async) + PostgreSQL/PostGIS + Redis Pub/Sub
- **Auth**: Supabase Auth → JWT → FastAPI dependency injection
- **Real-time**: WebSocket gateway with organization isolation + Redis Pub/Sub
- **State**: TanStack Query (server state) + Zustand (client state)

## Phase 5: Real-Time Location Pipeline

### Pipeline Architecture

```
Authenticated Device
        ↓
Location Ingestion API (POST /api/v1/location)
        ↓
Validation (coordinates, timestamps, payload schema)
        ↓
Deduplication (device_id + captured_at unique constraint)
        ↓
PostGIS (geography(Point, 4326) storage)
        ↓
Redis Pub/Sub (location.updated, device.online/offline, trip.started/ended)
        ↓
WebSocket Gateway (org-isolated broadcast)
        ↓
Next.js Live Map (real-time marker updates)
```

### Device Authentication

Devices authenticate using API key + secret headers:
- `X-API-Key`: Generated API key (format: `gtk_<random>`)
- `X-Device-Secret`: Generated device secret

**Endpoints:**
- `POST /api/v1/devices/{id}/credentials` — Issue new credentials
- `GET /api/v1/devices/{id}/credentials` — List credentials
- `POST /api/v1/devices/{id}/credentials/regenerate` — Revoke all + issue new
- `POST /api/v1/credentials/{id}/suspend` — Suspend a credential
- `POST /api/v1/credentials/{id}/revoke` — Revoke a credential

Credentials are stored as SHA-256 hashes. Raw API keys/secrets are only returned once at creation time.

### Location API

**Single ingestion:**
```
POST /api/v1/location
Headers: X-API-Key, X-Device-Secret
Body: { latitude, longitude, accuracy?, altitude?, heading?, speed?, battery_level?, signal_strength?, provider?, captured_at }
```

**Batch ingestion:**
```
POST /api/v1/location/batch
Body: { locations: [LocationIngest, ...] }  (max 500 per batch)
```

**Validation:**
- Latitude: -90 to 90
- Longitude: -180 to 180
- Heading: 0 to 360
- Speed: >= 0
- Battery: 0 to 100
- captured_at: Not more than 5 minutes in the future
- Deduplication: Unique constraint on (device_id, captured_at)

**Query endpoints:**
- `GET /api/v1/devices/{id}/locations` — Device location history
- `GET /api/v1/device-statuses` — All device real-time statuses
- `GET /api/v1/trips` — Trip history (optional device_id filter)
- `GET /api/v1/trips/{id}/history` — Location points for a specific trip
- `GET /api/v1/locations/within-radius?latitude=&longitude=&radius_meters=` — Radius search (PostGIS ST_DWithin)
- `GET /api/v1/locations/in-bbox?min_lat=&max_lat=&min_lng=&max_lng=` — Bounding box search (PostGIS ST_Contains)
- `GET /api/v1/locations/nearest?latitude=&longitude=&limit=` — Nearest device search (PostGIS ST_Distance)

### PostGIS Usage

Coordinates stored as `geography(Point, 4326)` for accurate distance calculations:
- `ST_DWithin` — Radius search
- `ST_Distance` — Nearest-device ordering
- `ST_Contains` — Bounding box queries
- GIST spatial index on `coordinates` column

### Redis Pub/Sub

Every accepted location publishes events:
- `location.updated` — New GPS ping received
- `device.online` — Device transitioned from offline to online
- `device.offline` — Device went offline
- `trip.started` — New trip automatically detected
- `trip.ended` — Trip completed (distance, duration, avg/max speed computed)

### WebSocket Protocol

```
WS /api/v1/ws/locations?token=<supabase_jwt>
```

- Authentication via Supabase JWT query parameter
- Organization isolation: users only receive updates for their org
- Heartbeat: server sends `{"type":"heartbeat"}` every 30s
- Client can send `ping` → server responds `{"type":"pong"}`
- Automatic reconnection with 3s backoff
- Message format: `{"type": "location.updated", "data": {...}}`

### Trip Detection

Trips are automatically created when:
- Device speed > 5 km/h (moving threshold)
- No active trip exists for the device

Trips are automatically ended when:
- Device speed drops to 0 for > 10 minutes (trip gap threshold)

Trip metrics computed on completion:
- Total distance (Haversine between consecutive points)
- Duration in seconds
- Average speed
- Maximum speed
- Idle duration
- Point count

### Device Status Detection

Real-time status updated on each location ping:
- `moving` — speed > 5 km/h
- `idle` — 0 < speed <= 5 km/h
- `stopped` — speed = 0
- `online` — recently received data
- `offline` — no data received within timeout

## Project Structure

```
/
├── app/                    # Next.js App Router pages
├── components/             # React components (UI + feature + map)
├── hooks/                  # Custom React hooks (use-live-map, use-location-websocket)
├── lib/                    # Supabase clients, API client, utils
├── stores/                 # Zustand stores
├── types/                  # TypeScript type definitions (Location, Trip, DeviceStatus)
├── backend/
│   ├── app/
│   │   ├── api/v1/         # FastAPI routes (locations, device_credentials, websocket)
│   │   ├── core/           # Config, auth, device_auth, database, rbac, redis
│   │   ├── models/         # SQLAlchemy models (Location, Trip, DeviceStatus, DeviceCredential)
│   │   ├── repositories/   # Data access (LocationRepository, TripRepository, etc.)
│   │   ├── schemas/        # Pydantic schemas (location.py)
│   │   ├── services/       # Business logic (LocationService, DeviceCredentialService)
│   │   └── main.py         # FastAPI app entrypoint
│   └── tests/              # 43 tests (health, auth, RBAC, location pipeline)
└── docker-compose.yml      # Full-stack local development
```

## Development

### Frontend

```bash
npm install
npm run dev
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Docker

```bash
docker-compose up
```

## CI

All checks must pass:

```bash
# Frontend
npm ci && npm run lint && npm run type-check && npm run build

# Backend
cd backend
ruff check app && ruff format --check app && mypy app && pytest
```
