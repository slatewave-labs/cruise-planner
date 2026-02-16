# ShoreExplorer - GitHub Copilot Instructions

## Project Overview

ShoreExplorer is an AI-powered cruise port day planner that helps cruise passengers plan their time at each port of call. The application generates personalized itineraries based on user preferences, weather conditions, and cruise schedules.

**Key Features:**
- Trip and port management for cruise itineraries
- AI-generated day plans using Google Gemini 2.0 Flash
- Real-time weather forecasts via Open-Meteo API
- Interactive maps with Leaflet and OpenStreetMap
- Route export to Google Maps
- Responsive design optimized for ages 30-70

**Users:** Cruise passengers, primarily aged 30-70, planning shore excursions.

---

## Tech Stack

### Backend
- **Language:** Python 3.9+
- **Framework:** FastAPI 0.104.1
- **Web Server:** Uvicorn
- **Database:** MongoDB 6+ (local development) / MongoDB Atlas M0 (production)
- **Database Client:** PyMongo 4.6.1
- **AI Service:** Google Gemini 2.0 Flash via `google-genai` SDK (v1.2.0)
- **Weather API:** Open-Meteo (free, no authentication)
- **Environment:** python-dotenv for configuration
- **Testing:** pytest
- **Code Style:** black, flake8, isort, mypy

### Frontend
- **Framework:** React 18.2.0
- **Build Tool:** Create React App (react-scripts 5.0.1)
- **Routing:** React Router v6
- **Styling:** Tailwind CSS 3.4.0
- **HTTP Client:** Axios 1.6.2
- **Maps:** Leaflet 1.9.4 + react-leaflet 4.2.1
- **Icons:** lucide-react 0.294.0
- **Animations:** framer-motion 10.16.16
- **Package Manager:** Yarn

### Infrastructure
- **Containerization:** Docker + docker-compose
- **Deployment:** AWS (see `infra/deployment/AWS-DEPLOYMENT.md`)
- **Version Control:** Git + GitHub

---

## Coding Standards & Best Practices

### Python (Backend)

#### Code Formatting
- **Always use `black`** for code formatting (line length: 88 characters)
- **Always use `isort`** for import sorting
- **Always use `flake8`** for linting
- **Always use `mypy`** for type checking

#### Conventions
- Use type hints for all function parameters and return values
- Use Pydantic models for all API request/response schemas
- Use descriptive variable names (avoid abbreviations)
- Use snake_case for function and variable names
- Use PascalCase for class names
- Keep functions focused and single-purpose
- Handle errors explicitly with FastAPI's HTTPException

#### Environment Variables
- **Always use `python-dotenv`** to load environment variables
- Required backend env vars:
  - `MONGO_URL` - MongoDB connection string
  - `DB_NAME` - Database name (default: `shoreexplorer`)
  - `GOOGLE_API_KEY` - Google Gemini API key (for AI plan generation)
- Optional affiliate program env vars (for monetization):
  - `VIATOR_AFFILIATE_ID` - Viator affiliate program ID
  - `GETYOURGUIDE_AFFILIATE_ID` - GetYourGuide partner program ID
  - `KLOOK_AFFILIATE_ID` - Klook affiliate program ID
  - `TRIPADVISOR_AFFILIATE_ID` - TripAdvisor affiliate program ID
  - `BOOKING_AFFILIATE_ID` - Booking.com affiliate program ID
  - See `AFFILIATE_LINKS.md` for details on affiliate monetization

#### API Design
- Use RESTful conventions for endpoint design
- Use appropriate HTTP methods (GET, POST, PUT, DELETE)
- Return appropriate HTTP status codes (200, 201, 400, 404, 500)
- Include CORS middleware for cross-origin requests

#### AI Integration
- **Use `google-genai` SDK** for Google Gemini API integration (NOT `emergentintegrations`)
- Example pattern:
```python
from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))
response = client.models.generate_content(
    model='gemini-2.0-flash-exp',
    contents=user_message,
    config=types.GenerateContentConfig(
        system_instruction=system_prompt,
        temperature=0.7
    )
)
```

#### Database
- Use PyMongo for MongoDB operations
- Collection names: `trips`, `plans`
- Always use UUID for document IDs
- Include timestamps (`created_at`, `updated_at`) in documents

### JavaScript/React (Frontend)

#### Code Style
- Use ES6+ syntax (arrow functions, destructuring, template literals)
- Use functional components with hooks (no class components)
- Use JSX for component rendering
- Prefer `const` over `let`, avoid `var`
- Use 2-space indentation
- Use single quotes for strings (unless escaping is needed)

#### Component Structure
- One component per file
- Component files in PascalCase (e.g., `TripSetup.js`)
- Place pages in `src/pages/`
- Place reusable components in `src/components/`
- Co-locate component-specific styles if needed

