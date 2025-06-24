# Cusdis for Cloudflare Workers (Full React Version)

Complete port of the original Cusdis Next.js application to run entirely on Cloudflare Workers using React + TypeScript with Static Assets serving.

## Architecture

**Backend (Worker):**
- Hono framework handling all API routes
- D1 (SQLite) for data storage  
- KV for sessions and caching
- R2 for file storage
- JWT authentication

**Frontend (React SPA):**
- React 18 with TypeScript
- Mantine UI components (same as original)
- React Query for state management
- React Router for navigation
- Vite for building and bundling

**Widget:**
- Standalone embeddable comment widget
- Vanilla JS with iframe integration
- Supports all original Cusdis features

## File Structure

```
src/
├── index.ts              # Main Worker entry point
└── services/             # Business logic (adapted for D1/KV/R2)
    ├── auth.service.ts
    ├── comment.service.ts
    ├── project.service.ts
    ├── user.service.ts
    ├── page.service.ts
    └── email.service.ts

frontend/
├── src/
│   ├── main.tsx         # React entry point
│   ├── App.tsx          # Main app component with routing
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # API client and utilities
│   ├── components/      # Shared React components
│   └── pages/           # Page components (converted from original)
└── public/
    └── widget.html      # Embeddable widget

schema.sql               # D1 database schema
wrangler.jsonc          # Cloudflare configuration
vite.config.ts          # Frontend build configuration
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Cloudflare Resources

```bash
# Create D1 database
wrangler d1 create cusdis-comments

# Create KV namespace  
wrangler kv:namespace create KV

# Create R2 bucket
wrangler r2 bucket create cusdis-uploads
```

### 3. Configure

Update `wrangler.jsonc` with your resource IDs:

```jsonc
{
  "d1_databases": [
    {
      "database_id": "your-d1-database-id"
    }
  ],
  "kv_namespaces": [
    {
      "id": "your-kv-namespace-id"
    }
  ]
}
```

### 4. Initialize Database

```bash
npm run db:init
```

### 5. Set Secrets

```bash
wrangler secret put JWT_SECRET
wrangler secret put SENDGRID_API_KEY  # optional
```

### 6. Development

```bash
npm run dev
```

This starts both the frontend dev server (Vite) and Worker dev server concurrently.

### 7. Deploy

```bash
npm run deploy
```

## Features Maintained

✅ **All Original Features:**
- Complete React frontend (same components as original)
- All API endpoints converted to Worker routes
- User authentication and project management
- Comment moderation and approval workflow
- Email notifications via SendGrid
- Embeddable widget with iframe
- Dark/light theme support
- Nested comment replies
- Webhook support

✅ **Enhanced for Cloudflare:**
- Runs entirely on Cloudflare's free tier
- Global edge deployment
- D1 for relational data with proper indexing
- KV for session management and caching
- TypeScript throughout
- Modern React with hooks

## API Compatibility

All original API endpoints are preserved:

**Public (Widget):**
- `GET /api/open/comments`
- `POST /api/open/comments`

**Protected (Dashboard):**
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/project/:id`
- `GET /api/comment`
- `POST /api/comment/:id/approve`
- `DELETE /api/comment/:id`
- `POST /api/comment/:id/reply`
- `GET /api/user`
- `PUT /api/user`
- `GET /api/user/stats`

## Widget Integration

Same as original Cusdis:

```html
<div id="cusdis_thread"
  data-host="https://your-worker.workers.dev"
  data-app-id="your-app-id"
  data-page-id="page-identifier"
  data-page-title="Page Title">
</div>
<script async defer src="https://your-worker.workers.dev/js/cusdis.es.js"></script>
```

## Development Workflow

1. **Frontend changes:** Edit files in `frontend/src/`, Vite will hot-reload
2. **Backend changes:** Edit files in `src/`, Worker will restart
3. **Database changes:** Update `schema.sql` and run `npm run db:migrate`

## Differences from Original

**Simplified:**
- No NextAuth.js (custom JWT auth instead)
- No Prisma (direct D1 SQL queries)
- No complex subscription system (basic free/pro tiers)

**Enhanced:**
- Better TypeScript types throughout
- Modern React patterns with hooks
- Simplified deployment (single Worker)
- Better performance with edge caching

## Production Considerations

- Set up custom domain via Cloudflare
- Configure email provider (SendGrid) for notifications
- Monitor usage via Cloudflare Analytics
- Consider rate limiting for production use
- Set up proper error monitoring

## Migration from Original

To migrate from the original Next.js version:

1. Export your existing data
2. Transform to match the D1 schema
3. Import using `wrangler d1 execute`
4. Update widget integration URLs

This version maintains 100% feature parity with the original while running entirely on Cloudflare's serverless infrastructure.