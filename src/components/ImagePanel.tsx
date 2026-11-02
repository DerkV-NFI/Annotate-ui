import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAppState } from '../state/AppStateContext';
import type { PanelImage } from '../state/AppStateContext';

interface ImagePanelProps {
  panelId: string;
}

type ResizeHandleType = 'nw' | 'ne' | 'se' | 'sw';

export function ImagePanel({ panelId }: ImagePanelProps) {
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
    lastUsedColor,
    panelImages,
    setPanelImages,
    selectedImageId,
    setSelectedImageId,
    addPanelImage,
    updatePanelImage,
    removePanelImage,
    setHasUnsavedChanges
  } = useAppState();

  const images: PanelImage[] = useMemo(() => panelImages[panelId] || [], [panelImages, panelId]);
  const selectedId = selectedImageId[panelId];

  // Drag & drop highlight state
  const [isDropActive, setIsDropActive] = useState(false);

  // Pan & Zoom state (viewport)
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanningViewport, setIsPanningViewport] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Image dragging (moving/arranging) state
  const [draggingImageId, setDraggingImageId] = useState<string | null>(null);
  const dragStartMouseRef = useRef({ x: 0, y: 0 });
  const initialImagePosRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  // Image resizing state
  const [resizingImageId, setResizingImageId] = useState<string | null>(null);
  const [activeHandle, setActiveHandle] = useState<ResizeHandleType | null>(null);
  const resizeStartMouseRef = useRef({ x: 0, y: 0 });
  const initialRectRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const aspectRatioRef = useRef(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Sync legacy imageSize for backwards compatibility
  useEffect(() => {
      if (images.length > 0) {
        setImageSize(panelId, { width: images[0].naturalWidth, height: images[0].naturalHeight });
      } else {
        setImageSize(panelId, null);
      }
}, [images, panelId, setImageSize]);

// Helper to load file list into images
const processFiles = useCallback((files: FileList | File[]) => {
  const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (fileArray.length === 0) return;

  fileArray.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (!src) return;

      const img = new Image();
      img.onload = () => {
        const natW = img.naturalWidth;
        const natH = img.naturalHeight;
        const containerRect = containerRef.current?.getBoundingClientRect();
        const maxW = containerRect ? containerRect.width * 0.75 : 400;
        const maxH = containerRect ? containerRect.height * 0.75 : 400;
        const fitRatio = Math.min(maxW / natW, maxH / natH, 1);
        const width = Math.max(50, Math.round(natW * fitRatio));
        const height = Math.max(50, Math.round(natH * fitRatio));

        // Position offset: stagger new images so they don't completely overlap
        const existingCount = (panelImages[panelId] || []).length + index;
        const x = existingCount === 0 ? -width / 2 : (-width / 2 + (existingCount % 6) * 35);
        const y = existingCount === 0 ? -height / 2 : (-height / 2 + (existingCount % 6) * 35);

        addPanelImage(panelId, {
          src,
          x,
          y,
          width,
          height,
          naturalWidth: natW,
          naturalHeight: natH
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}, [addPanelImage, panelId, panelImages]);

// Drag & drop handlers
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
    processFiles(e.dataTransfer.files);
  }
};

const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files.length > 0) {
    processFiles(e.target.files);
  }
  e.target.value = '';
};

// Zoom controls
const handleZoomReset = () => {
  setScale(1);
  setOffset({ x: 0, y: 0 });
};

const handleZoomFit = () => {
  if (!containerRef.current || images.length === 0) return;
  const containerRect = containerRef.current.getBoundingClientRect();

// Calculate bounding box of all images in world space
let minX = Infinity;
let minY = Infinity;
let maxX = -Infinity;
let maxY = -Infinity;

images.forEach(img => {
  minX = Math.min(minX, img.x);
  minY = Math.min(minY, img.y);
  maxX = Math.max(maxX, img.x + img.width);
  maxY = Math.max(maxY, img.y + img.height);
});

  const boxW = maxX - minX;
  const boxH = maxY - minY;
  if (boxW <= 0 || boxH <= 0) return;

  const scaleX = (containerRect.width * 0.9) / boxW;
  const scaleY = (containerRect.height * 0.9) / boxH;
  const fitScale = Math.min(scaleX, scaleY);
  const clampedScale = Math.max(0.02, Math.min(fitScale, 5));

  const boxCenterX = (minX + maxX) / 2;
  const boxCenterY = (minY + maxY) / 2;

setScale(clampedScale);
setOffset({
  x: -boxCenterX * clampedScale,
  y: -boxCenterY * clampedScale
});
  };

