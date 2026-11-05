import React from 'react';
import { useAppState } from '../state/AppStateContext';
import { getAlphabeticLabel } from '../utils/labels';
import type { AnnotationPoint, Annotation } from '../state/AppStateContext';
import type { Point } from '../utils/coordinates';

export function SvgOverlay() {
  const {
    annotations,
    activeAnnotation,
    panelTransforms,
    panelRects,
    imageSizes,
    panelImages,
    editingAnnotationId,
    setEditingAnnotationId,
    workspaceRect,
    labelType,
    labelFontSize,
    showLabelBackground,
    lineThickness,
    labelPosition,
    labelColor,
    labelBgColor,
    setAnnotations
  } = useAppState();
  const [mousePos, setMousePos] = React.useState<Point | null>(null);
  const [dragState, setDragState] = React.useState<{ annId: string, pointIndex: number } | null>(null);
  const [hoveredAnnId, setHoveredAnnId] = React.useState<string | null>(null);
  const isDraggingRef = React.useRef(false);
  const isPreviewingAnnotation = activeAnnotation?.points.length === 1;

  React.useEffect(() => {
    if (!dragState && !isPreviewingAnnotation) return;

    let pendingMousePos: Point | null = null;
    let animationFrameId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (isPreviewingAnnotation) {
        pendingMousePos = { x: e.clientX, y: e.clientY };
        if (animationFrameId === null) {
          animationFrameId = requestAnimationFrame(() => {
            if (pendingMousePos) setMousePos(pendingMousePos);
            animationFrameId = null;
          });
        }
      }

      if (dragState) {
        if (!isDraggingRef.current) isDraggingRef.current = true;
        // Find panel under mouse
        let targetPanelId: string | null = null;
        for (const [id, rect] of Object.entries(panelRects)) {
          if (!rect) continue;
          if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
            targetPanelId = id;
            break;
          }
        }

        if (targetPanelId) {
          const rect = panelRects[targetPanelId];
          const transform = panelTransforms[targetPanelId];
          const images = panelImages[targetPanelId] || [];

            if (rect && transform) {
              const centerX = rect.width / 2;
              const centerY = rect.height / 2;
              const worldX = (e.clientX - rect.left - centerX - transform.offset.x) / transform.scale;
              const worldY = (e.clientY - rect.top - centerY - transform.offset.y) / transform.scale;

              // Find image under mouse (check top-most first)
              const targetImg = [...images].reverse().find(img =>
                worldX >= img.x && worldX <= img.x + img.width &&
                worldY >= img.y && worldY <= img.y + img.height
              ) || images[0];

              let imageCoord: Point;
              let imageId: string | undefined;

              if (targetImg && targetImg.naturalWidth > 0 && targetImg.naturalHeight > 0) {
                imageId = targetImg.id;
                imageCoord = {
                  x: ((worldX - targetImg.x) / targetImg.width) * targetImg.naturalWidth,
                  y: ((worldY - targetImg.y) / targetImg.height) * targetImg.naturalHeight
                };
              } else {
                const imgSize = imageSizes[targetPanelId];
                if (imgSize) {
                  imageCoord = {
                    x: worldX + imgSize.width / 2,
                    y: worldY + imgSize.height / 2
                  };
                } else {
                  imageCoord = { x: worldX, y: worldY };
                }
              }

              setAnnotations((prev: Annotation[]) => prev.map((ann: Annotation) => {
                if (ann.id === dragState.annId) {
                  const newPoints = [...ann.points];
                  newPoints[dragState.pointIndex] = {
                    panelId: targetPanelId!,
                    imageId,
                    imageCoord
                  };
                  return { ...ann, points: newPoints };
                }
                return ann;
              }));
            }
          }
        }
      };

      const handleMouseUp = () => {
        setDragState(null);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
}, [dragState, isPreviewingAnnotation, panelRects, panelTransforms, panelImages, imageSizes, setAnnotations]);

