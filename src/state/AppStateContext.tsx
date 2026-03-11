import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Point, Transform } from '../utils/coordinates';

export type MarkerType = 'point' | 'area';

export interface AnnotationPoint {
  panelId: string;
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

  // Popover state
  editingAnnotationId: string | null;
  setEditingAnnotationId: (id: string | null) => void;
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

  const [workspaceRect, setWorkspaceRect] = useState<DOMRect | null>(null);
  const [lastUsedColor, setLastUsedColor] = useState<string>('var(--accent-color)');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);

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
      setEditingAnnotationId
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
