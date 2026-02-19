# Full-Stack Application Template

A production-ready full-stack application template with **FastAPI**, **React**, **DynamoDB**, and **AWS infrastructure**. Built for rapid deployment with built-in CI/CD, security scanning, and comprehensive testing.

---

## What's Included

**Infrastructure & Deployment**
- AWS deployment scripts (ECS, ECR, ALB, Route 53, ACM)
- DynamoDB database with local development support
- Docker Compose for local development
- Nginx production configuration

**CI/CD & Quality**
- GitHub Actions workflows (CI, deploy, E2E testing)
- Security scanning (Semgrep, Trivy)
- Unit, integration, and E2E tests (pytest, Playwright)
- Linting (Ruff for Python, ESLint for React)

**Backend (FastAPI)**
- Python 3.9+ with async/await patterns
- Pydantic models for validation
- DynamoDB client with local/production support
- CORS configuration
- Health check endpoints

**Frontend (React)**
- Create React App setup
- Tailwind CSS for styling
- Axios API client
- React Router for navigation
- Mobile-first responsive design
- Accessibility-focused components

---

## Quick Start

### Using Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd <repo-name>
   ```

2. **Configure environment variables**
   
   Backend (`backend/.env`):
   ```bash
   DYNAMODB_TABLE_NAME=your_table_name
   AWS_DEFAULT_REGION=us-east-1
   DYNAMODB_ENDPOINT_URL=http://localhost:8000
   AWS_ACCESS_KEY_ID=dummy
   AWS_SECRET_ACCESS_KEY=dummy
   # Add your API keys here
   ```
   
   Frontend (`frontend/.env`):
   ```bash
   REACT_APP_BACKEND_URL=http://localhost:8001
   ```

3. **Start all services**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8001
   - API docs: http://localhost:8001/docs

### Manual Setup

**Prerequisites**: Python 3.9+, Node.js 18+, Docker (for local DynamoDB)

**Backend**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Configure your environment variables
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Frontend**
```bash
cd frontend
yarn install
cp .env.example .env  # Configure your environment variables
yarn start
```

**DynamoDB Local**
```bash
docker run -p 8000:8000 amazon/dynamodb-local
./infra/aws/scripts/init-dynamodb-local.sh
```

---

## Architecture

### Backend (FastAPI + DynamoDB)
- **Framework**: FastAPI with Pydantic data validation
- **Database**: DynamoDB (serverless NoSQL)
  - Local: DynamoDB Local via Docker
  - Production: AWS DynamoDB with IAM role authentication
- **API Design**: RESTful endpoints with OpenAPI documentation
- **Error Handling**: Structured HTTP responses with proper status codes

### Frontend (React + Tailwind)
- **Framework**: React 18 with functional components and hooks
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Context API (or add Redux/Zustand as needed)
- **Routing**: React Router v6
- **API Client**: Axios with centralized error handling

### Containerization
- **Backend**: Python 3.11 slim image with Uvicorn
- **Frontend**: Multi-stage build (Node.js → nginx)
- **nginx**: Configured for SPA routing and production optimization

---

## Customization

See **[TEMPLATE.md](./TEMPLATE.md)** for the complete customization guide.

**Key Files to Customize:**

| File | What to Change |
|------|----------------|
| `app.config.json` | Application name, description, branding |
| `design_guidelines.json` | Colors, typography, spacing |
| `backend/server.py` | API endpoints and business logic |
| `frontend/src/App.js` | Routes and page structure |
| `frontend/src/pages/` | Page components (replace with your app's pages) |
| `backend/dynamodb_client.py` | Database schema and queries |
| `docker-compose.yml` | Service configuration |
| `.github/workflows/` | CI/CD pipeline customization |

**Environment Variables:**
- Backend: `backend/.env` (database, API keys, AWS config)
- Frontend: `frontend/.env` (backend URL, feature flags)

---

## Development

**Run tests**
```bash
# Backend (pytest)
cd backend
pytest tests/ -v

# Frontend (Jest - if configured)
cd frontend
yarn test

# E2E tests (Playwright)
cd tests/e2e
npx playwright test
```

**Linting**
```bash
# Backend
cd backend
ruff check .

# Frontend
cd frontend
yarn lint
```

**Type checking**
```bash
# Backend (mypy - if configured)
cd backend
mypy .

