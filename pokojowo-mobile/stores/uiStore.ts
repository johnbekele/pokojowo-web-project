import { create } from 'zustand';

interface Toast {
  id: number;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
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
  removeToast: (id: number) => void;

  // Loading overlay
  isGlobalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;

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

const useUIStore = create<UIState>((set) => ({
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
          id: Date.now(),
          duration: 3000,
          ...toast,
        },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  // Loading overlay
  isGlobalLoading: false,
  setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),

  // Theme
  theme: 'light',
  setTheme: (theme) => set({ theme }),
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'light' ? 'dark' : 'light',
    })),

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
}));

export default useUIStore;
