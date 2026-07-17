# Database Schema

## Overview

GeoTrack Enterprise uses PostgreSQL 16 with the PostGIS extension for geospatial data. All tables use UUID primary keys, audit timestamps (`created_at`, `updated_at`), and soft delete (`deleted_at`) where appropriate.

## ER Diagram

```mermaid
erDiagram
    organizations ||--o{ teams : has
    organizations ||--o{ users : has
    organizations ||--o{ devices : has
    organizations ||--o{ geofences : has
    organizations ||--o{ alerts : has
    organizations ||--o{ audit_logs : has
    teams ||--o{ devices : manages
    users ||--o{ devices : owns
    devices ||--o{ locations : tracks
    devices ||--o{ trips : records
    geofences ||--o{ alerts : triggers
    users ||--o{ audit_logs : performs

    organizations {
        uuid id PK
        string name
        string slug UK
        string plan
        bool is_active
        timestamp created_at
        timestamp updated_at
    }

    users {
        uuid id PK
        uuid organization_id FK
        string email UK
        string password_hash
        string first_name
        string last_name
        string role
        string avatar_url
        bool is_active
        timestamp last_login_at
        timestamp created_at
        timestamp updated_at
    }

    teams {
        uuid id PK
        uuid organization_id FK
        string name
        string description
        timestamp created_at
        timestamp updated_at
    }

    devices {
        uuid id PK
        uuid organization_id FK
        uuid team_id FK
        uuid assigned_user_id FK
        string name
        string identifier UK
        string type
        string status
        int battery_level
        timestamp last_seen_at
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }

    locations {
        uuid id PK
        uuid device_id FK
        geography point
        float altitude
        float speed
        float heading
        float accuracy
        timestamp timestamp
    }

    trips {
        uuid id PK
        uuid device_id FK
        timestamp start_time
        timestamp end_time
        float distance
        int duration
        geography start_location
        geography end_location
        string status
        timestamp created_at
        timestamp updated_at
    }

    geofences {
        uuid id PK
        uuid organization_id FK
        string name
        string description
        string type
        geography coordinates
        float radius
        bool is_active
        timestamp created_at
        timestamp updated_at
    }

    alerts {
        uuid id PK
        uuid organization_id FK
        uuid device_id FK
        uuid geofence_id FK
        string type
        string severity
        string message
        timestamp acknowledged_at
        timestamp created_at
    }

    audit_logs {
        uuid id PK
        uuid user_id FK
        uuid organization_id FK
        string action
        string resource
        uuid resource_id
        jsonb metadata
        string ip_address
        timestamp created_at
    }
```

## Indexes

| Table      | Index                              | Type   |
| ---------- | ---------------------------------- | ------ |
| users      | `idx_users_email`                  | btree  |
| users      | `idx_users_organization_id`        | btree  |
| devices    | `idx_devices_organization_id`      | btree  |
| devices    | `idx_devices_identifier`           | btree  |
| devices    | `idx_devices_team_id`              | btree  |
| locations  | `idx_locations_device_id`          | btree  |
| locations  | `idx_locations_device_timestamp`   | btree  |
| locations  | `idx_locations_point`              | GIST   |
| trips      | `idx_trips_device_id`              | btree  |
| trips      | `idx_trips_status`                 | btree  |
| geofences  | `idx_geofences_organization_id`    | btree  |
| geofences  | `idx_geofences_coordinates`        | GIST   |
| alerts     | `idx_alerts_organization_id`       | btree  |
| alerts     | `idx_alerts_created_at`            | btree  |
| audit_logs | `idx_audit_logs_user_id`           | btree  |
| audit_logs | `idx_audit_logs_created_at`         | btree  |

## Constraints

- **UNIQUE**: `users.email`, `devices.identifier`, `organizations.slug`
- **CHECK**: `devices.type IN ('vehicle', 'asset', 'person')`
- **CHECK**: `users.role IN ('super_admin', 'admin', 'manager', 'operator', 'viewer')`
- **FOREIGN KEY**: All inter-table relationships with `ON DELETE CASCADE` or `ON DELETE SET NULL` as appropriate

## PostGIS Usage

- `locations.point` — `GEOGRAPHY(Point, 4326)` for WGS84 coordinates
- `geofences.coordinates` — `GEOGRAPHY(Polygon, 4326)` for polygon geofences
- Spatial queries use `ST_DWithin`, `ST_Contains`, `ST_Distance` for proximity and containment checks
