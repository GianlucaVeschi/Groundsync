
import React, { useState, useEffect, useMemo } from 'react';
import { User, Project, Plan, Decision, UserRole, PhaseHOAI } from './types';
import { db } from './services/storage';
import { PlanCanvas } from './components/PlanCanvas';
import { DecisionModal } from './components/DecisionModal';
import { AuthLandingScreen } from './components/AuthLandingScreen';
import { SignInScreen } from './components/SignInScreen';

type ViewState = 'auth-landing' | 'sign-in' | 'projects' | 'project-detail' | 'plan-view';

const App: React.FC = () => {
  const [state, setState] = useState(db.get());
  const [view, setView] = useState<ViewState>(db.get().isAuthenticated ? 'projects' : 'auth-landing');
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

  useEffect(() => {
    db.save(state);
  }, [state]);

  useEffect(() => {
    if (!state.isAuthenticated) {
      setView('auth-landing');
    }
  }, [state.isAuthenticated]);

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
    state.projects.find(p => p.id === activeProjectId),
    [state.projects, activeProjectId]
  );

  const projectPlans = useMemo(() => 
    state.plans.filter(p => p.projectId === activeProjectId),
    [state.plans, activeProjectId]
  );

  const activePlan = useMemo(() => 
    state.plans.find(p => p.id === activePlanId),
    [state.plans, activePlanId]
  );

  const planDecisions = useMemo(() => 
    activePlanId ? state.decisions.filter(d => d.planId === activePlanId) : [],
    [state.decisions, activePlanId]
  );

  // --- Handlers ---
  const handleCreateProject = (e: React.FormEvent<HTMLFormElement>) => {
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
      categories: ['Landscape', 'Construction', 'Irrigation', 'Lighting', 'Site Safety']
    };
    setState(prev => ({ ...prev, projects: [...prev.projects, newProject] }));
    setShowCreateProject(false);
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf' && activeProjectId) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const newPlan: Plan = {
          id: Math.random().toString(36).substr(2, 9),
          projectId: activeProjectId,
          name: file.name.replace('.pdf', ''),
          shortName: file.name.substring(0, 3).toUpperCase(),
          pdfData: base64
        };
        setState(prev => ({ ...prev, plans: [...prev.plans, newPlan] }));
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddDecision = (x: number, y: number) => {
    if (!activePlanId || !activeProjectId) return;
    setActiveDecision({
      projectId: activeProjectId,
      planId: activePlanId,
      creatorId: state.currentUser.id,
      creatorName: state.currentUser.name,
      x,
      y,
      media: [],
      comments: [],
      history: []
    });
  };

  const handleSaveDecision = (data: Partial<Decision>) => {
    if (activeDecision?.id) {
      setState(prev => ({
        ...prev,
        decisions: prev.decisions.map(d => 
          d.id === activeDecision.id 
          ? { ...d, ...data, history: [...d.history, { 
              id: Math.random().toString(), 
              userId: state.currentUser.id, 
              userName: state.currentUser.name, 
              timestamp: Date.now(), 
              changes: [{ field: 'text', oldValue: d.text, newValue: data.text }] 
            }]} 
          : d
        )
      }));
    } else {
      const projectShort = activeProject?.shortName || 'PRJ';
      const planShort = activePlan?.shortName || 'PLN';
      const count = state.decisions.length + 1;
      const humanId = `GS-${projectShort}-${planShort}-${count.toString().padStart(5, '0')}`;
      
      const newDecision: Decision = {
        ...activeDecision as any,
        ...data,
        id: Math.random().toString(),
        humanId,
        status: 'Open',
        createdAt: Date.now()
      };
      
      setState(prev => ({
        ...prev,
        decisions: [...prev.decisions, newDecision]
      }));
    }
    setActiveDecision(null);
  };

  const handleDecisionListSelect = (decision: Decision) => {
    setActiveDecision(decision);
    setShowDecisionList(false);
  };

  const handleSignInSuccess = (user: User) => {
    setState(prev => ({
      ...prev,
      currentUser: user,
      isAuthenticated: true
    }));
    setView('projects');
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      const updatedState = db.logout();
      setState(updatedState);
      setView('auth-landing');
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
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Projects</h1>
            <p className="text-slate-500 mt-1">Select a project to view plans and decisions.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white border shadow-sm rounded-2xl px-4 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs font-bold text-slate-600">{state.currentUser.name}</span>
            </div>
            <button
              onClick={() => setShowCreateProject(true)}
              className="bg-blue-600 text-white font-bold py-3 px-6 rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-plus"></i>
              New Project
            </button>
            <button
              onClick={handleLogout}
              className="bg-white border text-slate-600 font-bold py-3 px-4 rounded-2xl shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
        </div>

        {state.projects.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
            <i className="fa-solid fa-folder-open text-5xl text-slate-200 mb-4"></i>
            <p className="text-slate-600 font-bold text-lg">No projects yet</p>
            <p className="text-slate-400 text-sm">Create your first project to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.projects.map(p => (
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
                <p className="text-sm text-slate-500 mb-4">Client: {p.client}</p>
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                    <i className="fa-solid fa-calendar-day"></i>
                    {new Date(p.startDate).toLocaleDateString()}
                  </span>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{p.userRole}</span>
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
              <h2 className="text-xl font-black text-slate-900">Create New Project</h2>
              <button type="button" onClick={() => setShowCreateProject(false)} className="text-slate-400 hover:text-slate-600"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Project Name</label>
                <input name="name" required className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500" placeholder="e.g. Riverside Park" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Start Date</label>
                  <input name="startDate" type="date" className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">HOAI Phase</label>
                  <select name="phaseHOAI" required className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500">
                    {['LP1','LP2','LP3','LP4','LP5','LP6','LP7','LP8','LP9'].map(ph => <option key={ph} value={ph}>{ph}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Client</label>
                <input name="client" required className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500" placeholder="e.g. City Council" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Your Role</label>
                <select name="userRole" required className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500">
                  {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-2">
              <button type="button" onClick={() => setShowCreateProject(false)} className="flex-1 bg-white border py-3 rounded-xl font-bold text-slate-600">Cancel</button>
              <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg">Create Project</button>
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
            Back to Projects
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-white border shadow-sm rounded-2xl px-4 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs font-bold text-slate-600">{state.currentUser.name}</span>
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
              <p className="text-slate-500 mt-2 font-medium">Client: {activeProject?.client} • Role: {activeProject?.userRole}</p>
            </div>
            <label className={`
              cursor-pointer flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-3xl transition-all w-full md:w-64
              ${isUploading ? 'bg-slate-100 border-slate-300 pointer-events-none' : 'bg-blue-50 border-blue-200 hover:border-blue-500 hover:bg-white'}
            `}>
              <input type="file" className="hidden" accept="application/pdf" onChange={handlePdfUpload} />
              <i className={`fa-solid ${isUploading ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'} text-2xl text-blue-600`}></i>
              <span className="text-sm font-black text-blue-700">{isUploading ? 'Uploading...' : 'Add PDF Plan'}</span>
            </label>
          </div>
        </div>

        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Project Plans ({projectPlans.length})</h3>
        
        {projectPlans.length === 0 ? (
          <div className="bg-white border-2 border-dashed rounded-3xl p-12 text-center text-slate-400">
            <i className="fa-solid fa-map text-4xl mb-4 opacity-20"></i>
            <p className="font-bold">No plans uploaded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projectPlans.map(p => {
              const count = state.decisions.filter(d => d.planId === p.id && !d.deletedAt).length;
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
                      <span className="flex items-center gap-1"><i className="fa-solid fa-location-dot"></i> {count} Decisions</span>
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
              pdfData={activePlan.pdfData}
              decisions={planDecisions}
              selectedDecisionId={selectedPreviewId}
              onAddDecision={handleAddDecision}
              onSelectDecision={setSelectedPreviewId}
              onOpenFullDecision={setActiveDecision}
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
          {/* Decision Log */}
          <button
            onClick={() => setShowDecisionList(true)}
            className="w-14 h-14 bg-slate-700 hover:bg-slate-600 shadow-lg rounded-xl flex items-center justify-center text-white active:scale-90 transition-all"
            title="Decision Log"
          >
            <i className="fa-solid fa-list-ul text-xl"></i>
          </button>

          {/* Pin Placement FAB */}
          <button
            onClick={() => setIsPinPlacementMode(!isPinPlacementMode)}
            className={`w-16 h-16 shadow-xl rounded-2xl flex items-center justify-center transition-all active:scale-90 ${
              isPinPlacementMode
                ? 'bg-orange-500 ring-4 ring-orange-400/50 animate-pulse'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white relative`}
            title="Place Decision Pin (P)"
          >
            <i className="fa-solid fa-location-dot text-2xl"></i>
            <span className="absolute -top-1 -right-1 bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow">
              P
            </span>
          </button>

          {/* Divider */}
          <div className="w-12 h-px bg-slate-600"></div>

          {/* Zoom Controls */}
          <button
            onClick={() => setZoomInTrigger(prev => prev + 1)}
            className="w-14 h-14 bg-slate-700 hover:bg-slate-600 shadow-lg rounded-xl flex items-center justify-center text-white active:scale-90 transition-all"
            title="Zoom In"
          >
            <i className="fa-solid fa-plus text-xl"></i>
          </button>

          <button
            onClick={() => setZoomOutTrigger(prev => prev + 1)}
            className="w-14 h-14 bg-slate-700 hover:bg-slate-600 shadow-lg rounded-xl flex items-center justify-center text-white active:scale-90 transition-all"
            title="Zoom Out"
          >
            <i className="fa-solid fa-minus text-xl"></i>
          </button>

          <button
            onClick={() => setRecenterTrigger(prev => prev + 1)}
            className="w-14 h-14 bg-slate-700 hover:bg-slate-600 shadow-lg rounded-xl flex items-center justify-center text-white active:scale-90 transition-all"
            title="Recenter View"
          >
            <i className="fa-solid fa-compress text-xl"></i>
          </button>
        </div>

        {/* Pin Placement Mode Banner */}
        {isPinPlacementMode && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-6 py-3 rounded-full shadow-2xl z-50 font-bold text-sm flex items-center gap-2">
            <i className="fa-solid fa-location-dot"></i>
            <span>Click on plan to place decision pin</span>
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
                  {activeProject?.userRole.toUpperCase()}: {state.currentUser.name}
                </span>
             </div>
           </div>
           <button
             onClick={handleLogout}
             className="pointer-events-auto bg-white/95 backdrop-blur-sm border shadow-xl rounded-full px-4 py-2 text-xs font-black text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
           >
             <i className="fa-solid fa-right-from-bracket mr-1"></i>
             LOGOUT
           </button>
        </div>
      </main>

      {showDecisionList && (
        <div className="fixed inset-0 z-50 flex justify-end">
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDecisionList(false)}></div>
           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-tight">Decision Log</h2>
                <button onClick={() => setShowDecisionList(false)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {planDecisions.filter(d => !d.deletedAt).sort((a,b) => b.createdAt - a.createdAt).map(d => (
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
                        {d.status}
                      </span>
                    </div>
                    <h3 className="font-black text-slate-900 text-lg leading-tight mb-1">{d.category}</h3>
                    <p className="text-sm text-slate-600 line-clamp-2">{d.text}</p>
                    <div className="mt-4 flex items-center justify-between border-t pt-3">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">By {d.creatorName}</span>
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
          user={state.currentUser}
          onSave={handleSaveDecision}
          onCancel={() => { setActiveDecision(null); setSelectedPreviewId(null); }}
          onDelete={(id) => setState(prev => ({...prev, decisions: prev.decisions.map(d => d.id === id ? {...d, deletedAt: Date.now()} : d)}))}
          onAcknowledge={(id) => setState(prev => ({...prev, decisions: prev.decisions.map(d => d.id === id ? {...d, status: 'Acknowledged'} : d)}))}
        />
      )}
    </div>
  );

  return (
    <div className="h-screen w-screen font-sans">
      {view === 'auth-landing' && renderAuthLanding()}
      {view === 'sign-in' && renderSignIn()}
      {view === 'projects' && renderProjectsView()}
      {view === 'project-detail' && renderProjectDetail()}
      {view === 'plan-view' && renderPlanView()}
    </div>
  );
};

export default App;
