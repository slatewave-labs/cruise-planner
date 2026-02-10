# ShoreExplorer - AI Agent Handover & De-Emergent Migration Guide

> **Audience:** An AI coding agent (e.g. GitHub Copilot, Cursor, Claude Code) picking up this repository to migrate it away from the Emergent platform and onto standard, self-hosted infrastructure.

> **Date:** 2026-02-10

> **Current state:** Fully functional MVP running on the Emergent preview platform. All core features working (trip management, AI plan generation, weather, maps).

---

## 1. Architecture Overview (As-Is)

```
┌─────────────────────────────────────────────────────────┐
│  Emergent Preview Environment (Kubernetes Pod)          │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Frontend    │  │   Backend    │  │   MongoDB    │  │
│  │  React (CRA)  │  │   FastAPI    │  │  (local)     │  │
│  │  Port 3000    │  │  Port 8001   │  │  Port 27017  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │          │
│         │    Supervisor manages all three processes      │
│         │                  │                  │          │
│  ┌──────┴──────────────────┴──────────────────┘         │
│  │  Nginx/Ingress: /api/* → :8001, else → :3000         │
│  └──────────────────────────────────────────────────────│
│                                                         │
│  External calls from backend:                           │
│  ├── Open-Meteo API (weather, no auth)                  │
│  ├── Gemini 3 Flash (via emergentintegrations library)  │
│  │   └── Routes through integrations.emergentagent.com  │
│  └── No other external services                         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Emergent-Specific Components (What Must Change)

There are exactly **4 Emergent-specific touchpoints** in the codebase. Everything else is standard open-source technology.

### 2.1 The `emergentintegrations` Python Library

**What it is:** A proprietary Python library that wraps LLM provider APIs (OpenAI, Anthropic, Google Gemini). It uses an Emergent "Universal Key" that proxies requests through `integrations.emergentagent.com`.

**Where it's used:**
- `backend/server.py` lines 269-279 (the plan generation endpoint)
- `backend/requirements.txt` line 20 (`emergentintegrations==0.1.0`)
- Installed from a private PyPI: `--extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/`

**What the code does:**
```python
from emergentintegrations.llm.chat import LlmChat, UserMessage

chat = LlmChat(
    api_key=os.environ.get("EMERGENT_LLM_KEY"),
    session_id="unique-session-id",
    system_message="System prompt here"
).with_model("gemini", "gemini-3-flash-preview")

user_msg = UserMessage(text="User prompt here")
response_text = await chat.send_message(user_msg)
# response_text is a plain string containing the LLM's response
```

### 2.2 The `EMERGENT_LLM_KEY` Environment Variable

**Where it's referenced:**
- `backend/.env` (line 3)
- `backend/server.py` (line 270)

### 2.3 The Emergent Preview URL

**Where it's referenced:**
- `frontend/.env` (`REACT_APP_BACKEND_URL=https://d3b5827c-f1a5-4ca7-b72b-b72edc513f3e.preview.emergentagent.com`)
- `backend_test.py` (line 15, test base URL)

### 2.4 Supervisor + Nginx Ingress Routing

**What it does:** Emergent uses Supervisor to manage all three processes (frontend, backend, MongoDB) in a single Kubernetes pod, with Nginx routing `/api/*` to port 8001 and everything else to port 3000.

**Config location:** `/etc/supervisor/conf.d/supervisord.conf` (read-only, platform-managed)

**Environment variables injected by Supervisor:**
- `APP_URL` - the public preview URL
- `INTEGRATION_PROXY_URL` - `https://integrations.emergentagent.com` (used internally by `emergentintegrations` library, not referenced in app code)

---

## 3. Migration Steps (Emergent → Standard Setup)

### Step 1: Replace `emergentintegrations` with the Google Gemini SDK

This is the **only code change required**. The library is used in exactly one place.

#### 1a. Install the Google Generative AI SDK

Remove `emergentintegrations` and add the official Google SDK:

```bash
pip uninstall emergentintegrations
pip install google-genai
```

Update `backend/requirements.txt`: remove the `emergentintegrations` line and add `google-genai`.

> **Note:** You no longer need the `--extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/` flag when installing dependencies.

