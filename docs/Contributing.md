# Contributing

## Development Setup

### Prerequisites

- Node.js 20+
- Python 3.12+
- Docker & Docker Compose
- Git

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/geotrack-enterprise.git
   cd geotrack-enterprise
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Start infrastructure:
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

4. Set up backend:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   alembic upgrade head
   ```

5. Start development servers:
   ```bash
   # Terminal 1 — Backend
   cd backend && uvicorn app.main:app --reload

   # Terminal 2 — Frontend
   npm run dev
   ```

## Code Style

### Frontend (TypeScript / React)

- **Strict TypeScript** — no `any` types
- **Functional components** with hooks
- **Named exports** preferred
- **Tailwind CSS** for styling — use the design tokens
- **shadcn/ui** for UI primitives
- Run `npm run lint` and `npm run typecheck` before committing

### Backend (Python / FastAPI)

- **Python 3.12+** with type hints everywhere
- **async/await** for all I/O operations
- **Pydantic v2** for all schemas
- **SQLAlchemy 2** with async sessions
- Run `ruff check app`, `ruff format --check app`, and `mypy app` before committing

## Architecture Guidelines

- **Never put business logic in routes** — use service layer
- **Every module is independent** — no cross-module imports except through interfaces
- **Use dependency injection** — pass dependencies as arguments
- **Follow SOLID, DRY, KISS** principles
- **Write tests** — unit, integration, and API tests for every feature

## Git Workflow

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make your changes with clear, atomic commits
3. Ensure CI passes: `npm run lint && npm run typecheck && npm run build`
4. Open a pull request with a descriptive title and summary
5. Request review from a team member

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add device location history endpoint
fix: correct WebSocket reconnection logic
docs: update API reference for trips
refactor: extract geofence validation to service
test: add integration tests for auth flow
chore: update dependencies
```

## Testing

### Frontend

```bash
npm run test        # Run all tests
npm run test:watch  # Watch mode
```

### Backend

```bash
cd backend
pytest                      # All tests
pytest tests/unit/          # Unit only
pytest tests/integration/   # Integration only
pytest --cov=app            # With coverage
```

## Pull Request Checklist

- [ ] Code follows style guidelines
- [ ] Self-reviewed the code
- [ ] Added tests for new functionality
- [ ] All tests pass
- [ ] Linting and type checking pass
- [ ] Documentation updated if needed
- [ ] No breaking changes (or clearly documented)

## Reporting Issues

Use GitHub Issues for bug reports and feature requests. Include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, Python version)