// Wheel zoom anchored at mouse pointer
const handleWheel = (e: React.WheelEvent) => {
  if (!containerRef.current || images.length === 0) return;

  const zoomDelta = e.deltaY * -0.01;
  const zoomFactor = Math.exp(zoomDelta * 0.2);

  let newScale = scale * zoomFactor;
  if (newScale < 0.02) newScale = 0.02;
  if (newScale > 100) newScale = 100;

  const rect = containerRef.current.getBoundingClientRect();
  const mouseX = e.clientX - rect.left - rect.width / 2;
  const mouseY = e.clientY - rect.top - rect.height / 2;

  const actualZoomFactor = newScale / scale;
  const dx = mouseX - mouseX * actualZoomFactor;
  const dy = mouseY - mouseY * actualZoomFactor;

  setScale(newScale);
  setOffset(prev => ({
    x: prev.x * actualZoomFactor + dx,
    y: prev.y * actualZoomFactor + dy
  }));
};

// Viewport Pan or Background click
const handleContainerMouseDown = (e: React.MouseEvent) => {
  if (toolMode === 'annotate') return;

  // Middle click or clicking background
  if (e.button === 0 || e.button === 1) {
    // Clicking empty background deselects any selected image
    setSelectedImageId(panelId, null);

    setIsPanningViewport(true);
    panStartRef.current = { x: e.clientX, y: e.clientY };
  }
};

// Image mouse down (select and start moving)
const handleImageMouseDown = (e: React.MouseEvent, img: PanelImage) => {
  if (toolMode === 'annotate') return;

  if (e.button === 1) {
    // Middle click pans viewport
    setIsPanningViewport(true);
    panStartRef.current = { x: e.clientX, y: e.clientY };
    e.stopPropagation();
    return;
  }

  if (e.button === 0) {
    e.stopPropagation();
    setSelectedImageId(panelId, img.id);

    // Bring clicked image to top of display order
    setPanelImages(prev => {
      const list = prev[panelId] || [];
      const filtered = list.filter(item => item.id !== img.id);
      return { ...prev, [panelId]: [...filtered, img] };
    });

    setDraggingImageId(img.id);
    dragStartMouseRef.current = { x: e.clientX, y: e.clientY };
    initialImagePosRef.current = { x: img.x, y: img.y };
    hasDraggedRef.current = false;
  }
};

// Resize handle mouse down
const handleResizeHandleMouseDown = (e: React.MouseEvent, img: PanelImage, handle: ResizeHandleType) => {
  e.stopPropagation();
  if (e.button !== 0) return;

  setResizingImageId(img.id);
  setActiveHandle(handle);
  resizeStartMouseRef.current = { x: e.clientX, y: e.clientY };
  initialRectRef.current = { x: img.x, y: img.y, width: img.width, height: img.height };
  aspectRatioRef.current = img.naturalWidth / img.naturalHeight;
};

// Window mousemove / mouseup listener for panning, moving, and resizing
useEffect(() => {
  if (!isPanningViewport && !draggingImageId && !resizingImageId) return;

  const handleMouseMove = (e: MouseEvent) => {
    if (resizingImageId && activeHandle) {
      // Resizing active image
      const dx = (e.clientX - resizeStartMouseRef.current.x) / scale;
      const r = initialRectRef.current;
      const aspect = aspectRatioRef.current;
      let newWidth = r.width;
      let newHeight = r.height;
      let newX = r.x;
      let newY = r.y;

      switch (activeHandle) {
        case 'se': {
          newWidth = Math.max(40, r.width + dx);
          newHeight = newWidth / aspect;
          break;
        }
        case 'sw': {
          newWidth = Math.max(40, r.width - dx);
          newHeight = newWidth / aspect;
          newX = r.x + (r.width - newWidth);
          break;
        }
        case 'ne': {
          newWidth = Math.max(40, r.width + dx);
          newHeight = newWidth / aspect;
          newY = r.y + (r.height - newHeight);
          break;
        }
        case 'nw': {
          newWidth = Math.max(40, r.width - dx);
          newHeight = newWidth / aspect;
          newX = r.x + (r.width - newWidth);
          newY = r.y + (r.height - newHeight);
          break;
        }
      }

      updatePanelImage(panelId, resizingImageId, {
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newWidth),
        height: Math.round(newHeight)
      });
    } else if (draggingImageId) {
      // Moving/arranging active image
      const dx = (e.clientX - dragStartMouseRef.current.x) / scale;
      const dy = (e.clientY - dragStartMouseRef.current.y) / scale;

      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        hasDraggedRef.current = true;
      }

      updatePanelImage(panelId, draggingImageId, {
        x: Math.round(initialImagePosRef.current.x + dx),
        y: Math.round(initialImagePosRef.current.y + dy)
      });
    } else if (isPanningViewport) {
      // Panning the window viewport
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;

      setOffset(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));

      panStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    if (resizingImageId || (draggingImageId && hasDraggedRef.current)) {
      setHasUnsavedChanges(true);
    }
    setIsPanningViewport(false);
    setDraggingImageId(null);
    setResizingImageId(null);
    setActiveHandle(null);
  };

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  return () => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };
}, [
  isPanningViewport,
  draggingImageId,
  resizingImageId,
  activeHandle,
  scale,
  panelId,
  updatePanelImage,
  setHasUnsavedChanges
]);

