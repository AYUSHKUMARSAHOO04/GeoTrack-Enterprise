# API Reference

## Base URL

```
http://localhost:8000/api/v1
```

## Conventions

### Versioning

All endpoints are prefixed with `/api/v1/`. Future versions will use `/api/v2/`.

### Response Format

**Success:**
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Error:**
```json
{
  "detail": "Resource not found",
  "code": "NOT_FOUND",
  "field": null
}
```

### Authentication

All protected endpoints require a Bearer token:

```
Authorization: Bearer <access_token>
```

### Pagination

Query parameters:
- `page` (default: 1)
- `pageSize` (default: 20, max: 100)
- `sort` (e.g., `-created_at` for descending)
- `search` (full-text search)
- `filter[field]` (field-level filtering)

## Endpoints

### Authentication

| Method | Path                  | Description              |
| ------ | --------------------- | ------------------------ |
| POST   | `/auth/register`      | Register new organization |
| POST   | `/auth/login`         | Login and receive tokens |
| POST   | `/auth/refresh`       | Refresh access token     |
| POST   | `/auth/logout`        | Revoke refresh token     |
| GET    | `/auth/me`            | Get current user         |

### Organizations

| Method | Path                  | Description              |
| ------ | --------------------- | ------------------------ |
| GET    | `/organizations`      | List organizations       |
| GET    | `/organizations/{id}` | Get organization details |
| PATCH  | `/organizations/{id}` | Update organization     |

### Devices

| Method | Path                  | Description              |
| ------ | --------------------- | ------------------------ |
| GET    | `/devices`            | List devices             |
| POST   | `/devices`            | Create device            |
| GET    | `/devices/{id}`       | Get device details       |
| PATCH  | `/devices/{id}`       | Update device            |
| DELETE | `/devices/{id}`       | Soft delete device       |
| GET    | `/devices/{id}/location` | Get latest location  |
| GET    | `/devices/{id}/history`  | Get location history |

### Trips

| Method | Path                  | Description              |
| ------ | --------------------- | ------------------------ |
| GET    | `/trips`              | List trips               |
| GET    | `/trips/{id}`         | Get trip details         |
| GET    | `/trips/{id}/playback`| Get trip playback data   |

### Geofences

| Method | Path                  | Description              |
| ------ | --------------------- | ------------------------ |
| GET    | `/geofences`          | List geofences           |
| POST   | `/geofences`          | Create geofence          |
| GET    | `/geofences/{id}`     | Get geofence details     |
| PATCH  | `/geofences/{id}`     | Update geofence          |
| DELETE | `/geofences/{id}`     | Delete geofence          |

### Alerts

| Method | Path                  | Description              |
| ------ | --------------------- | ------------------------ |
| GET    | `/alerts`             | List alerts              |
| PATCH  | `/alerts/{id}/ack`    | Acknowledge alert        |

### Analytics

| Method | Path                  | Description              |
| ------ | --------------------- | ------------------------ |
| GET    | `/analytics/overview` | Dashboard overview      |
| GET    | `/analytics/fleet`    | Fleet utilization       |
| POST   | `/analytics/ai-query` | Natural language query   |

### WebSocket

| Path                           | Description              |
| ------------------------------ | ------------------------ |
| `/ws/locations`                | Real-time location stream |
| `/ws/alerts`                   | Real-time alert stream   |

## Status Codes

| Code | Meaning          |
| ---- | ---------------- |
| 200  | Success          |
| 201  | Created          |
| 204  | No Content       |
| 400  | Bad Request      |
| 401  | Unauthorized     |
| 403  | Forbidden        |
| 404  | Not Found        |
| 409  | Conflict         |
| 422  | Validation Error |
| 429  | Rate Limited     |
| 500  | Server Error     |
