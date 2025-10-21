# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Convoca-Spotter** is a self-contained system for monitoring grants, subsidies, and calls for proposals from foundations, public entities, and other sources. It features web scraping, change detection via SHA-256 hashing, and automatic sublink extraction for relevant opportunities.

**Tech Stack:**
- **Frontend:** React 18 + TypeScript + Vite + shadcn-ui + Tailwind CSS
- **Backend:** Node.js + Express + SQLite (better-sqlite3)
- **Deployment:** systemd service on Debian/Linux

## Architecture

### Directory Structure

```
convoca-spotter/
├── backend/              # Backend API and monitoring system
│   ├── server.js        # Express server with Supabase-compatible API
│   ├── database.js      # SQLite schema and initialization
│   ├── monitor.js       # Monitoring logic for all sources
│   ├── scraper.js       # Web scraping and link extraction
│   ├── change-detection.js  # Change detection with hashing
│   ├── crawlee-service.js   # Deep crawling with Crawlee
│   ├── cli.js           # CLI tool for manual monitoring
│   ├── local.db         # SQLite database file
│   └── *.sh             # Monitoring scripts (cron/systemd)
├── src/                 # React frontend source
│   ├── pages/          # Page components (Admin*, Public*, Index)
│   ├── components/     # UI components (Cards, Dialogs, etc.)
│   │   ├── admin/
│   │   ├── sections/
│   │   └── ui/         # shadcn-ui components
│   ├── integrations/   # API client (Supabase integration)
│   └── types/          # TypeScript type definitions
├── dist/               # Production build output
└── scripts/            # Maintenance and migration scripts
```

### Database Schema (SQLite)

Tables:
- `admin_users` - Admin authentication (bcrypt hashed passwords)
- `fundaciones` - Private foundations being monitored
- `entes_publicos` - Public entities (BOE, DOGA, BOPs)
- `otras_fuentes` - Other sources (aggregators, consultancies)
- `sublinks` - Extracted relevant links from monitored pages
- `change_history` - Change detection log

All source tables include: `id`, `name`, `url`, `category`, `last_hash`, `last_html`, `status`, `last_checked`, `enabled`, timestamps.

### API Architecture

The backend implements a **Supabase-compatible REST API** while using SQLite locally:

**API Endpoints:**
- `POST /rest/v1/rpc/login_admin` - Admin login
- `GET /rest/v1/fundaciones` - List foundations (supports PostgREST query params)
- `GET /rest/v1/entes_publicos` - List public entities
- `GET /rest/v1/otras_fuentes` - List other sources
- `GET /rest/v1/change_history` - Change history
- `GET /rest/v1/sublinks` - Extracted sublinks
- `POST /api/monitor/all` - Trigger monitoring for all sources
- `POST /api/monitor/fundaciones` - Monitor only foundations
- `POST /api/monitor/entes` - Monitor only public entities
- `POST /api/monitor/fuentes` - Monitor other sources

**PostgREST Query Support:**
```
?limit=50&offset=0&order=name.asc
?enabled=eq.1
?category=eq.Financiera
```

## Key Concepts

### Change Detection System

The monitoring system works as follows:

1. **Scraping:** Fetches HTML content from configured URLs
2. **Hashing:** Calculates SHA-256 hash of the content
3. **Comparison:** Compares new hash with `last_hash` in database
4. **Detection:** If hashes differ, registers a change in `change_history`
5. **Link Extraction:** Extracts relevant links containing keywords (convocatoria, ayuda, subvencion, beca, grant, etc.)
6. **Storage:** Saves up to 10 relevant sublinks per source

### Monitoring Modes

- **Simple scraping:** Basic HTTP fetch + hash comparison
- **Deep crawling:** Uses Crawlee for multi-level page crawling (configurable depth)

Controlled via `useDeepCrawl` option in monitoring functions.

### Production Deployment

The system runs as a **systemd service** (`convoca-spotter.service`) that:
- Serves the web interface on port 3000
- Provides the REST API
- Auto-starts on system boot

**Scheduled monitoring** via:
- systemd timers (recommended): `convoca-monitor.timer`
- cron jobs (alternative): `/usr/local/bin/convoca-monitor`
- Manual execution: `npm run monitor` in backend directory

Default schedule: 2:00 AM and 2:00 PM daily.

## Common Development Tasks

### Frontend Development

