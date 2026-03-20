import React from 'react';
import { useTranslation } from 'react-i18next';
import { Project, Plan } from '../types';
import LanguageSwitcher from './LanguageSwitcher';

interface ProjectDetailViewProps {
  activeProject: Project;
  projectPlans: Plan[];
  isUploading: boolean;
  onBack: () => void;
  onSelectPlan: (id: string) => void;
  onPdfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogout: () => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  activeProject,
  projectPlans,
  isUploading,
  onBack,
  onSelectPlan,
  onPdfUpload,
  onLogout,
}) => {
  const { t } = useTranslation(['common', 'projects']);

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6 gap-2">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors shrink-0">
            <i className="fa-solid fa-arrow-left"></i>
            {t('common:buttons.back')}
          </button>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <LanguageSwitcher />
            <button
              onClick={onLogout}
              className="bg-white border text-slate-600 font-bold py-2 px-3 rounded-2xl shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">{activeProject.shortName}</span>
                <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-1 rounded-lg uppercase">{activeProject.phaseHOAI}</span>
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">{activeProject.name}</h1>
              <p className="text-slate-500 mt-2 font-medium">{activeProject.client} • {t(`common:userRoles.${activeProject.userRole}`)}</p>
            </div>
            <label className={`
              cursor-pointer flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-3xl transition-all w-full md:w-64
              ${isUploading ? 'bg-slate-100 border-slate-300 pointer-events-none' : 'bg-blue-50 border-blue-200 hover:border-blue-500 hover:bg-white'}
            `}>
              <input type="file" className="hidden" accept="application/pdf" onChange={onPdfUpload} />
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
            {projectPlans.map(p => (
              <div
                key={p.id}
                onClick={() => onSelectPlan(p.id)}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
