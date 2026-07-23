import { create } from 'zustand';

interface UiState {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => {
  return {
    setSidebarCollapsed: (collapsed: boolean) => {
      set({ sidebarCollapsed: collapsed });
    },
    sidebarCollapsed: false,
    toggleSidebar: () => {
      set((state) => {
        return { sidebarCollapsed: !state.sidebarCollapsed };
      });
    },
  };
});
