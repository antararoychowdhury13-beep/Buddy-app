import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CarbonTheme = 'white' | 'g100';

interface UiState {
  theme: CarbonTheme;
  toggleTheme: () => void;
}

/**
 * UI-level preferences persisted to localStorage. Theme values are Carbon
 * theme names so they map directly onto the <Theme> component.
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'white',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'white' ? 'g100' : 'white' })),
    }),
    { name: 'buddy.ui' },
  ),
);
