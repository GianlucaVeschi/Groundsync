import React from 'react';
import { useTranslation } from 'react-i18next';
import { Project, UserRole } from '../types';
import LanguageSwitcher from './LanguageSwitcher';
import { formatDate } from '../locales/i18n';

interface ProjectsViewProps {
  projects: Project[];
  showCreateProject: boolean;
  onCreateProject: (e: React.FormEvent<HTMLFormElement>) => void;
  onSelectProject: (id: string) => void;
  onShowCreateProject: (show: boolean) => void;
  onLogout: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  showCreateProject,
  onCreateProject,
  onSelectProject,
  onShowCreateProject,
  onLogout,
}) => {
  const { t, i18n } = useTranslation(['common', 'projects']);

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('projects:list.title')}</h1>
            <p className="text-slate-500 mt-1">{t('projects:list.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <LanguageSwitcher />
            <button
              onClick={() => onShowCreateProject(true)}
              className="bg-blue-600 text-white font-bold py-2.5 px-4 rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 text-sm"
            >
              <i className="fa-solid fa-plus"></i>
              {t('projects:list.createButton')}
            </button>
            <button
              onClick={onLogout}
              className="bg-white border text-slate-600 font-bold py-2.5 px-3 rounded-2xl shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center gap-2"
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
                onClick={() => onSelectProject(p.id)}
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
          <form onSubmit={onCreateProject} className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-900">{t('projects:create.title')}</h2>
              <button type="button" onClick={() => onShowCreateProject(false)} className="text-slate-400 hover:text-slate-600"><i className="fa-solid fa-xmark"></i></button>
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
              <button type="button" onClick={() => onShowCreateProject(false)} className="flex-1 bg-white border py-3 rounded-xl font-bold text-slate-600">{t('common:buttons.cancel')}</button>
              <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg">{t('projects:create.submitButton')}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
