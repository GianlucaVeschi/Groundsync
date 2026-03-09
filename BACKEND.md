# Groundsync: Firebase Backend Integration Plan

## Overview

Replace browser `localStorage` persistence with Firebase as the sole backend.
Target: web app + React Native (Expo managed) mobile app, offline support required.

**Chosen SDK:** Firebase JS SDK (`firebase` package) — not `@react-native-firebase`.
- Works identically in web and Expo managed RN (no native modules required)
- `persistentLocalCache()` provides built-in offline sync on both platforms

**Firebase services used:**
- Firebase Auth → replaces simulated auth in `services/storage.ts`
- Firestore → stores `projects`, `plans`, `decisions`, user profiles
- Firebase Storage → stores PDF files and decision images
- Offline: `persistentLocalCache()` on Firestore (queues writes, auto-syncs on reconnect)

---

## Current State

`firebase` is already installed (`npm install firebase` done).

Source files are untouched — all changes will be made phase by phase below.

---

## Phases

Each phase ends with the app in a working state. Implement one phase, confirm it works, then move to the next.

---

### ✅ Phase 1 — Firebase Initialization

**Goal:** Wire up Firebase SDK. No data changes yet.

**Files to create/modify:**
- `services/firebase.ts` *(new)* — initialize app, Firestore with `persistentLocalCache()`, Auth, Storage; export `firestoreDb`, `auth`, `storage`
- `.env.local` — add 6 `VITE_FIREBASE_*` env vars (filled in from Firebase Console)
- No changes to `vite.config.ts` needed — `VITE_` prefix is auto-exposed by Vite via `import.meta.env`

**`services/firebase.ts` exports:**
```ts
export const firestoreDb: Firestore
export const auth: Auth
export const storage: FirebaseStorage
```

**`.env.local` additions:**
```
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
```

**`vite.config.ts`:** add all 6 vars to the `define` block as `process.env.FIREBASE_*` (same pattern as `GEMINI_API_KEY`).

**Verify:** App loads, no console errors about Firebase, `firestoreDb` / `auth` / `storage` are non-null.

---

### ✅ Phase 2 — Authentication

**Goal:** Replace simulated email/password auth with Firebase Auth.

**Files to modify:**
- `services/storage.ts` — replace `db.authenticate()`, `db.register()`, `db.logout()` with Firebase Auth calls; add `db.onAuthStateChanged()` wrapper; keep `db.get()` / `db.save()` for projects/plans/decisions (untouched for now)
- `components/SignInScreen.tsx` — swap `db.authenticate` / `db.register` calls to the new Firebase-backed versions (same call signature, no other UI changes)
- `App.tsx` — replace `state.isAuthenticated` check with `onAuthStateChanged` listener; split state into `currentUser: User | null` (from Firebase) and `localData` (projects/plans/decisions still from localStorage)

**Key behavior changes:**
- Sign up → `createUserWithEmailAndPassword` + write `users/{uid}` doc to Firestore with name/role
- Sign in → `signInWithEmailAndPassword`; read `users/{uid}` from Firestore to get name/role
- Sign out → `signOut(auth)`
- App load → `onAuthStateChanged` determines auth state (no localStorage flag)
- Auth loading state: show a full-screen spinner while Firebase resolves the session (avoid flash of sign-in screen)

**Auth error mapping:** Firebase error codes → human-readable strings (e.g. `auth/invalid-credential` → "Invalid email or password").

**Not changed:** `db.get()`, `db.save()`, localStorage for projects/plans/decisions — still works as before.

---

### Phase 3 — Projects in Firestore

**Goal:** Move projects from localStorage to Firestore.

**Files to modify:**
- `services/storage.ts` — add `projectsService` with `createProject`, `updateProject`, `deleteProject`, `subscribeToProjects(uid, callback)`
- `App.tsx` — replace synchronous `state.projects` with `onSnapshot` listener on `projects` collection filtered by `ownerUid == currentUser.uid`; remove projects from `localData` state

**Firestore collection:** `projects/{projectId}`
```
{
  ...all Project fields from types.ts,
  ownerUid: string   // ← new field, scopes to logged-in user
}
```

**ID generation:** Use Firestore `doc(collection).id` (random ID) instead of `Math.random()`.

**Not changed:** Plans and decisions still in localStorage.

---

### Phase 4 — Decisions in Firestore

**Goal:** Move decisions from localStorage to Firestore.

**Files to modify:**
- `services/storage.ts` — add `decisionsService` with `createDecision`, `updateDecision`, `subscribeToDecisions(planId, callback)`
- `App.tsx` — replace `state.decisions` with `onSnapshot` listener on `decisions` collection filtered by `planId`; remove decisions from `localData` state

