import React, { useCallback } from 'react';

import { Button, Card, Spinner } from '@grafana/ui';
import { useKeyNavigationListener } from 'app/features/search/hooks/useSearchKeyboardSelection';
import { SearchResultsProps, SearchResultsTable } from 'app/features/search/page/components/SearchResultsTable';
import { useSearchStateManager } from 'app/features/search/state/SearchStateManager';
import { DashboardViewItemKind } from 'app/features/search/types';
import { useDispatch, useSelector } from 'app/types';

import { setAllSelection, setItemSelectionState, useHasSelection } from '../state';

interface SearchViewProps {
  height: number;
  width: number;
  canSelect: boolean;
}

export function SearchView({ width, height, canSelect }: SearchViewProps) {
  const dispatch = useDispatch();
  const selectedItems = useSelector((wholeState) => wholeState.browseDashboards.selectedItems);
  const hasSelection = useHasSelection();

  const { keyboardEvents } = useKeyNavigationListener();
  const [searchState, stateManager] = useSearchStateManager();

  const value = searchState.result;

  const selectionChecker = useCallback(
    (kind: string | undefined, uid: string): boolean => {
      if (!kind) {
        return false;
      }

      // Currently, this indicates _some_ items are selected, not nessicarily all are
      // selected.
      if (kind === '*' && uid === '*') {
        return hasSelection;
      } else if (kind === '*') {
        // Unsure how this case can happen
        return false;
      }

      return selectedItems[assertDashboardViewItemKind(kind)][uid] ?? false;
    },
    [selectedItems, hasSelection]
  );

  const clearSelection = useCallback(() => {
    dispatch(setAllSelection({ isSelected: false, folderUID: undefined }));
  }, [dispatch]);

  const handleItemSelectionChange = useCallback(
    (kind: string, uid: string) => {
      const newIsSelected = !selectionChecker(kind, uid);

      dispatch(
        setItemSelectionState({ item: { kind: assertDashboardViewItemKind(kind), uid }, isSelected: newIsSelected })
      );
    },
    [selectionChecker, dispatch]
  );

  if (!value) {
    return (
      <div style={{ width }}>
        <Spinner />
      </div>
    );
  }

  if (value.totalRows === 0) {
    return (
      <div style={{ width }}>
        <Card>
          <Card.Heading>No results found for your query.</Card.Heading>
          <Card.Actions>
            <Button variant="secondary" onClick={stateManager.onClearSearchAndFilters}>
              Clear search and filters
            </Button>
          </Card.Actions>
        </Card>
      </div>
    );
  }

  const props: SearchResultsProps = {
    response: value,
    selection: canSelect ? selectionChecker : undefined,
    selectionToggle: canSelect ? handleItemSelectionChange : undefined,
    clearSelection,
    width: width,
    height: height,
    onTagSelected: stateManager.onAddTag,
    keyboardEvents,
    onDatasourceChange: searchState.datasource ? stateManager.onDatasourceChange : undefined,
    onClickItem: stateManager.onSearchItemClicked,
  };

  return <SearchResultsTable {...props} />;
}

function assertDashboardViewItemKind(kind: string): DashboardViewItemKind {
  switch (kind) {
    case 'folder':
      return 'folder';
    case 'dashboard':
      return 'dashboard';
    case 'panel':
      return 'panel';
  }

  throw new Error('Unsupported kind' + kind);
}
