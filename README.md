# Groundsync

**Construction Site Decision Documentation Tool**

Groundsync is a web application for construction project management that enables teams to document, track, and collaborate on decisions directly on 2D PDF construction plans.

## Features

### Core Functionality
- 📍 **Pin Decisions on PDF Plans** - Place geolocated decision pins directly on construction drawings
- 🎤 **Voice Note Recording** - Record and automatically transcribe/categorize voice notes using AI
- 📸 **Photo Attachments** - Attach up to 3 photos per decision
- 💬 **Comments & Discussion** - Collaborative commenting on decisions
- 📜 **Decision History** - Complete audit trail of all changes
- ✅ **Acknowledgement Workflow** - Role-based decision acknowledgement

### Project Management
- 🏗️ **HOAI Phase Support** - German construction phases (LP1-LP9)
- 👥 **Role-Based Access Control** - Bauleiter, Project Manager, Architect, and more
- 🏢 **Multi-Project Support** - Manage multiple construction projects
- 🔖 **Custom Categories** - Project-specific decision categories
- 🔍 **Decision Search & Filter** - Quick access to all project decisions

### Technical Features
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- ⚡ **Real-time Updates** - LocalStorage-backed state management
- 🎨 **Modern UI** - Tailwind CSS with clean, professional design
- 📊 **PDF Rendering** - High-quality PDF.js integration with zoom/pan

## Prerequisites

- **Node.js** (v16 or higher)
- **Gemini API Key** (for voice note transcription)

## Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**

   Set your Gemini API key in `.env.local`:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

   The app will start at `http://localhost:3000`

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Preview production build:**
   ```bash
   npm run preview
   ```

## Tech Stack

- **Frontend Framework:** React 19 + TypeScript
- **Styling:** Tailwind CSS (via CDN)
- **PDF Rendering:** PDF.js v3.11.174
- **AI Integration:** Google Gemini API (via @google/genai)
- **Icons:** Font Awesome 6.4.0
- **Build Tool:** Vite
- **State Management:** React useState with localStorage persistence
- **Deployment:** GitHub Pages

## Project Structure

```
groundsync-web/
├── components/
│   ├── PlanCanvas.tsx          # PDF viewer with pin placement
│   ├── DecisionModal.tsx       # Decision creation/editing
│   ├── AuthLandingScreen.tsx   # Landing page
│   └── SignInScreen.tsx        # Authentication
├── services/
│   ├── storage.ts              # LocalStorage database
│   └── gemini.ts               # AI voice transcription
├── types.ts                     # TypeScript definitions
├── App.tsx                      # Root component & routing
└── CLAUDE.md                    # Developer documentation

```

## Usage

### Creating a Project
1. Sign in or register a new account
2. Click "New Project" and fill in details:
   - Project name
   - Client name
   - HOAI phase
   - Your role
   - Custom decision categories

### Working with Plans
1. Open a project
2. Upload a PDF construction plan
3. Use the right sidebar controls:
   - **Blue pin button** - Place decision pins (or press 'P')
   - **+/- buttons** - Zoom in/out
   - **Recenter button** - Reset PDF view to home position
4. Click on the plan to place a decision pin
5. Fill in decision details (category, text, voice notes, photos)

### Managing Decisions
- **View all decisions** - Click the list icon in the header
- **Edit decisions** - Click on any pin or list item
- **Acknowledge decisions** - Available based on your role
- **Track changes** - View decision history
- **Add comments** - Collaborate with team members

## Deployment to GitHub Pages

The app automatically deploys to GitHub Pages when you push to the `main` branch.

**Setup steps:**

1. Go to your GitHub repository settings
2. Navigate to Settings > Pages
3. Under "Build and deployment", select:
   - Source: **GitHub Actions**
4. Push to `main` branch to trigger deployment

**Deployment URL:** `https://gianlucaveschi.github.io/Groundsync/`

The deployment workflow is configured in `.github/workflows/deploy.yml`

## Architecture

**State Management:**
- Single centralized state pattern with localStorage persistence
- Database key: `groundsync_db_v2`
- State includes: `projects[]`, `plans[]`, `decisions[]`, `currentUser`
- Changes auto-save to localStorage

**Data Models:**
- **Project** - Construction project with HOAI phase, client, user role, categories
- **Plan** - PDF document (base64) associated with a project
- **Decision** - Geolocated annotation with category, text, media, comments, history
- **User** - Person with name, email, and role

**Decision ID Format:** `GS-{projectShort}-{planShort}-{count}`
Example: `GS-RIV-PLA-00001`

## Voice Note Integration

Voice notes use Google Gemini API for automatic transcription and categorization:
- Records audio (currently simulated in UI)
- Sends to Gemini 3 Flash Preview model
- Returns structured JSON: `{ text, category }`
- Auto-categorizes based on project categories

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

For development guidelines and architecture details, see [CLAUDE.md](CLAUDE.md)

## License

Private project - All rights reserved
