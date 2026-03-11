import React from 'react';
import { useAppState } from '../state/AppStateContext';
import type { AnnotationPoint } from '../state/AppStateContext';
import { imageToScreenCoords } from '../utils/coordinates';
import type { Point } from '../utils/coordinates';

export function SvgOverlay() {
  const { 
    annotations, 
    activeAnnotation, 
    panelTransforms,
    panelRects, 
    imageSizes,
    editingAnnotationId,
    setEditingAnnotationId,
    workspaceRect
  } = useAppState();
  const [mousePos, setMousePos] = React.useState<Point | null>(null);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Helper to convert an AnnotationPoint to global screen coordinates
  const getScreenCoordinates = (pt: AnnotationPoint): Point | null => {
    return getCoordsForPanel(pt.panelId, pt.imageCoord);
  };

  const getCoordsForPanel = (panelId: string, imageCoord: Point): Point | null => {
    const transform = panelTransforms[panelId];
    const rect = panelRects[panelId];
    const imgSize = imageSizes[panelId];

    if (!transform || !rect || !imgSize || !workspaceRect) return null;

    const panelCoords = imageToScreenCoords(imageCoord, transform, rect, imgSize);
    
    return {
      x: rect.left - workspaceRect.left + panelCoords.x,
      y: rect.top - workspaceRect.top + panelCoords.y
    };
  };

  const isImagePointVisible = (panelId: string, imageCoord: Point): boolean => {
    const transform = panelTransforms[panelId];
    const rect = panelRects[panelId];
    const imgSize = imageSizes[panelId];

    if (!transform || !rect || !imgSize) return false;

    const panelCoords = imageToScreenCoords(imageCoord, transform, rect, imgSize);
    
    // Check if within panel bounds
    return (
      panelCoords.x >= 0 && 
      panelCoords.x <= rect.width && 
      panelCoords.y >= 0 && 
      panelCoords.y <= rect.height
    );
  };

  const renderArrow = (start: Point, end: Point, color: string = 'var(--accent-color)') => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);
    const headLen = 12;
    
    // End arrow head
    const headX1 = end.x - headLen * Math.cos(angle - Math.PI / 6);
    const headY1 = end.y - headLen * Math.sin(angle - Math.PI / 6);
    const headX2 = end.x - headLen * Math.cos(angle + Math.PI / 6);
    const headY2 = end.y - headLen * Math.sin(angle + Math.PI / 6);

    // Start arrow head
    const revAngle = angle + Math.PI;
    const headX1_s = start.x - headLen * Math.cos(revAngle - Math.PI / 6);
    const headY1_s = start.y - headLen * Math.sin(revAngle - Math.PI / 6);
    const headX2_s = start.x - headLen * Math.cos(revAngle + Math.PI / 6);
    const headY2_s = start.y - headLen * Math.sin(revAngle + Math.PI / 6);

    return (
      <g style={{ pointerEvents: 'none' }}>
        <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={color} strokeWidth="2" strokeOpacity="0.8" />
        {/* End Head */}
        <polygon points={`${end.x},${end.y} ${headX1},${headY1} ${headX2},${headY2}`} fill={color} fillOpacity="0.8" />
        {/* Start Head */}
        <polygon points={`${start.x},${start.y} ${headX1_s},${headY1_s} ${headX2_s},${headY2_s}`} fill={color} fillOpacity="0.8" />
      </g>
    );
  };

  const renderActiveAnnotation = () => {
    if (!activeAnnotation || activeAnnotation.points.length === 0) return null;
    
    const p1 = getScreenCoordinates(activeAnnotation.points[0]);
    if (!p1) return null;

    if (activeAnnotation.points.length === 1 && mousePos && workspaceRect) {
      // Fix: calibrate mousePos relative to workspace container
      const calibratedMouse = {
        x: mousePos.x - workspaceRect.left,
        y: mousePos.y - workspaceRect.top
      };

      return (
        <g>
          {renderArrow(p1, calibratedMouse, 'rgba(255, 152, 0, 0.5)')}
          <circle cx={p1.x} cy={p1.y} r="4" fill="none" stroke="#ff9800" strokeWidth="1" />
        </g>
      );
    }

    if (activeAnnotation.points.length === 2) {
      const p2 = getScreenCoordinates(activeAnnotation.points[1]);
      if (p2) {
        return renderArrow(p1, p2, '#ff9800');
      }
    }
    return null;
  };

  const renderLabel = (pos: Point, label: string, color: string) => {
    const offset = 20; // Offset label from the actual point
    return (
      <g style={{ pointerEvents: 'auto' }}>
        <line x1={pos.x} y1={pos.y} x2={pos.x + offset} y2={pos.y - offset} stroke={color} strokeWidth="1" strokeDasharray="2 2" />
        <circle cx={pos.x + offset} cy={pos.y - offset} r="12" fill="var(--panel-bg)" stroke={color} strokeWidth="2" />
        <text 
          x={pos.x + offset} 
          y={pos.y - offset} 
          textAnchor="middle" 
          dominantBaseline="central" 
          fill="var(--text-main)" 
          fontSize="12px" 
          fontWeight="bold"
          fontFamily="sans-serif"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {label}
        </text>
      </g>
    );
  };

  const renderCompletedAnnotations = () => {
    return annotations.map(ann => {
      if (ann.points.length < 1) return null;
      
      const p1 = getScreenCoordinates(ann.points[0]);
      const p2 = ann.points.length > 1 ? getScreenCoordinates(ann.points[1]) : null;
      
      if (!p1) return null;

      const p1Visible = isImagePointVisible(ann.points[0].panelId, ann.points[0].imageCoord);
      const p2Visible = ann.points.length > 1 ? isImagePointVisible(ann.points[1].panelId, ann.points[1].imageCoord) : false;
      
      const isEditing = editingAnnotationId === ann.id;
      
      return (
        <g key={ann.id} style={{ cursor: 'pointer', pointerEvents: 'auto' }} onClick={(e) => {
          e.stopPropagation();
          setEditingAnnotationId(ann.id);
        }}>
          {p2 && p1Visible && p2Visible && renderArrow(p1, p2, ann.color)}
          
          {ann.type === 'area' && (
            // Render on BOTH panels (mirroring)
            Object.keys(panelTransforms).map(panelId => {
              // User request: Area in image 1 should be centered on click 1, Area in image 2 should be centered on click 2
              // Fallback to points[0] if specific point for panel doesn't exist
              const centerPointForPanel = ann.points.find(p => p.panelId === panelId) || ann.points[0];
              
              // Only render on this panel if the marker center is in frame
              if (!isImagePointVisible(panelId, centerPointForPanel.imageCoord)) return null;

              const mirroredCoords = getCoordsForPanel(panelId, centerPointForPanel.imageCoord);
              if (!mirroredCoords) return null;
              
              const isPanel2 = panelId === '2';
              const isUnlinked = ann.isLocked === false;

              const rx = (isPanel2 && isUnlinked && ann.radius2 !== undefined ? ann.radius2 : (ann.radius || 30)) * panelTransforms[panelId].scale;
              const ry = (isPanel2 && isUnlinked && ann.ry2 !== undefined ? ann.ry2 : (ann.ry || ann.radius || 30)) * panelTransforms[panelId].scale;
              const rotation = (isPanel2 && isUnlinked && ann.rotation2 !== undefined ? ann.rotation2 : (ann.rotation || 0));

              return (
                <ellipse 
                  key={`${ann.id}-${panelId}`}
                  cx={mirroredCoords.x} 
                  cy={mirroredCoords.y} 
                  rx={rx}
                  ry={ry}
                  transform={`rotate(${rotation}, ${mirroredCoords.x}, ${mirroredCoords.y})`}
                  fill={ann.color.startsWith('var') ? "rgba(0, 122, 204, 0.05)" : `${ann.color}22`} 
                  stroke={ann.color} 
                  strokeWidth={isEditing ? "3" : "1.5"}
                  strokeDasharray={isEditing ? "" : "4 2"}
                />
              );
            })
          )}

          {p1Visible && renderLabel(p1, ann.label, ann.color)}
        </g>
      );
    });
  };

  return (
    <>
      {renderCompletedAnnotations()}
      {renderActiveAnnotation()}
    </>
  );
}
