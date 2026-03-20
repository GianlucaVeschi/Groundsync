import React from 'react';
import { useTranslation } from 'react-i18next';
import { Decision } from '../types';
import { formatDateTime } from '../locales/i18n';
import { translateCategory } from '../locales/categoryMapping';

interface DecisionListPanelProps {
  decisions: Decision[];
  selectedPreviewId: string | null;
  onSelect: (decision: Decision) => void;
  onClose: () => void;
}

export const DecisionListPanel: React.FC<DecisionListPanelProps> = ({
  decisions,
  selectedPreviewId,
  onSelect,
  onClose,
}) => {
  const { t, i18n } = useTranslation(['common', 'decisions']);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight">{t('decisions:list.title')}</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {decisions.filter(d => !d.deletedAt).sort((a, b) => b.createdAt - a.createdAt).map(d => (
            <div
              key={d.id}
              className={`p-4 rounded-2xl cursor-pointer border transition-all mb-1 ${
                selectedPreviewId === d.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50 border-transparent hover:border-slate-100'
              }`}
              onClick={() => onSelect(d)}
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
  );
};
