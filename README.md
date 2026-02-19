# ShoreExplorer - Cruise Port of Call Day Planner

> Last updated: 2026-02-19

Plan your perfect day ashore at every cruise port of call. ShoreExplorer uses AI to generate personalised itineraries based on your preferences, weather conditions, and cruise schedule.

---

## Table of Contents

1. [What Does This App Do?](#what-does-this-app-do)
2. [What You'll Need Before Starting](#what-youll-need-before-starting)
3. [Step-by-Step Setup Guide](#step-by-step-setup-guide)
   - [Step 1: Install Required Software](#step-1-install-required-software)
   - [Step 2: Download the Project](#step-2-download-the-project)
   - [Step 3: Set Up the Backend](#step-3-set-up-the-backend)
   - [Step 4: Set Up the Frontend](#step-4-set-up-the-frontend)
   - [Step 5: Start the App](#step-5-start-the-app)
4. [Environment Variables Explained](#environment-variables-explained)
5. [How to Use the App](#how-to-use-the-app)
6. [Troubleshooting Common Issues](#troubleshooting-common-issues)
7. [Project Structure](#project-structure)
8. [Third-Party Services](#third-party-services)
9. [Infrastructure & Deployment](#infrastructure--deployment)

---

## What Does This App Do?

ShoreExplorer helps cruise passengers plan their time at each port of call. You tell it:
- Which cruise ship you're on
- Which ports you're visiting (and when you arrive/depart)
- Who's travelling (solo, couple, family)
- How active you want to be
- How you want to get around (walking, taxi, public transport)
- Your budget

It then uses AI to generate a complete day plan with:
- A circular route starting and ending at your cruise ship
- Timed activities with descriptions and cost estimates
- Weather-appropriate suggestions
- An interactive map showing your route
- Links to book paid activities
- Packing suggestions and safety tips

---

## What You'll Need Before Starting

Before you begin, you'll need to install some software on your computer. Don't worry - each tool below has a simple installer, and we'll walk through them one at a time.

| Software | What It Is | Where to Get It |
|----------|-----------|-----------------|
| **Node.js** (v18 or newer) | Runs the frontend (the part you see in the browser) | [nodejs.org/en/download](https://nodejs.org/en/download) |
| **Yarn** | Installs frontend code packages | Installed via Node.js (see Step 1) |
| **Python** (v3.9 or newer) | Runs the backend (the server that handles data) | [python.org/downloads](https://www.python.org/downloads/) |
| **Docker** (optional) | For running DynamoDB Local in development | [docker.com/get-docker](https://www.docker.com/get-docker/) |
| **AWS CLI** (for production) | For deploying to AWS and managing DynamoDB | [aws.amazon.com/cli](https://aws.amazon.com/cli/) |
| **Git** | Downloads the project code | [git-scm.com/downloads](https://git-scm.com/downloads/) |

**Note**: For local development, we use **DynamoDB Local** (runs via Docker or standalone). For production, we use **AWS DynamoDB** (fully managed, serverless database).

You will also need one API key:

| Key | What It's For | How to Get It |
|-----|--------------|---------------|
| **Groq API Key** | Powers the AI that generates your day plans using Llama 3.3 70B | Go to [Groq Console](https://console.groq.com/keys), sign up (free), and click "Create API Key". Free tier: 30 requests/minute, 14,400 requests/day. See [GROQ_SETUP.md](GROQ_SETUP.md) for detailed instructions. |

> **No other API keys are needed.** The weather service (Open-Meteo) and maps (OpenStreetMap) are completely free and require no sign-up.

---

## Step-by-Step Setup Guide

Open the **Terminal** app on your computer (Mac/Linux) or **Command Prompt / PowerShell** (Windows) and follow each step below.

### Step 1: Install Required Software

#### Install Node.js
1. Go to [nodejs.org/en/download](https://nodejs.org/en/download)
2. Download the installer for your operating system (Mac, Windows, or Linux)
3. Run the installer and follow the on-screen prompts (accept all defaults)
4. Verify it installed correctly by typing this in your terminal:
   ```
   node --version
   ```
   You should see something like `v18.x.x` or `v20.x.x`

#### Install Yarn
Once Node.js is installed, install Yarn by typing:
```
npm install -g yarn
```
Verify it worked:
```
yarn --version
```

#### Install Python
1. Go to [python.org/downloads](https://www.python.org/downloads/)
2. Download the installer for your operating system
3. **Important (Windows only):** During installation, tick the box that says **"Add Python to PATH"**
4. Run the installer and follow the prompts
5. Verify it installed:
   ```
   python3 --version
   ```
   You should see something like `Python 3.11.x` or `Python 3.12.x`

#### Install Docker (for local DynamoDB)
1. Go to [docker.com/get-docker](https://www.docker.com/get-docker/)
2. Download Docker Desktop for your operating system
3. Install and start Docker Desktop
4. Verify installation:
   ```
   docker --version
   ```
   You should see `Docker version 20.x.x` or newer

**Note**: Docker is used to run DynamoDB Local for development. In production, we use AWS DynamoDB (managed service).

#### Install Git
1. Go to [git-scm.com/downloads](https://git-scm.com/downloads/)
2. Download and install for your operating system (accept all defaults)

---

### Step 2: Download the Project

Open your terminal and navigate to where you want to store the project (e.g. your Desktop or Documents folder):

```bash
cd ~/Desktop
```

Then download the project:
```bash
git clone <your-repository-url> shoreexplorer
cd shoreexplorer
```

> Replace `<your-repository-url>` with the actual GitHub URL of this repository.

---

### Step 3: Set Up the Backend

The backend is the server that handles your data, talks to the AI, and fetches weather information.

#### 3a. Create a Python virtual environment

This keeps the project's packages separate from the rest of your computer:

```bash
cd backend
python3 -m venv venv
```

#### 3b. Activate the virtual environment

**Mac / Linux:**
```bash
source venv/bin/activate
```

**Windows (Command Prompt):**
```bash
venv\Scripts\activate
```

**Windows (PowerShell):**
```bash
venv\Scripts\Activate.ps1
```

You'll know it's working when you see `(venv)` at the beginning of your terminal line.

#### 3c. Install Python packages

```bash
pip install -r requirements.txt
```

#### 3d. Create the backend environment file

You need to create a file called `.env` inside the `backend` folder. This file tells the backend where to find the database and AI service.

**Mac / Linux:**
```bash
cat > .env << 'EOF'
DYNAMODB_TABLE_NAME=shoreexplorer
AWS_DEFAULT_REGION=us-east-1
DYNAMODB_ENDPOINT_URL=http://localhost:8000
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
GROQ_API_KEY=your-groq-api-key-here
EOF
```

**Windows (manually):**
1. Open Notepad (or any text editor)
2. Paste the following lines:
   ```
   DYNAMODB_TABLE_NAME=shoreexplorer
   AWS_DEFAULT_REGION=us-east-1
   DYNAMODB_ENDPOINT_URL=http://localhost:8000
   AWS_ACCESS_KEY_ID=dummy
   AWS_SECRET_ACCESS_KEY=dummy
   GROQ_API_KEY=your-groq-api-key-here
   ```
3. Save the file as `.env` (not `.env.txt`) inside the `backend` folder
   - In the "Save as type" dropdown, select "All Files"
   - Name it exactly `.env`

**Now replace the placeholder values:**

| Variable | What to Put | Example |
|----------|------------|---------|
| `DYNAMODB_TABLE_NAME` | The name of your DynamoDB table. **Leave this as-is** for local development. | `shoreexplorer` |
| `AWS_DEFAULT_REGION` | AWS region for DynamoDB. **Leave this as-is** for local development. | `us-east-1` |
| `DYNAMODB_ENDPOINT_URL` | URL for DynamoDB Local. **Leave this as-is** when using Docker Compose. | `http://localhost:8000` |
| `AWS_ACCESS_KEY_ID` | Dummy credentials for local DynamoDB. **Leave this as-is**. | `dummy` |
| `AWS_SECRET_ACCESS_KEY` | Dummy credentials for local DynamoDB. **Leave this as-is**. | `dummy` |
| `GROQ_API_KEY` | Your Groq API key for AI-powered day plan generation. Replace `your-groq-api-key-here` with your actual key from Groq Console. | `gsk_abc123...` |

**Note**: The `dummy` AWS credentials are only for local development with DynamoDB Local. For production deployments to AWS, real AWS credentials are managed through IAM roles.

> **Where do I get my Groq API Key?**
> 1. Go to [Groq Console](https://console.groq.com/keys)
> 2. Sign up for free (no credit card required)
> 3. Click **"Create API Key"**
> 4. Give it a name (e.g., "ShoreExplorer Dev") and click **"Submit"**
> 5. Copy your key (starts with `gsk_...`) and paste it into the `.env` file
> 6. Free tier limits: 30 requests per minute, 14,400 requests per day
> 7. For detailed setup instructions, see [GROQ_SETUP.md](GROQ_SETUP.md)

---

### Step 4: Set Up the Frontend

The frontend is what you see and interact with in your web browser.

Open a **new terminal window** (keep the backend terminal open) and navigate to the frontend folder:

```bash
cd ~/Desktop/shoreexplorer/frontend
```

#### 4a. Install frontend packages

```bash
yarn install
```

This will take a minute or two as it downloads all the required code packages.

#### 4b. Create the frontend environment file

Create a file called `.env` inside the `frontend` folder.

**Mac / Linux:**
```bash
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=http://localhost:8001
EOF
```

**Windows (manually):**
1. Open Notepad
2. Paste this single line:
   ```
   REACT_APP_BACKEND_URL=http://localhost:8001
   ```
3. Save as `.env` inside the `frontend` folder (same method as before - "All Files" type, name it `.env`)

| Variable | What to Put | Notes |
|----------|------------|-------|
| `REACT_APP_BACKEND_URL` | The address where the backend server runs. **Leave this as-is** for local development. | `http://localhost:8001` |

---

### Step 5: Start the App

There are two ways to start the app: using **Docker Compose** (recommended, easier) or **manually** (more control).

#### Option A: Using Docker Compose (Recommended)

This method starts everything (frontend, backend, and DynamoDB Local) with a single command:

```bash
cd ~/Desktop/shoreexplorer
docker-compose up --build
```

After a few moments, you should see:
```
dynamodb-local_1  | Initializing DynamoDB Local
backend_1         | INFO:  Uvicorn running on http://0.0.0.0:8001
frontend_1        | Compiled successfully!
```

**The app is now running:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8001
- DynamoDB Local: http://localhost:8000

Open your browser to `http://localhost:3000` to see the ShoreExplorer landing page.

**To stop:** Press `Ctrl+C` in the terminal, then run `docker-compose down`

#### Option B: Manual Setup (Advanced)

If you prefer to run each service separately (useful for development):

**Terminal 1: Start DynamoDB Local**
```bash
docker run -p 8000:8000 amazon/dynamodb-local
```

**Terminal 2: Initialize DynamoDB table**
```bash
cd ~/Desktop/shoreexplorer
./infra/aws/scripts/init-dynamodb-local.sh
```

**Terminal 3: Start the Backend**
```bash
cd ~/Desktop/shoreexplorer/backend
source venv/bin/activate   # Mac/Linux (or venv\Scripts\activate on Windows)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

You should see:
```
INFO:     Successfully connected to DynamoDB table 'shoreexplorer'
INFO:     Uvicorn running on http://0.0.0.0:8001
INFO:     Application startup complete.
```

**Terminal 4: Start the Frontend**
```bash
cd ~/Desktop/shoreexplorer/frontend
yarn start
```

After a moment, you should see:
```
Compiled successfully!
You can now view shoreexplorer in the browser.
  Local: http://localhost:3000
```

**Your browser should automatically open to `http://localhost:3000`.** If it doesn't, open your browser and go to that address manually.

You should now see the ShoreExplorer landing page with the headline "Make Every Port an Adventure".

---

## Environment Variables Explained

Here is a complete reference of every environment variable the app uses:

### Backend (`backend/.env`)

| Variable | Required | Description | Default for Local Dev |
|----------|----------|-------------|----------------------|
| `DYNAMODB_TABLE_NAME` | Yes | Name of the DynamoDB table for storing trips and plans. | `shoreexplorer` |
| `AWS_DEFAULT_REGION` | Yes | AWS region for DynamoDB. For local development with DynamoDB Local, this can be any valid region. | `us-east-1` |
| `DYNAMODB_ENDPOINT_URL` | No | Custom endpoint for DynamoDB Local. Only needed for local development. Omit this for production (uses real AWS DynamoDB). | `http://localhost:8000` |
| `AWS_ACCESS_KEY_ID` | Conditional | AWS credentials. Use `dummy` for local DynamoDB. For production, managed via IAM roles (not needed in env file). | `dummy` |
| `AWS_SECRET_ACCESS_KEY` | Conditional | AWS credentials. Use `dummy` for local DynamoDB. For production, managed via IAM roles (not needed in env file). | `dummy` |
| `GROQ_API_KEY` | Yes | Groq API key for AI plan generation. Without this, the "Generate Day Plan" feature will not work. Get it free from [Groq Console](https://console.groq.com/keys). See [GROQ_SETUP.md](GROQ_SETUP.md) for details. | *(You must provide your own key)* |

### Frontend (`frontend/.env`)

| Variable | Required | Description | Default for Local Dev |
|----------|----------|-------------|----------------------|
| `REACT_APP_BACKEND_URL` | Yes | The URL where the backend API is running. The frontend sends all data requests to this address. | `http://localhost:8001` |

> **Important:** Do not add quotes around the values. Write `DYNAMODB_TABLE_NAME=shoreexplorer` not `DYNAMODB_TABLE_NAME="shoreexplorer"`

> **Important:** Do not add comments or extra text in the `.env` files. Each line should be exactly `KEY=value`.

---

## How to Use the App

Once the app is running in your browser:

1. **Click "Start Planning"** on the landing page
2. **Enter your ship name** (e.g. "Symphony of the Seas") and optionally the cruise line
3. **Click "+ Add Port"** to add each port you're visiting
   - Start typing a port name and select from the suggestions (popular ports are pre-loaded with coordinates)
   - Or enter the port name, country, and coordinates manually
   - Set your arrival and departure date/time for each port
4. **Click "Create Trip"** to save
5. On the trip detail page, click **"Plan Day"** next to any port
6. **Choose your preferences:**
   - Who's travelling (solo / couple / family)
   - Activity level (light walk / moderate / active / intensive)
   - How to get around (walking / public transport / taxi / mixed)
   - Budget (free only / low / medium / high)
7. **Click "Generate Day Plan"** - the AI will take 15-30 seconds to create your personalised itinerary
8. **View your plan** with:
   - A map showing your route with numbered stops
   - A timeline of activities with times, costs, and tips
   - Weather forecast for the day
   - Packing suggestions and safety tips
9. **Click "Open in Google Maps"** to export your route for turn-by-turn navigation on your phone

---

## Troubleshooting Common Issues

### "Database service is currently unavailable" or backend won't start

**If using Docker Compose:**
Make sure Docker is running and start all services together:
```bash
docker-compose up --build
```

**If running manually:**
DynamoDB Local needs to be running before you start the backend.

1. Start DynamoDB Local in a separate terminal:
```bash
docker run -p 8000:8000 amazon/dynamodb-local
```

2. Initialize the table (only needed once):
```bash
./infra/aws/scripts/init-dynamodb-local.sh
```

3. Verify it's running:
```bash
curl http://localhost:8000/
```
You should see a response from DynamoDB Local.

### "GROQ_API_KEY" errors or AI plan generation fails
- Double-check that your key is correct in `backend/.env`
- Make sure there are no extra spaces or quotes around the key
- Verify your key starts with `gsk_` and is valid at [Groq Console](https://console.groq.com/keys)
- Check that you haven't exceeded the free tier limits (30 requests/minute, 14,400 requests/day)
- See [GROQ_SETUP.md](GROQ_SETUP.md) for complete troubleshooting

### Frontend shows a blank page
- Make sure the backend is running first
- Check that `frontend/.env` has `REACT_APP_BACKEND_URL=http://localhost:8001`
- If you changed the `.env` file while the frontend was running, stop the frontend (press `Ctrl+C`) and restart it with `yarn start`

### "Port already in use" error
Another programme is using port 3000, 8001, or 8000. Either:
- Close the other programme, or
- Change the port:
  - DynamoDB Local: `docker run -p 8001:8000 amazon/dynamodb-local` (and update `DYNAMODB_ENDPOINT_URL` in backend/.env)
  - Backend: `uvicorn server:app --host 0.0.0.0 --port 8002 --reload` (and update `frontend/.env` to `REACT_APP_BACKEND_URL=http://localhost:8002`)
  - Frontend: `PORT=3001 yarn start`

### Map doesn't show / looks broken
The map requires an internet connection (it loads tiles from OpenStreetMap). Make sure you're connected to the internet.

### Weather shows "unavailable"
The weather API (Open-Meteo) only provides forecasts up to 16 days in the future. If your port visit date is further away, weather data won't be available yet. It will appear closer to your travel date.

---

## Project Structure

```
shoreexplorer/
├── backend/                    # Python FastAPI server
│   ├── server.py               # Main API application (all endpoints)
│   ├── llm_client.py           # Groq LLM integration (Llama 3.3 70B)
│   ├── dynamodb_client.py      # AWS DynamoDB database client
│   ├── affiliate_config.py     # Affiliate link configuration
│   ├── ports_data.py           # Pre-loaded cruise port database
│   ├── Dockerfile              # Backend container image
│   ├── requirements.txt        # Python package list
│   ├── .env                    # Backend environment variables (you create this)
│   └── tests/                  # Backend unit tests
│       ├── test_api.py
│       └── test_error_handling.py
│
├── frontend/                   # React web application
│   ├── public/
│   │   ├── index.html          # HTML entry point
│   │   └── manifest.json       # PWA configuration
│   ├── src/
│   │   ├── App.js              # Main app with page routing
│   │   ├── api.js              # Centralised API calls (Axios)
│   │   ├── utils.js            # Utility functions
│   │   ├── pages/
│   │   │   ├── Landing.js      # Home page with hero section
│   │   │   ├── TripSetup.js    # Create/edit trip form
│   │   │   ├── TripDetail.js   # View trip with port list
│   │   │   ├── PortPlanner.js  # Set preferences & generate plan
│   │   │   ├── DayPlanView.js  # View generated day plan
│   │   │   ├── MyTrips.js      # List of saved trips
│   │   │   └── TermsConditions.js  # Third-party T&Cs
│   │   └── components/
│   │       ├── Layout.js       # App shell (nav bars)
│   │       ├── MapView.js      # Leaflet map with route
│   │       ├── WeatherCard.js  # Weather forecast display
│   │       └── ActivityCard.js # Activity timeline item
│   ├── Dockerfile              # Frontend container image (nginx)
│   ├── nginx.conf              # Production nginx config
│   ├── .env                    # Frontend environment variables (you create this)
│   ├── package.json            # Node.js package list
│   └── tailwind.config.js      # Tailwind CSS theme config
│
├── infra/                      # Infrastructure & deployment
│   ├── aws/                    # AWS setup guides & scripts
│   │   ├── scripts/            # Deployment & diagnostics scripts
│   │   ├── DYNAMODB-SETUP.md   # DynamoDB table setup guide
│   │   ├── MANUAL-SETUP-GUIDE.md  # Step-by-step AWS setup
│   │   ├── TROUBLESHOOTING.md  # AWS troubleshooting guide
│   │   └── ...                 # DNS, HTTPS, secrets guides
│   ├── deployment/             # AWS deployment guide
│   │   └── AWS-DEPLOYMENT.md
│   ├── feature-flags/          # Feature toggle configuration
│   └── github-actions/         # CI/CD utilities
│
├── tests/                      # Test suites
│   ├── unit/                   # Unit tests (pytest)
│   ├── integration/            # Integration tests (pytest)
│   └── e2e/                    # End-to-end tests (Playwright)
│
├── .github/                    # CI/CD & GitHub configuration
│   ├── workflows/              # GitHub Actions workflows
│   │   ├── ci.yml              # Main CI pipeline (lint, test, build, security)
│   │   ├── deploy-test.yml     # Deploy to test environment
│   │   ├── deploy-prod.yml     # Deploy to production
│   │   ├── e2e-test.yml        # E2E tests against test env
│   │   └── e2e-prod.yml        # E2E tests against production
│   └── ...                     # CI docs, branch protection guide
│
├── docker-compose.yml          # Local dev (frontend + backend + DynamoDB Local)
├── design_guidelines.json      # UI/UX design system specification
├── GROQ_SETUP.md               # Groq API key setup guide
├── AFFILIATE_LINKS.md          # Affiliate link configuration guide
└── README.md                   # This file
```

---

## Third-Party Services

| Service | Used For | Cost | API Key Needed? |
|---------|---------|------|-----------------|
| **Groq** (Llama 3.3 70B) | AI day plan generation | Free tier (30 req/min, 14,400 req/day) | Yes ([Groq API Key](https://console.groq.com/keys)) |
| **Open-Meteo** | Weather forecasts | Free | No |
| **OpenStreetMap + Leaflet** | Interactive maps | Free | No |
| **Google Maps** (export only) | Route navigation export | Free (opens in user's browser) | No |

Full terms and conditions for each service are available in the app at the **Terms** page.

---

## Infrastructure & Deployment

This application runs on AWS with DynamoDB for database storage.

### Quick Deployment Options

1. **Docker Compose** (Local/VPS) — See root `docker-compose.yml` (includes DynamoDB Local)
2. **AWS Deployment** — See [infra/deployment/AWS-DEPLOYMENT.md](./infra/deployment/AWS-DEPLOYMENT.md) for the complete guide
3. **Manual AWS Setup** — See [infra/aws/MANUAL-SETUP-GUIDE.md](./infra/aws/MANUAL-SETUP-GUIDE.md) for step-by-step instructions

### AWS Guides

| Guide | Description |
|-------|-------------|
| [AWS-DEPLOYMENT.md](./infra/deployment/AWS-DEPLOYMENT.md) | Complete deployment guide (ECS, ECR, ALB) |
| [MANUAL-SETUP-GUIDE.md](./infra/aws/MANUAL-SETUP-GUIDE.md) | Non-technical step-by-step AWS setup |
| [DYNAMODB-SETUP.md](./infra/aws/DYNAMODB-SETUP.md) | DynamoDB table provisioning |
| [GITHUB-SECRETS.md](./infra/aws/GITHUB-SECRETS.md) | GitHub Actions secrets configuration |
| [SECRETS-ARCHITECTURE.md](./infra/aws/SECRETS-ARCHITECTURE.md) | Two-tier secrets architecture (GitHub + AWS Secrets Manager) |
| [DNS-SETUP.md](./infra/aws/DNS-SETUP.md) | Route 53 DNS configuration |
| [HTTPS-SETUP.md](./infra/aws/HTTPS-SETUP.md) | ACM certificate and HTTPS setup |
| [TROUBLESHOOTING.md](./infra/aws/TROUBLESHOOTING.md) | AWS troubleshooting (502/503/504 errors, ALB, ECS) |
| [AWS_GROQ_SETUP.md](./infra/aws/AWS_GROQ_SETUP.md) | Groq API key setup in AWS |
| [scripts/README.md](./infra/aws/scripts/README.md) | Deployment & diagnostics scripts reference |

### CI/CD Pipeline

The repository uses GitHub Actions for continuous integration and deployment:

- **CI** (`.github/workflows/ci.yml`) — Runs on every PR: linting, unit tests, integration tests, E2E tests, Docker builds, security scanning (Semgrep + Trivy)
- **Deploy to Test** (`.github/workflows/deploy-test.yml`) — Deploys to test environment
- **Deploy to Prod** (`.github/workflows/deploy-prod.yml`) — Production deployment (tag-based or manual)
- **E2E Tests** (`.github/workflows/e2e-test.yml`, `e2e-prod.yml`) — Playwright tests against deployed environments

See [.github/workflows/README.md](./.github/workflows/README.md) for full workflow documentation.

---

## Quick Reference

**Start everything with Docker Compose (recommended):**
```bash
docker-compose up --build
```
Then open **http://localhost:3000** in your browser.

**Or start services manually (after initial setup):**

Terminal 1 (DynamoDB Local):
```bash
docker run -p 8000:8000 amazon/dynamodb-local
```

Terminal 2 (backend):
```bash
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Terminal 3 (frontend):
```bash
cd frontend
yarn start
```

Then open **http://localhost:3000** in your browser.

**Stop everything:**
Press `Ctrl+C` in each terminal window, or `docker-compose down` if using Docker Compose.
