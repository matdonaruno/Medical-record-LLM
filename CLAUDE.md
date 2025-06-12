# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Medical Record LLM is a local LLM chat application designed to assist with medical office computer tasks. It provides a secure chat interface using locally-run LLM models (Ollama) with user authentication and session management.

## Development Commands

```bash
# Web development (standalone server)
npm run dev         # Start development server (Express backend + client build)
npm run build       # Build the application
npm run start       # Start production server

# Electron development 
npm run electron:dev    # Start Electron app in development mode
npm run electron        # Start Electron app with built files
npm run electron:build  # Build all components for Electron

# Build installers
npm run dist        # Build installer for current platform
npm run dist:win    # Build Windows installer
npm run dist:mac    # Build macOS installer  
npm run dist:linux  # Build Linux installer

# Type checking
npm run check

# Database operations
npm run db:push  # Push schema changes to database
```

## Architecture

### Multi-Part Application Structure

The project consists of several interconnected parts:

1. **Server** (`/server/`): Express.js backend with WebSocket support
   - Main entry: `server/index.ts`
   - Routes: `server/routes.ts` 
   - LLM integration: `server/llm.ts`
   - Database: `server/db.ts`
   - Authentication: `server/auth.ts`

2. **Client** (`/client/`): React frontend built with Vite
   - Entry point: `client/src/main.tsx`
   - Main app: `client/src/App.tsx`
   - Uses Wouter for routing, React Query for state management
   - WebSocket connection for real-time chat

3. **Shared** (`/shared/`): Common schema and types
   - Database schema: `shared/schema.ts` (Drizzle ORM with PostgreSQL)

4. **Electron** (`/electron/`): Desktop app wrapper (optional)

### Key Integrations

- **LLM Backend**: Ollama integration for local model execution
- **WebSocket**: Real-time communication between client and server for chat
- **Database**: PostgreSQL with Drizzle ORM for users, chats, and messages
- **Authentication**: Session-based auth with Passport.js

### Database Schema

- `users`: User accounts with username/password
- `chats`: Chat sessions linked to users  
- `messages`: Individual messages within chats (user/assistant roles)

### LLM Model Management

Available models are configured in `server/index.ts`:
- llama3:latest (default)
- deepseek-coder:6.7b
- deepseek-r1:7b
- deepscaler:latest

Models can be switched via `/api/models/default` endpoint.

## Environment Setup

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (defaults to 3000)

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Ollama installed and running locally