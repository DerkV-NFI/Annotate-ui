import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Point, Transform } from '../utils/coordinates';
import { generateId } from '../utils/id';

export type MarkerType = 'point' | 'area';

export interface AnnotationPoint {
  panelId: string;
  imageId?: string;
  imageCoord: Point;
}

export interface Annotation {
  id: string;
  label: string; // "1", "2", "A", etc.
  type: MarkerType;
  radius?: number; // for legacy/rx (Panel 1)
  ry?: number;
  rotation?: number;
  radius2?: number; // for rx (Panel 2) if unlinked
  ry2?: number;
  rotation2?: number;
  isLocked?: boolean; // defaults to true
  points: AnnotationPoint[]; // 0, 1, or 2 points
  text: string;
  color: string;
}

export interface PanelImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
}

export type ToolMode = 'pan' | 'annotate';

interface AppStateContextType {
  annotations: Annotation[];
  setAnnotations: React.Dispatch<React.SetStateAction<Annotation[]>>;

  // The current annotation being drawn
  activeAnnotation: Annotation | null;
  setActiveAnnotation: React.Dispatch<React.SetStateAction<Annotation | null>>;

  // Current tool mode
  toolMode: ToolMode;
  setToolMode: React.Dispatch<React.SetStateAction<ToolMode>>;

  // Currently selected marker type for new annotations
  activeMarkerType: MarkerType;
  setActiveMarkerType: React.Dispatch<React.SetStateAction<MarkerType>>;

  // We need to keep track of panel transforms and container rects globally
  // so the SVG overlay can draw lines correctly between them.
  panelTransforms: Record<string, Transform>;
  setPanelTransform: (panelId: string, transform: Transform) => void;

  panelRects: Record<string, DOMRect | null>;
  setPanelRect: (panelId: string, rect: DOMRect | null) => void;

  imageSizes: Record<string, { width: number, height: number } | null>;
  setImageSize: (panelId: string, size: { width: number, height: number } | null) => void;

  workspaceRect: DOMRect | null;
  setWorkspaceRect: (rect: DOMRect | null) => void;

  lastUsedColor: string;
  setLastUsedColor: (color: string) => void;

  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;

  layoutMode: 'side-by-side' | 'top-bottom';
  setLayoutMode: (mode: 'side-by-side' | 'top-bottom' | ((prev: 'side-by-side' | 'top-bottom') => 'side-by-side' | 'top-bottom')) => void;

  // Multiple images per panel
  panelImages: Record<string, PanelImage[]>;
  setPanelImages: React.Dispatch<React.SetStateAction<Record<string, PanelImage[]>>>;
  selectedImageId: Record<string, string | null>;
  setSelectedImageId: (panelId: string, imageId: string | null) => void;
  addPanelImage: (panelId: string, image: Omit<PanelImage, 'id'>) => string;
  updatePanelImage: (panelId: string, imageId: string, updates: Partial<PanelImage>) => void;
  removePanelImage: (panelId: string, imageId: string) => void;

  // Legacy single image compatibility
  imageSrcs: Record<string, string | null>;
  setImageSrc: (panelId: string, src: string | null) => void;

  // Popover state
  editingAnnotationId: string | null;
  setEditingAnnotationId: (id: string | null) => void;

