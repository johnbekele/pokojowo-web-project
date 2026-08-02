import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '@/lib/storage';

export type OutboxStatus = 'sending' | 'failed';

export interface OutboxMessage {
  /** Client-generated ID, echoed by the server so an ack can be matched to it. */
  tempId: string;
  chatId: string;
  content: string;
  replyTo?: string;
  replyToContent?: string;
  status: OutboxStatus;
  createdAt: string;
}

interface ChatOutboxState {
  messages: OutboxMessage[];
  enqueue: (message: Omit<OutboxMessage, 'status' | 'createdAt'>) => void;
  markSending: (tempId: string) => void;
  markFailed: (tempId: string) => void;
  remove: (tempId: string) => void;
}

/**
 * Messages typed on this device that the server has not confirmed.
 *
 * Persisted because the alternative is losing what someone wrote: a failed send
 * whose only record is component state disappears when they back out of the
 * conversation, and they have no way of knowing it never arrived.
 */
const useChatOutboxStore = create<ChatOutboxState>()(
  persist(
    (set) => ({
      messages: [],

      enqueue: (message) =>
        set((state) => ({
          messages: [
            ...state.messages,
            { ...message, status: 'sending', createdAt: new Date().toISOString() },
          ],
        })),

      markSending: (tempId) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.tempId === tempId ? { ...m, status: 'sending' } : m
          ),
        })),

      markFailed: (tempId) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.tempId === tempId ? { ...m, status: 'failed' } : m
          ),
        })),

      remove: (tempId) =>
        set((state) => ({
          messages: state.messages.filter((m) => m.tempId !== tempId),
        })),
    }),
    {
      name: 'chat-outbox',
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          const value = await storage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name, value) => {
          await storage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          await storage.removeItem(name);
        },
      })),
      // Anything still 'sending' when the app was last closed has no timer left
      // watching it, so it would spin forever. Failed is the honest state, and
      // it is the one the user can retry from.
      onRehydrateStorage: () => (state) => {
        state?.messages.forEach((message) => {
          if (message.status === 'sending') message.status = 'failed';
        });
      },
    }
  )
);

export default useChatOutboxStore;
