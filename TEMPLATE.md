# Application Template

This repository is a production-ready full-stack application template designed to be customized by an AI agent (or developer) into a brand new application from a single prompt.

## What This Template Provides

### Architecture
- **Backend:** Python FastAPI REST API with DynamoDB (single-table design)
- **Frontend:** React 18 SPA with Tailwind CSS, React Router v6
- **AI Integration:** LLM client abstraction (Groq / Llama 3.3 70B)
- **Containerization:** Multi-stage Docker builds with non-root users
- **Infrastructure:** AWS ECS/Fargate deployment with ALB, ECR, DynamoDB

### CI/CD Pipeline (GitHub Actions)
- **Backend Linting:** Black, isort, flake8, mypy
- **Backend Tests:** pytest with DynamoDB Local
- **Backend Integrity:** E2E API tests against a live server
- **Frontend Linting:** ESLint with React/Hooks plugins
- **Frontend Tests:** Jest + React Testing Library
- **Frontend Build:** Production build validation
- **Frontend E2E:** Playwright browser tests
- **SAST:** Semgrep (OWASP Top 10, language-specific rules)
- **SCA:** Trivy dependency vulnerability scanning
- **Deployment:** Automated test deploys on main, tag-based production deploys

### Security
- Semgrep SAST scanning in CI
- Trivy SCA scanning in CI
- Non-root Docker containers
- AWS Secrets Manager for sensitive values
- CORS middleware with configurable origins
- Request ID middleware for tracing
- Security headers in nginx (X-Frame-Options, X-Content-Type-Options, etc.)

### Testing
- Backend unit tests (pytest)
- Backend integration tests (pytest + DynamoDB Local)
- Backend E2E/integrity tests (live server)
- Frontend unit tests (Jest + React Testing Library)
- Frontend E2E tests (Playwright)

---

## How to Customize This Template

### Step 1: Define Your Application

Choose your app name, description, and domain. Then update these files:

| File | What to Change |
|------|----------------|
| `app.config.json` | App name, description, and metadata |
| `README.md` | Project title, description, setup instructions |
| `design_guidelines.json` | Brand identity, colors, fonts, tone |
| `frontend/tailwind.config.js` | Color palette, typography |
| `frontend/public/index.html` | Page title, fonts, meta tags |

### Step 2: Build Your Data Model

The template includes a generic "items" CRUD example. Replace it with your domain entities:

| File | What to Change |
|------|----------------|
| `backend/server.py` | API endpoints, Pydantic models, business logic |
| `backend/dynamodb_client.py` | Entity-specific CRUD operations (PK/SK patterns) |
| `backend/llm_client.py` | Customize AI prompt templates (if using AI features) |

### Step 3: Build Your Frontend

The template includes placeholder pages. Replace with your UI:

| File | What to Change |
|------|----------------|
| `frontend/src/App.js` | Routes and page imports |
| `frontend/src/pages/` | Page components (replace placeholders) |
| `frontend/src/components/` | Reusable UI components |
| `frontend/src/api.js` | API client (add endpoint functions) |
| `frontend/src/utils.js` | Utility functions |

### Step 4: Update Tests

Match your tests to your new domain logic:

| File | What to Change |
|------|----------------|
| `backend/tests/` | Backend unit tests |
| `tests/unit/` | Additional unit tests |
| `tests/integration/` | Integration tests (pytest + DynamoDB) |
| `frontend/src/__tests__/` | Frontend component tests |
| `tests/e2e/specs/` | Playwright E2E tests |
| `backend_test.py` | Backend integrity/E2E tests |

### Step 5: Configure Infrastructure

| File | What to Change |
|------|----------------|
| `app.config.json` | Set `app_name` - used by infra scripts |
| `infra/aws/scripts/config.sh` | Verify AWS settings (region, instance sizes) |
| `.github/workflows/*.yml` | Verify secrets and environment references |
| `docker-compose.yml` | Local dev environment variables |

---

## Configuration Reference

### `app.config.json`

Central configuration file for the application template:

```json
{
  "app_name": "myapp",
  "display_name": "My Application",
  "description": "A brief description of your application",
  "version": "0.1.0"
}
```

The `app_name` value is used as:
- DynamoDB table name default
- ECR repository prefix (`{app_name}-backend`, `{app_name}-frontend`)
- ECS service/task family prefix
- Docker image tags
- Frontend package name

### Environment Variables

#### Backend (`backend/.env`)
```
DYNAMODB_TABLE_NAME=myapp          # DynamoDB table name
AWS_DEFAULT_REGION=us-east-1       # AWS region
DYNAMODB_ENDPOINT_URL=             # Set for local dev (http://localhost:8000)
GROQ_API_KEY=your-groq-api-key    # Required for AI features
ALLOWED_ORIGINS=http://localhost:3000  # CORS allowed origins
```

