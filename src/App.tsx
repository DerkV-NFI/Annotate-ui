import { useState, useEffect, useRef } from 'react';
import { domToPng } from 'modern-screenshot';
import './index.css';
import { ImagePanel } from './components/ImagePanel';
import { SvgOverlay } from './components/SvgOverlay';
import { AppStateProvider, useAppState, getAlphabeticLabel } from './state/AppStateContext';
import type { Annotation } from './state/AppStateContext';

function AnnotationListItem({
  ann,
  displayLabel,
  onDelete,
  onChangeText,
  onChangeColor,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  isNew
}: {
  ann: Annotation;
  displayLabel: string;
  onDelete: () => void;
  onChangeText: (text: string) => void;
  onChangeColor: (color: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  isNew: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isNew && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isNew]);

  const presetColors = [
    { name: 'Default', value: 'var(--accent-color)' },
    { name: 'Red', value: '#ff4444' },
    { name: 'Green', value: '#00c851' }
  ];

  return (
    <div style={{
      backgroundColor: 'var(--bg-color)',
      border: '1px solid var(--border-color)',
      borderRadius: '6px',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: ann.color.startsWith('var') ? 'var(--accent-color)' : ann.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            color: 'white',
            textShadow: '0 0 2px rgba(0,0,0,0.5)'
          }}>
            {displayLabel}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
            {ann.type} marker
          </span>
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            disabled={isFirst}
            onClick={onMoveUp}
            style={{ ...smallIconButtonStyle, opacity: isFirst ? 0.3 : 1 }}
            title="Move Up"
          >
            ↑
          </button>
          <button
            disabled={isLast}
            onClick={onMoveDown}
            style={{ ...smallIconButtonStyle, opacity: isLast ? 0.3 : 1 }}
            title="Move Down"
          >
            ↓
          </button>
          <button
            onClick={onDelete}
            style={{ ...smallIconButtonStyle, color: 'var(--danger-color)' }}
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {presetColors.map(c => (
          <button
            key={c.value}
            onClick={() => onChangeColor(c.value)}
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: c.value.startsWith('var') ? 'var(--accent-color)' : c.value,
              border: ann.color === c.value ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
              padding: 0
            }}
            title={c.name}
          />
        ))}
        <div style={{ position: 'relative', width: '16px', height: '16px' }}>
          <input
            type="color"
            value={ann.color.startsWith('var') ? '#007acc' : ann.color}
            onChange={(e) => onChangeColor(e.target.value)}
            style={{
              opacity: 0,
              position: 'absolute',
              width: '100%',
              height: '100%',
              cursor: 'pointer'
            }}
            title="Custom Color"
          />
          <div style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
            border: (!presetColors.some(c => c.value === ann.color)) ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
            pointerEvents: 'none'
          }} />
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={ann.text}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder="Enter description..."
        style={{
          backgroundColor: 'var(--input-bg, var(--bg-color))',
          color: 'var(--text-main)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          padding: '8px',
          fontSize: '0.85rem',
          resize: 'vertical',
          minHeight: '60px',
          fontFamily: 'inherit'
        }}
      />
    </div>
  );
}

