# TODO: Deployment Architecture for ShoreExplorer

## Environment Setup

### Local Development
- **Status**: Implemented (current Emergent preview environment)
- Backend: FastAPI on port 8001
- Frontend: React on port 3000
- Database: MongoDB local instance
- Hot reload enabled for both services

### Beta Production (TODO)
- **Strategy**: Blue/Green deployment
- **Infrastructure**: Container-based (Docker + Kubernetes or AWS ECS)
- **Feature Toggles**: Integrated with feature flag service (see /infra/feature-flags/config.json)

#### Blue/Green Setup
```
                    ┌─────────────┐
                    │   Load      │
                    │  Balancer   │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
        ┌─────┴─────┐           ┌──────┴─────┐
        │   BLUE    │           │   GREEN    │
        │ (active)  │           │ (standby)  │
        │           │           │            │
        │ Frontend  │           │ Frontend   │
        │ Backend   │           │ Backend    │
        └─────┬─────┘           └──────┬─────┘
              │                         │
              └────────────┬────────────┘
                           │
                    ┌──────┴──────┐
                    │  MongoDB    │
                    │  (shared)   │
                    └─────────────┘
```

#### Deployment Steps (TODO)
1. Deploy new version to GREEN (inactive) slot
2. Run smoke tests against GREEN
3. If tests pass: switch load balancer to GREEN
4. Monitor for 15 minutes
5. If stable: mark GREEN as active, BLUE becomes standby
6. If issues: rollback by switching traffic back to BLUE

### Public Production (TODO)
- Same blue/green architecture as Beta
- Additional: Canary releases for gradual traffic shifting
- CDN for static assets (CloudFront or Cloudflare)
- Managed MongoDB (Atlas) with replica set

#### Feature Visibility (0-100% Rollout)
```
Feature Flag Service
      │
      ├── Feature: ai_day_plan_generation
      │     └── rollout: 100% of users
      │
      ├── Feature: google_maps_native
      │     └── rollout: 0% (disabled)
      │
      └── Feature: offline_mode
            └── rollout: 25% (testing with subset)
```

## Infrastructure TODO Checklist
- [ ] Create Dockerfiles (backend + frontend)
- [ ] Set up container registry (GHCR or ECR)
- [ ] Configure Kubernetes manifests or ECS task definitions
- [ ] Set up load balancer with health checks
- [ ] Configure DNS and SSL certificates
- [ ] Set up MongoDB Atlas (production database)
- [ ] Configure environment-specific .env files
- [ ] Set up secrets management (AWS Secrets Manager or HashiCorp Vault)
- [ ] Implement blue/green deployment scripts
- [ ] Set up feature flag service connection
- [ ] Configure CDN for static assets
- [ ] Set up backup strategy for MongoDB
- [ ] Configure auto-scaling policies

## Recommended Cloud Providers (Cost-Conscious)
1. **AWS** (Free tier for 12 months): EC2, ECS, RDS equivalent
2. **Railway** (Simple, developer-friendly): From $5/mo
3. **Fly.io** (Edge deployment): Free tier available
4. **Render** (Simple PaaS): Free tier for static sites
5. **MongoDB Atlas**: Free tier (512MB shared cluster)