#### 1b. Get a Google Gemini API Key

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Sign in with a Google account
3. Click "Create API Key"
4. Copy the key (format: `AIza...`)

Free tier: 15 requests per minute, 1 million tokens per minute, 1500 requests per day.

#### 1c. Update the Environment Variable

In `backend/.env`, replace:
```
EMERGENT_LLM_KEY=sk-emergent-...
```
With:
```
GOOGLE_API_KEY=AIza...your-key-here
```

#### 1d. Rewrite the LLM Call in `server.py`

**File:** `backend/server.py`

**Replace lines 269-279** (the `emergentintegrations` block inside the `generate_plan` function):

```python
# OLD CODE (remove this):
from emergentintegrations.llm.chat import LlmChat, UserMessage
api_key = os.environ.get("EMERGENT_LLM_KEY")
session_id = f"plan-{data.trip_id}-{data.port_id}-{uuid.uuid4().hex[:8]}"
chat = LlmChat(
    api_key=api_key,
    session_id=session_id,
    system_message="You are an expert cruise port day planner. You always respond with valid JSON only, no markdown formatting."
).with_model("gemini", "gemini-3-flash-preview")

user_msg = UserMessage(text=prompt)
response_text = await chat.send_message(user_msg)
```

```python
# NEW CODE (replace with this):
from google import genai

client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))
response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents=prompt,
    config=genai.types.GenerateContentConfig(
        system_instruction="You are an expert cruise port day planner. You always respond with valid JSON only, no markdown formatting.",
        temperature=0.7,
    ),
)
response_text = response.text
```

