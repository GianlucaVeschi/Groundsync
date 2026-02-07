
import { Decision, Project, Plan, User, UserRole } from '../types';

const DB_KEY = 'groundsync_db_v2'; // Bumped version for new schema

interface DbState {
  projects: Project[];
  plans: Plan[];
  decisions: Decision[];
  currentUser: User;
}

const DEFAULT_STATE: DbState = {
  projects: [],
  plans: [],
  decisions: [],
  currentUser: {
    id: 'u1',
    name: 'Admin User',
    email: 'user@groundsync.io',
    role: UserRole.BAULEITER // Global default, can be overridden per project
  }
};

export const db = {
  get: (): DbState => {
    const saved = localStorage.getItem(DB_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_STATE;
  },
  save: (state: DbState) => {
    localStorage.setItem(DB_KEY, JSON.stringify(state));
  },
  reset: () => {
    localStorage.removeItem(DB_KEY);
    window.location.reload();
  }
};