// Helper to convert an AnnotationPoint to global screen coordinates
const getScreenCoordinates = (pt: AnnotationPoint): Point | null => {
  return getCoordsForPanel(pt.panelId, pt.imageCoord, pt.imageId);
};

  const getCoordsForPanel = (panelId: string, imageCoord: Point, imageId?: string): Point | null => {
    const transform = panelTransforms[panelId];
    const rect = panelRects[panelId];
    if (!transform || !rect || !workspaceRect) return null;

    const images = panelImages[panelId] || [];
    const targetImg = imageId ? images.find(img => img.id === imageId) : images[0];

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    let worldX: number;
    let worldY: number;

    if (targetImg && targetImg.naturalWidth > 0 && targetImg.naturalHeight > 0) {
      const uRatio = imageCoord.x / targetImg.naturalWidth;
      const vRatio = imageCoord.y / targetImg.naturalHeight;
      worldX = targetImg.x + uRatio * targetImg.width;
      worldY = targetImg.y + vRatio * targetImg.height;
    } else {
      const imgSize = imageSizes[panelId];
      if (imgSize) {
        worldX = imageCoord.x - imgSize.width / 2;
        worldY = imageCoord.y - imgSize.height / 2;
      } else {
        worldX = imageCoord.x;
        worldY = imageCoord.y;
      }
    }

    const panelX = worldX * transform.scale + centerX + transform.offset.x;
    const panelY = worldY * transform.scale + centerY + transform.offset.y;

    return {
      x: rect.left - workspaceRect.left + panelX,
      y: rect.top - workspaceRect.top + panelY
    };
  };

    const isImagePointVisible = (panelId: string, imageCoord: Point, imageId?: string): boolean => {
      const coords = getCoordsForPanel(panelId, imageCoord, imageId);
      const rect = panelRects[panelId];
      if (!coords || !rect || !workspaceRect) return false;

      const screenX = coords.x + workspaceRect.left;
      const screenY = coords.y + workspaceRect.top;

      return (
      screenX >= rect.left &&
        screenX <= rect.right &&
        screenY >= rect.top &&
        screenY <= rect.bottom
    );
  };

const getEllipseIntersection = (center: Point, target: Point, rx: number, ry: number, rotation: number): Point => {
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.1) return center;

  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(-rad);
  const sin = Math.sin(-rad);

  // Rotate vector into local ellipse space
  const vx = dx * cos - dy * sin;
  const vy = dx * sin + dy * cos;

  // Solve for intersection with canonical ellipse: (vx*k/rx)^2 + (vy*k/ry)^2 = 1
  const k = 1 / Math.sqrt(Math.pow(vx / rx, 2) + Math.pow(vy / ry, 2));

  // Transform back to world space
  const ix_local = vx * k;
  const iy_local = vy * k;

  const cos_w = Math.cos(rad);
  const sin_w = Math.sin(rad);

  return {
    x: center.x + (ix_local * cos_w - iy_local * sin_w),
    y: center.y + (ix_local * sin_w + iy_local * cos_w)
  };
};

const renderArrow = (start: Point, end: Point, color: string = 'var(--accent-color)', hideHeads: boolean = false) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx);
  const headLen = 6 + lineThickness * 3; // Scale head with line thickness

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
      <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={color} strokeWidth={lineThickness} strokeOpacity="0.8" />
      {!hideHeads && (
        <>
          {/* End Head */}
          <polygon points={`${end.x},${end.y} ${headX1},${headY1} ${headX2},${headY2}`} fill={color} fillOpacity="0.8" />
          {/* Start Head */}
          <polygon points={`${start.x},${start.y} ${headX1_s},${headY1_s} ${headX2_s},${headY2_s}`} fill={color} fillOpacity="0.8" />
        </>
      )}
    </g>
  );
};

