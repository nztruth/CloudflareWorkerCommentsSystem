# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cusdis is an open-source, lightweight (~5kb gzip), privacy-friendly comment system alternative to Disqus. It's built with Next.js, TypeScript, and Prisma, designed for easy self-hosting and minimal resource usage.

## Architecture

### Core Stack
- **Frontend**: Next.js with React, Mantine UI components, Emotion for styling
- **Backend**: Next.js API routes with TypeScript
- **Database**: Multi-database support (SQLite, PostgreSQL, MySQL) via Prisma ORM
- **Authentication**: NextAuth.js
- **Widget**: Svelte-based embeddable comment widget
- **Build System**: Vite for widget bundling, Next.js for main app

### Key Directories
- `pages/` - Next.js pages and API routes
- `service/` - Business logic layer with service classes
- `components/` - React components
- `widget/` - Svelte-based embeddable widget
- `prisma/` - Database schemas for different DB types
- `templates/` - Email notification templates
- `public/doc/` - Documentation files

### Database Architecture
The system uses Prisma with support for three database types:
- SQLite (default for development): `prisma/sqlite/schema.prisma`
- PostgreSQL (production): `prisma/pgsql/schema.prisma` 
- MySQL: `prisma/mysql/schema.prisma`

Core entities: User, Project, Page, Comment, with support for nested replies and moderation workflow.

### Service Layer Pattern
Business logic is organized into service classes in `service/`:
- `ProjectService` - Project management
- `CommentService` - Comment operations and moderation
- `NotificationService` - Email notifications
- `WebhookService` - Webhook integrations
- All services extend `RequestScopeService` for session management

## Development Commands

### Database Operations
- `npm run db:generate` - Generate Prisma client
- `npm run db:deploy` - Apply migrations
- `npm run db:push` - Push schema changes (development)
- `npm run db:migrate` - Create and apply new migration
- `npm run admin` - Open Prisma Studio

### Development
- `npm run dev` - Start dev server (SQLite)
- `npm run dev:pg` - Start dev server (PostgreSQL)
- `npm run dev:mysql` - Start dev server (MySQL)

### Building
- `npm run build` - Full production build (PostgreSQL + widget)
- `npm run build:without-migrate` - Build without database migration
- `npm run build:widget` - Build widget only

### Widget Development
- `npm run widget` - Start widget development server
- Widget components are in Svelte, main app in React

### Production
- `npm run start` - Start production server
- `npm run start:with-migrate` - Start with database migration

## Environment Variables
The application requires these key environment variables:
- `DB_TYPE` - Database type (sqlite/pgsql/mysql)  
- `DB_URL` - Database connection string
- `NEXTAUTH_URL` - NextAuth.js URL
- `JWT_SECRET` - JWT signing secret

## Multi-Database Support
When working with database operations, always specify the correct schema:
- Use `DB_TYPE` environment variable to target correct Prisma schema
- Schema files are in `prisma/{sqlite|pgsql|mysql}/schema.prisma`
- Migration commands automatically use the correct schema based on `DB_TYPE`

## Widget Integration
The embeddable widget is built separately with Svelte and bundled with Vite. Widget files are served from `/js/widget/` and support multiple languages and themes. The widget communicates with the main app via API routes under `/api/open/`.