#### State Management
- Use React hooks (`useState`, `useEffect`, `useContext`)
- Use React Router's `useNavigate`, `useParams` for navigation
- Avoid prop drilling; consider Context API for shared state
- Handle loading and error states explicitly

#### API Calls
- Centralize API calls in `src/api.js`
- Use axios for HTTP requests
- Use environment variable `REACT_APP_BACKEND_URL` for backend URL
- Handle errors with try-catch and user-friendly messages

#### Styling with Tailwind CSS
- **Always use Tailwind utility classes** (no custom CSS unless absolutely necessary)
- Follow the design system in `design_guidelines.json`:
  - **Background:** Use `bg-secondary` (#F5F5F4 - Warm Sand) for main backgrounds, NOT pure white
  - **Primary color:** `bg-primary` (#0F172A - Deep Ocean Indigo)
  - **Accent color:** `bg-accent` (#F43F5E - Sunset Coral) for CTAs
  - **Fonts:** 
    - Headings: `font-heading` (Playfair Display)
    - Body text: `font-body` (Plus Jakarta Sans)
    - Monospace: `font-mono` (JetBrains Mono) for times/prices
  - **Buttons:** Use `rounded-full` for primary buttons, min height 48px for accessibility
  - **Cards:** Use `rounded-2xl`, `shadow-sm`, `bg-white`
  - **Spacing:** Use generous spacing (2-3x more than feels comfortable)

#### Accessibility
- **All interactive elements must be at least 48px in height** (critical for senior users)
- Use descriptive `alt` text for all images
- Use `aria-label` or `aria-hidden` for icons
- Respect `prefers-reduced-motion` for animations
- Maintain AA contrast ratios (4.5:1 for text, 3:1 for large text)

#### Icons
- Use `lucide-react` for all icons
- Use stroke width of 2px
- Use rounded line caps

---

## Project Structure

```
cruise-planner/
├── .github/                    # GitHub configuration
│   ├── agents/                 # Custom agent configurations
│   └── copilot-instructions.md # This file
├── backend/                    # Python FastAPI server
│   ├── server.py               # Main API application (all endpoints)
│   ├── affiliate_config.py     # Affiliate link configuration & URL processing
│   ├── ports_data.py           # Pre-loaded port coordinates
│   ├── requirements.txt        # Python dependencies
│   ├── .env                    # Backend environment variables (create this)
│   └── tests/                  # Backend tests
├── frontend/                   # React web application
│   ├── public/                 # Static assets
│   │   ├── index.html          # HTML entry point
│   │   └── manifest.json       # PWA configuration
│   ├── src/
│   │   ├── App.js              # Main app with routing
│   │   ├── api.js              # Centralized API calls
│   │   ├── utils.js            # Utility functions
│   │   ├── pages/              # Page components
│   │   │   ├── Landing.js      # Home page
│   │   │   ├── TripSetup.js    # Create/edit trip form
│   │   │   ├── TripDetail.js   # View trip with ports
│   │   │   ├── PortPlanner.js  # Set preferences & generate plan
│   │   │   ├── DayPlanView.js  # View generated day plan
│   │   │   ├── MyTrips.js      # List of saved trips
│   │   │   └── TermsConditions.js # T&Cs
│   │   └── components/         # Reusable components
│   │       ├── Layout.js       # App shell with navigation
│   │       ├── MapView.js      # Leaflet map with route
│   │       ├── WeatherCard.js  # Weather forecast display
│   │       └── ActivityCard.js # Activity timeline item
│   ├── .env                    # Frontend environment variables (create this)
│   ├── package.json            # Node.js dependencies
│   └── tailwind.config.js      # Tailwind theme configuration
├── infra/                      # Infrastructure and deployment
│   ├── deployment/             # Deployment guides (AWS, Docker)
│   ├── github-actions/         # CI/CD pipeline templates
│   ├── feature-flags/          # Feature toggle configuration
│   └── monitoring/             # Observability setup
├── tests/                      # Test scaffolds
│   ├── unit/                   # Unit test templates
│   ├── integration/            # PACT contract tests
│   └── e2e/                    # Playwright E2E tests
├── docker-compose.yml          # Local development with Docker
├── README.md                   # Setup and usage guide
├── AFFILIATE_LINKS.md          # Affiliate link configuration guide
└── HANDOVER.md                 # Migration guide (Emergent → AWS)
```

---

## Development Workflow

### Backend Development

1. **Setup:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```

2. **Environment variables:**
   Create `backend/.env`:
   ```
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=shoreexplorer
   GOOGLE_API_KEY=your-google-api-key-here
   ```

3. **Run server:**
   ```bash
   uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```

4. **Run tests:**
   ```bash
   pytest
   ```

5. **Lint and format:**
   ```bash
   black .
   isort .
   flake8 .
   mypy .
   ```

### Frontend Development

1. **Setup:**
   ```bash
   cd frontend
   yarn install
   ```

2. **Environment variables:**
   Create `frontend/.env`:
   ```
   REACT_APP_BACKEND_URL=http://localhost:8001
   ```

3. **Run development server:**
   ```bash
   yarn start
   ```
   Opens at `http://localhost:3000`

4. **Build for production:**
   ```bash
   yarn build
   ```

5. **Run tests:**
   ```bash
   yarn test
   ```

---

## Important Notes & Gotchas

### Do NOT Use These
- ❌ `emergentintegrations` library (deprecated, replaced with `google-genai`)
- ❌ `EMERGENT_LLM_KEY` environment variable (use `GOOGLE_API_KEY` instead)
- ❌ Pure white backgrounds (`bg-white` for large areas - use `bg-secondary` instead)
- ❌ Custom CSS (use Tailwind utilities)
- ❌ Class components (use functional components with hooks)
- ❌ Default Inter font (use Playfair Display for headings, Plus Jakarta Sans for body)

### Always Do This
- ✅ Use `google-genai` SDK for AI integration
- ✅ Use MongoDB Atlas M0 (free tier) for production deployments
- ✅ Use Open-Meteo API for weather (free, no auth required)
- ✅ Use OpenStreetMap + Leaflet for maps (free, no auth required)
- ✅ Maintain minimum 48px touch targets for accessibility
- ✅ Test at 375px width (mobile-first)
- ✅ Include generous spacing in designs
- ✅ Use descriptive alt text for images
- ✅ Handle loading and error states in UI
- ✅ Use environment variables for configuration (never hardcode API keys)

### Testing
- Backend tests use pytest
- Frontend tests use react-scripts test (Jest)
- E2E tests use Playwright (see `tests/e2e/`)
- Always test API endpoints after changes
- Test UI at multiple viewport sizes

### Security
- Never commit `.env` files (they're in `.gitignore`)
- Never hardcode API keys or credentials
- Use HTTPS in production
- Validate all user inputs
- Sanitize data before database operations

---

## Useful Commands

### Backend
```bash
# Start backend server
cd backend && source venv/bin/activate && uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Run backend tests
cd backend && pytest

# Format and lint
cd backend && black . && isort . && flake8 .
```

### Frontend
```bash
# Start frontend dev server
cd frontend && yarn start

# Build for production
cd frontend && yarn build

# Run tests
cd frontend && yarn test
```

### Docker
```bash
# Start all services (frontend, backend, MongoDB)
docker-compose up

# Stop all services
docker-compose down
```

### MongoDB
```bash
# Check MongoDB is running
mongosh --eval "db.runCommand({ ping: 1 })"

# Connect to local MongoDB
mongosh

# Connect to MongoDB Atlas
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/"
```

---

## Additional Resources

- **Main README:** `/README.md` - Complete setup and usage guide
- **AWS Deployment:** `/infra/deployment/AWS-DEPLOYMENT.md` - Production deployment guide
- **Migration Guide:** `/HANDOVER.md` - Emergent to AWS migration details
- **Design Guidelines:** `/design_guidelines.json` - Complete UI/UX design system
- **Quick Start:** `/QUICKSTART.md` - Quick reference for setup

---

## Key API Endpoints

### Backend API (Port 8001)

- `GET /api/trips` - List all trips
- `POST /api/trips` - Create a new trip
- `GET /api/trips/{trip_id}` - Get trip details
- `PUT /api/trips/{trip_id}` - Update trip
- `DELETE /api/trips/{trip_id}` - Delete trip
- `POST /api/trips/{trip_id}/ports` - Add port to trip
- `DELETE /api/trips/{trip_id}/ports/{port_id}` - Remove port from trip
- `POST /api/generate-plan` - Generate AI day plan for a port
- `GET /api/plans/{plan_id}` - Get plan details
- `GET /api/weather` - Get weather forecast (query: lat, lon, date)
- `GET /api/ports/search` - Search for cruise ports

---

## When Making Changes

1. **Always read relevant documentation** (`README.md`, `HANDOVER.md`, `design_guidelines.json`) before making changes
2. **Follow the existing code patterns** in the codebase
3. **Test your changes** locally before committing
4. **Update documentation** if you change functionality
5. **Maintain backward compatibility** unless explicitly instructed otherwise
6. **Use the existing design system** - don't introduce new colors or fonts
7. **Respect accessibility requirements** - especially touch target sizes
8. **Keep the mobile-first approach** - test on small screens first

---

## Tone & Philosophy

- **Reliable & Trustworthy:** Code should be robust, well-tested, and handle errors gracefully
- **Accessible:** Design for all users, especially those aged 30-70
- **Clean & Simple:** Avoid over-engineering; prefer clear, maintainable code
- **Premium Experience:** Attention to detail in UI/UX, smooth animations, thoughtful spacing
- **Developer-Friendly:** Clear naming, good documentation, helpful error messages
