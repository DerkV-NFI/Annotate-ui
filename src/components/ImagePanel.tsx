import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../state/AppStateContext';
import { screenToImageCoords } from '../utils/coordinates';

interface ImagePanelProps {
  panelId: string;
}

export function ImagePanel({ panelId }: ImagePanelProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const { 
    setPanelTransform, 
    setPanelRect, 
    setImageSize, 
    toolMode, 
    setToolMode,
    activeAnnotation, 
    setActiveAnnotation,
    setAnnotations,
    activeMarkerType,
    lastUsedColor
  } = useAppState();
  
  // Drag & drop state
  // Drag & drop state
  const [isDropActive, setIsDropActive] = useState(false);

  // Pan & Zoom state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Sync transform to context whenever it changes
  useEffect(() => {
    setPanelTransform(panelId, { scale, offset });
  }, [scale, offset, panelId, setPanelTransform]);

  // Sync container rect to context when mounted or window resized
  useEffect(() => {
    const updateRect = () => {
      if (containerRef.current) {
        setPanelRect(panelId, containerRef.current.getBoundingClientRect());
      }
    };
    
    updateRect();
    window.addEventListener('resize', updateRect);
    return () => window.removeEventListener('resize', updateRect);
  }, [panelId, setPanelRect]);

  // Sync image size to context when image changes
  useEffect(() => {
    if (imageRef.current && imageSrc) {
      const img = new Image();
      img.onload = () => {
        setImageSize(panelId, { width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = imageSrc;
    } else {
      setImageSize(panelId, null);
    }
  }, [imageSrc, panelId, setImageSize]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setImageSrc(url);
        // Reset view
        setScale(1);
        setOffset({ x: 0, y: 0 });
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setImageSrc(url);
        // Reset view
        setScale(1);
        setOffset({ x: 0, y: 0 });
      }
    }
  };

  const handleZoomReset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleZoomFit = () => {
    if (!containerRef.current || !imageRef.current || !imageSrc) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const curImage = imageRef.current;
    
    // Calculate the scale needed to fit the image entirely within the container
    const scaleX = containerRect.width / curImage.naturalWidth;
    const scaleY = containerRect.height / curImage.naturalHeight;
    // Use the smaller scale to ensure it fits completely
    const fitScale = Math.min(scaleX, scaleY) * 0.95; // 95% to leave a tiny margin
    
    // Important: we don't clamp the fit scale here to the 0.05 min because very large images might need to be smaller
    setScale(Math.max(0.01, fitScale));
    setOffset({ x: 0, y: 0 });
  };

  // Pan interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageSrc) return;
    // Start pan on middle click (1) or left click if we consider adding an explicit pan tool later
    // For now, left click (0) or middle click (1) can both pan.
    if (e.button === 0 || e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      
      setOffset(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
      
      panStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning]);

  // Zoom interaction
  const handleWheel = (e: React.WheelEvent) => {
    if (!imageSrc || !containerRef.current) return;
    
    // Zoom sensitivity
    const zoomDelta = e.deltaY * -0.01;
    const zoomFactor = Math.exp(zoomDelta * 0.2); // Smooth exponential zoom
    
    let newScale = scale * zoomFactor;
    
    // Clamp scale
    if (newScale < 0.05) newScale = 0.05;
    if (newScale > 100) newScale = 100;

    // Calculate mouse position relative to container
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;

    // To keep the mouse pointer over the same point in the image,
    // we need to adjust the offset based on the scale change.
    const actualZoomFactor = newScale / scale;
    const dx = mouseX - mouseX * actualZoomFactor;
    const dy = mouseY - mouseY * actualZoomFactor;

    setScale(newScale);
    setOffset(prev => ({
      x: prev.x * actualZoomFactor + dx,
      y: prev.y * actualZoomFactor + dy
    }));
  };

  // Annotation placement interaction
  const handleClick = (e: React.MouseEvent) => {
    // Only handle clicks for annotations if we are in annotate mode and not panning
    if (toolMode !== 'annotate' || !imageSrc || !containerRef.current || !imageRef.current) return;
    
    // If the user was dragging/panning, ignore the click
    if (e.defaultPrevented) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const imgSize = { 
      width: imageRef.current.naturalWidth, 
      height: imageRef.current.naturalHeight 
    };

    // Convert mouse click relative to viewport into image coordinates
    const clickPoint = { x: e.clientX, y: e.clientY };
    const imageCoord = screenToImageCoords(clickPoint, { scale, offset }, containerRect, imgSize);

    if (!activeAnnotation || activeAnnotation.points.length === 0) {
      // First point
      const newAnn = {
        id: crypto.randomUUID(),
        label: '1', // Will be auto-sequenced later based on length
        type: activeMarkerType,
        radius: activeMarkerType === 'area' ? 30 : undefined,
        ry: activeMarkerType === 'area' ? 30 : undefined,
        rotation: 0,
        radius2: activeMarkerType === 'area' ? 30 : undefined,
        ry2: activeMarkerType === 'area' ? 30 : undefined,
        rotation2: 0,
        isLocked: true,
        points: [{ panelId, imageCoord }],
        text: '',
        color: lastUsedColor
      };
      setActiveAnnotation(newAnn);
    } else if (activeAnnotation.points.length === 1) {
      // Second point
      const completedAnn = {
        ...activeAnnotation,
        points: [...activeAnnotation.points, { panelId, imageCoord }]
      };
      
      setAnnotations(prev => {
        // Simple auto-sequencing for now
        const nextLabel = (prev.length + 1).toString();
        completedAnn.label = nextLabel;
        return [...prev, completedAnn];
      });
      
      // Cleanup draft state and return to pan mode
      setActiveAnnotation(null);
      setToolMode('pan');
    }
  };

  return (
    <div 
      ref={containerRef}
      data-transparent-on-export="true"
      style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-color)',
        cursor: toolMode === 'annotate' && imageSrc 
          ? 'crosshair' 
          : isPanning ? 'grabbing' : (imageSrc ? 'grab' : 'default')
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      onClick={handleClick}
    >
      {/* Zoom Controls Overlay */}
      {imageSrc && (
        <div 
          data-html2canvas-ignore="true"
          style={{
            position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          backgroundColor: 'var(--panel-bg)', // Themed background
          opacity: 0.9,
          padding: '4px 8px',
          borderRadius: '4px',
          border: '1px solid var(--border-color)',
          zIndex: 10,
          color: 'var(--text-main)',
          fontSize: '0.8rem',
          backdropFilter: 'blur(4px)'
        }}>
          <span style={{ minWidth: '45px', textAlign: 'right', fontFamily: 'monospace' }}>
            {Math.round(scale * 100)}%
          </span>
          <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />
          <button 
            onClick={handleZoomReset}
            style={zoomButtonStyle}
            title="Actual Size (100%)"
          >
            1:1
          </button>
          <button 
            onClick={handleZoomFit}
            style={zoomButtonStyle}
            title="Fit to Screen"
          >
            Fit
          </button>
        </div>
      )}

      {imageSrc ? (
        <div 
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.05s ease-out',
            willChange: 'transform',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <img 
            ref={imageRef}
            src={imageSrc} 
            alt={`Panel ${panelId}`} 
            style={{ 
              maxWidth: 'none', 
              maxHeight: 'none',
              // We don't set absolute width/height here; let image load at its natural resolution
              pointerEvents: 'none',
              imageRendering: 'pixelated'
            }}
          />
        </div>
      ) : (
        <div style={{
          color: isDropActive ? 'var(--accent-color)' : 'var(--text-muted)',
          border: `2px dashed ${isDropActive ? 'var(--accent-color)' : 'var(--border-color)'}`,
          padding: '32px',
          borderRadius: '8px',
          textAlign: 'center',
          backgroundColor: isDropActive ? 'rgba(0, 122, 204, 0.1)' : 'transparent',
          transition: 'all 0.2s',
          cursor: 'pointer'
        }}>
          <label style={{ cursor: 'pointer' }}>
            <p style={{ margin: 0 }}>Drag and drop an image here</p>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.85em' }}>or click to browse</p>
            <input 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handleFileSelect}
            />
          </label>
        </div>
      )}
    </div>
  );
}

const zoomButtonStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  color: 'var(--text-main)',
  border: '1px solid transparent',
  padding: '2px 6px',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '0.75rem',
  transition: 'background-color 0.2s, border-color 0.2s'
};

// We will inject a tiny style tag to handle hover effects since we are using inline styles mostly
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    button[title="Actual Size (100%)"]:hover, button[title="Fit to Screen"]:hover {
      background-color: rgba(255,255,255,0.1) !important;
      border-color: var(--border-color) !important;
    }
  `;
  document.head.appendChild(style);
}
