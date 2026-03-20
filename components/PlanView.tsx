import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Project, Plan, Decision } from '../types';
import { PlanCanvas } from './PlanCanvas';
import { DecisionModal } from './DecisionModal';
import { DecisionListPanel } from './DecisionListPanel';
import LanguageSwitcher from './LanguageSwitcher';

interface PlanViewProps {
  activePlan: Plan;
  activeProject: Project;
  projectPlans: Plan[];
  planDecisions: Decision[];
  decisions: Decision[];
  activeDecision: Partial<Decision> | null;
  selectedPreviewId: string | null;
  currentUser: User;
  isPinPlacementMode: boolean;
  showDecisionList: boolean;
  zoomInTrigger: number;
  zoomOutTrigger: number;
  recenterTrigger: number;
  onBack: () => void;
  onChangePlan: (id: string) => void;
  onAddDecision: (x: number, y: number) => void;
  onSelectDecision: (id: string | null) => void;
  onSetPinPlacementMode: (active: boolean) => void;
  onShowDecisionList: (show: boolean) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  onSaveDecision: (data: Partial<Decision>) => void;
  onCancelDecision: () => void;
  onDeleteDecision: (id: string) => void;
  onAcknowledgeDecision: (id: string) => void;
  onDecisionListSelect: (decision: Decision) => void;
  onLogout: () => void;
}

export const PlanView: React.FC<PlanViewProps> = ({
  activePlan,
  activeProject,
  projectPlans,
  planDecisions,
  decisions,
  activeDecision,
  selectedPreviewId,
  currentUser,
  isPinPlacementMode,
  showDecisionList,
  zoomInTrigger,
  zoomOutTrigger,
  recenterTrigger,
  onBack,
  onChangePlan,
  onAddDecision,
  onSelectDecision,
  onSetPinPlacementMode,
  onShowDecisionList,
  onZoomIn,
  onZoomOut,
  onRecenter,
  onSaveDecision,
  onCancelDecision,
  onDeleteDecision,
  onAcknowledgeDecision,
  onDecisionListSelect,
  onLogout,
}) => {
  const { t } = useTranslation(['common', 'decisions']);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden">
      <header className="bg-white/80 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-slate-900 leading-none">{activePlan.name}</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-bold">{activeProject.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <div className="relative group">
            <select
              className="text-sm border-2 border-slate-100 bg-white font-bold rounded-xl focus:ring-2 focus:ring-blue-500 py-2 pl-3 pr-8 appearance-none cursor-pointer"
              value={activePlan.id}
              onChange={(e) => onChangePlan(e.target.value)}
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
          <PlanCanvas
            pdfUrl={activePlan.pdfUrl}
            decisions={planDecisions}
            selectedDecisionId={selectedPreviewId}
            onAddDecision={onAddDecision}
            onSelectDecision={onSelectDecision}
            isPinPlacementMode={isPinPlacementMode}
            onSetPinPlacementMode={onSetPinPlacementMode}
            zoomInTrigger={zoomInTrigger}
            zoomOutTrigger={zoomOutTrigger}
            recenterTrigger={recenterTrigger}
          />
        </div>

        {/* Right Sidebar with Controls */}
        <div className="w-24 shrink-0 bg-slate-800 border-l border-slate-700 flex flex-col items-center py-6 gap-4">
          {/* Pin Placement FAB */}
          <button
            onClick={() => onSetPinPlacementMode(!isPinPlacementMode)}
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
            onClick={() => onShowDecisionList(true)}
            className="w-14 h-14 bg-slate-700 hover:bg-slate-600 shadow-lg rounded-xl flex items-center justify-center text-white active:scale-90 transition-all"
            title={t('decisions:list.title')}
          >
            <i className="fa-solid fa-list-ul text-xl"></i>
          </button>

          {/* Divider */}
          <div className="w-12 h-px bg-slate-600"></div>

          <button
            onClick={onZoomIn}
            className="w-14 h-14 bg-slate-700 hover:bg-slate-600 shadow-lg rounded-xl flex items-center justify-center text-white active:scale-90 transition-all"
            title={t('decisions:canvas.zoomIn')}
          >
            <i className="fa-solid fa-plus text-xl"></i>
          </button>

          <button
            onClick={onZoomOut}
            className="w-14 h-14 bg-slate-700 hover:bg-slate-600 shadow-lg rounded-xl flex items-center justify-center text-white active:scale-90 transition-all"
            title={t('decisions:canvas.zoomOut')}
          >
            <i className="fa-solid fa-minus text-xl"></i>
          </button>

          <button
            onClick={onRecenter}
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
              onClick={() => onSetPinPlacementMode(false)}
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
                {activeProject.userRole?.toUpperCase()}: {currentUser.name}
              </span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="pointer-events-auto bg-white/95 backdrop-blur-sm border shadow-xl rounded-full px-4 py-2 text-xs font-black text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
          >
            <i className="fa-solid fa-right-from-bracket mr-1"></i>
            {t('common:buttons.signOut').toUpperCase()}
          </button>
        </div>
      </main>

      {showDecisionList && (
        <DecisionListPanel
          decisions={decisions}
          selectedPreviewId={selectedPreviewId}
          onSelect={onDecisionListSelect}
          onClose={() => onShowDecisionList(false)}
        />
      )}

      {activeDecision && (
        <DecisionModal
          decision={activeDecision}
          project={activeProject}
          user={currentUser}
          onSave={onSaveDecision}
          onCancel={onCancelDecision}
          onDelete={onDeleteDecision}
          onAcknowledge={onAcknowledgeDecision}
        />
      )}
    </div>
  );
};
