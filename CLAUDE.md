# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Groundsync** is a construction site decision documentation tool that allows users to pin decisions on 2D PDF plans, record voice notes, take photos, and manage project-wide construction logic with role-based access. Built for AI Studio and deployed as a React web application.

AI Studio app: https://ai.studio/apps/drive/1CKLTATqPAJgtVHt0K3xF7AR1VTpF1FuT

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (starts on http://0.0.0.0:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Setup

Set `GEMINI_API_KEY` in `.env.local` before running. The Vite config maps this to `process.env.API_KEY` for the Gemini service.

## Architecture Overview

### State Management

The app uses a **single centralized state** pattern with localStorage persistence:

- **services/storage.ts**: LocalStorage-backed database (`groundsync_db_v2` key)
- State includes: `projects[]`, `plans[]`, `decisions[]`, `currentUser`
- All state mutations happen at the App.tsx level and propagate down
- Changes auto-save to localStorage via `useEffect` in App.tsx:11-23

### Data Flow

```
App.tsx (root state)
  ├─> Projects view: Browse/create projects
  ├─> Project Detail view: Browse/upload PDF plans for a project
  └─> Plan view: Interactive canvas with decision pins
      ├─> PlanCanvas.tsx: PDF rendering + pan/zoom + pin placement
      └─> DecisionModal.tsx: Decision creation/editing form
```

### Key Data Models (types.ts)

- **Project**: Construction project with HOAI phase, client, user role, and categories
- **Plan**: PDF document (base64) associated with a project
- **Decision**: Geolocated annotation on a plan with category, text, media, comments, history, and status (Open/Acknowledged)
- **User**: Person with name, email, and role (Bauleiter, Project Manager, Architect, etc.)

Each Decision gets a human-readable ID like `GS-RIV-PLA-00001` (format: `GS-{projectShort}-{planShort}-{count}`)

### Components

**PlanCanvas.tsx** (components/PlanCanvas.tsx):
- Renders PDF on HTML canvas using PDF.js (loaded via CDN in index.html:11)
- Implements pan (click-drag), zoom (mouse wheel), and pin placement (click on canvas)
- Pins are positioned using normalized coordinates (0-1) relative to PDF dimensions
- Scale-independent pin rendering: pins scale inversely to canvas zoom (components/PlanCanvas.tsx:169)
- Auto-centers on selected decision when `selectedDecisionId` changes (components/PlanCanvas.tsx:58-73)

**DecisionModal.tsx** (components/DecisionModal.tsx):
- Full-screen modal for creating/editing decisions
- Role-based permissions: only creators can edit; Bauleiter/PM/Architect can acknowledge
- Voice note simulation (components/DecisionModal.tsx:39-45) - connects to Gemini in production
- Photo upload with 3-image limit
- Comments section (currently simplified/mocked)

### Gemini Integration

**services/gemini.ts**:
- Uses `@google/genai` SDK (v1.38.0)
- Function: `parseDecisionVoice(audioBase64, categories)`
- Transcribes voice notes and auto-categorizes them using Gemini 3 Flash Preview
- Returns structured JSON: `{ text, category }`
- Currently simulated in DecisionModal; wire this up for real voice note functionality

### PDF Rendering

- PDF.js loaded from CDN (v3.11.174) in index.html:11
- Worker initialized in index.html:44-46
- PDF data stored as base64 data URI in Plan.pdfData
- Rendered at 2x scale for better quality (components/PlanCanvas.tsx:38)

### Styling

- Uses **Tailwind CSS** via CDN (index.html:8)
- **Font Awesome 6.4.0** for icons (index.html:9)
- Custom global styles in index.html:12-27 (overscroll behavior, canvas container)
- Design system: rounded-3xl cards, bold typography, blue-600 primary, slate grays

### Role-Based Access

Each project has a `userRole` field that determines the user's permissions in that project:
- **Bauleiter, Project Manager, Architect**: Can acknowledge decisions
- **All roles**: Can create decisions and comments
- **Decision creators**: Can edit/delete their own decisions

German HOAI phases supported: LP1 through LP9 (types.ts:11)

## Important Implementation Notes

### ID Generation

Projects, Plans, and Decisions use `Math.random().toString(36).substr(2, 9)` for IDs. Decisions additionally get human-readable IDs (App.tsx:118-121).

### Soft Deletes

Decisions use soft delete pattern with `deletedAt` timestamp (types.ts:82). Filtering happens in render: `decisions.filter(d => !d.deletedAt)` (App.tsx:381).

### Coordinate System

Decision pins use **normalized coordinates** (0-1 range) stored in `Decision.x` and `Decision.y`. This makes them resolution-independent. Convert to pixel coordinates by multiplying by canvas dimensions (components/PlanCanvas.tsx:64-65).

### History Tracking

Decisions have a `history[]` array of `DecisionRevision` objects that track all changes (types.ts:53-63). Currently only text changes are tracked (App.tsx:112).

### Mobile Considerations

- Viewport configured with `user-scalable=no` (index.html:6)
- `overscroll-behavior-y: contain` prevents pull-to-refresh (index.html:14)
- Canvas uses `touch-action: none` (index.html:18)
- Modal layouts adapt for mobile with `sm:` breakpoints (components/DecisionModal.tsx:63, 196)

## Troubleshooting

### PDF not rendering
- Check that PDF.js worker is loaded (console errors will show if it fails)
- Verify pdfData is valid base64 data URI with `data:application/pdf;base64,` prefix

### Gemini API errors
- Verify `GEMINI_API_KEY` is set in `.env.local`
- Check vite.config.ts:14 for environment variable mapping
- Gemini service expects `process.env.API_KEY` (services/gemini.ts:4)

### State not persisting
- Check browser localStorage for `groundsync_db_v2` key
- Clear localStorage and reload to reset: `db.reset()` (services/storage.ts:33-36)