const renderActiveAnnotation = () => {
  if (!activeAnnotation || activeAnnotation.points.length === 0) return null;

  const p1 = getScreenCoordinates(activeAnnotation.points[0]);
  if (!p1) return null;

  if (activeAnnotation.points.length === 1 && mousePos && workspaceRect) {
    const calibratedMouse = {
      x: mousePos.x - workspaceRect.left,
      y: mousePos.y - workspaceRect.top
    };

    const mousePanelId = (() => {
      for (const [id, rect] of Object.entries(panelRects)) {
        if (!rect) continue;
        if (mousePos.x >= rect.left && mousePos.x <= rect.right &&
          mousePos.y >= rect.top && mousePos.y <= rect.bottom) {
          return id;
        }
      }
      return null;
    })();

    if (activeAnnotation.type === 'area') {
      const panelId = activeAnnotation.points[0].panelId;
      const isP1_2 = panelId === '2';
      const isUnlinked = activeAnnotation.isLocked === false;

      const rx = (isP1_2 && isUnlinked && activeAnnotation.radius2 !== undefined ? activeAnnotation.radius2 : (activeAnnotation.radius || 30)) * panelTransforms[panelId].scale;
      const ry = (isP1_2 && isUnlinked && activeAnnotation.ry2 !== undefined ? activeAnnotation.ry2 : (activeAnnotation.ry || activeAnnotation.radius || 30)) * panelTransforms[panelId].scale;
      const rot = (isP1_2 && isUnlinked && activeAnnotation.rotation2 !== undefined ? activeAnnotation.rotation2 : (activeAnnotation.rotation || 0));

      const startI = getEllipseIntersection(p1, calibratedMouse, rx, ry, rot);

      return (
        <g>
          {renderArrow(startI, calibratedMouse, 'rgba(255, 152, 0, 0.5)')}
          <ellipse
            cx={p1.x} cy={p1.y} rx={rx} ry={ry}
            transform={`rotate(${rot}, ${p1.x}, ${p1.y})`}
            fill="none" stroke="#ff9800" strokeWidth="1" strokeDasharray="4 2"
          />
        </g>
      );
    }

    return (
      <g>
        {renderArrow(p1, calibratedMouse, 'rgba(255, 152, 0, 0.5)')}
        {(() => {
          const p1PanelId = activeAnnotation.points[0].panelId;
          let labelPos = p1; // Default/Fallback

          if (labelPosition === 'center') {
            labelPos = { x: (p1.x + calibratedMouse.x) / 2, y: (p1.y + calibratedMouse.y) / 2 };
          } else if (labelPosition === 'image1') {
            labelPos = (p1PanelId === '1') ? p1 : (mousePanelId === '1' ? calibratedMouse : p1);
          } else if (labelPosition === 'image2') {
            labelPos = (p1PanelId === '2') ? p1 : (mousePanelId === '2' ? calibratedMouse : p1);
          }
          return renderLabel(labelPos, '?', 'rgba(255, 152, 0, 0.5)');
        })()}
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

const renderHandle = (pos: Point, annId: string, pointIndex: number, color: string) => {
  return (
    <circle
      cx={pos.x} cy={pos.y} r={10}
      fill="transparent"
      stroke={dragState?.annId === annId && dragState?.pointIndex === pointIndex ? color : "transparent"}
      strokeWidth="1"
      style={{ cursor: 'move', pointerEvents: 'auto' }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        isDraggingRef.current = false;
        setDragState({ annId, pointIndex });
      }}
    />
  );
};

const renderLabel = (pos: Point, label: string, color: string) => {
  const offset = 20; // Offset label from the actual point
  const radius = labelFontSize * 0.8 + 2;
  return (
    <g style={{ pointerEvents: 'auto' }}>
      <line x1={pos.x} y1={pos.y} x2={pos.x + offset} y2={pos.y - offset} stroke={color} strokeWidth={Math.max(1, lineThickness / 2)} strokeDasharray="2 2" />
      {showLabelBackground && (
        <circle cx={pos.x + offset} cy={pos.y - offset} r={radius} fill={labelBgColor.startsWith('var') ? 'var(--panel-bg)' : labelBgColor} stroke={color} strokeWidth="2" />
      )}
      <text
        x={pos.x + offset}
        y={pos.y - offset}
        textAnchor="middle"
        dominantBaseline="central"
        fill={labelColor}
        fontSize={`${labelFontSize}px`}
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
  return annotations.map((ann, idx) => {
    if (ann.points.length < 1) return null;

    const p1 = getScreenCoordinates(ann.points[0]);
    const p2 = ann.points.length > 1 ? getScreenCoordinates(ann.points[1]) : null;

    if (!p1) return null;

    const p1Visible = isImagePointVisible(ann.points[0].panelId, ann.points[0].imageCoord, ann.points[0].imageId);
    const p2Visible = ann.points.length > 1 ? isImagePointVisible(ann.points[1].panelId, ann.points[1].imageCoord, ann.points[1].imageId) : false;

    const isEditing = editingAnnotationId === ann.id;
    const displayLabel = labelType === 'alphabetic' ? getAlphabeticLabel(idx) : (idx + 1).toString();

    return (
      <g
        key={ann.id}
        style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        onClick={(e) => {
          e.stopPropagation();
          if (!isDraggingRef.current) {
            setEditingAnnotationId(ann.id);
          }
          isDraggingRef.current = false;
        }}
        onMouseEnter={() => setHoveredAnnId(ann.id)}
        onMouseLeave={() => setHoveredAnnId(null)}
      >
        {(() => {
          if (!p2 || !p1Visible || !p2Visible) return null;

          if (ann.type === 'area') {
            const panelId1 = ann.points[0].panelId;
            const panelId2 = ann.points[1].panelId;
            const isP1_2 = panelId1 === '2';
            const isP2_2 = panelId2 === '2';
            const isUnlinked = ann.isLocked === false;

            const rx1 = (isP1_2 && isUnlinked && ann.radius2 !== undefined ? ann.radius2 : (ann.radius || 30)) * panelTransforms[panelId1].scale;
            const ry1 = (isP1_2 && isUnlinked && ann.ry2 !== undefined ? ann.ry2 : (ann.ry || ann.radius || 30)) * panelTransforms[panelId1].scale;
            const rot1 = (isP1_2 && isUnlinked && ann.rotation2 !== undefined ? ann.rotation2 : (ann.rotation || 0));

            const rx2 = (isP2_2 && isUnlinked && ann.radius2 !== undefined ? ann.radius2 : (ann.radius || 30)) * panelTransforms[panelId2].scale;
            const ry2 = (isP2_2 && isUnlinked && ann.ry2 !== undefined ? ann.ry2 : (ann.ry || ann.radius || 30)) * panelTransforms[panelId2].scale;
            const rot2 = (isP2_2 && isUnlinked && ann.rotation2 !== undefined ? ann.rotation2 : (ann.rotation || 0));

            const startI = getEllipseIntersection(p1, p2, rx1, ry1, rot1);
            const endI = getEllipseIntersection(p2, p1, rx2, ry2, rot2);
            return renderArrow(startI, endI, ann.color, true);
          }

          return renderArrow(p1, p2, ann.color);
        })()}

        {ann.type === 'area' && (
          Object.keys(panelTransforms).map(panelId => {
            const centerPointForPanel = ann.points.find(p => p.panelId === panelId) || ann.points[0];

            if (!isImagePointVisible(panelId, centerPointForPanel.imageCoord, centerPointForPanel.imageId)) return null;

            const mirroredCoords = getCoordsForPanel(panelId, centerPointForPanel.imageCoord, centerPointForPanel.imageId);
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
                strokeWidth={isEditing ? lineThickness * 1.5 : lineThickness}
                strokeDasharray={isEditing ? "" : "4 2"}
              />
            );
          })
        )}

        {/* Hover node dots for Area markers */}
        {ann.type === 'area' && hoveredAnnId === ann.id && (
          ann.points.map((pt, pIdx) => {
            const coords = getCoordsForPanel(pt.panelId, pt.imageCoord, pt.imageId);
            if (!coords) return null;
            return (
              <circle
                key={`node-${ann.id}-${pIdx}`}
                cx={coords.x} cy={coords.y} r="4"
                fill={ann.color}
                style={{ pointerEvents: 'none' }}
              />
            );
          })
        )}

        {(() => {
          const pt1 = ann.points[0];
          const pt2 = ann.points.length > 1 ? ann.points[1] : null;

          let labelPos: Point = p1; // Default

          if (labelPosition === 'center' && p2 && p2Visible && p1Visible) {
            labelPos = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
          } else if (labelPosition === 'image1') {
            if (pt1.panelId === '1' && p1Visible) labelPos = p1;
            else if (pt2 && pt2.panelId === '1' && p2Visible) labelPos = p2!;
          } else if (labelPosition === 'image2') {
            if (pt1.panelId === '2' && p1Visible) labelPos = p1;
            else if (pt2 && pt2.panelId === '2' && p2Visible) labelPos = p2!;
          } else {
            labelPos = p1Visible ? p1 : (p2Visible && p2 ? p2 : p1);
          }

          return renderLabel(labelPos, displayLabel, ann.color);
        })()}

        {/* Draggable Handles */}
        {p1Visible && renderHandle(p1, ann.id, 0, ann.color)}
        {p2 && p2Visible && renderHandle(p2, ann.id, 1, ann.color)}
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