  // Global settings
  labelType: 'numeric' | 'alphabetic';
  setLabelType: (type: 'numeric' | 'alphabetic') => void;
  labelFontSize: number;
  setLabelFontSize: (size: number) => void;
  showLabelBackground: boolean;
  setShowLabelBackground: (show: boolean) => void;
  lineThickness: number;
  setLineThickness: (thickness: number) => void;
  labelPosition: 'image1' | 'center' | 'image2';
  setLabelPosition: (pos: 'image1' | 'center' | 'image2') => void;
  labelColor: string;
  setLabelColor: (color: string) => void;
  labelBgColor: string;
  setLabelBgColor: (color: string) => void;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  projectName: string;
  setProjectName: (name: string) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeAnnotation, setActiveAnnotation] = useState<Annotation | null>(null);
  const [toolMode, setToolMode] = useState<ToolMode>('pan');
  const [activeMarkerType, setActiveMarkerType] = useState<MarkerType>('point');

  const [panelTransforms, setPanelTransforms] = useState<Record<string, Transform>>({
    '1': { scale: 1, offset: { x: 0, y: 0 } },
    '2': { scale: 1, offset: { x: 0, y: 0 } }
  });

  const [panelRects, setPanelRects] = useState<Record<string, DOMRect | null>>({
    '1': null,
    '2': null
  });

  const [imageSizes, setImageSizes] = useState<Record<string, { width: number, height: number } | null>>({
    '1': null,
    '2': null
  });

  const setPanelTransform = (panelId: string, transform: Transform) => {
    setPanelTransforms(prev => ({ ...prev, [panelId]: transform }));
  };

  const setPanelRect = (panelId: string, rect: DOMRect | null) => {
    setPanelRects(prev => ({ ...prev, [panelId]: rect }));
  };

  const setImageSize = (panelId: string, size: { width: number, height: number } | null) => {
    setImageSizes(prev => ({ ...prev, [panelId]: size }));
  };

  const [panelImages, setPanelImages] = useState<Record<string, PanelImage[]>>({
    '1': [],
    '2': []
  });

  const [selectedImageId, setSelectedImageIdState] = useState<Record<string, string | null>>({
    '1': null,
    '2': null
  });

  const setSelectedImageId = (panelId: string, imageId: string | null) => {
    setSelectedImageIdState(prev => ({ ...prev, [panelId]: imageId }));
  };

  const [workspaceRect, setWorkspaceRect] = useState<DOMRect | null>(null);
  const [lastUsedColor, setLastUsedColor] = useState<string>('var(--accent-color)');
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('forensic-theme');
    return (saved as 'light' | 'dark') || 'dark';
  });

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    localStorage.setItem('forensic-theme', newTheme);
  };
  const [layoutMode, setLayoutMode] = useState<'side-by-side' | 'top-bottom'>('side-by-side');

  const addPanelImage = (panelId: string, image: Omit<PanelImage, 'id'>): string => {
    const id = generateId();
    const newImage: PanelImage = { ...image, id };
    setPanelImages(prev => ({
      ...prev,
      [panelId]: [...(prev[panelId] || []), newImage]
    }));
    setSelectedImageId(panelId, id);
    setHasUnsavedChanges(true);
    return id;
  };

  const updatePanelImage = (panelId: string, imageId: string, updates: Partial<PanelImage>) => {
    setPanelImages(prev => ({
      ...prev,
      [panelId]: (prev[panelId] || []).map(img => img.id === imageId ? { ...img, ...updates } : img)
    }));
    setHasUnsavedChanges(true);
  };

  const removePanelImage = (panelId: string, imageId: string) => {
    setPanelImages(prev => ({
      ...prev,
      [panelId]: (prev[panelId] || []).filter(img => img.id !== imageId)
    }));
    setSelectedImageIdState(prev => (prev[panelId] === imageId ? { ...prev, [panelId]: null } : prev));
    // Clean up annotations linked to this image
    setAnnotations(prev => prev.filter(ann => !ann.points.some(p => p.panelId === panelId && p.imageId === imageId)));
    setHasUnsavedChanges(true);
  };

  // Provide imageSrcs mapped from panelImages for backwards compatibility
  const imageSrcs: Record<string, string | null> = {
    '1': panelImages['1']?.[0]?.src || null,
    '2': panelImages['2']?.[0]?.src || null
  };

  const setImageSrc = (panelId: string, src: string | null) => {
    if (!src) {
      setPanelImages(prev => ({ ...prev, [panelId]: [] }));
      setSelectedImageId(panelId, null);
    } else {
      const img = new Image();
      img.onload = () => {
        const id = generateId();
        const newImg: PanelImage = {
          id,
          src,
          x: -img.naturalWidth / 2,
          y: -img.naturalHeight / 2,
          width: img.naturalWidth,
          height: img.naturalHeight,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        };
        setPanelImages(prev => ({ ...prev, [panelId]: [newImg] }));
        setSelectedImageId(panelId, id);
      };
      img.src = src;
    }
  };

  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);

  const [labelType, setLabelType] = useState<'numeric' | 'alphabetic'>('numeric');
  const [labelFontSize, setLabelFontSize] = useState<number>(12);
  const [showLabelBackground, setShowLabelBackground] = useState<boolean>(true);
  const [lineThickness, setLineThickness] = useState<number>(2);
  const [labelPosition, setLabelPosition] = useState<'image1' | 'center' | 'image2'>('image1');
  const [labelColor, setLabelColor] = useState<string>('var(--text-main)');
  const [labelBgColor, setLabelBgColor] = useState<string>('var(--panel-bg)');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [projectName, setProjectName] = useState<string>('');

  return (
    <AppStateContext.Provider value={{
      annotations,
      setAnnotations,
      activeAnnotation,
      setActiveAnnotation,
      toolMode,
      setToolMode,
      activeMarkerType,
      setActiveMarkerType,
      panelTransforms,
      setPanelTransform,
      panelRects,
      setPanelRect,
      imageSizes,
      setImageSize,
      workspaceRect,
      setWorkspaceRect,
      lastUsedColor,
      setLastUsedColor,
      theme,
      setTheme,
      editingAnnotationId,
      setEditingAnnotationId,
      labelType,
      setLabelType,
      labelFontSize,
      setLabelFontSize,
      showLabelBackground,
      setShowLabelBackground,
      lineThickness,
      setLineThickness,
      labelPosition,
      setLabelPosition,
      labelColor,
      setLabelColor,
      labelBgColor,
      setLabelBgColor,
      layoutMode,
      setLayoutMode,
      panelImages,
      setPanelImages,
      selectedImageId,
      setSelectedImageId,
      addPanelImage,
      updatePanelImage,
      removePanelImage,
      imageSrcs,
      setImageSrc,
      hasUnsavedChanges,
      setHasUnsavedChanges,
      projectName,
      setProjectName
    }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
