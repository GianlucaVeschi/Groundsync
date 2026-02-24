
import { Decision, Project, Plan, User, UserRole } from '../types';

const DB_KEY = 'groundsync_db_v2'; // Bumped version for new schema

interface UserWithPassword extends User {
  password: string;
}

interface DbState {
  projects: Project[];
  plans: Plan[];
  decisions: Decision[];
  currentUser: User;
  users: UserWithPassword[];
  isAuthenticated: boolean;
}

const DEFAULT_STATE: DbState = {
  projects: [],
  plans: [],
  decisions: [],
  currentUser: {
    id: 'demo',
    name: 'Demo User',
    email: 'demo@groundsync.com',
    role: UserRole.BAULEITER
  },
  users: [
    {
      id: 'demo',
      name: 'Demo User',
      email: 'demo@groundsync.com',
      password: 'password123',
      role: UserRole.BAULEITER
    }
  ],
  isAuthenticated: false
};

export const db = {
  get: (): DbState => {
    const saved = localStorage.getItem(DB_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);

      // Migration: Add users array if missing
      if (!parsed.users) {
        parsed.users = [
          {
            id: 'demo',
            name: 'Demo User',
            email: 'demo@groundsync.com',
            password: 'password123',
            role: UserRole.BAULEITER
          }
        ];
        // Preserve existing currentUser if it exists and add to users
        if (parsed.currentUser && !parsed.users.find((u: UserWithPassword) => u.id === parsed.currentUser.id)) {
          parsed.users.push({
            ...parsed.currentUser,
            password: 'password123' // Default password for migrated users
          });
        }
      }

      // Migration: Add isAuthenticated flag if missing
      if (parsed.isAuthenticated === undefined) {
        parsed.isAuthenticated = false; // Force re-login on first load
      }

      return parsed;
    }
    return DEFAULT_STATE;
  },
  save: (state: DbState) => {
    localStorage.setItem(DB_KEY, JSON.stringify(state));
  },
  reset: () => {
    localStorage.removeItem(DB_KEY);
    window.location.reload();
  },
  authenticate: async (email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> => {
    // Simulate 1-second delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const state = db.get();
    const user = state.users.find(u => u.email === email);

    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    if (user.password !== password) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Update state with authenticated user
    const updatedState: DbState = {
      ...state,
      currentUser: { id: user.id, name: user.name, email: user.email, role: user.role },
      isAuthenticated: true
    };
    db.save(updatedState);

    return { success: true, user: updatedState.currentUser };
  },
  register: async (firstName: string, lastName: string, email: string, password: string, role: UserRole): Promise<{ success: boolean; error?: string; user?: User }> => {
    // Simulate 1-second delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const state = db.get();

    // Check if email already exists
    if (state.users.find(u => u.email === email)) {
      return { success: false, error: 'Email already registered' };
    }

    // Create new user
    const newUser: UserWithPassword = {
      id: Math.random().toString(36).substr(2, 9),
      name: `${firstName} ${lastName}`,
      email,
      password,
      role
    };

    // Update state with new user and auto-authenticate
    const updatedState: DbState = {
      ...state,
      users: [...state.users, newUser],
      currentUser: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
      isAuthenticated: true
    };
    db.save(updatedState);

    return { success: true, user: updatedState.currentUser };
  },
  logout: (): DbState => {
    const state = db.get();
    const updatedState: DbState = {
      ...state,
      isAuthenticated: false
    };
    db.save(updatedState);
    return updatedState;
  },
  findUserByEmail: (email: string): UserWithPassword | undefined => {
    const state = db.get();
    return state.users.find(u => u.email === email);
  }
};