// Annotation placement interaction
  const handleContainerClick = (e: React.MouseEvent) => {
    if (toolMode !== 'annotate' || images.length === 0 || !containerRef.current) return;
    if (e.defaultPrevented) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;

    const worldClickX = (e.clientX - containerRect.left - centerX - offset.x) / scale;
    const worldClickY = (e.clientY - containerRect.top - centerY - offset.y) / scale;

    // Search top-most image under mouse
    const hitImg = [...images].reverse().find(img =>
      worldClickX >= img.x && worldClickX <= img.x + img.width &&
      worldClickY >= img.y && worldClickY <= img.y + img.height
    );

    let imageCoord: { x: number; y: number };
    let imageId: string | undefined;

    if (hitImg && hitImg.naturalWidth > 0 && hitImg.naturalHeight > 0) {
      imageId = hitImg.id;
      imageCoord = {
        x: ((worldClickX - hitImg.x) / hitImg.width) * hitImg.naturalWidth,
        y: ((worldClickY - hitImg.y) / hitImg.height) * hitImg.naturalHeight
      };
    } else {
      // Outside any image: record world coordinates relative to panel center
      imageCoord = { x: worldClickX, y: worldClickY };
    }

    const generateId = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    };

    if (!activeAnnotation || activeAnnotation.points.length === 0) {
      // First point
      const newAnn = {
        id: generateId(),
        label: '1',
        type: activeMarkerType,
        radius: activeMarkerType === 'area' ? 30 : undefined,
        ry: activeMarkerType === 'area' ? 30 : undefined,
        rotation: 0,
        radius2: activeMarkerType === 'area' ? 30 : undefined,
        ry2: activeMarkerType === 'area' ? 30 : undefined,
        rotation2: 0,
        isLocked: true,
        points: [{ panelId, imageId, imageCoord }],
        text: '',
        color: lastUsedColor
      };
      setActiveAnnotation(newAnn);
    } else if (activeAnnotation.points.length === 1) {
      // Second point
      const completedAnn = {
        ...activeAnnotation,
        points: [...activeAnnotation.points, { panelId, imageId, imageCoord }]
      };

      setAnnotations(prev => {
        const nextLabel = (prev.length + 1).toString();
        completedAnn.label = nextLabel;
        return [...prev, completedAnn];
      });

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
        minWidth: 0,
        minHeight: 0,
        cursor: toolMode === 'annotate' && images.length > 0
          ? 'crosshair'
          : isPanningViewport
  ? 'grabbing'
  : draggingImageId
    ? 'move'
    : images.length > 0 ? 'default' : 'default'
      }}
