import { act } from '@testing-library/react';

import { useUiStore } from '@/stores/ui.store';

describe('useUiStore', () => {
  beforeEach(() => {
    useUiStore.setState({ sidebarCollapsed: false });
  });

  it('toggles the sidebar state', () => {
    act(() => {
      useUiStore.getState().toggleSidebar();
    });

    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  it('sets the sidebar state explicitly', () => {
    act(() => {
      useUiStore.getState().setSidebarCollapsed(true);
    });

    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });
});
