
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Decision, Project, User, UserRole } from '../types';
import { translateCategory } from '../locales/categoryMapping';
import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface DecisionModalProps {
  decision: Partial<Decision>;
  project: Project;
  user: User;
  onSave: (data: Partial<Decision>) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  onAcknowledge?: (id: string) => void;
}

export const DecisionModal: React.FC<DecisionModalProps> = ({
  decision,
  project,
  user,
  onSave,
  onCancel,
  onDelete,
  onAcknowledge
}) => {
  const { t, i18n } = useTranslation(['decisions', 'common']);
  const [formData, setFormData] = useState({
    category: decision.category || project.categories?.[0] || '',
    text: decision.text || '',
    media: decision.media || []
  });

  const [isRecording, setIsRecording] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const isCreator = !decision.id || decision.creatorId === user.id;
  const canAck = [UserRole.BAULEITER, UserRole.PROJECT_MANAGER, UserRole.ARCHITECT].includes(user.role);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const simulateVoice = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      setFormData(prev => ({ ...prev, text: prev.text + " [Transcribed: Ground condition verified at marker location. Ready for foundation pouring.]" }));
    }, 2000);
  };

  const compressImageToDataUrl = (file: File, maxDim = 1600, quality = 0.78): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const { width, height } = img;
          const scale = Math.min(1, maxDim / Math.max(width, height));
          const targetW = Math.max(1, Math.round(width * scale));
          const targetH = Math.max(1, Math.round(height * scale));

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 2D context unavailable'));
            return;
          }
          ctx.drawImage(img, 0, 0, targetW, targetH);

          // JPEG is significantly smaller than PNG for photos.
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    // Allow selecting the same file twice in a row
    input.value = '';

    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (formData.media.length >= 3) return;

    try {
      const dataUrl = await compressImageToDataUrl(file);
      const mediaId = Math.random().toString(36).substr(2, 9);

      const blob = await fetch(dataUrl).then(r => r.blob());
      const storageRef = ref(storage, `decision-media/${mediaId}.jpg`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      setFormData(prev => ({
        ...prev,
        media: [...prev.media, { id: mediaId, type: 'image', url }]
      }));
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Could not process this image. Please try a different file.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {decision.id ? `${t('modal.viewTitle')} ${decision.humanId}` : t('modal.createTitle')}
            </h2>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mt-0.5">
               {project.name}
            </p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-2">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 sm:pb-4">
          {/* Status Badge */}
          {decision.id && (
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              decision.status === 'Acknowledged'
              ? 'bg-green-100 text-green-800 border-green-200'
              : 'bg-orange-100 text-orange-800 border-orange-200'
            }`}>
              {t(`status.${decision.status}`)}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('modal.categoryLabel')}</label>
            <select
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 bg-slate-50 border"
              value={formData.category}
              disabled={!isCreator}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            >
              {project.categories.map(cat => (
                <option key={cat} value={cat}>{translateCategory(cat, i18n.language as 'en' | 'de')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('modal.descriptionLabel')}</label>
            <textarea
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 bg-slate-50 border h-32"
              placeholder={t('modal.descriptionPlaceholder')}
              value={formData.text}
              readOnly={!isCreator}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              required
            />
          </div>

          {isCreator && (
            <div className="flex gap-2">
              {isMobile && (
                <button
                  type="button"
                  onClick={simulateVoice}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                    isRecording ? 'border-red-500 bg-red-50 text-red-600 animate-pulse' : 'border-slate-200 hover:border-blue-400'
                  }`}
                >
                  <i className={`fa-solid ${isRecording ? 'fa-stop' : 'fa-microphone'}`}></i>
                  {isRecording ? t('modal.recordingButton') : t('modal.recordButton')}
                </button>
              )}

              <div className="flex-1 relative">
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileUpload}
                  disabled={formData.media.length >= 3}
                />
                <div className="w-full py-3 px-4 rounded-xl border-2 border-slate-200 flex items-center justify-center gap-2 hover:border-blue-400">
                  <i className="fa-solid fa-camera"></i>
                  {t('modal.photosLabel')} ({formData.media.length}/3)
                </div>
              </div>
            </div>
          )}

          {/* Media Preview */}
          {formData.media.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {formData.media.map((m, idx) => (
                <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-slate-100 border relative group">
                  <img src={m.url} className="w-full h-full object-cover" />
                  {isCreator && (
                    <button 
                      type="button"
                      className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100"
                      onClick={() => setFormData(prev => ({ ...prev, media: prev.media.filter((_, i) => i !== idx) }))}
                    >
                      <i className="fa-solid fa-xmark text-xs"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Comments Section (Simplified) */}
          {decision.id && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold text-slate-800 mb-2">{t('modal.commentsLabel')}</h3>
              <div className="space-y-3 mb-4">
                {decision.comments.map(c => (
                  <div key={c.id} className="text-sm">
                    <span className="font-bold mr-2">{c.userName}</span>
                    <span className="text-slate-600">{c.text}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-lg border p-2 text-sm"
                  placeholder={t('modal.commentPlaceholder')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                       // Simulated logic
                       e.preventDefault();
                       alert(t('modal.addCommentButton'));
                    }
                  }}
                />
              </div>
            </div>
          )}
        </form>

        <div className="p-4 border-t bg-slate-50 flex flex-col sm:flex-row gap-2 rounded-b-2xl sticky bottom-0">
          {isCreator && (
            <button
              type="submit"
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-blue-700"
            >
              {decision.id ? t('modal.saveButton') : t('modal.saveButton')}
            </button>
          )}

          {decision.id && canAck && decision.status !== 'Acknowledged' && (
            <button
              type="button"
              onClick={() => {
                onAcknowledge?.(decision.id!);
                onCancel();
              }}
              className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-check"></i>
              {t('modal.acknowledgeButton')}
            </button>
          )}

          {decision.id && isCreator && (
            <button
              type="button"
              onClick={() => { if(confirm(t('modal.deleteConfirm'))) onDelete?.(decision.id!); }}
              className="sm:w-16 bg-white text-red-500 font-bold py-3 rounded-xl border border-red-200 hover:bg-red-50 flex items-center justify-center"
            >
              <i className="fa-solid fa-trash-can"></i>
            </button>
          )}

          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-white text-slate-600 font-bold py-3 rounded-xl border hover:bg-slate-50 sm:hidden"
          >
            {t('common:buttons.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