onDragOver = { handleDragOver }
onDragLeave = { handleDragLeave }
onDrop = { handleDrop }
onMouseDown = { handleContainerMouseDown }
onWheel = { handleWheel }
onClick = { handleContainerClick }
  >
    {/* Hidden File Input for Adding Images */ }
    < input 
        ref = { fileInputRef }
  type = "file"
  multiple
  accept = "image/*"
  style = {{ display: 'none' }
}
onChange = { handleFileSelect }
  />

  {/* Top Controls Overlay */ }
{
  images.length > 0 && (
    <div
      data-html2canvas-ignore="true"
      style={{
        position: 'absolute',
      top: '12px',
      right: '12px',
      display: 'flex',
      gap: '6px',
      alignItems: 'center',
      backgroundColor: 'var(--panel-bg)',
      opacity: 0.95,
      padding: '4px 8px',
      borderRadius: '6px',
      border: '1px solid var(--border-color)',
      zIndex: 30,
      color: 'var(--text-main)',
      fontSize: '0.8rem',
      backdropFilter: 'blur(4px)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
      <span style={{ minWidth: '45px', textAlign: 'right', fontFamily: 'monospace' }}>
        {Math.round(scale * 100)}%
      </span>
      <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />
      <button
        type="button"
        onClick={handleZoomReset}
        style={zoomButtonStyle}
        title="Actual Size (100%)"
      >
        1:1
      </button>
      <button
        type="button"
        onClick={handleZoomFit}
        style={zoomButtonStyle}
        title="Fit All Images to Window"
      >
        Fit
      </button>
      <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        style={{
          ...zoomButtonStyle,
          backgroundColor: 'var(--accent-color)',
          color: '#ffffff',
          fontWeight: 500,
          padding: '2px 8px'
        }}
        title="Add another image to this window"
      >
        + Add Image
      </button>
    </div>
  )
}

    {/* World / Canvas Space for Images */ }
      {
    images.length > 0 ? (
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 0,
          height: 0,
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          transition: isPanningViewport || draggingImageId || resizingImageId ? 'none' : 'transform 0.05s ease-out',
          willChange: 'transform'
        }}
      >
        {images.map(img => {
          const isSelected = img.id === selectedId && toolMode === 'pan';

          return (
            <div
              key={img.id}
              style={{
                position: 'absolute',
                left: `${img.x}px`,
                top: `${img.y}px`,
                width: `${img.width}px`,
                height: `${img.height}px`,
                cursor: toolMode === 'annotate' ? 'crosshair' : 'move',
                userSelect: 'none'
              }}
              onMouseDown={(e) => handleImageMouseDown(e, img)}
            >
              {/* The Image Element */}
              <img
                src={img.src}
                alt={`Window ${panelId} - Image`}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  pointerEvents: 'none',
                  imageRendering: 'pixelated'
                }}
                draggable={false}
              />

              {/* Selection Outline & Controls */}
              {isSelected && (
                <div
                  data-html2canvas-ignore="true"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: '2px solid var(--accent-color, #007acc)',
                    boxShadow: '0 0 10px rgba(0, 122, 204, 0.4)',
                    pointerEvents: 'none'
                  }}
                >
                  {/* Floating Delete Button on Clicked Image */}
                  <button
                    type="button"
                    data-html2canvas-ignore="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePanelImage(panelId, img.id);
                    }}
                    style={{
                      position: 'absolute',
                      top: '-15px',
                      right: '-15px',
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      backgroundColor: '#e74c3c',
                      color: '#ffffff',
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      pointerEvents: 'auto',
                      zIndex: 25,
                      transition: 'transform 0.15s ease, background-color 0.15s ease',
                      padding: 0
                    }}
                    title="Delete this image"
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>

                  {/* Corner Resize Handles */}
                  <div
                    data-html2canvas-ignore="true"
                    style={{ ...resizeHandleStyle, top: '-5px', left: '-5px', cursor: 'nwse-resize' }}
                    onMouseDown={(e) => handleResizeHandleMouseDown(e, img, 'nw')}
                    title="Resize"
                  />
                  <div
                    data-html2canvas-ignore="true"
                    style={{ ...resizeHandleStyle, top: '-5px', right: '-5px', cursor: 'nesw-resize' }}
                    onMouseDown={(e) => handleResizeHandleMouseDown(e, img, 'ne')}
                    title="Resize"
                  />
                  <div
                    data-html2canvas-ignore="true"
                    style={{ ...resizeHandleStyle, bottom: '-5px', right: '-5px', cursor: 'nwse-resize' }}
                    onMouseDown={(e) => handleResizeHandleMouseDown(e, img, 'se')}
                    title="Resize"
                  />
                  <div
                    data-html2canvas-ignore="true"
                    style={{ ...resizeHandleStyle, bottom: '-5px', left: '-5px', cursor: 'nesw-resize' }}
                    onMouseDown={(e) => handleResizeHandleMouseDown(e, img, 'sw')}
                    title="Resize"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    ) : (
    /* Empty State Dropzone */
    <div style={{
      color: isDropActive ? 'var(--accent-color)' : 'var(--text-muted)',
      border: `2px dashed ${isDropActive ? 'var(--accent-color)' : 'var(--border-color)'}`,
      padding: '36px',
      borderRadius: '8px',
      textAlign: 'center',
      backgroundColor: isDropActive ? 'rgba(0, 122, 204, 0.1)' : 'transparent',
      transition: 'all 0.2s',
      cursor: 'pointer'
    }}>
      <label style={{ cursor: 'pointer' }}>
        <p style={{ margin: 0, fontWeight: 500 }}>Drag and drop images here</p>
        <p style={{ margin: '8px 0 0 0', fontSize: '0.85em', color: 'var(--text-muted)' }}>or click to browse multiple images</p>
        <input
          type="file"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </label>
    </div>
  )
  }
    </div >
  );
}

const resizeHandleStyle: React.CSSProperties = {
  position: 'absolute',
  width: '10px',
  height: '10px',
  backgroundColor: '#ffffff',
  border: '1.5px solid var(--accent-color, #007acc)',
  borderRadius: '2px',
  pointerEvents: 'auto',
  zIndex: 20
};

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
