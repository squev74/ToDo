import { useState, useEffect, useRef, useMemo } from 'react';

export interface TaskFiltersState {
  searchQuery: string;
  selectedStatuses: any[] | null;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  selectedProjectIds?: string[] | null;
  selectedProjectFilter?: string;
  startDate?: string;
  endDate?: string;
  projectId?: string;
  [key: string]: any;
}

/**
 * Custom hook to persist and automatically restore task filters based on the view type and project context.
 *
 * @param viewType - The current tab/view: 'active' | 'backlog' | 'archive'
 * @param projectId - The selected project ID, or 'global' if multi-project view.
 * @param defaultFilters - Fallback default filter values.
 * @param spaceId - The active workspace ID to prevent filter bleeding between workspaces.
 */
export function useTaskFiltersPersist<T extends TaskFiltersState>(
  viewType: 'active' | 'backlog' | 'archive',
  projectId: string | null | undefined,
  defaultFilters: T,
  spaceId?: string
) {
  // Normalize projectId and spaceId for key naming
  const resolvedProjectId = projectId && projectId.trim() !== '' ? projectId : 'global';
  const resolvedSpaceId = spaceId && spaceId.trim() !== '' ? spaceId : 'default';
  const storageKey = `pmo_task_filters_space_${resolvedSpaceId}_${viewType}_${resolvedProjectId}`;

  // Helper to load stored filters from localStorage
  const getStoredFilters = (): T => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          // Merge with defaultFilters to guarantee structure and fallback gracefully
          return { ...defaultFilters, ...parsed } as T;
        }
      }
    } catch (error) {
      console.error('[useTaskFiltersPersist] Error loading or parsing filters from storage:', error);
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {
        // ignore
      }
    }
    return defaultFilters;
  };

  const [filters, setFilters] = useState<T>(getStoredFilters);

  // Clean up old, obsolete, or malformed localStorage keys on mount to prevent clutter/corruption
  useEffect(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('pmo_task_filters_') && !key.startsWith('pmo_task_filters_space_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => {
        localStorage.removeItem(key);
      });
    } catch (e) {
      console.error('[useTaskFiltersPersist] Error during legacy keys cleanup:', e);
    }
  }, []);

  // A ref to track the storageKey for which the current filters state is valid.
  // This prevents saving older workspace/view state into a newly switched workspace/view slot.
  const loadedKeyRef = useRef<string>(storageKey);

  // Track the previous state for selective debouncing on searchQuery changes
  const prevFiltersRef = useRef<T>(filters);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Restore stored filters automatically when viewType, project, or workspace changes
  useEffect(() => {
    const loaded = getStoredFilters();
    setFilters(loaded);
    loadedKeyRef.current = storageKey;
    prevFiltersRef.current = loaded;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    // If the state filters in memory do not yet belong to the active storageKey,
    // skip saving to prevent overwriting the new key with stale filters of the old key.
    if (loadedKeyRef.current !== storageKey) {
      return;
    }

    // If the filters object reference is identical, nothing has changed, so we skip saving.
    if (filters === prevFiltersRef.current) {
      return;
    }

    const saveToLocalStorage = (data: T) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (error) {
        console.error('[useTaskFiltersPersist] Error saving filters to storage:', error);
      }
    };

    const hasSearchQueryChanged = filters.searchQuery !== prevFiltersRef.current.searchQuery;

    if (hasSearchQueryChanged) {
      // Apply 150ms debounce on textual search queries to minimize disk writes
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        saveToLocalStorage(filters);
      }, 150);
    } else {
      // Save changes immediately for other structural changes (status, project selections)
      saveToLocalStorage(filters);
    }

    prevFiltersRef.current = filters;

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [filters, storageKey]);

  // Update a single filter field
  const updateFilter = <K extends keyof T>(key: K, value: T[K]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Update multiple filter fields at once
  const updateFilters = (newFilters: Partial<T>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  };

  // Reset filters to default state and clear local storage entry
  const resetFilters = () => {
    setFilters(defaultFilters);
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('[useTaskFiltersPersist] Error resetting storage key:', error);
    }
  };

  // Calculate if the filters currently applied differ from defaults
  const isCustomActive = useMemo(() => {
    return Object.keys(defaultFilters).some((key) => {
      const defaultVal = defaultFilters[key];
      const currentVal = filters[key];
      return JSON.stringify(defaultVal) !== JSON.stringify(currentVal);
    });
  }, [filters, defaultFilters]);

  return {
    filters,
    setFilters,
    updateFilter,
    updateFilters,
    resetFilters,
    isCustomActive,
  };
}
