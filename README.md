# MindChart - Interactive Mind Mapping Tool

## Overview

MindChart is a browser-based interactive mind mapping application that allows users to create, organize, and visualize ideas through an intuitive drag-and-drop interface. The application features a clean landing page and a powerful mind mapping canvas with zoom, pan, node management, and connection editing capabilities. Users can save their work as XML files and reload them later. The application includes comprehensive debugging information and real-time feedback for all user interactions.

## System Architecture

This is a client-side focused web application with a minimal server setup:

**Frontend Architecture:**
- Pure vanilla JavaScript with ES6 classes
- Modular component architecture with separate concerns
- SVG-based rendering for scalable graphics
- Event-driven interaction model

**Backend Architecture:**
- Minimal Node.js HTTP server for static file serving
- No database or persistent storage (file-based XML export/import)
- Simple file system routing

## Key Components

### 1. Frontend Components

**MindChartApp (app.js)**
- Main application controller
- Manages page navigation between landing and app views
- Handles high-level user interactions and file operations
- Coordinates between different modules

**MindEngine (mindmap.js)**
- Core mind mapping engine
- Manages nodes, connections, and canvas interactions
- Handles mouse/touch events for dragging, panning, and zooming
- Maintains internal state of the mind map structure

**XMLHandler (xmlhandler.js)**
- Handles serialization and deserialization of mind maps
- Converts mind map data to/from XML format for persistence
- Provides version control and metadata management

### 2. User Interface

**Landing Page**
- Welcome screen with feature highlights
- Clean, gradient-based design
- Call-to-action button to enter the application

**Mind Map Canvas**
- SVG-based drawing area for scalable graphics
- Toolbar with essential controls (New, Templates, Save, Load, Add Node, Delete, Connect Mode, Help)
- Zoom and pan controls for navigation
- Interactive connection editing with visual feedback
- Real-time debugging information in status bar
- Comprehensive keyboard shortcuts and tooltips system
- Template system with 8 predefined mind map structures

### 3. Server Component

**Static File Server (server.js)**
- Simple HTTP server using Node.js built-in modules
- Serves static assets (HTML, CSS, JS files)
- Configured to run on port 5000
- MIME type handling for various file formats

## Data Flow

1. **Application Initialization:**
   - MindChartApp instantiated on page load
   - Landing page displayed by default
   - Event listeners attached to UI elements

2. **Mind Map Creation:**
   - User navigates to app page
   - MindMap instance created with SVG canvas
   - Initial root node created automatically

3. **User Interactions:**
   - Mouse/touch events captured on canvas
   - Node selection, dragging, and editing handled
   - Real-time visual feedback provided

4. **Data Persistence:**
   - XMLHandler serializes mind map data
   - File download triggered for saving
   - File upload processed for loading existing maps

## External Dependencies

**Runtime Dependencies:**
- Node.js 20 (server runtime)
- Modern web browser with SVG support

**No External Libraries:**
- Pure vanilla JavaScript implementation
- No frontend frameworks or build tools
- No external CSS frameworks

## Deployment Strategy

**Development Environment:**
- Replit-based development with Node.js 20 module
- Hot reload through file watching
- Local development server on port 5000

**Production Deployment:**
- Simple static file serving
- Can be deployed to any web server or CDN
- No database or complex infrastructure required

**Deployment Configuration:**
- **Development**: Configured for shell execution: `node server.js` on port 5000
- **Production**: Netlify-ready with serverless functions and static hosting
- **Database**: Neon PostgreSQL for scalable cloud storage
- **Collaboration**: WebSocket server for development, polling-based for Netlify deployment

## Changelog

```
Changelog:
- June 23, 2025. Initial setup
- June 23, 2025. Added comprehensive debugging information to status bar
- June 23, 2025. Added connection editing capabilities with Connect Mode
- June 23, 2025. Added keyboard shortcuts help system with tooltips
- June 23, 2025. Implemented template system with 8 pre-built mind map templates
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```

## Technical Decisions & Rationale

**1. Vanilla JavaScript Choice:**
- **Problem:** Need for lightweight, fast-loading application
- **Solution:** Pure JavaScript without frameworks
- **Rationale:** Reduces bundle size, eliminates build complexity, and provides direct DOM control for SVG manipulation

**2. SVG-Based Rendering:**
- **Problem:** Need for scalable, crisp graphics that work at any zoom level
- **Solution:** SVG canvas for all mind map elements
- **Rationale:** Vector graphics scale perfectly, provide precise control, and integrate well with web standards

**3. Client-Side Storage Strategy:**
- **Problem:** Need for data persistence without server complexity
- **Solution:** XML file export/import system
- **Rationale:** Keeps server simple, gives users full control over their data, and provides portable file format

**4. Modular Class Architecture:**
- **Problem:** Need for maintainable, extensible code structure
- **Solution:** Separate classes for app control, mind map logic, and data handling
- **Rationale:** Clear separation of concerns, easier testing, and simplified feature additions

**5. Event-Driven Interaction Model:**
- **Problem:** Complex user interactions with drag, pan, zoom, and selection
- **Solution:** Comprehensive event handling system with state management
- **Rationale:** Provides responsive user experience and handles both mouse and touch inputs
