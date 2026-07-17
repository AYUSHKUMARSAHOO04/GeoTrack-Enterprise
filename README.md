# GeoTrack Enterprise

> Enterprise location intelligence platform for fleet management, asset tracking, and geospatial analytics.

## Overview

GeoTrack Enterprise is a full-stack multi-tenant SaaS application built with a modern technology stack and clean layered architecture. It provides real-time device tracking, team management, and AI-powered natural language insights through the Geo Command palette.

## Tech Stack

| Layer        | Technologies                                                    |
| ------------ | --------------------------------------------------------------- |
| Frontend     | Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui     |
| State        | Zustand, TanStack Query, React Hook Form, Zod                   |
| Backend      | FastAPI, SQLAlchemy 2 (async), Pydantic v2                     |
| Database     | PostgreSQL 16 + PostGIS, Redis 7                               |
| Auth         | Supabase Auth (JWT), RBAC                                       |
| Migrations   | Supabase SQL migrations                                         |
| Infra        | Docker, Docker Compose, GitHub Actions                          |

## Feature Status

### Implemented
- Next.js App Router with authentication (login, register, callback)
- Dashboard with sidebar navigation and topbar
- Supabase Auth integration (email/password)
- FastAPI backend with health endpoint
- Supabase JWT verification in FastAPI
- Centralized RBAC system (OWNER, ADMIN, MANAGER, OPERATOR, VIEWER)
- Multi-tenant organization isolation (server-side)
- Organization API (get/update current org, list members)
- Profile API (/me endpoint with permissions)
- Team CRUD API with membership management
- Device CRUD API with search, filtering, pagination, soft deletion
- Audit logging for all domain actions
- Centralized typed API client (frontend)
- Device management UI connected to real API
- Team management UI connected to real API
- Supabase SQL migrations for organizations, profiles, teams, team_members, audit_logs, devices
- Row Level Security policies
- Docker Compose for full-stack deployment
- GitHub Actions CI/CD

### In Development
- Frontend permission-based UI visibility refinement

### Planned
- Device GPS ingestion and real-time location tracking
- WebSocket-based live updates
- Trip recording and playback
- Geofence creation and monitoring
- Alert system
- Analytics and reporting
- AI backend integration for natural language queries

## Authentication Architecture

```
User → Next.js → Supabase Auth → Supabase JWT → FastAPI verifies JWT → RBAC → Business APIs
```

Supabase Auth is the identity provider. The frontend authenticates directly with Supabase. Business API requests include the Supabase JWT, which FastAPI verifies using the Supabase JWT secret. RBAC permissions are enforced server-side.

## RBAC Model

| Role     | Key Permissions                                               |
| -------- | ------------------------------------------------------------- |
| OWNER    | Full organization control, all permissions                   |
| ADMIN    | Manage teams, devices, members, audit logs (no org updates)  |
| MANAGER  | Create/update teams, create/update devices, read members     |
| OPERATOR | Read teams and devices                                        |
| VIEWER   | Read-only access to teams and devices                         |

## Multi-Tenancy

Every organization-owned resource is tenant-isolated at the database level (Supabase RLS) and at the application level (FastAPI repository queries are scoped by `organization_id`). Cross-tenant access is prevented server-side.

## API Endpoints

| Method | Path                              | Permission            | Description                |
| ------ | --------------------------------- | --------------------- | -------------------------- |
| GET    | /api/v1/health                    | —                     | Health check               |
| GET    | /api/v1/me                        | authenticated         | Current user profile       |
| PATCH  | /api/v1/me                        | authenticated         | Update profile             |
| GET    | /api/v1/organizations/me          | organizations:read    | Current organization       |
| PATCH  | /api/v1/organizations/me          | organizations:update  | Update organization        |
| GET    | /api/v1/organizations/me/members  | members:read          | List org members           |
| GET    | /api/v1/teams                     | teams:read            | List teams                 |
| POST   | /api/v1/teams                     | teams:create          | Create team                |
| GET    | /api/v1/teams/{id}                | teams:read            | Get team                   |
| PATCH  | /api/v1/teams/{id}                | teams:update          | Update team                |
| DELETE | /api/v1/teams/{id}                | teams:delete          | Delete team                |
| GET    | /api/v1/teams/{id}/members        | teams:read            | List team members          |
| POST   | /api/v1/teams/{id}/members        | members:manage        | Add member                 |
| DELETE | /api/v1/teams/{id}/members/{uid}  | members:manage        | Remove member              |
| GET    | /api/v1/devices                   | devices:read          | List devices (paginated)   |
| POST   | /api/v1/devices                   | devices:create        | Create device              |
| GET    | /api/v1/devices/{id}              | devices:read          | Get device                 |
| PATCH  | /api/v1/devices/{id}              | devices:update        | Update device              |
| DELETE | /api/v1/devices/{id}              | devices:delete        | Delete device (soft)       |
| GET    | /api/v1/audit-logs                | audit_logs:read       | List audit logs            |

## Quick Start

```bash
# Install frontend
npm install

# Start infrastructure
docker compose -f docker-compose.dev.yml up -d

# Start backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# Start frontend
npm run dev
```

## License

MIT
