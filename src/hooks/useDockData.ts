import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase, TABLES } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { DockItem, DEFAULT_DOCK_ITEMS } from '@/components/Dock/types';

const STORAGE_KEY = 'dock-items';
const SETTINGS_KEY = 'dock-settings';

interface DockSettings {
  showLabels: boolean;
}

const DEFAULT_SETTINGS: DockSettings = {
  showLabels: true,
};

interface UseDockDataReturn {
  dockItems: DockItem[];
  setDockItems: (items: DockItem[] | ((prev: DockItem[]) => DockItem[])) => void;
  addDockItem: (item: DockItem) => void;
  updateDockItem: (id: string, updates: Partial<DockItem>) => void;
  deleteDockItem: (id: string) => void;
  isLoading: boolean;
  isSyncing: boolean;
  showLabels: boolean;
  setShowLabels: (value: boolean) => void;
}

// Load from localStorage
const loadFromStorage = (): DockItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to load dock items from storage:', error);
  }
  return DEFAULT_DOCK_ITEMS;
};

// Save to localStorage
const saveToStorage = (items: DockItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn('Failed to save dock items to storage:', error);
  }
};

// Load settings from localStorage
const loadSettingsFromStorage = (): DockSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.warn('Failed to load dock settings from storage:', error);
  }
  return DEFAULT_SETTINGS;
};

// Save settings to localStorage
const saveSettingsToStorage = (settings: DockSettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save dock settings to storage:', error);
  }
};

/**
 * Hook for managing Dock items with local storage and cloud sync
 */
export function useDockData(): UseDockDataReturn {
  const { currentUser } = useAuth();
  const [dockItems, setDockItemsState] = useState<DockItem[]>(() => loadFromStorage());
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showLabels, setShowLabelsState] = useState(() => loadSettingsFromStorage().showLabels);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<string>('');

  // Save to localStorage when items change
  useEffect(() => {
    saveToStorage(dockItems);
  }, [dockItems]);

  // Load from cloud on login
  useEffect(() => {
    if (!currentUser || !currentUser.email_confirmed_at) return;

    const loadFromCloud = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from(TABLES.USER_SETTINGS)
          .select('dock_items')
          .eq('id', currentUser.id)
          .single();

        if (error) {
          // Field might not exist yet, that's OK
          if (error.code !== 'PGRST116' && !error.message?.includes('column')) {
            logger.warn('Failed to load dock items from cloud:', error);
          }
          return;
        }

        if (data?.dock_items && Array.isArray(data.dock_items)) {
          logger.debug('Loaded dock items from cloud:', data.dock_items.length);
          // Merge with local: cloud wins for conflicts
          setDockItemsState((local) => {
            const merged = new Map<string, DockItem>();
            local.forEach((item) => merged.set(item.id, item));
            (data.dock_items as DockItem[]).forEach((item) => merged.set(item.id, item));
            return Array.from(merged.values());
          });
        }
      } catch (error) {
        logger.warn('Error loading dock items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFromCloud();
  }, [currentUser]);

  // Sync to cloud on change (debounced)
  useEffect(() => {
    if (!currentUser || !currentUser.email_confirmed_at) return;

    const dataFingerprint = JSON.stringify(dockItems);
    if (dataFingerprint === lastSyncRef.current) return;

    // Clear existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Debounce sync by 3 seconds
    syncTimeoutRef.current = setTimeout(async () => {
      setIsSyncing(true);
      try {
        const { error } = await supabase
          .from(TABLES.USER_SETTINGS)
          .upsert({
            id: currentUser.id,
            dock_items: dockItems,
          });

        if (error) {
          // Field might not exist, that's OK
          if (!error.message?.includes('column')) {
            logger.warn('Failed to sync dock items:', error);
          }
        } else {
          lastSyncRef.current = dataFingerprint;
          logger.debug('Dock items synced to cloud');
        }
      } catch (error) {
        logger.warn('Error syncing dock items:', error);
      } finally {
        setIsSyncing(false);
      }
    }, 3000);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [currentUser, dockItems]);

  const setDockItems = useCallback(
    (updater: DockItem[] | ((prev: DockItem[]) => DockItem[])) => {
      setDockItemsState(updater);
    },
    []
  );

  const addDockItem = useCallback((item: DockItem) => {
    setDockItemsState((prev) => [...prev, item]);
  }, []);

  const updateDockItem = useCallback((id: string, updates: Partial<DockItem>) => {
    setDockItemsState((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const deleteDockItem = useCallback((id: string) => {
    setDockItemsState((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const setShowLabels = useCallback((value: boolean) => {
    setShowLabelsState(value);
    saveSettingsToStorage({ showLabels: value });
  }, []);

  return {
    dockItems,
    setDockItems,
    addDockItem,
    updateDockItem,
    deleteDockItem,
    isLoading,
    isSyncing,
    showLabels,
    setShowLabels,
  };
}
