
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Decision } from '../types';

const ZOOM_STEP = 1.4;
const DEFAULT_HOME_SCALE = 0.8 / (ZOOM_STEP * ZOOM_STEP); // same as clicking "Zoom Out" twice

interface PlanCanvasProps {
  pdfUrl: string;
  decisions: Decision[];
  onAddDecision: (x: number, y: number) => void;
  selectedDecisionId?: string | null;
  onSelectDecision: (decisionId: string | null) => void;
  isPinPlacementMode: boolean;
  onSetPinPlacementMode: (value: boolean) => void;
  zoomInTrigger?: number;
  zoomOutTrigger?: number;
  recenterTrigger?: number;
}

export const PlanCanvas: React.FC<PlanCanvasProps> = ({
  pdfUrl,
  decisions,
  onAddDecision,
  selectedDecisionId,
  onSelectDecision,
  isPinPlacementMode,
  onSetPinPlacementMode,
  zoomInTrigger = 0,
  zoomOutTrigger = 0,
  recenterTrigger = 0,
}) => {
  const { t } = useTranslation('decisions');
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: DEFAULT_HOME_SCALE });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [canvasReady, setCanvasReady] = useState(false);
  const [touchPoints, setTouchPoints] = useState<TouchList | null>(null);
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const initialTransformRef = useRef<{ x: number; y: number; scale: number } | null>(null);
  const initialTransformPdfRef = useRef<string | null>(null);

  const placePinAtClientPoint = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const pdfX = (clientX - rect.left - transform.x) / transform.scale;
    const pdfY = (clientY - rect.top - transform.y) / transform.scale;

    const normalizedX = pdfX / canvas.width;
    const normalizedY = pdfY / canvas.height;

    if (normalizedX >= 0 && normalizedX <= 1 && normalizedY >= 0 && normalizedY <= 1) {
      onAddDecision(normalizedX, normalizedY);
      onSetPinPlacementMode(false); // Auto-exit after placement
    }
  };

  // Render PDF to Canvas
  useEffect(() => {
    let isCancelled = false;
    let renderTask: any = null;

    const renderPdf = async () => {
      if (!pdfUrl || !canvasRef.current) return;
      try {
        const response = await fetch(pdfUrl);
        const arrayBuffer = await response.arrayBuffer();
        const loadingTask = (window as any).pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;

        if (isCancelled) return;

        const page = await pdf.getPage(1);

        if (isCancelled) return;

        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = canvasRef.current;

        if (!canvas || isCancelled) return;

        const context = canvas.getContext('2d');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        renderTask = page.render({
          canvasContext: context,
          viewport: viewport
        });

        await renderTask.promise;

        if (!isCancelled) {
          setCanvasReady(true);
          // Save an initial "home" view per PDF so recenter is deterministic.
          // This intentionally uses a simple, safe default (top-left at 0,0)
          // rather than trying to auto-fit/center (which can be fragile).
          if (initialTransformPdfRef.current !== pdfUrl) {
            initialTransformPdfRef.current = pdfUrl;
            initialTransformRef.current = { x: 0, y: 0, scale: DEFAULT_HOME_SCALE };
            setTransform(initialTransformRef.current);
          }
        }
      } catch (err) {
        if (!isCancelled && err.name !== 'RenderingCancelledException') {
          console.error("PDF Render Error:", err);
        }
      }
    };

    renderPdf();

    return () => {
      isCancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch (e) {
          // Ignore cancellation errors
        }
      }
    };
  }, [pdfUrl]);

  // Handle zoom triggers from parent
  useEffect(() => {
    if (zoomInTrigger > 0) {
      setTransform(prev => ({ ...prev, scale: prev.scale * ZOOM_STEP }));
    }
  }, [zoomInTrigger]);

  useEffect(() => {
    if (zoomOutTrigger > 0) {
      setTransform(prev => ({ ...prev, scale: prev.scale / ZOOM_STEP }));
    }
  }, [zoomOutTrigger]);

  useEffect(() => {
    if (recenterTrigger <= 0) return;
    if (!canvasReady) return;
    const home = initialTransformRef.current;
    if (!home) return;
    setIsDragging(false);
    setTransform(home);
  }, [recenterTrigger]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setLastPos({ x: e.clientX, y: e.clientY });
    if (!isPinPlacementMode) {
      setIsDragging(true);
    }
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
    if (isPinPlacementMode) {
      placePinAtClientPoint(e.clientX, e.clientY);
    } else {
      const moveDist = Math.sqrt(Math.pow(e.clientX - lastPos.x, 2) + Math.pow(e.clientY - lastPos.y, 2));
      if (moveDist > 5) return; // Was a drag, not a click

      // Not in pin mode - deselect any selected pin
      onSelectDecision(null);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!isPinPlacementMode) return;
    e.preventDefault();
    e.stopPropagation();
    placePinAtClientPoint(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touches = e.touches;

    if (touches.length === 1) {
      // Single touch - potential tap for pin placement
      setLastPos({ x: touches[0].clientX, y: touches[0].clientY });
      setTouchStartTime(Date.now());
    } else if (touches.length === 2) {
      // Two fingers - pan or pinch
      e.preventDefault();
      setTouchPoints(touches);
      setIsDragging(true);

      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      setInitialDistance(Math.sqrt(dx * dx + dy * dy));

      const centerX = (touches[0].clientX + touches[1].clientX) / 2;
      const centerY = (touches[0].clientY + touches[1].clientY) / 2;
      setLastPos({ x: centerX, y: centerY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touches = e.touches;

    if (touches.length === 2 && touchPoints && initialDistance) {
      e.preventDefault();

      // Calculate current center point
      const currentCenterX = (touches[0].clientX + touches[1].clientX) / 2;
      const currentCenterY = (touches[0].clientY + touches[1].clientY) / 2;

      // Pan: move based on center point delta
      const dx = currentCenterX - lastPos.x;
      const dy = currentCenterY - lastPos.y;

      // Pinch zoom: calculate distance change
      const currentDx = touches[0].clientX - touches[1].clientX;
      const currentDy = touches[0].clientY - touches[1].clientY;
      const currentDistance = Math.sqrt(currentDx * currentDx + currentDy * currentDy);
      const scaleChange = currentDistance / initialDistance;

      setTransform(prev => {
        const newScale = Math.min(Math.max(prev.scale * scaleChange, 0.15), 5);

        // Zoom toward pinch center point
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const zoomCenterX = currentCenterX - rect.left;
          const zoomCenterY = currentCenterY - rect.top;

          // Calculate offset adjustment for zoom
          const offsetX = (zoomCenterX - prev.x) / prev.scale;
          const offsetY = (zoomCenterY - prev.y) / prev.scale;

          return {
            scale: newScale,
            x: zoomCenterX - offsetX * newScale + dx,
            y: zoomCenterY - offsetY * newScale + dy
          };
        }

        return { ...prev, x: prev.x + dx, y: prev.y + dy, scale: newScale };
      });

      setLastPos({ x: currentCenterX, y: currentCenterY });
      setInitialDistance(currentDistance);
      setTouchPoints(touches);
    } else if (touches.length === 1 && !isPinPlacementMode) {
      // Single finger drag in pan mode (when not placing pins)
      const dx = touches[0].clientX - lastPos.x;
      const dy = touches[0].clientY - lastPos.y;
      setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setLastPos({ x: touches[0].clientX, y: touches[0].clientY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      // All fingers lifted
      const endPos = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY
      };
      const moveDist = Math.sqrt(
        Math.pow(endPos.x - lastPos.x, 2) + Math.pow(endPos.y - lastPos.y, 2)
      );
      const touchDuration = Date.now() - touchStartTime;

      // Was a tap (not a drag) and in pin placement mode
      if (moveDist < 10 && touchDuration < 300 && isPinPlacementMode) {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (container && canvas) {
          const rect = container.getBoundingClientRect();
          const pdfX = (endPos.x - rect.left - transform.x) / transform.scale;
          const pdfY = (endPos.y - rect.top - transform.y) / transform.scale;
          const normalizedX = pdfX / canvas.width;
          const normalizedY = pdfY / canvas.height;

          if (normalizedX >= 0 && normalizedX <= 1 && normalizedY >= 0 && normalizedY <= 1) {
            onAddDecision(normalizedX, normalizedY);
            onSetPinPlacementMode(false); // Auto-exit
          }
        }
      }

      setIsDragging(false);
      setTouchPoints(null);
      setInitialDistance(null);
      setTouchStartTime(0);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-full min-w-0 min-h-0 bg-slate-900 overflow-hidden select-none relative ${
        isPinPlacementMode ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Loading Spinner */}
      {!canvasReady && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-600 border-t-blue-500"></div>
            <p className="text-slate-400 font-semibold text-sm">{t('canvas.loadingPdf')}</p>
          </div>
        </div>
      )}
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
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