> **Model note:** `gemini-3-flash-preview` was accessed via the Emergent proxy. When using the Google SDK directly, use the latest available model name from [ai.google.dev/gemini-api/docs/models](https://ai.google.dev/gemini-api/docs/models). At time of writing, `gemini-2.0-flash` is the latest stable Flash model. Check for newer versions.

> **Alternative LLM providers:** If you prefer OpenAI or Anthropic instead of Google, install their respective SDKs (`openai` or `anthropic`) and replace the call accordingly. The prompt and response parsing logic remains the same - only the client call changes.

#### 1e. Verify the Change

After making the replacement, test the plan generation:

```bash
curl -X POST http://localhost:8001/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{
    "trip_id": "<a-valid-trip-id>",
    "port_id": "<a-valid-port-id>",
    "preferences": {
      "party_type": "couple",
      "activity_level": "moderate",
      "transport_mode": "mixed",
      "budget": "low"
    }
  }'
```

The response should contain a `plan` object with `plan_title`, `activities`, etc.

---

### Step 2: Update Environment Variables

#### Backend (`backend/.env`)

| Old (Emergent) | New (Standard) | Notes |
|----------------|---------------|-------|
| `EMERGENT_LLM_KEY=sk-emergent-...` | `GOOGLE_API_KEY=AIza...` | Direct Google API key |
| `MONGO_URL=mongodb://localhost:27017` | No change needed | Update if using a remote MongoDB (e.g. Atlas) |
| `DB_NAME=shoreexplorer` | No change needed | |

#### Frontend (`frontend/.env`)

| Old (Emergent) | New (Standard) | Notes |
|----------------|---------------|-------|
| `REACT_APP_BACKEND_URL=https://...preview.emergentagent.com` | `REACT_APP_BACKEND_URL=http://localhost:8001` | For local dev. Set to your production URL for deployment. |

---

### Step 3: Update References in Documentation and UI

These are cosmetic/text changes, not functional:

1. **`frontend/src/pages/TermsConditions.js`** (lines 17-18): Change "The integration is managed through the Emergent platform" to "Integrated via the Google Gemini API" or similar.

2. **`README.md`**: Already contains non-Emergent setup instructions. Remove/update the Emergent-specific key instructions to reference the Google API key instead.

3. **`memory/PRD.md`** (line 10): Update "Gemini 3 Flash via Emergent Universal Key" to "Gemini Flash via Google API".

4. **`backend_test.py`** (line 15): Replace the Emergent preview URL with `http://localhost:8001` or your deployment URL.

---

### Step 4: Remove Emergent-Specific Dependencies

In `backend/requirements.txt`, the file was generated via `pip freeze` and contains many transitive dependencies from `emergentintegrations`. After removing it, regenerate a clean requirements file:

```bash
cd backend
pip uninstall emergentintegrations
pip install google-genai  # (or your chosen LLM SDK)
pip freeze > requirements.txt
```

Or, for a minimal clean requirements file, these are the only direct dependencies needed:

```
fastapi==0.104.1
uvicorn==0.24.0
pymongo==4.6.1
python-dotenv==1.0.0
httpx==0.25.2
pydantic==2.5.2
google-genai
```

---

### Step 5: Set Up Process Management (Replacing Supervisor)

On Emergent, Supervisor manages all three processes in one pod. For a standard setup, you have several options:

#### Option A: Docker Compose (Recommended for Local Dev & Simple Deployments)

Create `docker-compose.yml` in the project root:

```yaml
version: "3.8"

services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=shoreexplorer
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
    depends_on:
      - mongodb

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_BACKEND_URL=http://localhost:8001

volumes:
  mongo_data:
```

Create `backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
```

Create `frontend/Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
RUN yarn build

# Serve stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

Create `frontend/nginx.conf`:

```nginx
server {
    listen 3000;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Run everything:
```bash
GOOGLE_API_KEY=your-key-here docker compose up --build
```

#### Option B: Separate Terminal Processes (Simplest for Dev)

Run each service in its own terminal, exactly as described in the main README. No changes needed.

#### Option C: PM2 (Node-based Process Manager)

```bash
npm install -g pm2
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: "backend",
      cwd: "./backend",
      script: "uvicorn",
      args: "server:app --host 0.0.0.0 --port 8001",
      interpreter: "python3",
    },
    {
      name: "frontend",
      cwd: "./frontend",
      script: "yarn",
      args: "start",
    },
  ],
};
```

Run: `pm2 start ecosystem.config.js`

---

### Step 6: Set Up Reverse Proxy (Replacing Emergent's Nginx Ingress)

On Emergent, Nginx routes `/api/*` to the backend and everything else to the frontend. For production, you'll need to replicate this.

#### Option A: Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # API requests → backend
    location /api/ {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 60s;  # Plan generation can take 30s
    }

    # Everything else → frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}
```

#### Option B: Caddy (Simpler Alternative)

```
yourdomain.com {
    handle /api/* {
        reverse_proxy localhost:8001
    }
    handle {
        reverse_proxy localhost:3000
    }
}
```

#### For Local Development

No reverse proxy is needed. The frontend already calls the backend directly via `REACT_APP_BACKEND_URL=http://localhost:8001`. CORS is configured to accept all origins.

---

## 4. Files Changed Summary

Here is the complete, minimal list of changes needed:

| File | Action | What Changes |
|------|--------|-------------|
| `backend/server.py` | **Edit** | Replace lines 269-279 (LLM call). Replace `emergentintegrations` import with `google-genai` SDK call. Replace `EMERGENT_LLM_KEY` env var reference with `GOOGLE_API_KEY`. |
| `backend/.env` | **Edit** | Replace `EMERGENT_LLM_KEY=...` with `GOOGLE_API_KEY=...` |
| `backend/requirements.txt` | **Regenerate** | Remove `emergentintegrations`, add `google-genai`. Run `pip freeze > requirements.txt`. |
| `frontend/.env` | **Edit** | Replace Emergent preview URL with your deployment URL (or `http://localhost:8001` for local) |
| `frontend/src/pages/TermsConditions.js` | **Edit** | Update text on lines 17-18 (cosmetic, remove "Emergent" mention) |
| `backend_test.py` | **Edit** | Update base URL on line 15 |
| `README.md` | **Edit** | Update key instructions from Emergent key to Google API key |
| `memory/PRD.md` | **Edit** | Update architecture references (cosmetic) |

**New files to create (for Docker deployment):**
| File | Purpose |
|------|---------|
| `docker-compose.yml` | Orchestrates all three services |
| `backend/Dockerfile` | Containerises the FastAPI backend |
| `frontend/Dockerfile` | Builds and serves the React frontend |
| `frontend/nginx.conf` | Nginx config for serving the SPA |

---

## 5. Non-Emergent Components (No Changes Needed)

These parts of the codebase are entirely standard and require no migration:

| Component | Technology | Notes |
|-----------|-----------|-------|
| Frontend framework | React 18 (Create React App) | Standard CRA setup |
| Styling | Tailwind CSS 3 | Standard config |
| Routing | React Router v6 | Standard SPA routing |
| Maps | Leaflet + OpenStreetMap | Free, no API key, no vendor lock-in |
| Animations | Framer Motion | Standard library |
| Icons | Lucide React | Standard library |
| Backend framework | FastAPI | Standard Python framework |
| Database | MongoDB | Standard, works with local or Atlas |
| Weather API | Open-Meteo | Free, no API key, called directly via httpx |
| HTTP client | httpx (backend), axios (frontend) | Standard libraries |
| All frontend components | React components | No Emergent-specific code |
| All API endpoints | FastAPI routes | No Emergent-specific code (except the one LLM call) |
| Infrastructure scaffolds | `infra/` folder | Generic CI/CD, feature flags, monitoring docs |
| Test scaffolds | `tests/` folder | Generic test structure docs |

---

## 6. Database (MongoDB)

The database has **no Emergent-specific schema or configuration**. It uses two collections:

- **`trips`** - Stores trip documents with embedded `ports` array
- **`plans`** - Stores generated day plans

There are no indexes beyond the default `_id`. For production, consider adding:

```javascript
db.trips.createIndex({ "trip_id": 1 }, { unique: true })
db.plans.createIndex({ "plan_id": 1 }, { unique: true })
db.plans.createIndex({ "trip_id": 1 })
db.plans.createIndex({ "port_id": 1 })
```

To migrate existing data, simply `mongodump` from the current instance and `mongorestore` to your target.

---

## 7. Deployment Options (Post-Migration)

Once the Emergent-specific code is replaced, the app is a standard React + FastAPI + MongoDB stack. Deploy anywhere:

| Platform | Effort | Cost | Notes |
|----------|--------|------|-------|
| **Docker Compose on a VPS** (DigitalOcean, Linode, Hetzner) | Low | $5-10/mo | Best value. Use the Docker Compose setup from Step 5. |
| **Railway** | Very Low | $5-20/mo | Push to GitHub, Railway auto-detects and deploys. |
| **Fly.io** | Low | Free tier available | Edge deployment, good for global users. |
| **AWS ECS / GCP Cloud Run** | Medium | Variable | For when you need auto-scaling. |
| **Vercel (frontend) + Railway (backend) + Atlas (DB)** | Low | Free tiers available | Split deployment, each service on its best platform. |
| **Kubernetes** | High | Variable | Only if you need the blue/green and feature flag infrastructure from the `infra/` scaffolds. |

For MongoDB specifically, [MongoDB Atlas](https://www.mongodb.com/atlas) offers a free tier (512MB) that's sufficient for MVP.

---

## 8. Quick Verification Checklist

After completing the migration, verify these work:

- [ ] `backend/.env` contains `GOOGLE_API_KEY` (not `EMERGENT_LLM_KEY`)
- [ ] `frontend/.env` contains your deployment URL (not Emergent preview URL)
- [ ] `pip install -r backend/requirements.txt` works without `--extra-index-url`
- [ ] Backend starts: `uvicorn server:app --port 8001` with no import errors
- [ ] Health check: `curl http://localhost:8001/api/health` returns `{"status":"ok"}`
- [ ] Create a trip: `curl -X POST http://localhost:8001/api/trips -H "Content-Type: application/json" -d '{"ship_name":"Test Ship"}'`
- [ ] Weather works: `curl "http://localhost:8001/api/weather?latitude=41.38&longitude=2.19"`
- [ ] Frontend loads: open `http://localhost:3000` in a browser
- [ ] AI plan generation works end-to-end (create trip → add port → generate plan)
- [ ] No references to `emergent` remain in runtime code: `grep -ri "emergent" backend/server.py frontend/src/`

---

## 9. Contact & Context

- **Original PRD:** `/app/memory/PRD.md`
- **Design guidelines:** `/app/design_guidelines.json`
- **Test results:** `/app/test_reports/iteration_1.json` (all tests passing at time of handover)
- **Infrastructure plans:** `/app/infra/` (CI/CD, feature flags, monitoring, deployment scaffolds - all TODO)