# Frontend (TypeScript - if migrated)
cd frontend
yarn type-check
```

**View logs (Docker Compose)**
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## Deployment

### AWS Deployment

Complete guides available in `infra/`:

1. **[AWS-DEPLOYMENT.md](./infra/deployment/AWS-DEPLOYMENT.md)** — Full automated deployment guide
2. **[MANUAL-SETUP-GUIDE.md](./infra/aws/MANUAL-SETUP-GUIDE.md)** — Step-by-step manual setup
3. **[DYNAMODB-SETUP.md](./infra/aws/DYNAMODB-SETUP.md)** — Database provisioning

**Quick Deploy (AWS CLI)**
```bash
# Set up AWS credentials
export AWS_PROFILE=your-profile

# Deploy infrastructure
./infra/aws/scripts/deploy-infrastructure.sh

# Build and push Docker images
./infra/aws/scripts/build-and-push.sh

# Deploy to ECS
./infra/aws/scripts/deploy-ecs.sh
```

**GitHub Actions Deployment**

Deployment workflows are triggered by:
- `deploy-test.yml`: Deploys to test environment on push to `main`
- `deploy-prod.yml`: Deploys to production on tag push (`v*`)

Configure secrets in GitHub Settings → Secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- API keys and other secrets (see [GITHUB-SECRETS.md](./infra/aws/GITHUB-SECRETS.md))

---

## Project Structure

```
.
├── backend/                    # FastAPI backend
│   ├── server.py               # Main API application
│   ├── dynamodb_client.py      # Database client
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile              # Backend container
│   └── tests/                  # Backend tests
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── App.js              # Main app component
│   │   ├── api.js              # API client (Axios)
│   │   ├── pages/              # Page components
│   │   └── components/         # Reusable components
│   ├── public/                 # Static assets
│   ├── Dockerfile              # Frontend container (nginx)
│   ├── nginx.conf              # Production web server config
│   └── package.json            # Node.js dependencies
│
├── infra/                      # Infrastructure & deployment
│   ├── aws/                    # AWS setup guides & scripts
│   │   ├── scripts/            # Deployment automation
│   │   ├── DYNAMODB-SETUP.md
│   │   ├── MANUAL-SETUP-GUIDE.md
│   │   └── TROUBLESHOOTING.md
│   ├── deployment/
│   │   └── AWS-DEPLOYMENT.md   # Deployment guide
│   └── feature-flags/          # Feature toggle config
│
├── tests/                      # Test suites
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   └── e2e/                    # E2E tests (Playwright)
│
├── .github/
│   └── workflows/              # CI/CD pipelines
│       ├── ci.yml              # Lint, test, build, security scan
│       ├── deploy-test.yml     # Test environment deployment
│       └── deploy-prod.yml     # Production deployment
│
├── docker-compose.yml          # Local development setup
├── app.config.json             # Application configuration
├── design_guidelines.json      # Design system specification
├── TEMPLATE.md                 # Customization guide
└── README.md                   # This file
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DYNAMODB_TABLE_NAME` | Yes | DynamoDB table name | `my_app_table` |
| `AWS_DEFAULT_REGION` | Yes | AWS region | `us-east-1` |
| `DYNAMODB_ENDPOINT_URL` | No | Local DynamoDB endpoint (dev only) | `http://localhost:8000` |
| `AWS_ACCESS_KEY_ID` | Conditional | AWS credentials (local dev: `dummy`) | See AWS docs |
| `AWS_SECRET_ACCESS_KEY` | Conditional | AWS credentials (local dev: `dummy`) | See AWS docs |

Add your API keys and service credentials as needed.

### Frontend (`frontend/.env`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `REACT_APP_BACKEND_URL` | Yes | Backend API URL | `http://localhost:8001` |

All React environment variables must start with `REACT_APP_`.

---

## Security & Best Practices

- **Never commit secrets**: Use `.env` files (gitignored) and GitHub Secrets
- **IAM roles in production**: No hardcoded AWS credentials
- **Security scanning**: Semgrep (code) and Trivy (containers) in CI
- **HTTPS only**: ACM certificates for production (see [HTTPS-SETUP.md](./infra/aws/HTTPS-SETUP.md))
- **CORS configuration**: Restrict origins in production
- **Input validation**: Pydantic models on backend
- **Error handling**: Never expose stack traces to clients

---

## License

[MIT License](./LICENSE) — Free to use, modify, and distribute.

---

## Support

- **Documentation**: See `infra/` and `TEMPLATE.md`
- **Troubleshooting**: [infra/aws/TROUBLESHOOTING.md](./infra/aws/TROUBLESHOOTING.md)
- **CI/CD**: [.github/workflows/README.md](./.github/workflows/README.md)

Built with ❤️ for rapid full-stack development.
