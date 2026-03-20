
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Project, Plan, Decision, UserRole, PhaseHOAI } from './types';
import { db, projectsService, decisionsService, plansService } from './services/storage';
import { storage } from './services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { AuthLandingScreen } from './components/AuthLandingScreen';
import { SignInScreen } from './components/SignInScreen';
import { ProjectsView } from './components/ProjectsView';
import { ProjectDetailView } from './components/ProjectDetailView';
import { PlanView } from './components/PlanView';
import { getDefaultCategories } from './locales/categoryMapping';

type ViewState = 'auth-landing' | 'sign-in' | 'projects' | 'project-detail' | 'plan-view';

const App: React.FC = () => {
  const { t, i18n } = useTranslation(['common', 'projects', 'decisions']);
  // undefined = auth loading, null = signed out, User = signed in
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
  const [projects, setProjects] = useState<Project[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [view, setView] = useState<ViewState>('auth-landing');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [activeDecision, setActiveDecision] = useState<Partial<Decision> | null>(null);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
  const [showDecisionList, setShowDecisionList] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [signInMode, setSignInMode] = useState<'sign-in' | 'register'>('sign-in');
  const [isPinPlacementMode, setIsPinPlacementMode] = useState(false);
  const [zoomInTrigger, setZoomInTrigger] = useState(0);
  const [zoomOutTrigger, setZoomOutTrigger] = useState(0);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Firebase auth state listener — drives navigation
  useEffect(() => {
    const unsubscribe = db.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setView(user ? 'projects' : 'auth-landing');
    });
    return unsubscribe;
  }, []);

  // Firestore projects subscription — scoped to current user
  useEffect(() => {
    if (!currentUser?.id) {
      setProjects([]);
      return;
    }
    const unsubscribe = projectsService.subscribe(currentUser.id, setProjects);
    return unsubscribe;
  }, [currentUser]);

  // Firestore decisions subscription — scoped to active project (includes mobile decisions)
  useEffect(() => {
    if (!activeProjectId) {
      setDecisions([]);
      return;
    }
    const unsubscribe = decisionsService.subscribe(activeProjectId, setDecisions);
    return unsubscribe;
  }, [activeProjectId]);

  // Firestore plans subscription — scoped to active project
  useEffect(() => {
    if (!activeProjectId) {
      setPlans([]);
      return;
    }
    const unsubscribe = plansService.subscribe(activeProjectId, setPlans);
    return unsubscribe;
  }, [activeProjectId]);

  // Keyboard shortcut for pin placement mode (P key) - only in plan view
  useEffect(() => {
    if (view !== 'plan-view') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyP' && !e.repeat &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA') {
        setIsPinPlacementMode(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view]);

  // Reset pin mode when leaving plan view
  useEffect(() => {
    if (view !== 'plan-view') {
      setIsPinPlacementMode(false);
    }
  }, [view]);

  // --- Mappings ---
  const activeProject = useMemo(() =>
    projects.find(p => p.id === activeProjectId),
    [projects, activeProjectId]
  );

  const projectPlans = useMemo(() =>
    plans.filter(p => p.projectId === activeProjectId),
    [plans, activeProjectId]
  );

  const activePlan = useMemo(() =>
    plans.find(p => p.id === activePlanId),
    [plans, activePlanId]
  );

  // Filter decisions to the active plan for pin placement on canvas
  // (mobile decisions have no planId — they appear in lists but not as pins)
  const planDecisions = useMemo(() =>
    decisions.filter(d => d.planId === activePlanId),
    [decisions, activePlanId]
  );

  const handleSelectDecisionFromCanvas = (decisionId: string | null) => {
    setSelectedPreviewId(decisionId);
    if (!decisionId) return;
    const decision = planDecisions.find(d => d.id === decisionId && !d.deletedAt);
    if (decision) {
      setActiveDecision(decision);
    }
  };

  // --- Handlers ---
  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      shortName: name.substring(0, 3).toUpperCase(),
      startDate: formData.get('startDate') as string,
      client: formData.get('client') as string,
      phaseHOAI: formData.get('phaseHOAI') as PhaseHOAI,
      userRole: formData.get('userRole') as UserRole,
      categories: getDefaultCategories(i18n.language as 'en' | 'de')
    };
    await projectsService.create(newProject, currentUser!.id);
    // onSnapshot will update `projects` state automatically
    setShowCreateProject(false);
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf' && activeProjectId) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const dataUrl = reader.result as string;
          const planId = Math.random().toString(36).substr(2, 9);

          const blob = await fetch(dataUrl).then(r => r.blob());
          const storageRef = ref(storage, `plans/${activeProjectId}/${planId}.pdf`);
          await uploadBytes(storageRef, blob);
          const pdfUrl = await getDownloadURL(storageRef);

          await plansService.create({
            id: planId,
            projectId: activeProjectId,
            name: file.name.replace('.pdf', ''),
            shortName: file.name.substring(0, 3).toUpperCase(),
            pdfUrl,
            createdBy: currentUser!.id,
          });
          showToast(`"${file.name}" uploaded successfully.`, 'success');
        } catch (err) {
          console.error('PDF upload failed:', err);
          showToast('Upload failed. Please try again.', 'error');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddDecision = (x: number, y: number) => {
    if (!activePlanId || !activeProjectId) return;
    setActiveDecision({
      projectId: activeProjectId,
      planId: activePlanId,
      creatorId: currentUser!.id,
      creatorName: currentUser!.name || currentUser!.email || 'Unknown',
      x,
      y,
      media: [],
      comments: [],
      history: []
    });
  };

  const handleSaveDecision = async (data: Partial<Decision>) => {
    try {
      if (activeDecision?.id) {
        const existing = decisions.find(d => d.id === activeDecision.id);
        await decisionsService.update(activeDecision.id, {
          ...data,
          history: [
            ...(existing?.history || []),
            {
              id: Math.random().toString(),
              userId: currentUser!.id,
              userName: currentUser!.name,
              timestamp: Date.now(),
              changes: [{ field: 'text', oldValue: existing?.text, newValue: data.text }]
            }
          ]
        });
      } else {
        const projectShort = activeProject?.shortName || 'PRJ';
        const planShort = activePlan?.shortName || 'PLN';
        const count = decisions.length + 1;
        const humanId = `GS-${projectShort}-${planShort}-${count.toString().padStart(5, '0')}`;

        const newDecision: Decision = {
          ...activeDecision as any,
          ...data,
          id: Math.random().toString(36).substr(2, 9),
          humanId,
          status: 'Open',
          createdAt: Date.now()
        };

        await decisionsService.create(newDecision);
        // onSnapshot will update decisions state automatically
      }
    } catch (err) {
      console.error('Failed to save decision:', err);
      showToast(t('decisions:errors.saveFailed'), 'error');
      return; // don't clear activeDecision — let user retry
    }
    setActiveDecision(null);
  };

  const handleDecisionListSelect = (decision: Decision) => {
    setActiveDecision(decision);
    setSelectedPreviewId(decision.id);
    setShowDecisionList(false);
  };

  const handleSignInSuccess = (_user: User) => {
    // Navigation is handled by the onAuthStateChanged listener
  };

  const handleLogout = () => {
    if (confirm(t('common:buttons.signOut') + '?')) {
      db.logout();
      // Navigation is handled by the onAuthStateChanged listener
    }
  };

  // Show spinner while Firebase resolves the session
  if (currentUser === undefined) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen font-sans">
      {view === 'auth-landing' && (
        <AuthLandingScreen
          onSignIn={() => { setSignInMode('sign-in'); setView('sign-in'); }}
          onRegister={() => { setSignInMode('register'); setView('sign-in'); }}
        />
      )}
      {view === 'sign-in' && (
        <SignInScreen
          initialMode={signInMode}
          onSuccess={handleSignInSuccess}
          onBack={() => setView('auth-landing')}
        />
      )}
      {view === 'projects' && (
        <ProjectsView
          projects={projects}
          showCreateProject={showCreateProject}
          onCreateProject={handleCreateProject}
          onSelectProject={(id) => { setActiveProjectId(id); setView('project-detail'); }}
          onShowCreateProject={setShowCreateProject}
          onLogout={handleLogout}
        />
      )}
      {view === 'project-detail' && activeProject && (
        <ProjectDetailView
          activeProject={activeProject}
          projectPlans={projectPlans}
          isUploading={isUploading}
          onBack={() => setView('projects')}
          onSelectPlan={(id) => { setActivePlanId(id); setView('plan-view'); setSelectedPreviewId(null); }}
          onPdfUpload={handlePdfUpload}
          onLogout={handleLogout}
        />
      )}
      {view === 'plan-view' && activePlan && activeProject && (
        <PlanView
          activePlan={activePlan}
          activeProject={activeProject}
          projectPlans={projectPlans}
          planDecisions={planDecisions}
          decisions={decisions}
          activeDecision={activeDecision}
          selectedPreviewId={selectedPreviewId}
          currentUser={currentUser!}
          isPinPlacementMode={isPinPlacementMode}
          showDecisionList={showDecisionList}
          zoomInTrigger={zoomInTrigger}
          zoomOutTrigger={zoomOutTrigger}
          recenterTrigger={recenterTrigger}
          onBack={() => setView('project-detail')}
          onChangePlan={(id) => { setActivePlanId(id); setSelectedPreviewId(null); }}
          onAddDecision={handleAddDecision}
          onSelectDecision={handleSelectDecisionFromCanvas}
          onSetPinPlacementMode={setIsPinPlacementMode}
          onShowDecisionList={setShowDecisionList}
          onZoomIn={() => setZoomInTrigger(prev => prev + 1)}
          onZoomOut={() => setZoomOutTrigger(prev => prev + 1)}
          onRecenter={() => setRecenterTrigger(prev => prev + 1)}
          onSaveDecision={handleSaveDecision}
          onCancelDecision={() => { setActiveDecision(null); setSelectedPreviewId(null); }}
          onDeleteDecision={(id) => decisionsService.update(id, { deletedAt: Date.now() })}
          onAcknowledgeDecision={(id) => decisionsService.update(id, { status: 'Acknowledged', acknowledgedBy: currentUser!.id, acknowledgedAt: Date.now() })}
          onDecisionListSelect={handleDecisionListSelect}
          onLogout={handleLogout}
        />
      )}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl shadow-lg text-white text-sm font-medium transition-all z-50 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.message}
        </div>
      )}
    </div>
  );
};

export default App;
