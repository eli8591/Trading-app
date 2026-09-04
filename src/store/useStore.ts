import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Account, PropFirmRules, Trade } from '../types';
import { generateId } from '../utils/id';

interface AppState {
  accounts: Account[];
  trades: Trade[];
  activeAccountId: string | null;
  hasHydrated: boolean;
  /** Lock-episode keys (see utils/lock.ts) the user has confirmed via the breach lock screen. */
  acknowledgedLocks: Record<string, string>;

  addAccount: (input: {
    name: string;
    firmName: string;
    accountType: Account['accountType'];
    startingBalance: number;
    rules: PropFirmRules;
  }) => string;
  updateAccount: (id: string, updates: Partial<Omit<Account, 'id'>>) => void;
  deleteAccount: (id: string) => void;
  setActiveAccount: (id: string) => void;

  addTrade: (input: { accountId: string; amount: number; setupTag?: string; notes?: string; timestamp?: string }) => void;
  deleteTrade: (id: string) => void;

  acknowledgeLock: (lockKey: string) => void;

  setHasHydrated: (value: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      accounts: [],
      trades: [],
      activeAccountId: null,
      hasHydrated: false,
      acknowledgedLocks: {},

      addAccount: (input) => {
        const id = generateId();
        const account: Account = {
          id,
          name: input.name,
          firmName: input.firmName,
          accountType: input.accountType,
          startingBalance: input.startingBalance,
          createdAt: new Date().toISOString(),
          rules: input.rules,
          status: 'active',
        };
        set((state) => ({
          accounts: [...state.accounts, account],
          activeAccountId: state.activeAccountId ?? id,
        }));
        return id;
      },

      updateAccount: (id, updates) => {
        set((state) => ({
          accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        }));
      },

      deleteAccount: (id) => {
        set((state) => {
          const accounts = state.accounts.filter((a) => a.id !== id);
          const trades = state.trades.filter((t) => t.accountId !== id);
          const activeAccountId =
            state.activeAccountId === id ? (accounts[0]?.id ?? null) : state.activeAccountId;
          return { accounts, trades, activeAccountId };
        });
      },

      setActiveAccount: (id) => set({ activeAccountId: id }),

      addTrade: (input) => {
        const trade: Trade = {
          id: generateId(),
          accountId: input.accountId,
          amount: input.amount,
          setupTag: input.setupTag,
          notes: input.notes,
          timestamp: input.timestamp ?? new Date().toISOString(),
        };
        set((state) => ({ trades: [...state.trades, trade] }));
      },

      deleteTrade: (id) => {
        set((state) => ({ trades: state.trades.filter((t) => t.id !== id) }));
      },

      acknowledgeLock: (lockKey) => {
        set((state) => ({
          acknowledgedLocks: { ...state.acknowledgedLocks, [lockKey]: new Date().toISOString() },
        }));
      },

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'drawdownguard-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accounts: state.accounts,
        trades: state.trades,
        activeAccountId: state.activeAccountId,
        acknowledgedLocks: state.acknowledgedLocks,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export function useActiveAccount(): Account | null {
  return useStore((state) => state.accounts.find((a) => a.id === state.activeAccountId) ?? null);
}

export function useAccountTrades(accountId: string | null): Trade[] {
  return useStore((state) => (accountId ? state.trades.filter((t) => t.accountId === accountId) : []));
}
