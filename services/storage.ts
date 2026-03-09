import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, firestoreDb } from './firebase';
import { Decision, Project, Plan, User, UserRole } from '../types';

const DB_KEY = 'groundsync_db_v2';

interface LocalDbState {
  projects: Project[];
  plans: Plan[];
  decisions: Decision[];
}

const DEFAULT_LOCAL_STATE: LocalDbState = {
  projects: [],
  plans: [],
  decisions: [],
};

export const db = {
  // --- Local data (projects/plans/decisions) — still in localStorage for now ---
  get: (): LocalDbState => {
    const saved = localStorage.getItem(DB_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          projects: parsed.projects || [],
          plans: parsed.plans || [],
          decisions: parsed.decisions || [],
        };
      } catch {
        return DEFAULT_LOCAL_STATE;
      }
    }
    return DEFAULT_LOCAL_STATE;
  },

  save: (state: LocalDbState) => {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(state));
    } catch (err) {
      console.error('[db.save] Failed to persist state to localStorage.', err);
    }
  },

  reset: () => {
    localStorage.removeItem(DB_KEY);
    window.location.reload();
  },

  // --- Auth — Firebase ---
  authenticate: async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const user = await fetchUserProfile(credential.user);
      return { success: true, user };
    } catch (err: any) {
      return { success: false, error: mapAuthError(err.code) };
    }
  },

  register: async (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    role: UserRole
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const displayName = `${firstName} ${lastName}`;
      await updateProfile(credential.user, { displayName });

      const user: User = {
        id: credential.user.uid,
        name: displayName,
        email,
        role,
      };

      await setDoc(doc(firestoreDb, 'users', credential.user.uid), user);
      return { success: true, user };
    } catch (err: any) {
      return { success: false, error: mapAuthError(err.code) };
    }
  },

  logout: async (): Promise<void> => {
    await signOut(auth);
  },

  onAuthStateChanged: (callback: (user: User | null) => void): (() => void) => {
    return firebaseOnAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        callback(null);
        return;
      }
      const user = await fetchUserProfile(firebaseUser);
      callback(user);
    });
  },
};

async function fetchUserProfile(firebaseUser: FirebaseUser): Promise<User> {
  const snap = await getDoc(doc(firestoreDb, 'users', firebaseUser.uid));
  if (snap.exists()) {
    return snap.data() as User;
  }
  // Fallback if Firestore doc is missing
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || firebaseUser.email || 'Unknown',
    email: firebaseUser.email || '',
    role: UserRole.BAULEITER,
  };
}

function mapAuthError(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password';
    case 'auth/email-already-in-use':
      return 'Email already registered';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters';
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
