import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, firestoreDb } from './firebase';
import { Decision, Project, Plan, User, UserRole } from '../types';

export const db = {
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

export const projectsService = {
  // Query by memberIds so both owned and shared projects are returned
  subscribe: (uid: string, callback: (projects: Project[]) => void): (() => void) => {
    const q = query(
      collection(firestoreDb, 'projects'),
      where('memberIds', 'array-contains', uid)
    );
    return onSnapshot(q, (snapshot) => {
      const projects = snapshot.docs.map(d => {
        const { ownerId: _oid, memberIds: _mids, ...data } = d.data();
        return { ...data, id: d.id } as Project; // d.id is the authoritative document ID
      });
      callback(projects);
    });
  },

  create: async (project: Project, ownerUid: string): Promise<void> => {
    await setDoc(doc(firestoreDb, 'projects', project.id), {
      ...project,
      ownerId: ownerUid,     // rules: create requires ownerId == auth.uid
      memberIds: [ownerUid], // rules: create requires auth.uid in memberIds
    });
  },
};

export const decisionsService = {
  subscribe: (projectId: string, callback: (decisions: Decision[]) => void): (() => void) => {
    const q = query(
      collection(firestoreDb, 'decisions'),
      where('projectId', '==', projectId)
    );
    return onSnapshot(q, (snapshot) => {
      const decisions = snapshot.docs.map(d => {
        const { createdBy: _cb, ...data } = d.data();
        return { ...data, id: d.id } as Decision;
      });
      callback(decisions);
    });
  },

  create: async (decision: Decision): Promise<void> => {
    await setDoc(doc(firestoreDb, 'decisions', decision.id), {
      ...decision,
      createdBy: decision.creatorId, // required by security rules
    });
  },

  update: async (id: string, changes: Partial<Decision>): Promise<void> => {
    await updateDoc(doc(firestoreDb, 'decisions', id), changes as Record<string, any>);
  },
};

export const plansService = {
  subscribe: (projectId: string, callback: (plans: Plan[]) => void): (() => void) => {
    const q = query(
      collection(firestoreDb, 'plans'),
      where('projectId', '==', projectId)
    );
    return onSnapshot(q, (snapshot) => {
      const plans = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Plan));
      callback(plans);
    });
  },

  create: async (plan: Plan): Promise<void> => {
    await setDoc(doc(firestoreDb, 'plans', plan.id), plan);
  },
};

async function fetchUserProfile(firebaseUser: FirebaseUser): Promise<User> {
  const snap = await getDoc(doc(firestoreDb, 'users', firebaseUser.uid));
  if (snap.exists()) {
    // Always override id from the Firebase UID — never trust the stored field
    return { ...snap.data(), id: firebaseUser.uid } as User;
  }
  // Fallback if Firestore doc is missing (e.g. user created before Phase 2)
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
