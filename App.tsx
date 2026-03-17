
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Project, Plan, Decision, UserRole, PhaseHOAI } from './types';
import { db, projectsService, decisionsService, plansService } from './services/storage';
import { storage } from './services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { PlanCanvas } from './components/PlanCanvas';
import { DecisionModal } from './components/DecisionModal';
import { AuthLandingScreen } from './components/AuthLandingScreen';
import { SignInScreen } from './components/SignInScreen';
import LanguageSwitcher from './components/LanguageSwitcher';
import { formatDate, formatDateTime } from './locales/i18n';
import { translateCategory, getDefaultCategories } from './locales/categoryMapping';

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
      creatorName: currentUser!.name,
      x,
      y,
      media: [],
      comments: [],
      history: []
    });
  };

  const handleSaveDecision = async (data: Partial<Decision>) => {
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

  // --- Rendering Helpers ---
  const renderAuthLanding = () => (
    <AuthLandingScreen
      onSignIn={() => { setSignInMode('sign-in'); setView('sign-in'); }}
      onRegister={() => { setSignInMode('register'); setView('sign-in'); }}
    />
  );

  const renderSignIn = () => (
    <SignInScreen
      initialMode={signInMode}
      onSuccess={handleSignInSuccess}
      onBack={() => setView('auth-landing')}
    />
  );

  const renderProjectsView = () => (
    <div className="flex flex-col h-full bg-slate-50 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('projects:list.title')}</h1>
            <p className="text-slate-500 mt-1">{t('projects:list.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <div className="bg-white border shadow-sm rounded-2xl px-4 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs font-bold text-slate-600">{currentUser?.name}</span>
            </div>
            <button
              onClick={() => setShowCreateProject(true)}
              className="bg-blue-600 text-white font-bold py-3 px-6 rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-plus"></i>
              {t('projects:list.createButton')}
            </button>
            <button
              onClick={handleLogout}
              className="bg-white border text-slate-600 font-bold py-3 px-4 rounded-2xl shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
            <i className="fa-solid fa-folder-open text-5xl text-slate-200 mb-4"></i>
            <p className="text-slate-600 font-bold text-lg">{t('projects:list.emptyState')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map(p => (
              <div 
                key={p.id} 
                onClick={() => { setActiveProjectId(p.id); setView('project-detail'); }}
                className="bg-white border p-6 rounded-3xl shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-50 text-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {p.shortName}
                  </div>
                  <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-1 rounded-lg uppercase">
                    {p.phaseHOAI}
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 mb-1">{p.name}</h2>
                <p className="text-sm text-slate-500 mb-4">{p.client}</p>
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                    <i className="fa-solid fa-calendar-day"></i>
                    {formatDate(p.startDate, i18n.language)}
                  </span>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{t(`common:userRoles.${p.userRole}`)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleCreateProject} className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-900">{t('projects:create.title')}</h2>
              <button type="button" onClick={() => setShowCreateProject(false)} className="text-slate-400 hover:text-slate-600"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">{t('projects:create.nameLabel')}</label>
                <input name="name" required className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500" placeholder={t('projects:create.namePlaceholder')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">{t('projects:create.startDateLabel')}</label>
                  <input name="startDate" type="date" className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">{t('projects:create.phaseLabel')}</label>
                  <select name="phaseHOAI" required className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500">
                    {['LP1','LP2','LP3','LP4','LP5','LP6','LP7','LP8','LP9'].map(ph => <option key={ph} value={ph}>{t(`projects:hoaiPhases.${ph}`)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">{t('projects:create.clientLabel')}</label>
                <input name="client" required className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500" placeholder={t('projects:create.clientPlaceholder')} />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">{t('projects:create.roleLabel')}</label>
                <select name="userRole" required className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500">
                  {Object.values(UserRole).map(role => <option key={role} value={role}>{t(`common:userRoles.${role}`)}</option>)}
                </select>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-2">
              <button type="button" onClick={() => setShowCreateProject(false)} className="flex-1 bg-white border py-3 rounded-xl font-bold text-slate-600">{t('common:buttons.cancel')}</button>
              <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg">{t('projects:create.submitButton')}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  const renderProjectDetail = () => (
    <div className="flex flex-col h-full bg-slate-50 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setView('projects')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors">
            <i className="fa-solid fa-arrow-left"></i>
            {t('common:buttons.back')}
          </button>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <div className="bg-white border shadow-sm rounded-2xl px-4 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs font-bold text-slate-600">{currentUser?.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white border text-slate-600 font-bold py-2 px-4 rounded-2xl shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">{activeProject?.shortName}</span>
                <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-1 rounded-lg uppercase">{activeProject?.phaseHOAI}</span>
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">{activeProject?.name}</h1>
              <p className="text-slate-500 mt-2 font-medium">{activeProject?.client} • {t(`common:userRoles.${activeProject?.userRole}`)}</p>
            </div>
            <label className={`
              cursor-pointer flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-3xl transition-all w-full md:w-64
              ${isUploading ? 'bg-slate-100 border-slate-300 pointer-events-none' : 'bg-blue-50 border-blue-200 hover:border-blue-500 hover:bg-white'}
            `}>
              <input type="file" className="hidden" accept="application/pdf" onChange={handlePdfUpload} />
              <i className={`fa-solid ${isUploading ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'} text-2xl text-blue-600`}></i>
              <span className="text-sm font-black text-blue-700">{isUploading ? t('common:common.loading') : t('projects:detail.uploadPlan')}</span>
            </label>
          </div>
        </div>

        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{t('projects:detail.plans')} ({projectPlans.length})</h3>

        {projectPlans.length === 0 ? (
          <div className="bg-white border-2 border-dashed rounded-3xl p-12 text-center text-slate-400">
            <i className="fa-solid fa-map text-4xl mb-4 opacity-20"></i>
            <p className="font-bold">{t('projects:detail.emptyState')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projectPlans.map(p => {
              return (
                <div 
                  key={p.id} 
                  onClick={() => { setActivePlanId(p.id); setView('plan-view'); setSelectedPreviewId(null); }}
                  className="bg-white border-2 border-transparent p-6 rounded-3xl shadow-sm hover:border-blue-500 hover:shadow-lg cursor-pointer transition-all group relative overflow-hidden"
                >
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <i className="fa-solid fa-file-pdf"></i>
                      </div>
                      <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg uppercase">{p.shortName}</span>
                    </div>
                    <h4 className="text-lg font-black text-slate-900 mb-1">{p.name}</h4>
                    <div className="flex items-center gap-4 mt-4 text-xs font-bold text-slate-400">
                      <span className="flex items-center gap-1"><i className="fa-solid fa-location-dot"></i> {t('common:navigation.decisions')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderPlanView = () => (
    <div className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden">
      <header className="bg-white/80 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('project-detail')} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-slate-900 leading-none">{activePlan?.name}</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-bold">{activeProject?.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <div className="relative group">
            <select
              className="text-sm border-2 border-slate-100 bg-white font-bold rounded-xl focus:ring-2 focus:ring-blue-500 py-2 pl-3 pr-8 appearance-none cursor-pointer"
              value={activePlanId || ''}
              onChange={(e) => { setActivePlanId(e.target.value); setSelectedPreviewId(null); }}
            >
              {projectPlans.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
          </div>
        </div>
      </header>

      <main className="flex-1 flex bg-slate-900 min-w-0">
        {/* PDF Canvas Area */}
        <div className="flex-1 relative min-w-0">
          {activePlan && (
            <PlanCanvas
              pdfUrl={activePlan.pdfUrl}
              decisions={planDecisions}
              selectedDecisionId={selectedPreviewId}
              onAddDecision={handleAddDecision}
              onSelectDecision={handleSelectDecisionFromCanvas}
              isPinPlacementMode={isPinPlacementMode}
              onSetPinPlacementMode={setIsPinPlacementMode}
              zoomInTrigger={zoomInTrigger}
              zoomOutTrigger={zoomOutTrigger}
              recenterTrigger={recenterTrigger}
            />
          )}
        </div>

        {/* Right Sidebar with Controls */}
        <div className="w-24 shrink-0 bg-slate-800 border-l border-slate-700 flex flex-col items-center py-6 gap-4">
          {/* Pin Placement FAB */}
          <button
            onClick={() => setIsPinPlacementMode(!isPinPlacementMode)}
            className={`w-16 h-16 shadow-xl rounded-2xl flex items-center justify-center transition-all active:scale-90 ${
              isPinPlacementMode
                ? 'bg-orange-500 ring-4 ring-orange-400/50 animate-pulse'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white relative`}
            title={t('decisions:canvas.clickToPlace') + ' (P)'}
          >
            <i className="fa-solid fa-location-dot text-2xl"></i>
            <span className="absolute -top-1 -right-1 bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow">
              P
            </span>
          </button>

          {/* Decision Log */}
          <button
            onClick={() => setShowDecisionList(true)}
            className="w-14 h-14 bg-slate-700 hover:bg-slate-600 shadow-lg rounded-xl flex items-center justify-center text-white active:scale-90 transition-all"
            title={t('decisions:list.title')}
          >
            <i className="fa-solid fa-list-ul text-xl"></i>
          </button>

          {/* Divider */}
          <div className="w-12 h-px bg-slate-600"></div>

          <button
            onClick={() => setZoomInTrigger(prev => prev + 1)}
            className="w-14 h-14 bg-slate-700 hover:bg-slate-600 shadow-lg rounded-xl flex items-center justify-center text-white active:scale-90 transition-all"
            title={t('decisions:canvas.zoomIn')}
          >
            <i className="fa-solid fa-plus text-xl"></i>
          </button>

          <button
            onClick={() => setZoomOutTrigger(prev => prev + 1)}
            className="w-14 h-14 bg-slate-700 hover:bg-slate-600 shadow-lg rounded-xl flex items-center justify-center text-white active:scale-90 transition-all"
            title={t('decisions:canvas.zoomOut')}
          >
            <i className="fa-solid fa-minus text-xl"></i>
          </button>

          <button
            onClick={() => setRecenterTrigger(prev => prev + 1)}
            className="w-14 h-14 bg-slate-700 hover:bg-slate-600 shadow-lg rounded-xl flex items-center justify-center text-white active:scale-90 transition-all"
            title={t('decisions:canvas.resetView')}
          >
            <i className="fa-solid fa-compress text-xl"></i>
          </button>
        </div>

        {/* Pin Placement Mode Banner */}
        {isPinPlacementMode && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-6 py-3 rounded-full shadow-2xl z-50 font-bold text-sm flex items-center gap-2">
            <i className="fa-solid fa-location-dot"></i>
            <span>{t('decisions:canvas.clickToPlace')}</span>
            <button
              onClick={() => setIsPinPlacementMode(false)}
              className="ml-2 w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <i className="fa-solid fa-xmark text-xs"></i>
            </button>
          </div>
        )}
        
        <div className="absolute top-4 left-4 z-30 flex flex-col gap-2">
           <div className="pointer-events-none">
             <div className="bg-white/95 backdrop-blur-sm border shadow-xl rounded-full px-4 py-2 flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-black text-slate-800 tracking-tight">
                  {activeProject?.userRole?.toUpperCase()}: {currentUser?.name}
                </span>
             </div>
           </div>
           <button
             onClick={handleLogout}
             className="pointer-events-auto bg-white/95 backdrop-blur-sm border shadow-xl rounded-full px-4 py-2 text-xs font-black text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
           >
             <i className="fa-solid fa-right-from-bracket mr-1"></i>
             {t('common:buttons.signOut').toUpperCase()}
           </button>
        </div>
      </main>

      {showDecisionList && (
        <div className="fixed inset-0 z-50 flex justify-end">
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDecisionList(false)}></div>
           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-tight">{t('decisions:list.title')}</h2>
                <button onClick={() => setShowDecisionList(false)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {decisions.filter(d => !d.deletedAt).sort((a,b) => b.createdAt - a.createdAt).map(d => (
                  <div 
                    key={d.id} 
                    className={`p-4 rounded-2xl cursor-pointer border transition-all mb-1 ${
                      selectedPreviewId === d.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50 border-transparent hover:border-slate-100'
                    }`}
                    onClick={() => handleDecisionListSelect(d)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded uppercase">{d.humanId}</span>
                      <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black uppercase ${
                        d.status === 'Acknowledged' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {t(`decisions:status.${d.status}`)}
                      </span>
                    </div>
                    <h3 className="font-black text-slate-900 text-lg leading-tight mb-1">{translateCategory(d.category, i18n.language as 'en' | 'de')}</h3>
                    <p className="text-sm text-slate-600 line-clamp-2">{d.text}</p>
                    <div className="mt-4 flex items-center justify-between border-t pt-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {d.creatorName}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {d.createdAt ? formatDateTime(d.createdAt, i18n.language) : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      )}

      {activeDecision && activeProject && (
        <DecisionModal 
          decision={activeDecision}
          project={activeProject}
          user={currentUser!}
          onSave={handleSaveDecision}
          onCancel={() => { setActiveDecision(null); setSelectedPreviewId(null); }}
          onDelete={(id) => decisionsService.update(id, { deletedAt: Date.now() })}
          onAcknowledge={(id) => decisionsService.update(id, { status: 'Acknowledged', acknowledgedBy: currentUser!.id, acknowledgedAt: Date.now() })}
        />
      )}
    </div>
  );

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
      {view === 'auth-landing' && renderAuthLanding()}
      {view === 'sign-in' && renderSignIn()}
      {view === 'projects' && renderProjectsView()}
      {view === 'project-detail' && renderProjectDetail()}
      {view === 'plan-view' && renderPlanView()}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl shadow-lg text-white text-sm font-medium transition-all z-50 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.message}
        </div>
      )}
    </div>
  );
};

export default App;
