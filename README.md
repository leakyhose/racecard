# Flashcard

A web-based flashcard application with multiplayer game support.

## Features

- Create, edit, and study flashcards
- Import and export flashcard sets
- Publish and share sets with others
- Multiplayer game mode with lobbies
- AI-powered flashcard generation

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, TypeScript
- **Database**: Supabase
- **Deployment**: Docker, Caddy

## Getting Started

### Prerequisites

- Node.js
- Docker (for production deployment)

### Development

1. Install dependencies:

```bash
cd frontend && npm install
cd backend && npm install
```

2. Start the development servers:

```bash
# Frontend
cd frontend && npm run dev

# Backend
cd backend && npm run dev
```

### Production

Use Docker Compose to run the production build:

```bash
docker-compose -f docker-compose.prod.yml up
```

## Project Structure

```
frontend/   - React frontend application
backend/    - Node.js backend server
shared/     - Shared TypeScript types
```