```bash
# Install dependencies
npm install

# Run development server (port varies based on vite config)
npm run dev

# Build for production
npm run build

# Build with development mode
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Backend Development

```bash
cd backend

# Start backend server (port 3000)
npm start

# Manual monitoring - all sources
npm run monitor

# Monitor specific source types
npm run monitor:fundaciones
npm run monitor:entes
npm run monitor:fuentes
```

### Database Operations

```bash
cd backend

# Access SQLite database
sqlite3 local.db

# Backup database
cp local.db backup-$(date +%Y%m%d).db

# Run migrations (if migration scripts exist)
node migrate-db.js
node migrate-enhanced-db.js

# Add sample data
node add-mock-data.js
```

### Production System Management

```bash
# Service status
systemctl status convoca-spotter

# View logs
journalctl -u convoca-spotter -f
tail -f /var/log/convoca-spotter/monitor.log

# Restart service
sudo systemctl restart convoca-spotter

# Check timer status
systemctl status convoca-monitor.timer
systemctl list-timers convoca-monitor.timer

# Manual monitoring execution
/usr/local/bin/convoca-monitor
bash backend/hourly-scrape.sh
```

## Important Implementation Details

### Authentication

- Admin users stored in `admin_users` table
- Passwords hashed with bcryptjs (10 rounds)
- Default credentials: `admin` / `admin123`
- Login endpoint mimics Supabase RPC format

### Frontend Integration

The frontend uses `src/integrations/supabase/client.ts` but it's configured to point to the local Express API instead of actual Supabase. This allows the frontend codebase to remain unchanged from Lovable.dev while running fully locally.

### Environment Variables

`.env` file should contain:
```
VITE_SUPABASE_URL=http://localhost:3000
VITE_SUPABASE_ANON_KEY=dummy-key-for-local-dev
```

### Scraping Considerations

- Delay of 1500ms between requests to avoid overwhelming servers
- Retry logic with exponential backoff (3 retries default)
- User-Agent header sent to avoid being blocked
- Timeout handling for slow/unresponsive pages
- Error logging without crashing the entire monitoring run

### Scalability

System designed to handle **11,000+ foundations**:
- Database indices on `enabled`, `status`, `category`, `last_checked`
- WAL mode enabled for better concurrency
- Bulk loading scripts support CSV/JSON imports
- Server-side pagination via PostgREST query params

## Testing and Debugging

### Check System Status

```bash
# Verify backend is running
curl http://localhost:3000/api/health

# Test monitoring manually
cd backend
node cli.js all

# Check database stats
node db-stats.js

# View recent changes
sqlite3 local.db "SELECT * FROM change_history ORDER BY detected_at DESC LIMIT 10;"
```

### Common Issues

**Service won't start:**
```bash
journalctl -u convoca-spotter -n 50
netstat -tulpn | grep 3000
```

**Login fails:**
```bash
sqlite3 backend/local.db "SELECT username FROM admin_users;"
```

**Monitoring not working:**
```bash
cd backend
node cli.js all  # Run manually to see errors
```

## Project-Specific Patterns

### Adding New Monitoring Sources

1. Add to appropriate table (`fundaciones`, `entes_publicos`, or `otras_fuentes`)
2. Set `enabled = 1` to activate monitoring
3. Provide valid `url` and descriptive `name`
4. Category is optional but recommended for filtering

### Creating New Components

Follow the shadcn-ui pattern:
- Card components display data (`FundacionCard.tsx`, `EntePublicoCard.tsx`)
- Dialog components handle editing (`FundacionDialog.tsx`, `EntePublicoDialog.tsx`)
- Use consistent styling with Tailwind classes
- Implement proper TypeScript types from `src/types/`

### API Response Format

Always return Supabase-compatible format:
```javascript
{ data: [...], error: null }  // Success
{ data: null, error: { message: "...", code: "ERROR" } }  // Error
```

## Related Documentation

- Main README: `README.md` (Lovable.dev project info)
- Production docs: `README-PRODUCCION.md` (deployment guide)
- Production status: `PRODUCTION-STATUS.md` (current state)
- Scalability: `docs/ESCALABILIDAD.md` (11K+ foundations architecture)

## Notes for AI Assistants

- This is a **fully local system** - no external cloud dependencies
- Backend mimics Supabase API for frontend compatibility
- Always test monitoring changes with small delays to avoid rate limiting
- When modifying scraping logic, consider impact on 11,000+ sources
- Database migrations should preserve existing data
- System is designed to run 24/7 as a production service