function ResizePopover({
  ann,
  onUpdate,
  onClose
}: {
  ann: Annotation,
  onUpdate: (updates: Partial<Annotation>) => void,
  onClose: () => void
}) {
  const isLocked = ann.isLocked !== false;

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'var(--panel-bg)',
      border: '1px solid var(--accent-color)',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      zIndex: 1000,
      width: '240px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxHeight: '80vh',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '0.9rem', margin: 0 }}>Marker Shape: {ann.label}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
      </div>

      <button
        onClick={() => {
          const nextLocked = !isLocked;
          const updates: Partial<Annotation> = { isLocked: nextLocked };
          
          // When unlinking, copy current Panel 1 settings to Panel 2 for continuity
          if (!nextLocked) {
            updates.radius2 = ann.radius || 30;
            updates.ry2 = ann.ry || ann.radius || 30;
            updates.rotation2 = ann.rotation || 0;
          }
          
          onUpdate(updates);
        }}
        style={{
          ...buttonStyle,
          backgroundColor: isLocked ? 'var(--accent-color)' : 'transparent',
          color: isLocked ? 'white' : 'var(--accent-color)',
          fontSize: '0.75rem',
          padding: '4px 8px'
        }}
      >
        {isLocked ? '🔒 Coordinates Linked' : '🔓 Coordinates Unlinked'}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4 style={{ fontSize: '0.8rem', margin: '4px 0', color: 'var(--text-muted)' }}>
          {isLocked ? 'Global Parameters' : 'Panel 1 Parameters'}
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Width (rx)</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="range" min="5" max="200" step="1"
              value={ann.radius || 30}
              onChange={(e) => onUpdate({ radius: parseInt(e.target.value) })}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: '0.75rem', width: '25px' }}>{ann.radius || 30}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Height (ry)</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="range" min="5" max="200" step="1"
              value={ann.ry || ann.radius || 30}
              onChange={(e) => onUpdate({ ry: parseInt(e.target.value) })}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: '0.75rem', width: '25px' }}>{ann.ry || ann.radius || 30}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rotation (°)</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="range" min="-180" max="180" step="1"
              value={ann.rotation || 0}
              onChange={(e) => onUpdate({ rotation: parseInt(e.target.value) })}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: '0.75rem', width: '25px' }}>{ann.rotation || 0}</span>
          </div>
        </div>
      </div>

      {!isLocked && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <h4 style={{ fontSize: '0.8rem', margin: '4px 0', color: 'var(--text-muted)' }}>Panel 2 Parameters</h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Width (rx)</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="range" min="5" max="200" step="1"
                value={ann.radius2 || ann.radius || 30}
                onChange={(e) => onUpdate({ radius2: parseInt(e.target.value) })}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '0.75rem', width: '25px' }}>{ann.radius2 || ann.radius || 30}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Height (ry)</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="range" min="5" max="200" step="1"
                value={ann.ry2 || ann.ry || ann.radius || 30}
                onChange={(e) => onUpdate({ ry2: parseInt(e.target.value) })}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '0.75rem', width: '25px' }}>{ann.ry2 || ann.ry || ann.radius || 30}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rotation (°)</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="range" min="-180" max="180" step="1"
                value={ann.rotation2 || ann.rotation || 0}
                onChange={(e) => onUpdate({ rotation2: parseInt(e.target.value) })}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '0.75rem', width: '25px' }}>{ann.rotation2 || ann.rotation || 0}</span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onClose}
        style={{
          ...buttonStyle,
          marginTop: '8px',
          width: '100%'
        }}
      >
        Done
      </button>
    </div>
  );
}
const smallIconButtonStyle: React.CSSProperties = {
  background: 'none',
  borderRadius: '4px',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  padding: '2px 6px',
  fontSize: '0.75rem'
};

