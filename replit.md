# MindMapper - Interactive Mind Mapping Tool

## Overview

MindMapper is a collaborative mind mapping application that combines a rich client-side interface with real-time collaboration capabilities. The application features an intuitive drag-and-drop interface for creating mind maps, with support for cloud storage, user authentication, and real-time collaboration through WebSocket connections.

## System Architecture

**Frontend Architecture:**
- Pure vanilla JavaScript with ES6 classes for modularity
- SVG-based rendering for scalable graphics and smooth interactions
- Event-driven architecture with clear separation of concerns
- Three main client components: MindMapApp (orchestration), MindMap (core engine), XMLHandler (persistence)

**Backend Architecture:**
- Node.js Express server with dual deployment support (Replit/Netlify)
- PostgreSQL database using Neon serverless for scalability
- Drizzle ORM for type-safe database operations
- WebSocket-based real-time collaboration with fallback to Pusher for serverless deployments

**Authentication System:**
- Multi-provider authentication supporting both Replit Auth and Google OAuth
- Session-based authentication with PostgreSQL session storage
- Passport.js integration for OAuth flows

## Key Components

### Frontend Components

**MindMapApp (app.js)**
- Main application controller managing page navigation and user interactions
- Handles file operations (save/load XML), authentication state
- Orchestrates communication between mind map engine and collaboration services

**MindMap Engine (mindmap.js)**
- Core mind mapping functionality with full canvas interaction support
- Drag-and-drop node manipulation, connection creation, zoom/pan controls
- SVG-based rendering for crisp graphics at any scale
- Touch support for mobile devices

**XMLHandler (xmlhandler.js)**
- Serialization/deserialization of mind map data to XML format
- Version control and metadata management
- Local file export/import capabilities

**Collaboration Clients**
- Multiple collaboration implementations: WebSocket (server), Pusher (serverless), polling fallback
- Real-time cursor tracking, live editing, user presence indicators
- Conflict resolution for simultaneous edits

### Backend Components

**Authentication System (server/replitAuth.js)**
- Replit Auth integration using OpenID Connect
- Google OAuth 2.0 strategy with Passport.js
- Session management with PostgreSQL storage
- Fallback authentication for development environments

**Database Layer (server/storage.js)**
- User management with profile data persistence
- Mind map storage with JSON data fields
- Collaboration tracking and permissions system
- Share code generation for public mind maps

**Real-time Collaboration (server/collaboration.js)**
- WebSocket server for real-time communication
- Room-based collaboration with user permissions
- Live cursor tracking and operation broadcasting
- Connection management and graceful disconnection handling

## Data Flow

1. **User Authentication**: Multi-provider login (Replit/Google) → Session creation → User profile storage
2. **Mind Map Creation**: Client creates mind map → Optional cloud storage → Share code generation
3. **Real-time Collaboration**: WebSocket connection → Room joining → Live operation broadcasting → Conflict resolution
4. **Data Persistence**: Local XML export/import + Cloud PostgreSQL storage with JSON data fields

## External Dependencies

**Core Dependencies:**
- `express` (5.1.0) - Web server framework
- `drizzle-orm` (0.44.2) - Type-safe database ORM
- `@neondatabase/serverless` (1.0.1) - Serverless PostgreSQL client
- `ws` (8.18.2) - WebSocket implementation

**Authentication:**
- `passport` (0.7.0) + `passport-google-oauth20` (2.0.0) - OAuth strategies
- `openid-client` (6.6.1) - Replit Auth integration
- `express-session` (1.18.1) + `connect-pg-simple` (10.0.0) - Session management

**Real-time Features:**
- `pusher` (5.2.0) - Serverless WebSocket alternative
- `jsonwebtoken` (9.0.2) - JWT token handling
- `bcryptjs` (3.0.2) - Password hashing

**Database Schema:**
- Users table: ID, email, profile data, timestamps
- Mind maps table: ID, title, owner, JSON data, sharing settings
- Collaborators table: Mind map permissions tracking
- Activities table: Real-time collaboration event logging

## Deployment Strategy

**Dual Deployment Support:**
- **Replit**: Full-stack deployment with WebSocket support and PostgreSQL
- **Netlify**: Serverless deployment with functions and Pusher for real-time features

**Environment Variables Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth credentials
- `PUSHER_APP_ID` / `PUSHER_KEY` / `PUSHER_SECRET` / `PUSHER_CLUSTER` - Real-time service
- `NODE_ENV` - Environment specification

**Deployment Configurations:**
- Netlify functions for serverless API endpoints
- Automatic redirects for SPA routing
- PostgreSQL database provisioning with Neon
- OAuth callback URL configuration per deployment environment

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- June 23, 2025. Initial setup