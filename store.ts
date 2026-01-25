
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DashboardState, WidgetConfig } from './types';

interface AppState extends DashboardState {
  addWidget: (widget: WidgetConfig) => void;
  removeWidget: (id: string) => void;
  updateWidget: (widget: WidgetConfig) => void;
  reorderWidgets: (startIndex: number, endIndex: number) => void;
  toggleTheme: () => void;
  importConfig: (config: WidgetConfig[]) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      widgets: [],
      isDarkMode: true,
      addWidget: (widget) => set((state) => ({ widgets: [...state.widgets, widget] })),
      removeWidget: (id) => set((state) => ({ widgets: state.widgets.filter((w) => w.id !== id) })),
      updateWidget: (widget) => set((state) => ({
        widgets: state.widgets.map((w) => (w.id === widget.id ? widget : w)),
      })),
      reorderWidgets: (startIndex, endIndex) => set((state) => {
        const result = Array.from(state.widgets);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return { widgets: result };
      }),
      toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      importConfig: (config) => set({ widgets: config }),
    }),
    {
      name: 'finboard-storage',
    }
  )
);
