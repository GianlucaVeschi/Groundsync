
export enum UserRole {
  BAULEITER = 'Bauleiter',
  BAUUEBERWACHUNG = 'Bauüberwachung',
  PROJECT_MANAGER = 'Project Manager',
  ARCHITECT = 'Architect',
  SUBCONTRACTOR = 'Subcontractor',
  AUFTRAGGEBER = 'Auftraggeber'
}

export type PhaseHOAI = 'LP1' | 'LP2' | 'LP3' | 'LP4' | 'LP5' | 'LP6' | 'LP7' | 'LP8' | 'LP9';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Project {
  id: string;
  name: string;
  shortName: string;
  startDate: string;
  client: string;
  phaseHOAI: PhaseHOAI;
  userRole: UserRole; // The role the current user takes in this project
  categories: string[];
}

export interface Plan {
  id: string;
  projectId: string;
  name: string;
  shortName: string;
  pdfUrl: string;
  createdBy: string;
}

export interface DecisionMedia {
  id: string;
  type: 'image' | 'audio';
  url: string;
}

export interface DecisionComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
}

export interface DecisionRevision {
  id: string;
  userId: string;
  userName: string;
  timestamp: number;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export interface Decision {
  id: string;
  humanId: string;
  projectId: string;
  planId: string;
  creatorId: string;
  creatorName: string;
  category: string;
  text: string;
  x: number;
  y: number;
  status: 'Open' | 'Acknowledged';
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  media: DecisionMedia[];
  comments: DecisionComment[];
  history: DecisionRevision[];
  deletedAt?: number;
  deletedBy?: string;
  createdAt: number;
}
