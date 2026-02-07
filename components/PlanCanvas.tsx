
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Decision } from '../types';

interface PlanCanvasProps {
  pdfData: string;
  decisions: Decision[];
  onAddDecision: (x: number, y: number) => void;
  onOpenFullDecision: (decision: Decision) => void;
  selectedDecisionId?: string | null;
  onSelectDecision: (decisionId: string | null) => void;
}

export const PlanCanvas: React.FC<PlanCanvasProps> = ({
  pdfData,
  decisions,
  onAddDecision,
  onOpenFullDecision,
  selectedDecisionId,
  onSelectDecision,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.8 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [canvasReady, setCanvasReady] = useState(false);

  // Render PDF to Canvas
  useEffect(() => {
    const renderPdf = async () => {
      if (!pdfData || !canvasRef.current) return;
      try {
        const loadingTask = (window as any).pdfjsLib.getDocument({ data: atob(pdfData.split(',')[1]) });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        setCanvasReady(true);
      } catch (err) {
        console.error("PDF Render Error:", err);
      }
    };
    renderPdf();
  }, [pdfData]);

  // Centering Logic
  useEffect(() => {
    if (selectedDecisionId && containerRef.current && canvasRef.current && canvasReady) {
      const decision = decisions.find(d => d.id === selectedDecisionId);
      if (decision) {
        const container = containerRef.current.getBoundingClientRect();
        const canvas = canvasRef.current;
        const pinPxX = decision.x * canvas.width;
        const pinPxY = decision.y * canvas.height;
        
        const targetX = (container.width / 2) - (pinPxX * transform.scale);
        const targetY = (container.height / 2) - (pinPxY * transform.scale);
        
        setTransform(prev => ({ ...prev, x: targetX, y: targetY }));
      }
    }
  }, [selectedDecisionId, canvasReady]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
    const newScale = Math.min(Math.max(transform.scale + delta, 0.15), 5);
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const offsetX = (e.clientX - rect.left - transform.x) / transform.scale;
      const offsetY = (e.clientY - rect.top - transform.y) / transform.scale;
      
      setTransform(prev => ({
        scale: newScale,
        x: e.clientX - rect.left - offsetX * newScale,
        y: e.clientY - rect.top - offsetY * newScale
      }));
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const moveDist = Math.sqrt(Math.pow(e.clientX - lastPos.x, 2) + Math.pow(e.clientY - lastPos.y, 2));
    if (moveDist > 5) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const pdfX = (e.clientX - rect.left - transform.x) / transform.scale;
    const pdfY = (e.clientY - rect.top - transform.y) / transform.scale;
    
    const normalizedX = pdfX / canvas.width;
    const normalizedY = pdfY / canvas.height;
    
    if (normalizedX >= 0 && normalizedX <= 1 && normalizedY >= 0 && normalizedY <= 1) {
      onAddDecision(normalizedX, normalizedY);
    } else {
      onSelectDecision(null);
    }
  };

  const previewDecision = useMemo(() => 
    decisions.find(d => d.id === selectedDecisionId),
    [decisions, selectedDecisionId]
  );

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-slate-900 overflow-hidden cursor-crosshair select-none relative"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleClick}
    >
      <div 
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          transition: isDragging ? 'none' : 'transform 0.15s ease-out'
        }}
        className="relative inline-block"
      >
        <canvas ref={canvasRef} className="shadow-2xl bg-white" />
        
        {/* PINS LAYER */}
        <div className="absolute inset-0 pointer-events-none">
          {decisions.filter(d => !d.deletedAt).map(decision => {
            const isHighlighted = decision.id === selectedDecisionId;
            return (
              <div 
                key={decision.id}
                className="absolute"
                style={{ 
                  left: `${decision.x * 100}%`, 
                  top: `${decision.y * 100}%`,
                  zIndex: isHighlighted ? 100 : 50,
                  // Keep pins fixed size despite map scale
                  transform: `scale(${1/transform.scale})`
                }}
              >
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDecision(decision.id);
                    }}
                    className={`
                      w-8 h-8 rounded-full border-2 border-white shadow-xl -translate-x-1/2 -translate-y-full
                      flex items-center justify-center transition-all pointer-events-auto
                      ${isHighlighted ? 'bg-blue-600 ring-4 ring-blue-400/50' : 
                        (decision.status === 'Acknowledged' ? 'bg-green-600' : 'bg-orange-500')}
                    `}
                  >
                    <i className="fa-solid fa-location-dot text-sm text-white"></i>
                  </button>

                  {/* ANCHORED POPUP */}
                  {isHighlighted && (
                    <div 
                      className="absolute bottom-10 left-1/2 -translate-x-1/2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-[110] pointer-events-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{decision.humanId}</span>
                          <button 
                            onClick={() => onSelectDecision(null)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                        <div className="mb-2">
                          <h4 className="font-black text-slate-900 text-sm leading-tight">{decision.category}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                            {decision.creatorName} • {new Date(decision.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-3 mb-3">
                          {decision.text || (decision.media.some(m => m.type === 'audio') ? '(Voice note)' : 'No notes.')}
                        </p>
                        <button 
                          onClick={() => onOpenFullDecision(decision)}
                          className="w-full bg-blue-600 text-white text-[11px] font-black py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Open decision
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ZOOM CONTROLS */}
      <div className="absolute top-6 right-6 flex flex-col gap-2 z-30">
        <button 
          onClick={(e) => { e.stopPropagation(); setTransform(prev => ({ ...prev, scale: prev.scale * 1.4 })); }}
          className="w-12 h-12 bg-white shadow-lg rounded-xl flex items-center justify-center text-slate-800 active:scale-90 pointer-events-auto"
        >
          <i className="fa-solid fa-plus text-lg"></i>
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); setTransform(prev => ({ ...prev, scale: prev.scale / 1.4 })); }}
          className="w-12 h-12 bg-white shadow-lg rounded-xl flex items-center justify-center text-slate-800 active:scale-90 pointer-events-auto"
        >
          <i className="fa-solid fa-minus text-lg"></i>
        </button>
      </div>
    </div>
  );
};