// Helper for the "Black, White, Custom" color selection in settings
function SettingsColorSelection({
  value,
  onChange,
  label
}: {
  value: string;
  onChange: (c: string) => void;
  label: string;
}) {
  const presetColors = [
    { name: 'White', value: '#ffffff' },
    { name: 'Black', value: '#000000' }
  ];
  const isCustom = !presetColors.some(c => c.value === value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>{label}</label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {presetColors.map(c => (
          <button
            key={c.value}
            onClick={() => onChange(c.value)}
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              backgroundColor: c.value,
              border: value === c.value ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
              boxShadow: value === c.value ? '0 0 0 1px var(--accent-color)' : 'none',
              cursor: 'pointer',
              padding: 0
            }}
            title={c.name}
          />
        ))}

        {/* Rainbow Custom Picker Dot */}
        <div style={{ position: 'relative', width: '18px', height: '18px' }}>
          <input
            type="color"
            value={isCustom ? value : '#007acc'}
            onChange={(e) => onChange(e.target.value)}
            style={{
              opacity: 0,
              position: 'absolute',
              width: '100%',
              height: '100%',
              cursor: 'pointer',
              zIndex: 1
            }}
            title="Custom Color"
          />
          <div style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
            border: isCustom ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
            boxShadow: isCustom ? '0 0 0 1px var(--accent-color)' : 'none',
            pointerEvents: 'none'
          }} />
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const [isExporting, setIsExporting] = useState(false);
  const {
    labelColor,
    setLabelColor,
    layoutMode,
    setLayoutMode,
    imageSrcs,
    setImageSrc,
    panelTransforms,
    setPanelTransform,
    annotations,
    setAnnotations,
    toolMode,
    setToolMode,
    activeMarkerType,
    setActiveMarkerType,
    editingAnnotationId,
    setEditingAnnotationId,
    setWorkspaceRect,
    setLastUsedColor,
    theme,
    setTheme,
    labelType,
    setLabelType,
    labelFontSize,
    setLabelFontSize,
    showLabelBackground,
    setShowLabelBackground,
    labelBgColor,
    setLabelBgColor,
    lineThickness,
    setLineThickness,
    labelPosition,
    setLabelPosition,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    projectName,
    setProjectName
  } = useAppState();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const prevAnnotationsCount = useRef(annotations.length);
  const isInitialMount = useRef(true);

  // Mark project as unsaved when data changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    // Only set to true if not already true, to avoid recursive loops 
    // though these deps are simple state values
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  }, [
    annotations, 
    imageSrcs, 
    layoutMode, 
    labelType, 
    labelFontSize, 
    showLabelBackground, 
    labelBgColor, 
    labelColor, 
    lineThickness, 
    labelPosition,
    setHasUnsavedChanges,
    projectName,
    setProjectName
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in a textarea or input
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }
      if (e.key === '1') {
        setToolMode('annotate');
        setActiveMarkerType('point');
      } else if (e.key === '2') {
        setToolMode('annotate');
        setActiveMarkerType('area');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setToolMode, setActiveMarkerType]);

  // Sync theme to body attribute
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  // Sync workspace rect for coordinate calibration
  useEffect(() => {
    const updateRect = () => {
      if (mainRef.current) {
        setWorkspaceRect(mainRef.current.getBoundingClientRect());
      }
    };
    updateRect();
    window.addEventListener('resize', updateRect);
    return () => window.removeEventListener('resize', updateRect);
  }, [setWorkspaceRect]);

  const editingAnn = annotations.find(a => a.id === editingAnnotationId);

  const moveAnnotation = (index: number, direction: 'up' | 'down') => {
    setAnnotations(prev => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;

      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;

      return next;
    });
  };

  const exportCSV = () => {
    const headers = ['Label', 'Type', 'Description', 'Image 1 X', 'Image 1 Y', 'Image 2 X', 'Image 2 Y'];
    const rows = annotations.map((ann, idx) => {
      const displayLabel = labelType === 'alphabetic' ? getAlphabeticLabel(idx) : (idx + 1).toString();
      return [
        displayLabel,
        ann.type,
        ann.text.replace(/"/g, '""'),
        ann.points[0]?.imageCoord.x.toFixed(2) || '',
        ann.points[0]?.imageCoord.y.toFixed(2) || '',
        ann.points[1]?.imageCoord.x.toFixed(2) || '',
        ann.points[1]?.imageCoord.y.toFixed(2) || '',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const fileName = projectName.trim() 
      ? `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`
      : `forensic_annotations_${new Date().getTime()}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.click();
  };

  const exportVisual = async () => {
    if (!mainRef.current) return;
    setIsExporting(true);
    try {
      const main = mainRef.current;
      const mainRect = main.getBoundingClientRect();

      // 1. Find bounding box of all images and annotations in screen coordinates
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let foundContent = false;

      // Check images
      const images = main.querySelectorAll('img');
      images.forEach(img => {
        const rect = img.getBoundingClientRect();
        if (rect.width > 1 && rect.height > 1) { // Ignore tiny placeholders
          minX = Math.min(minX, rect.left);
          minY = Math.min(minY, rect.top);
          maxX = Math.max(maxX, rect.right);
          maxY = Math.max(maxY, rect.bottom);
          foundContent = true;
        }
      });

      // Check SVG annotations markers/labels
      const svg = main.querySelector('svg');
      if (svg) {
        const markers = svg.querySelectorAll('circle, text, path');
        markers.forEach(m => {
          const sRect = (m as SVGElement).getBoundingClientRect();
          if (sRect.width > 0 && sRect.height > 0) {
            minX = Math.min(minX, sRect.left);
            minY = Math.min(minY, sRect.top);
            maxX = Math.max(maxX, sRect.right);
            maxY = Math.max(maxY, sRect.bottom);
            foundContent = true;
          }
        });
      }

      // If no markers found but we have images, use images. 
      // If nothing found at all, use main rect.
      if (!foundContent) {
        minX = mainRect.left;
        minY = mainRect.top;
        maxX = mainRect.right;
        maxY = mainRect.bottom;
      }

      // 2. Add padding (20px) and clamp to main area
      const padding = 20;
      minX = Math.max(mainRect.left, minX - padding);
      minY = Math.max(mainRect.top, minY - padding);
      maxX = Math.min(mainRect.right, maxX + padding);
      maxY = Math.min(mainRect.bottom, maxY + padding);

      const width = maxX - minX;
      const height = maxY - minY;

      if (width <= 0 || height <= 0) throw new Error("Invalid export dimensions");

      // 3. Temporarily strip all backgrounds for true transparency
      const nodesWithBg = main.querySelectorAll('[data-transparent-on-export="true"]');
      const originalBgs = new Map<HTMLElement, string>();

      const setTransparent = (el: HTMLElement) => {
        originalBgs.set(el, el.style.backgroundColor);
        el.style.backgroundColor = 'transparent';
      };

      setTransparent(main);
      nodesWithBg.forEach(node => setTransparent(node as HTMLElement));

      // 4. Capture the full stage
      const dataUrl = await domToPng(main, {
        scale: 2,
        backgroundColor: 'rgba(0,0,0,0)',
        filter: (node: Node) => {
          if (node instanceof HTMLElement && node.hasAttribute('data-html2canvas-ignore')) {
            return false;
          }
          return true;
        }
      });

      // Restore backgrounds immediately
      originalBgs.forEach((bg, el) => { el.style.backgroundColor = bg; });

      // 5. Crop the resulting image to our calculated bounds
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Coordinates are relative to main container
        const cropX = minX - mainRect.left;
        const cropY = minY - mainRect.top;

        canvas.width = width * 2;
        canvas.height = height * 2;

        ctx.drawImage(
          img,
          cropX * 2, cropY * 2, width * 2, height * 2, // Source (at scale 2)
          0, 0, width * 2, height * 2                  // Destination
        );

        const finalUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        
        const fileName = projectName.trim() 
          ? `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`
          : `forensic_report_${new Date().getTime()}.png`;

        link.href = finalUrl;
        link.download = fileName;
        link.click();
        setIsExporting(false);
      };
      img.src = dataUrl;

    } catch (err) {
      console.error('Export failed:', err);
      setIsExporting(false);
    }
  };

  const resetToDefault = () => {
    if (hasUnsavedChanges) {
      const choice = confirm('Current project has unsaved changes. Save before starting a new project?\n\nOK = Save and Reset\nCancel = Discard and Reset');
      if (choice) {
        saveProject();
      }
    } else if (annotations.length > 0 || Object.values(imageSrcs).some(s => s !== null)) {
      if (!confirm('Start a new project? This will clear all current annotations and images.')) return;
    }

    setAnnotations([]);
    setImageSrc('1', null);
    setImageSrc('2', null);
    setProjectName('');
    setHasUnsavedChanges(false);
  };

  const saveProject = () => {
    const projectData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      projectName,
      state: {
        annotations,
        imageSrcs,
        panelTransforms,
        settings: {
          layoutMode,
          labelType,
          labelFontSize,
          showLabelBackground,
          labelBgColor,
          labelColor,
          lineThickness,
          labelPosition
        }
      }
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const fileName = projectName.trim() 
      ? `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`
      : `forensic_project_${new Date().getTime()}.json`;

    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    setHasUnsavedChanges(false);
  };

  const loadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.projectName) setProjectName(data.projectName);
        if (data.state) {
          const { state } = data;
          if (state.annotations) setAnnotations(state.annotations);
          if (state.imageSrcs) {
            Object.entries(state.imageSrcs).forEach(([id, src]) => {
              setImageSrc(id, src as string | null);
            });
          }
          if (state.panelTransforms) {
            Object.entries(state.panelTransforms).forEach(([id, transform]) => {
              setPanelTransform(id, transform as any);
            });
          }
          if (state.settings) {
            const { settings } = state;
            if (settings.layoutMode) setLayoutMode(settings.layoutMode);
            if (settings.labelType) setLabelType(settings.labelType);
            if (settings.labelFontSize) setLabelFontSize(settings.labelFontSize);
            if (settings.showLabelBackground !== undefined) setShowLabelBackground(settings.showLabelBackground);
            if (settings.labelBgColor) setLabelBgColor(settings.labelBgColor);
            if (settings.labelColor) setLabelColor(settings.labelColor);
            if (settings.lineThickness) setLineThickness(settings.lineThickness);
            if (settings.labelPosition) setLabelPosition(settings.labelPosition);
          }
          setHasUnsavedChanges(false);
        }
      } catch (err) {
        console.error('Failed to load project:', err);
        alert('Failed to load project file. Invalid format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      {/* Header / Tabs Area */}
      <header style={{
        height: '50px',
        backgroundColor: 'var(--panel-bg)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        justifyContent: 'space-between',
        zIndex: 50 // Above SVG overlay
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="5" cy="5" r="4.5" fill="#01689b"/>
            <path d="M7 7L24 24" stroke="#01689b" stroke-width="3" stroke-linecap="round"/>
            <path d="M18 26L28 28L26 18L18 26Z" fill="#01689b"/>
          </svg>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Forensic Annotator</h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>Project name:</span>
          <input
            type="text"
            placeholder="Enter name..."
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-color)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '0.9rem',
              width: '200px',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={resetToDefault}
            style={{ ...buttonStyle, backgroundColor: '#95a5a6', color: 'white', border: 'none' }}
            title="Start a new project (clear all)"
          >
            New Project
          </button>
          <button
            onClick={saveProject}
            style={{ ...buttonStyle, backgroundColor: '#2ecc71', color: 'white', border: 'none' }}
            title="Save project (JSON)"
          >
            Save Project
          </button>
          <label
            style={{ ...buttonStyle, backgroundColor: '#3498db', color: 'white', border: 'none', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            title="Load project (JSON)"
          >
            Load Project
            <input type="file" accept=".json" onChange={loadProject} style={{ display: 'none' }} />
          </label>
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)', margin: '0 8px' }} />
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{ ...buttonStyle, backgroundColor: 'transparent', padding: '4px 8px', fontSize: '1.1rem' }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            style={{ ...buttonStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '32px', padding: 0 }}
            onClick={() => setLayoutMode(prev => prev === 'side-by-side' ? 'top-bottom' : 'side-by-side')}
            title={`Switch to ${layoutMode === 'side-by-side' ? 'Top/Bottom' : 'Side-by-Side'} layout`}
          >
            {layoutMode === 'side-by-side' ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="4" width="7" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="11" y="4" width="7" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="2" width="12" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="4" y="11" width="12" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <aside style={{
          width: '300px',
          flexShrink: 0,
          backgroundColor: 'var(--panel-bg)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          overflow: 'hidden'
        }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Annotations</span>
              <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{annotations.length} total</span>
            </div>
            {annotations.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear all annotations? This cannot be undone.')) {
                    setAnnotations([]);
                  }
                }}
                style={{
                  alignSelf: 'flex-start',
                  background: 'none',
                  border: 'none',
                  color: 'var(--danger-color)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  padding: 0,
                  opacity: 0.7
                }}
              >
                Clear All
              </button>
            )}
          </h2>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={() => {
                setToolMode('annotate');
                setActiveMarkerType('point');
              }}
              style={{
                ...buttonStyle,
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: (toolMode === 'annotate' && activeMarkerType === 'point') ? 'var(--accent-hover)' : 'var(--panel-bg)',
                border: (toolMode === 'annotate' && activeMarkerType === 'point') ? '1px solid var(--accent-color)' : '1px solid var(--border-color)'
              }}
              title="Add Point Annotation (1)"
            >
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: (toolMode === 'annotate' && activeMarkerType === 'point') ? 'var(--btn-text)' : 'var(--text-main)' }}>+</span>
              <span style={{ fontSize: '1rem', color: (toolMode === 'annotate' && activeMarkerType === 'point') ? 'var(--btn-text)' : 'var(--text-main)' }}>↗</span>
            </button>
            <button
              onClick={() => {
                setToolMode('annotate');
                setActiveMarkerType('area');
              }}
              style={{
                ...buttonStyle,
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: (toolMode === 'annotate' && activeMarkerType === 'area') ? 'var(--accent-hover)' : 'var(--panel-bg)',
                border: (toolMode === 'annotate' && activeMarkerType === 'area') ? '1px solid var(--accent-color)' : '1px solid var(--border-color)'
              }}
              title="Add Area Annotation (2)"
            >
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: (toolMode === 'annotate' && activeMarkerType === 'area') ? 'var(--btn-text)' : 'var(--text-main)' }}>+</span>
              <span style={{ fontSize: '1rem', color: (toolMode === 'annotate' && activeMarkerType === 'area') ? 'var(--btn-text)' : 'var(--text-main)' }}>○</span>
            </button>
          </div>

          {/* Annotation Settings Collapsible */}
          <div style={{ marginBottom: '16px', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: 'var(--panel-bg)',
                border: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                fontWeight: 'bold'
              }}
            >
              Annotation Settings
              <span>{isSettingsOpen ? '▼' : '▶'}</span>
            </button>

            {isSettingsOpen && (
              <div style={{ padding: '12px', backgroundColor: 'var(--panel-bg)', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)' }}>
                {/* Numbering Type */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>NUMBERING FORMAT</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => setLabelType('numeric')}
                      style={{
                        ...buttonStyle,
                        flex: 1,
                        fontSize: '0.7rem',
                        padding: '4px',
                        backgroundColor: labelType === 'numeric' ? 'var(--accent-color)' : 'transparent',
                        color: labelType === 'numeric' ? 'var(--btn-text)' : 'var(--text-main)',
                        borderColor: labelType === 'numeric' ? 'var(--accent-color)' : 'var(--border-color)'
                      }}
                    >
                      1, 2, 3
                    </button>
                    <button
                      onClick={() => setLabelType('alphabetic')}
                      style={{
                        ...buttonStyle,
                        flex: 1,
                        fontSize: '0.7rem',
                        padding: '4px',
                        backgroundColor: labelType === 'alphabetic' ? 'var(--accent-color)' : 'transparent',
                        color: labelType === 'alphabetic' ? 'var(--btn-text)' : 'var(--text-main)',
                        borderColor: labelType === 'alphabetic' ? 'var(--accent-color)' : 'var(--border-color)'
                      }}
                    >
                      A, B, C
                    </button>
                  </div>
                </div>

                {/* Background Settings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={showLabelBackground}
                      onChange={(e) => setShowLabelBackground(e.target.checked)}
                    />
                    Label Background
                  </label>

                  {showLabelBackground && (
                    <SettingsColorSelection
                      label="BACKGROUND COLOR"
                      value={labelBgColor}
                      onChange={setLabelBgColor}
                    />
                  )}
                </div>

                {/* Text Color Selection */}
                <SettingsColorSelection
                  label="TEXT COLOR"
                  value={labelColor}
                  onChange={setLabelColor}
                />

                <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />

                {/* Font Size */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>LABEL SIZE</label>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-main)' }}>{labelFontSize}px</span>
                  </div>
                  <input
                    type="range" min="8" max="24" value={labelFontSize}
                    onChange={(e) => setLabelFontSize(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-color)' }}
                  />
                </div>

                {/* Line Thickness */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>LINE WEIGHT</label>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-main)' }}>{lineThickness}px</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="0.5" value={lineThickness}
                    onChange={(e) => setLineThickness(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-color)' }}
                  />
                </div>

                {/* Label Position */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>LABEL POSITION</label>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {(['image1', 'center', 'image2'] as const).map(pos => (
                      <button
                        key={pos}
                        onClick={() => setLabelPosition(pos)}
                        style={{
                          ...buttonStyle,
                          flex: 1,
                          fontSize: '0.65rem',
                          padding: '4px 2px',
                          backgroundColor: labelPosition === pos ? 'var(--accent-color)' : 'transparent',
                          color: labelPosition === pos ? 'var(--btn-text)' : 'var(--text-main)',
                          borderColor: labelPosition === pos ? 'var(--accent-color)' : 'var(--border-color)',
                          textTransform: 'capitalize'
                        }}
                      >
                        {pos === 'image1' ? 'Img 1' : pos === 'image2' ? 'Img 2' : 'Center'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {annotations.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>
                No annotations yet. <br />Use the "Add Annotation" tool above.
              </p>
            ) : (
              annotations.map((ann, index) => {
                const displayLabel = labelType === 'alphabetic' ? getAlphabeticLabel(index) : (index + 1).toString();
                return (
                  <AnnotationListItem
                    key={ann.id}
                    ann={ann}
                    displayLabel={displayLabel}
                    isFirst={index === 0}
                    isLast={index === annotations.length - 1}
                    isNew={index === annotations.length - 1 && annotations.length > prevAnnotationsCount.current}
                    onDelete={() => {
                      setAnnotations(prev => prev.filter(a => a.id !== ann.id));
                    }}
                    onChangeText={(text) => {
                      setAnnotations(prev => prev.map(a => a.id === ann.id ? { ...a, text } : a));
                    }}
                    onChangeColor={(color) => {
                      setAnnotations(prev => prev.map(a => a.id === ann.id ? { ...a, color } : a));
                      setLastUsedColor(color);
                    }}
                    onMoveUp={() => moveAnnotation(index, 'up')}
                    onMoveDown={() => moveAnnotation(index, 'down')}
                  />
                );
              })
            )}
            {/* Capture the count for next render */}
            {(() => { prevAnnotationsCount.current = annotations.length; return null; })()}
          </div>

          {annotations.length > 0 && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                disabled={isExporting}
                onClick={exportVisual}
                style={{ ...buttonStyle, width: '100%' }}
              >
                {isExporting ? 'Exporting...' : 'Export High-Qual Image'}
              </button>
              <button
                onClick={exportCSV}
                style={{ ...buttonStyle, width: '100%', backgroundColor: 'transparent', color: 'var(--accent-color)' }}
              >
                Export CSV Data
              </button>
            </div>
          )}
        </aside>

        {/* Dual Panel Layout */}
        <main
          ref={mainRef}
          data-transparent-on-export="true"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: layoutMode === 'side-by-side' ? 'row' : 'column',
            position: 'relative',
            backgroundColor: 'var(--bg-color)', // Themed background
            minWidth: 0,
            minHeight: 0,
            userSelect: 'none'
          }}
        >
          {/* Panel 1 */}
          <div data-transparent-on-export="true" style={{ flex: '1 1 0%', display: 'flex', overflow: 'hidden', minWidth: 0, minHeight: 0 }}>
            <ImagePanel panelId="1" />
          </div>

          {/* Divider */}
          <div data-html2canvas-ignore="true" style={dividerStyle(layoutMode)}></div>

          {/* Panel 2 */}
          <div data-transparent-on-export="true" style={{ flex: '1 1 0%', display: 'flex', overflow: 'hidden', minWidth: 0, minHeight: 0 }}>
            <ImagePanel panelId="2" />
          </div>

          {/* SVG Overlay */}
          <svg style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none', // Restored to none so panels can receive drag/drop
            zIndex: 40 // Below header (50), above panels
          }}>
            <SvgOverlay />
          </svg>

          {editingAnn && (
            <div data-html2canvas-ignore="true">
              <ResizePopover
                ann={editingAnn}
                onUpdate={(updates) => {
                  setAnnotations(prev => prev.map(a => a.id === editingAnn.id ? { ...a, ...updates } : a));
                }}
                onClose={() => setEditingAnnotationId(null)}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  );
}

const buttonStyle: React.CSSProperties = {
  backgroundColor: 'var(--accent-color)',
  color: 'var(--btn-text)',
  border: '1px solid var(--border-color)',
  padding: '6px 12px',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.85rem',
  transition: 'all 0.2s'
};

const dividerStyle = (mode: 'side-by-side' | 'top-bottom'): React.CSSProperties => ({
  backgroundColor: 'var(--border-color)',
  ...(mode === 'side-by-side' ? { width: '2px', height: '100%', cursor: 'col-resize' } : { height: '2px', width: '100%', cursor: 'row-resize' })
});

export default App;