#### Frontend (`frontend/.env`)
```
REACT_APP_BACKEND_URL=http://localhost:8001  # Backend API URL
```

### GitHub Secrets (for CI/CD)
- `AWS_ACCOUNT_ID` - AWS account ID
- `AWS_REGION` - AWS region (default: us-east-1)
- `GROQ_API_KEY` - Groq API key for AI features
- See `infra/aws/GITHUB-SECRETS.md` for full list

---

## Project Structure

```
├── app.config.json              # ← Central app configuration
├── backend/                     # Python FastAPI backend
│   ├── server.py                # API endpoints and business logic
│   ├── dynamodb_client.py       # DynamoDB data access layer
│   ├── llm_client.py            # LLM client abstraction (Groq)
│   ├── Dockerfile               # Production container (non-root)
│   ├── requirements.txt         # Python dependencies
│   ├── .flake8                  # Linter config
│   └── tests/                   # Backend unit tests
├── frontend/                    # React 18 frontend
│   ├── src/
│   │   ├── App.js               # Router and page layout
│   │   ├── api.js               # Axios API client
│   │   ├── utils.js             # Shared utilities
│   │   ├── pages/               # Page components
│   │   └── components/          # Reusable components
│   ├── Dockerfile               # Production container (nginx, non-root)
│   ├── nginx.conf               # Nginx config with security headers
│   ├── tailwind.config.js       # Tailwind theme
│   └── package.json             # Node.js dependencies
├── tests/                       # Test suites
│   ├── unit/                    # Python unit tests
│   ├── integration/             # Python integration tests
│   └── e2e/                     # Playwright E2E tests
├── infra/                       # Infrastructure & deployment
│   ├── aws/scripts/             # AWS setup automation
│   └── deployment/              # Deployment guides
├── .github/workflows/           # CI/CD pipelines
│   ├── ci.yml                   # Lint, test, build, security scan
│   ├── deploy-test.yml          # Deploy to test environment
│   ├── deploy-prod.yml          # Deploy to production
│   ├── e2e-test.yml             # E2E tests on test env
│   └── e2e-prod.yml             # E2E tests on prod env
├── docker-compose.yml           # Local development environment
├── pytest.ini                   # pytest configuration
└── README.md                    # Project documentation
```

---

## Patterns and Conventions

### Backend Patterns

**API Endpoints:**
```python
@app.post("/api/items", status_code=201)
async def create_item(item: CreateItemRequest, x_device_id: str = Header(None)):
    # Validate input
    # Call DynamoDB client
    # Return response
```

**Pydantic Models:**
```python
class CreateItemRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
```

**DynamoDB Single-Table Design:**
- PK: `{ENTITY}#{uuid}` (e.g., `ITEM#abc123`)
- SK: `METADATA` (for main entity data)
- GSI1PK: `DEVICE#{device_id}` (for multi-tenancy)
- GSI1SK: `{created_at}` (for sorting)

**Error Handling:**
```python
raise HTTPException(status_code=404, detail="Item not found")
```

### Frontend Patterns

**Page Component:**
```jsx
import React, { useState, useEffect } from 'react';
import api from '../api';

function ItemList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  // ...fetch and render
}
```

**API Calls:**
```javascript
const response = await api.get('/api/items');
```

**Styling:** Always use Tailwind utility classes. See `tailwind.config.js` for theme tokens.

---

## Quick Start

```bash
# 1. Clone and configure
cp backend/.env.example backend/.env   # Add your GROQ_API_KEY
cp frontend/.env.example frontend/.env

# 2. Start with Docker Compose
docker-compose up

# 3. Open the app
open http://localhost:3000

# 4. Run tests
cd backend && pytest                    # Backend tests
cd frontend && yarn test                # Frontend tests
cd tests/e2e && npx playwright test     # E2E tests
```

---

## For AI Agents

When using this template to create a new application:

1. **Read `app.config.json`** to understand the current configuration
2. **Read `design_guidelines.json`** for the design system
3. **Start with the backend** - define your data model in `server.py` and `dynamodb_client.py`
4. **Build the frontend** - create pages and components that match your domain
5. **Update tests** - ensure all existing test patterns are maintained
6. **Run CI checks** - `cd backend && black . && isort . && flake8 .` and `cd frontend && yarn lint`
7. **Verify builds** - `cd frontend && yarn build` and `docker-compose build`

The template is designed so that you can replace the placeholder "items" CRUD with any domain model while keeping all infrastructure, CI/CD, security scanning, and deployment patterns intact.
