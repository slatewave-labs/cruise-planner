# ShoreExplorer - Cruise Port of Call Day Planner

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
| **MongoDB** (v6 or newer) | The database that stores your trips and plans | [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community) |
| **Git** | Downloads the project code | [git-scm.com/downloads](https://git-scm.com/downloads/) |

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

#### Install MongoDB
1. Go to [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Select your operating system and download the installer
3. Run the installer (accept all defaults)
4. MongoDB should start automatically as a background service

**To check MongoDB is running:**
```
mongosh --eval "db.runCommand({ ping: 1 })"
```
You should see `{ ok: 1 }`. If you get an error, see the [Troubleshooting](#troubleshooting-common-issues) section.

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
MONGO_URL=mongodb://localhost:27017
DB_NAME=shoreexplorer
GROQ_API_KEY=your-groq-api-key-here
EOF
```

**Windows (manually):**
1. Open Notepad (or any text editor)
2. Paste the following three lines:
   ```
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=shoreexplorer
   GROQ_API_KEY=your-groq-api-key-here
   ```
3. Save the file as `.env` (not `.env.txt`) inside the `backend` folder
   - In the "Save as type" dropdown, select "All Files"
   - Name it exactly `.env`

**Now replace the placeholder values:**

| Variable | What to Put | Example |
|----------|------------|---------|
| `MONGO_URL` | The address of your MongoDB database. If you installed MongoDB locally with defaults, **leave this as-is**. For MongoDB Atlas, use your connection string. | `mongodb://localhost:27017` or `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `DB_NAME` | The name of the database. **Leave this as-is** unless you want a custom name. | `shoreexplorer` |
| `GROQ_API_KEY` | Your Groq API key for AI-powered day plan generation. Replace `your-groq-api-key-here` with your actual key from Groq Console. | `gsk_abc123...` |

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

You'll need **two terminal windows** running at the same time - one for the backend and one for the frontend.

#### Terminal 1: Start the Backend

```bash
cd ~/Desktop/shoreexplorer/backend
source venv/bin/activate   # Mac/Linux (or venv\Scripts\activate on Windows)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8001
INFO:     Application startup complete.
```

**Leave this terminal running.** Don't close it.

#### Terminal 2: Start the Frontend

Open a new terminal window and run:
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
| `MONGO_URL` | Yes | MongoDB connection string. Points to your database. Use `mongodb://localhost:27017` for local or Atlas connection string for cloud. | `mongodb://localhost:27017` |
| `DB_NAME` | Yes | Name of the MongoDB database to use. | `shoreexplorer` |
| `GROQ_API_KEY` | Yes | Groq API key for AI plan generation. Without this, the "Generate Day Plan" feature will not work. Get it free from [Groq Console](https://console.groq.com/keys). See [GROQ_SETUP.md](GROQ_SETUP.md) for details. | *(You must provide your own key)* |

### Frontend (`frontend/.env`)

| Variable | Required | Description | Default for Local Dev |
|----------|----------|-------------|----------------------|
| `REACT_APP_BACKEND_URL` | Yes | The URL where the backend API is running. The frontend sends all data requests to this address. | `http://localhost:8001` |

> **Important:** Do not add quotes around the values. Write `MONGO_URL=mongodb://localhost:27017` not `MONGO_URL="mongodb://localhost:27017"`

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

### "MongoDB connection refused" or backend won't start
MongoDB needs to be running before you start the backend.

**Mac (Homebrew):**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

**Windows:**
MongoDB should run as a service automatically. If not, search for "Services" in the Start menu, find "MongoDB Server", and click "Start".

### "GROQ_API_KEY" errors or AI plan generation fails
- Double-check that your key is correct in `backend/.env`
- Make sure there are no extra spaces or quotes around the key
- Verify your key starts with `gsk_` and is valid at [Groq Console](https://console.groq.com/keys)
- Check that you haven't exceeded the free tier limits (30 requests/minute, 14,400 requests/day)
- See [GROQ_SETUP.md](GROQ_SETUP.md) for complete troubleshooting

### Frontend shows a blank page
- Make sure the backend is running first (Terminal 1)
- Check that `frontend/.env` has `REACT_APP_BACKEND_URL=http://localhost:8001`
- If you changed the `.env` file while the frontend was running, stop the frontend (press `Ctrl+C`) and restart it with `yarn start`

### "Port already in use" error
Another programme is using port 3000 or 8001. Either:
- Close the other programme, or
- Change the port:
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
│   ├── .env                    # Backend environment variables (you create this)
│   └── requirements.txt        # Python package list
│
├── frontend/                   # React web application
│   ├── public/
│   │   ├── index.html          # HTML entry point
│   │   └── manifest.json       # PWA configuration
│   ├── src/
│   │   ├── App.js              # Main app with page routing
│   │   ├── index.js            # React entry point
│   │   ├── index.css           # Global styles
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
│   ├── .env                    # Frontend environment variables (you create this)
│   ├── package.json            # Node.js package list
│   └── tailwind.config.js      # Tailwind CSS theme config
│
├── infra/                      # Infrastructure scaffolds (TODO)
│   ├── github-actions/         # CI/CD pipeline templates
│   ├── feature-flags/          # Feature toggle configuration
│   ├── monitoring/             # Observability setup guide
│   └── deployment/             # Blue/green deployment docs
│
├── tests/                      # Test scaffolds (TODO)
│   ├── unit/                   # Unit test templates
│   ├── integration/            # PACT contract test templates
│   └── e2e/                    # Playwright E2E test templates
│
└── README.md                   # This file
```

---

## Third-Party Services

| Service | Used For | Cost | API Key Needed? |
|---------|---------|------|-----------------|
| **Open-Meteo** | Weather forecasts | Free | No |
| **OpenStreetMap + Leaflet** | Interactive maps | Free | No |
| **Google Gemini 2.0 Flash** | AI day plan generation | Free tier (15 req/min, 1500 req/day) | Yes (Google API Key) |
| **Google Maps** (export only) | Route navigation export | Free (opens in user's browser) | No |

Full terms and conditions for each service are available in the app at the **Terms** page.

---

## Infrastructure & Deployment

This application has been migrated from the Emergent platform to run on AWS with MongoDB Atlas M0.

### 🚨 Connection Issues?

If you're getting a "connection closed" error when accessing the deployed environment:

**→ See [CONNECTION-ERROR-FIX.md](./CONNECTION-ERROR-FIX.md) for the quick fix** (TL;DR: Use `http://` not `https://`)

### Quick Deployment Options

1. **Docker Compose** (Local/VPS) - See root `docker-compose.yml`
2. **AWS Deployment** - See `infra/deployment/AWS-DEPLOYMENT.md` for complete guide
3. **Production Infrastructure** - See scaffolds below

### AWS Troubleshooting & Diagnostics

- **Quick Fix:** Run `./infra/aws/scripts/quick-fix-alb.sh test` to auto-fix common issues
- **Diagnostics:** Run `./infra/aws/scripts/diagnose-alb.sh test` for detailed health check
- **DNS Setup:** Run `./infra/aws/scripts/09-setup-dns-subdomain.sh test yourdomain.com` to configure subdomains
- **Custom Domain Config:** See [infra/aws/GITHUB-SECRETS.md](./infra/aws/GITHUB-SECRETS.md) to configure `REACT_APP_BACKEND_URL` with your domain
- **HTTPS Setup:** Run `./infra/aws/scripts/08-setup-https.sh test yourdomain.com` to enable HTTPS
- **Full Guide:** See [infra/aws/TROUBLESHOOTING.md](./infra/aws/TROUBLESHOOTING.md)
- **DNS Guide:** See [infra/aws/DNS-SETUP.md](./infra/aws/DNS-SETUP.md)
- **HTTPS Guide:** See [infra/aws/HTTPS-SETUP.md](./infra/aws/HTTPS-SETUP.md)

The `infra/` folder contains **scaffold files** (marked with TODO comments) for production infrastructure. These are ready to be picked up and completed:

- **`infra/deployment/AWS-DEPLOYMENT.md`** - Complete AWS deployment guide with MongoDB Atlas M0 setup
- **`infra/github-actions/ci.yml`** - CI pipeline with unit tests, integration tests (PACT), and E2E tests (Playwright)
- **`infra/github-actions/cd.yml`** - CD pipeline with blue/green deployment to beta and production
- **`infra/feature-flags/config.json`** - Feature flag configuration with 0-100% rollout settings per environment
- **`infra/monitoring/setup.md`** - Monitoring stack recommendations (Sentry, Grafana, UptimeRobot)
- **`infra/deployment/README.md`** - Blue/green deployment architecture and environment setup guide

---

## Quick Reference

**Start everything (after initial setup):**

Terminal 1 (backend):
```bash
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Terminal 2 (frontend):
```bash
cd frontend
yarn start
```

Then open **http://localhost:3000** in your browser.

**Stop everything:**
Press `Ctrl+C` in each terminal window.
