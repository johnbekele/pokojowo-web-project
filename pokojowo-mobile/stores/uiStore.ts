import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface Toast {
  id: number;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

export interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmState {
  visible: boolean;
  options: ConfirmOptions;
  resolve?: (value: boolean) => void;
}

interface UIState {
  // Modal state
  activeModal: string | null;
  modalData: unknown;
  openModal: (modalId: string, data?: unknown) => void;
  closeModal: () => void;

  // Toast notifications
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: number) => void;

  // Confirm / alert dialog
  confirmState: ConfirmState;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  resolveConfirm: (value: boolean) => void;

  // Loading overlay
  isGlobalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // Theme (persisted)
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;

  // First-run welcome (persisted)
  hasSeenWelcome: boolean;
  setSeenWelcome: () => void;

  // Bottom sheet state (for mobile)
  activeSheet: string | null;
  sheetData: unknown;
  openSheet: (sheetId: string, data?: unknown) => void;
  closeSheet: () => void;

  // Keyboard state
  keyboardVisible: boolean;
  setKeyboardVisible: (visible: boolean) => void;

  // Network state
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
}

const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Modal state
      activeModal: null,
      modalData: null,
      openModal: (modalId, data = null) => set({ activeModal: modalId, modalData: data }),
      closeModal: () => set({ activeModal: null, modalData: null }),

      // Toast notifications
      toasts: [],
      addToast: (toast) =>
        set((state) => ({
          toasts: [
            ...state.toasts,
            {
              id: Date.now() + Math.floor(Math.random() * 1000),
              duration: 3000,
              ...toast,
            },
          ].slice(-2), // cap visible toasts at 2
        })),
      showToast: (toast) => get().addToast(toast),
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),

      // Confirm / alert dialog
      confirmState: { visible: false, options: {} },
      confirm: (options) =>
        new Promise<boolean>((resolve) => {
          set({ confirmState: { visible: true, options, resolve } });
        }),
      resolveConfirm: (value) => {
        const { confirmState } = get();
        confirmState.resolve?.(value);
        set({ confirmState: { visible: false, options: {} } });
      },

      // Loading overlay
      isGlobalLoading: false,
      setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),

      // Theme
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),

      // First-run welcome
      hasSeenWelcome: false,
      setSeenWelcome: () => set({ hasSeenWelcome: true }),

      // Bottom sheet state
      activeSheet: null,
      sheetData: null,
      openSheet: (sheetId, data = null) => set({ activeSheet: sheetId, sheetData: data }),
      closeSheet: () => set({ activeSheet: null, sheetData: null }),

      // Keyboard state
      keyboardVisible: false,
      setKeyboardVisible: (visible) => set({ keyboardVisible: visible }),

      // Network state
      isOnline: true,
      setIsOnline: (online) => set({ isOnline: online }),
    }),
    {
      name: 'pokojowo-ui',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist the user's theme preference and first-run flag.
      partialize: (state) => ({ theme: state.theme, hasSeenWelcome: state.hasSeenWelcome }),
    }
  )
);

export default useUIStore;