**Firestore collection:** `decisions/{decisionId}`
```
{
  ...all Decision fields from types.ts,
  // media[].url stays as base64 data URI for now (migrated in Phase 6)
}
```

**Note on timestamps:** Keep `createdAt`, `acknowledgedAt`, `deletedAt` as Unix `number` (milliseconds) — no Firestore `Timestamp` conversion needed for now.

**Not changed:** Plans still in localStorage.

---

### Phase 5 — Plans in Firestore

**Goal:** Move plan metadata to Firestore. PDF data stays as base64 in Firestore temporarily.

**Files to modify:**
- `services/storage.ts` — add `plansService` with `createPlan`, `subscribeToPlans(projectId, callback)`
- `App.tsx` — replace `state.plans` with `onSnapshot` listener; remove plans from `localData` state

**Firestore collection:** `plans/{planId}`
```
{
  id, projectId, name, shortName,
  pdfData: string   // base64, same as before — migrated in Phase 6
}
```

**After this phase:** localStorage is no longer used for any data. `localData` state in `App.tsx` is removed. The `db.get()` / `db.save()` localStorage helpers can be deleted.

---

### Phase 6 — PDF and Image Storage

**Goal:** Move PDFs and images from base64 strings in Firestore to Firebase Storage.

**Files to modify:**
- `App.tsx` — `handlePdfUpload()` uploads PDF bytes to Storage, stores download URL in `plans/{planId}.pdfUrl`; remove `pdfData` from plan document
- `components/PlanCanvas.tsx` — accept `pdfUrl: string` in addition to / instead of `pdfData: string`; fetch PDF from URL using `fetch()` + `arrayBuffer()` before passing to PDF.js
- `components/DecisionModal.tsx` — `handleFileUpload()` uploads compressed image to Storage, stores download URL in `media[].url`; remove base64 data URI path

**Storage paths:**
```
plans/{projectId}/{planId}.pdf
decisions/{decisionId}/{mediaId}.jpg
```

**`types.ts` change:** `Plan.pdfData: string` → `Plan.pdfUrl: string`

---

### Phase 7 — Cleanup

**Goal:** Remove all remaining localStorage code.

**Files to modify/delete:**
- `services/storage.ts` — delete file entirely (or gut to empty shell); all logic is now in `projectsService`, `decisionsService`, `plansService` in dedicated service files, or inline in `App.tsx`
- `App.tsx` — remove `localDb.save()` `useEffect`; confirm no remaining `localStorage` calls

**After this phase:**
- localStorage contains no Groundsync data
- All data lives in Firestore + Firebase Storage
- Auth managed by Firebase Auth

---

## Firestore Security Rules

Apply in Firebase Console → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    match /projects/{projectId} {
      allow read, write: if request.auth != null
        && resource.data.ownerUid == request.auth.uid;
      allow create: if request.auth != null;
    }
    match /plans/{planId} {
      allow read, write: if request.auth != null;
    }
    match /decisions/{decisionId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Files Changed per Phase

| File | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 | Phase 7 |
|---|---|---|---|---|---|---|---|
| `services/firebase.ts` | **Create** | — | — | — | — | — | — |
| `services/storage.ts` | — | **Rewrite auth** | Add projects | Add decisions | Add plans | — | **Delete** |
| `App.tsx` | — | Auth listener | Projects onSnapshot | Decisions onSnapshot | Plans onSnapshot | Upload handlers | Remove localStorage |
| `components/SignInScreen.tsx` | — | Swap auth calls | — | — | — | — | — |
| `components/PlanCanvas.tsx` | — | — | — | — | — | Accept pdfUrl | — |
| `components/DecisionModal.tsx` | — | — | — | — | — | Upload images | — |
| `types.ts` | — | — | — | — | — | `pdfUrl` field | — |
| `.env.local` | Add Firebase vars | — | — | — | — | — | — |

---

## Verification Checklist (run after each phase)

- [ ] App loads without console errors
- [ ] Sign in / sign out works
- [ ] Projects visible and creatable
- [ ] PDF plans uploadable and viewable
- [ ] Decision pins placeable and persistent after refresh
- [ ] Data survives browser refresh

**Final checks (after Phase 7):**
- [ ] Sign up → user appears in Firebase Auth console
- [ ] Create project → appears in Firestore console
- [ ] Upload PDF → appears in Firebase Storage
- [ ] Create decision → persists after browser refresh
- [ ] Sign in on second device → same data visible
- [ ] Go offline, create decision, reconnect → decision syncs to Firestore
- [ ] `localStorage` contains no Groundsync data
