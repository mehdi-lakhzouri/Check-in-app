'use client';

import { useState, useCallback, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface UseTableSelectionOptions<T> {
  /** Unique identifier key for items */
  idKey: keyof T;
  /** Initial selected items */
  initialSelection?: Set<string>;
  /** Maximum number of items that can be selected */
  maxSelection?: number;
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

export interface UseTableSelectionReturn<T> {
  /** Set of selected item IDs */
  selectedIds: Set<string>;
  /** Array of selected item IDs */
  selectedIdsArray: string[];
  /** Number of selected items */
  selectionCount: number;
  /** Whether any items are selected */
  hasSelection: boolean;
  /** Check if a specific item is selected */
  isSelected: (item: T) => boolean;
  /** Toggle selection of a single item */
  toggleSelection: (item: T) => void;
  /** Select a single item */
  selectItem: (item: T) => void;
  /** Deselect a single item */
  deselectItem: (item: T) => void;
  /** Select all items from an array */
  selectAll: (items: T[]) => void;
  /** Deselect all items */
  deselectAll: () => void;
  /** Toggle between select all and deselect all */
  toggleAll: (items: T[]) => void;
  /** Check if all items are selected */
  isAllSelected: (items: T[]) => boolean;
  /** Check if some (but not all) items are selected */
  isSomeSelected: (items: T[]) => boolean;
  /** Replace entire selection */
  setSelection: (ids: Set<string>) => void;
  /** Get selected items from an array */
  getSelectedItems: (items: T[]) => T[];
}

// =============================================================================
// Hook
// =============================================================================

export function useTableSelection<T extends Record<string, any>>({
  idKey,
  initialSelection = new Set(),
  maxSelection,
  onSelectionChange,
}: UseTableSelectionOptions<T>): UseTableSelectionReturn<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(initialSelection);

  // Get ID from item
  const getItemId = useCallback(
    (item: T): string => String(item[idKey]),
    [idKey]
  );

  // Check if an item is selected
  const isSelected = useCallback(
    (item: T): boolean => selectedIds.has(getItemId(item)),
    [selectedIds, getItemId]
  );

  // Internal update function
  const updateSelection = useCallback(
    (newSelection: Set<string>) => {
      setSelectedIds(newSelection);
      onSelectionChange?.(newSelection);
    },
    [onSelectionChange]
  );

  // Select a single item
  const selectItem = useCallback(
    (item: T) => {
      const id = getItemId(item);
      if (selectedIds.has(id)) return;

      if (maxSelection && selectedIds.size >= maxSelection) {
        console.warn(`Maximum selection limit (${maxSelection}) reached`);
        return;
      }

      const newSelection = new Set(selectedIds);
      newSelection.add(id);
      updateSelection(newSelection);
    },
    [selectedIds, getItemId, maxSelection, updateSelection]
  );

  // Deselect a single item
  const deselectItem = useCallback(
    (item: T) => {
      const id = getItemId(item);
      if (!selectedIds.has(id)) return;

      const newSelection = new Set(selectedIds);
      newSelection.delete(id);
      updateSelection(newSelection);
    },
    [selectedIds, getItemId, updateSelection]
  );

  // Toggle selection of a single item
  const toggleSelection = useCallback(
    (item: T) => {
      if (isSelected(item)) {
        deselectItem(item);
      } else {
        selectItem(item);
      }
    },
    [isSelected, selectItem, deselectItem]
  );

  // Select all items from an array
  const selectAll = useCallback(
    (items: T[]) => {
      let itemsToSelect = items;

      if (maxSelection) {
        itemsToSelect = items.slice(0, maxSelection);
      }

      const newSelection = new Set(itemsToSelect.map(getItemId));
      updateSelection(newSelection);
    },
    [getItemId, maxSelection, updateSelection]
  );

  // Deselect all items
  const deselectAll = useCallback(() => {
    updateSelection(new Set());
  }, [updateSelection]);

  // Toggle between select all and deselect all
  const toggleAll = useCallback(
    (items: T[]) => {
      const allSelected = items.every((item) => selectedIds.has(getItemId(item)));

      if (allSelected) {
        deselectAll();
      } else {
        selectAll(items);
      }
    },
    [selectedIds, getItemId, selectAll, deselectAll]
  );

  // Check if all items are selected
  const isAllSelected = useCallback(
    (items: T[]): boolean => {
      if (items.length === 0) return false;
      return items.every((item) => selectedIds.has(getItemId(item)));
    },
    [selectedIds, getItemId]
  );

  // Check if some (but not all) items are selected
  const isSomeSelected = useCallback(
    (items: T[]): boolean => {
      if (items.length === 0) return false;
      const selectedCount = items.filter((item) =>
        selectedIds.has(getItemId(item))
      ).length;
      return selectedCount > 0 && selectedCount < items.length;
    },
    [selectedIds, getItemId]
  );

  // Replace entire selection
  const setSelection = useCallback(
    (ids: Set<string>) => {
      updateSelection(ids);
    },
    [updateSelection]
  );

  // Get selected items from an array
  const getSelectedItems = useCallback(
    (items: T[]): T[] => {
      return items.filter((item) => selectedIds.has(getItemId(item)));
    },
    [selectedIds, getItemId]
  );

  // Computed values
  const selectedIdsArray = useMemo(
    () => Array.from(selectedIds),
    [selectedIds]
  );

  const selectionCount = selectedIds.size;
  const hasSelection = selectionCount > 0;

  return {
    selectedIds,
    selectedIdsArray,
    selectionCount,
    hasSelection,
    isSelected,
    toggleSelection,
    selectItem,
    deselectItem,
    selectAll,
    deselectAll,
    toggleAll,
    isAllSelected,
    isSomeSelected,
    setSelection,
    getSelectedItems,
  };
}

export default useTableSelection;
