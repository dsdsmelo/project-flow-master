import { useState, useEffect, useCallback } from 'react';

export interface StandardColumn {
  id: string;
  name: string;
  visible: boolean;
  order: number;
  isStandard: true;
  canDelete: boolean;
}

const DEFAULT_STANDARD_COLUMNS: Omit<StandardColumn, 'visible' | 'order'>[] = [
  { id: 'name', name: 'Tarefa', isStandard: true, canDelete: false },
  { id: 'description', name: 'Descrição', isStandard: true, canDelete: true },
  { id: 'responsible', name: 'Responsável', isStandard: true, canDelete: true },
  { id: 'status', name: 'Status', isStandard: true, canDelete: true },
  { id: 'priority', name: 'Prioridade', isStandard: true, canDelete: true },
  { id: 'startDate', name: 'Início', isStandard: true, canDelete: true },
  { id: 'endDate', name: 'Fim', isStandard: true, canDelete: true },
  { id: 'progress', name: 'Progresso', isStandard: true, canDelete: true },
];

const getStorageKey = (projectId: string) => `column-settings-${projectId}`;

export const useColumnSettings = (projectId: string) => {
  const [standardColumns, setStandardColumns] = useState<StandardColumn[]>(() => {
    const saved = localStorage.getItem(getStorageKey(projectId));
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Return defaults if parsing fails
      }
    }
    return DEFAULT_STANDARD_COLUMNS.map((col, index) => ({
      ...col,
      visible: true,
      order: index + 1,
    }));
  });

  // Sync to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem(getStorageKey(projectId), JSON.stringify(standardColumns));
  }, [standardColumns, projectId]);

  // Reload settings when projectId changes
  useEffect(() => {
    const saved = localStorage.getItem(getStorageKey(projectId));
    if (saved) {
      try {
        setStandardColumns(JSON.parse(saved));
        return;
      } catch {
        // Fall through to defaults
      }
    }
    setStandardColumns(
      DEFAULT_STANDARD_COLUMNS.map((col, index) => ({
        ...col,
        visible: true,
        order: index + 1,
      }))
    );
  }, [projectId]);

  const toggleColumnVisibility = useCallback((columnId: string) => {
    setStandardColumns(prev => 
      prev.map(col => 
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  }, []);

  const updateColumnName = useCallback((columnId: string, name: string) => {
    setStandardColumns(prev => 
      prev.map(col => 
        col.id === columnId ? { ...col, name } : col
      )
    );
  }, []);

  const reorderColumns = useCallback((draggedId: string, targetId: string) => {
    setStandardColumns(prev => {
      const draggedIndex = prev.findIndex(col => col.id === draggedId);
      const targetIndex = prev.findIndex(col => col.id === targetId);
      
      if (draggedIndex === -1 || targetIndex === -1) return prev;
      
      const newColumns = [...prev];
      const [removed] = newColumns.splice(draggedIndex, 1);
      newColumns.splice(targetIndex, 0, removed);
      
      return newColumns.map((col, index) => ({ ...col, order: index + 1 }));
    });
  }, []);

  const visibleColumns = standardColumns
    .filter(col => col.visible)
    .sort((a, b) => a.order - b.order);

  const resetToDefaults = useCallback(() => {
    const defaults = DEFAULT_STANDARD_COLUMNS.map((col, index) => ({
      ...col,
      visible: true,
      order: index + 1,
    }));
    setStandardColumns(defaults);
  }, []);

  return {
    standardColumns,
    visibleColumns,
    toggleColumnVisibility,
    updateColumnName,
    reorderColumns,
    resetToDefaults,
    setStandardColumns,
  };
};
