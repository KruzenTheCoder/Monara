import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { format, getDaysInMonth, isBefore, isThisMonth, startOfDay } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bill, Transaction, Budget } from '../types';
import { convertAmount } from '../utils/currencies';
import { computeExpenseTax, TaxMode } from '../utils/tax';
import { getAdapter, DatabaseAdapter, UserProfile } from '../db';
import { useAuth } from './AuthContext';
import { useGamification } from './GamificationContext';
import { AppState, AppStateStatus } from 'react-native';

/* ─── User data shape (backward-compat with existing screens) ─── */
export interface UserData {
  display_name: string;
  current_streak: number;
  total_points: number;
  last_log_date: string | null;
  currency: string;
  theme: string;
  country_code: string;
  tax_enabled: boolean;
  tax_mode: TaxMode;
  target_monthly_budget: number;
}

const DEFAULT_USER: UserData = {
  display_name: 'Kruz',
  current_streak: 0,
  total_points: 0,
  last_log_date: null,
  currency: 'USD',
  theme: 'default',
  country_code: 'US',
  tax_enabled: false,
  tax_mode: 'exclusive',
  target_monthly_budget: 0,
};

interface FinancialContextType {
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: import('../types').SavingsGoal[];
  user: UserData;
  isLoading: boolean;
  updateUser: (data: Partial<UserData>) => Promise<void>;
  changeCurrency: (newCurrency: string) => Promise<void>;
  addTransaction: (t: Omit<Transaction, 'id' | 'user_id'>) => Promise<void>;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, 'id' | 'user_id'>>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  stopRecurring: (id: string) => Promise<void>;
  resumeRecurring: (id: string) => Promise<void>;
  updateBudgetLimit: (category: string, limit: number) => Promise<void>;

  addSavingsGoal: (goal: Omit<import('../types/index').SavingsGoal, 'id' | 'user_id'>) => Promise<void>;
  addSavingsContribution: (id: string, amount: number) => Promise<void>;

  balance: number;
  monthlyIncome: number;
  monthlySavingsContributions: number;
  monthlyExpenses: number;
  monthlySpendingByCategory: Record<string, number>;
  savingsRate: number;
  bills: Bill[];
  upcomingBills: Array<{ bill: Bill; nextDue: Date; isPaid: boolean; isOverdue: boolean }>;
  addBill: (bill: Omit<Bill, 'id' | 'created_at' | 'payments'>) => Promise<void>;
  updateBill: (id: string, patch: Partial<Omit<Bill, 'id' | 'created_at'>>) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  markBillPaid: (id: string, dueDate: Date, proofUri?: string) => Promise<void>;

  notifications: import('../types').AppNotification[];
  markNotificationRead: (id: string) => Promise<void>;
  clearNotification: (id: string) => Promise<void>;
  saveNotification: (notification: Omit<import('../types').AppNotification, 'id' | 'user_id' | 'created_at'>) => Promise<void>;

  /** Sum of estimated tax on this month's expenses (if tax_enabled). */
  monthlyEstimatedTax: number;
  taxForTransaction: (t: Transaction) => number;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

import { theme as appTheme, applyPalette } from '../utils/theme';

// Dark-mode theme keys use the dark palette; everything else uses light
const DARK_THEME_KEYS = new Set(['dark']);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<import('../types').SavingsGoal[]>([]);
  const [notifications, setNotifications] = useState<import('../types').AppNotification[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [user, setUser] = useState<UserData>(DEFAULT_USER);
  const [isLoading, setIsLoading] = useState(true);

  // The database adapter — swap by setting EXPO_PUBLIC_DB_BACKEND env var
  const db: DatabaseAdapter = useMemo(() => getAdapter(), []);

  const { session } = useAuth();
  const { trackAction } = useGamification();

  const billsKey = useMemo(() => `@monara:bills:${session?.user?.id || 'local'}`, [session?.user?.id]);

  // Apply theme when user changes
  useEffect(() => {
    if (user && user.theme && appTheme.colors.themes[user.theme]) {
      const selected = appTheme.colors.themes[user.theme];
      appTheme.name = user.theme;

      // 1. Swap entire light/dark palette first
      const mode = DARK_THEME_KEYS.has(user.theme) ? 'dark' : 'light';
      applyPalette(mode);

      // 2. Then override accent colors from the chosen theme
      appTheme.colors.accent = selected.primary;
    }
  }, [user?.theme]);

  const loadBills = useCallback(async () => {
    try {
      if (db.getBills) {
        const list = await db.getBills();
        setBills(list);
        return;
      }

      const raw = await AsyncStorage.getItem(billsKey);
      if (!raw) {
        setBills([]);
        return;
      }
      const parsed = JSON.parse(raw) as Bill[];
      setBills(Array.isArray(parsed) ? parsed : []);
    } catch {
      setBills([]);
    }
  }, [billsKey, db]);

  const persistBills = useCallback(
    async (next: Bill[]) => {
      setBills(next);
      if (!db.getBills) {
        await AsyncStorage.setItem(billsKey, JSON.stringify(next));
      }
    },
    [billsKey, db],
  );

  // Extract core load logic into reusable callback
  const loadData = useCallback(async () => {
    if (!session) return;
    try {
      const [txList, bdList, profile, savingsList, notifs] = await Promise.all([
        db.getTransactions().catch(e => { console.error('TX Error', e); return []; }),
        db.getBudgets().catch(e => { console.error('Budget Error', e); return []; }),
        db.getProfile().catch(e => { console.error('Profile Error', e); return null; }),
        (db.getSavingsGoals ? db.getSavingsGoals() : Promise.resolve([])).catch(e => {
          console.error('Savings Error:', e);
          return [];
        }),
        (db.getNotifications ? db.getNotifications() : Promise.resolve([])).catch(e => {
          console.error('Notif Error:', e);
          return [];
        }),
      ]);
      setTransactions(txList);
      setBudgets(bdList);
      setSavingsGoals(savingsList);
      setNotifications(notifs);
      await loadBills();
      if (profile) {
        setUser({
          display_name: profile.display_name,
          current_streak: profile.current_streak,
          total_points: profile.total_points,
          last_log_date: profile.last_log_date,
          currency: profile.currency,
          theme: profile.theme,
          country_code: profile.country_code,
          tax_enabled: profile.tax_enabled,
          tax_mode: profile.tax_mode as TaxMode,
          target_monthly_budget: profile.target_monthly_budget || 0,
        });
      }
    } catch (e) {
      console.error('Error loading financial data:', e);
    } finally {
      setIsLoading(false);
    }
  }, [db, session, loadBills]);

  // Track LOGIN action once per session
  const loginTracked = React.useRef(false);

  // Load data initially and when explicitly authenticated
  useEffect(() => {
    loadData().then(() => {
      if (session && !loginTracked.current) {
        loginTracked.current = true;
        trackAction('LOGIN');
      }
    });
  }, [loadData]);

  // Auto-refresh when bringing app to foreground or every 5 mins!
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        loadData();
      }
    });

    // Also set a failsafe 2-minute interval sync
    const interval = setInterval(() => {
      loadData();
    }, 120000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [loadData]);

  const balance = useMemo(
    () =>
      transactions.reduce((sum, t) => {
        if (t.type === 'income') return sum + t.amount;
        if (t.payment_status === 'unpaid') return sum;
        return sum - t.amount;
      }, 0),
    [transactions],
  );

  const monthlyIncome = useMemo(
    () =>
      transactions
        .filter(t => t.type === 'income' && isThisMonth(new Date(t.date)))
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions],
  );

  const monthlySavingsContributions = useMemo(
    () =>
      transactions
        .filter(t => t.type === 'expense' && t.payment_status !== 'unpaid' && t.category === 'Savings Contribution' && isThisMonth(new Date(t.date)))
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions],
  );

  const monthlyExpenses = useMemo(
    () =>
      transactions
        .filter(t => t.type === 'expense' && t.payment_status !== 'unpaid' && t.category !== 'Savings Contribution' && isThisMonth(new Date(t.date)))
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions],
  );

  const monthlySpendingByCategory = useMemo(
    () =>
      transactions
        .filter(t => t.type === 'expense' && t.payment_status !== 'unpaid' && t.category !== 'Savings Contribution' && isThisMonth(new Date(t.date)))
        .reduce(
          (acc, t) => ({ ...acc, [t.category]: (acc[t.category] || 0) + t.amount }),
          {} as Record<string, number>,
        ),
    [transactions],
  );

  const savingsRate = useMemo(() => {
    // To keep it clean, calculate off raw income 
    const rawIncome = transactions
      .filter(t => t.type === 'income' && isThisMonth(new Date(t.date)))
      .reduce((sum, t) => sum + t.amount, 0);
    const savingsAmount = transactions
      .filter(t => t.type === 'expense' && t.category === 'Savings Contribution' && isThisMonth(new Date(t.date)))
      .reduce((sum, t) => sum + t.amount, 0);

    if (rawIncome === 0) return 0;
    return Math.max(0, (savingsAmount / rawIncome) * 100);
  }, [transactions]);

  const taxForTransaction = useCallback(
    (t: Transaction) => {
      if (!user.tax_enabled || t.type !== 'expense') return 0;
      return computeExpenseTax(t.amount, t.category, user.country_code, user.tax_mode);
    },
    [user.tax_enabled, user.country_code, user.tax_mode],
  );

  const monthlyEstimatedTax = useMemo(() => {
    if (!user.tax_enabled) return 0;
    return transactions
      .filter(t => t.type === 'expense' && t.payment_status !== 'unpaid' && isThisMonth(new Date(t.date)))
      .reduce((sum, t) => sum + computeExpenseTax(t.amount, t.category, user.country_code, user.tax_mode), 0);
  }, [transactions, user.tax_enabled, user.country_code, user.tax_mode]);

  const upcomingBills = useMemo(() => {
    const today = startOfDay(new Date());

    const clampDay = (year: number, monthIndex: number, day: number) => {
      const max = getDaysInMonth(new Date(year, monthIndex, 1));
      return Math.max(1, Math.min(day, max));
    };

    const monthKeyFor = (d: Date) => format(d, 'yyyy-MM');

    const dueThisMonthFor = (bill: Bill) => {
      if (bill.schedule.type === 'once') {
        return startOfDay(new Date(bill.schedule.date));
      }

      const now = new Date();
      const day = clampDay(now.getFullYear(), now.getMonth(), bill.schedule.day);
      return startOfDay(new Date(now.getFullYear(), now.getMonth(), day));
    };

    const rows = bills
      .map(bill => {
        const nextDue = dueThisMonthFor(bill);
        const isPaid = !!bill.payments?.[monthKeyFor(nextDue)];
        const isOverdue = !isPaid && isBefore(nextDue, today);
        return { bill, nextDue, isPaid, isOverdue };
      })
      .filter(r => {
        if (r.bill.schedule.type === 'once') {
          return !r.isPaid;
        }
        return true;
      })
      .sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime());

    return rows;
  }, [bills]);

  /* ─── MUTATIONS (delegate to adapter + update local state) ─── */

  const addTransaction = useCallback(
    async (t: Omit<Transaction, 'id' | 'user_id'>) => {
      const normalized: Omit<Transaction, 'id' | 'user_id'> = {
        ...t,
        ...(t.type === 'expense' ? { payment_status: t.payment_status || 'paid' } : {}),
      };
      const result = await db.addTransaction(normalized);

      // Optimistic: rebuild local state from adapter
      const updated = await db.getTransactions();
      setTransactions(updated);

      // Track gamification action
      const actionType = normalized.type === 'income' ? 'INCOME_LOG' : 'EXPENSE_LOG';
      trackAction(actionType as any);

      // Update streak info
      if (result.points_earned > 0) {
        const profile = await db.getProfile();
        if (profile) {
          setUser(prev => ({
            ...prev,
            current_streak: profile.current_streak,
            total_points: profile.total_points,
            last_log_date: profile.last_log_date,
          }));
        }
      }
    },
    [db],
  );

  const updateTransaction = useCallback(
    async (id: string, patch: Partial<Omit<Transaction, 'id' | 'user_id'>>) => {
      await db.updateTransaction(id, patch);
      const updated = await db.getTransactions();
      setTransactions(updated);
    },
    [db],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      await db.deleteTransaction(id);
      const updated = await db.getTransactions();
      setTransactions(updated);

      if (db.getBills) {
        const updatedBills = await db.getBills();
        setBills(updatedBills);
        return;
      }

      let anyBillChanged = false;
      const nextBills = bills.map(b => {
        if (!b.payments) return b;
        const payments: NonNullable<Bill['payments']> = { ...b.payments };
        let changed = false;
        for (const key of Object.keys(payments)) {
          if (payments[key]?.transaction_id === id) {
            delete payments[key];
            changed = true;
          }
        }
        if (!changed) return b;
        anyBillChanged = true;
        return { ...b, payments };
      });
      if (anyBillChanged) {
        await persistBills(nextBills);
      }
    },
    [db, bills, persistBills],
  );

  const stopRecurring = useCallback(
    async (id: string) => {
      await db.stopRecurring(id);
      const updated = await db.getTransactions();
      setTransactions(updated);
    },
    [db],
  );

  const resumeRecurring = useCallback(
    async (id: string) => {
      await db.resumeRecurring(id);
      const updated = await db.getTransactions();
      setTransactions(updated);
    },
    [db],
  );

  const updateUser = useCallback(
    async (data: Partial<UserData>) => {
      await db.updateProfile(data as Partial<UserProfile>);
      setUser(prev => ({ ...prev, ...data }));
    },
    [db],
  );

  const changeCurrency = useCallback(
    async (newCurrency: string) => {
      const oldCurrency = user.currency || 'USD';
      if (oldCurrency === newCurrency) return;

      // Compute conversion rate
      const sampleConversion = convertAmount(1, oldCurrency, newCurrency);

      await db.changeCurrency(newCurrency, sampleConversion);

      // Re-fetch everything
      const [txList, bdList] = await Promise.all([
        db.getTransactions(),
        db.getBudgets(),
      ]);
      setTransactions(txList);
      setBudgets(bdList);
      setUser(prev => ({ ...prev, currency: newCurrency }));
    },
    [user.currency, db],
  );

  const updateBudgetLimit = useCallback(
    async (category: string, limit: number) => {
      await db.updateBudgetLimit(category, limit);
      const updated = await db.getBudgets();
      setBudgets(updated);
      trackAction('BUDGET_CREATE');
    },
    [db, trackAction],
  );

  const addSavingsGoal = useCallback(
    async (goal: Omit<import('../types').SavingsGoal, 'id' | 'user_id'>) => {
      if (db.addSavingsGoal && db.getSavingsGoals) {
        await db.addSavingsGoal(goal);
        const updated = await db.getSavingsGoals();
        setSavingsGoals(updated);
      }
    },
    [db],
  );

  const addSavingsContribution = useCallback(
    async (id: string, amount: number) => {
      if (db.addSavingsContribution && db.getSavingsGoals) {
        await db.addSavingsContribution(id, amount);
        const updated = await db.getSavingsGoals();
        setSavingsGoals(updated);

        trackAction('SAVINGS_CONTRIBUTION');
        const targetGoal = updated.find(g => g.id === id);
        if (targetGoal) {
          // Log a transaction so ledger and balance reflect the transfer immediately
          await addTransaction({
            type: 'expense',
            amount,
            category: 'Savings Contribution',
            date: new Date().toISOString(),
            merchant_name: `Fund: ${targetGoal.name}`,
            is_manual_entry: false,
          });
        }
      }
    },
    [db, addTransaction],
  );

  const saveNotification = useCallback(
    async (notification: Omit<import('../types').AppNotification, 'id' | 'user_id' | 'created_at'>) => {
      if (db.saveNotification && db.getNotifications) {
        await db.saveNotification(notification);
        const updated = await db.getNotifications();
        setNotifications(updated);
      }
    },
    [db],
  );

  useEffect(() => {
    const now = new Date();
    const overdue = upcomingBills.filter(b => b.isOverdue);
    const dueSoon = upcomingBills.filter(b => {
      const days = Math.ceil((b.nextDue.getTime() - now.getTime()) / 86400000);
      return !b.isPaid && days >= 0 && days <= 3;
    });

    overdue.slice(0, 3).forEach(row => {
      saveNotification({
        title: 'Overdue Bill',
        message: `${row.bill.name} was due on ${format(row.nextDue, 'MMM d')}.`,
        type: 'budget',
        priority: 'high',
        is_read: false,
      });
    });

    dueSoon.slice(0, 3).forEach(row => {
      saveNotification({
        title: 'Bill Due Soon',
        message: `${row.bill.name} is due on ${format(row.nextDue, 'MMM d')}.`,
        type: 'budget',
        priority: 'medium',
        is_read: false,
      });
    });
  }, [upcomingBills, saveNotification]);

  const markNotificationRead = useCallback(
    async (id: string) => {
      if (db.markNotificationRead && db.getNotifications) {
        await db.markNotificationRead(id);
        const updated = await db.getNotifications();
        setNotifications(updated);
      }
    },
    [db],
  );

  const clearNotification = useCallback(
    async (id: string) => {
      if (db.clearNotification && db.getNotifications) {
        await db.clearNotification(id);
        const updated = await db.getNotifications();
        setNotifications(updated);
      }
    },
    [db],
  );

  const addBill = useCallback(
    async (bill: Omit<Bill, 'id' | 'created_at' | 'payments'>) => {
      if (db.addBill && db.getBills) {
        await db.addBill(bill);
        const updated = await db.getBills();
        setBills(updated);
        return;
      }

      const next: Bill[] = [
        {
          ...bill,
          id: `bill_${Date.now()}`,
          created_at: new Date().toISOString(),
          payments: {},
        },
        ...bills,
      ];
      await persistBills(next);
    },
    [bills, db, persistBills],
  );

  const updateBill = useCallback(
    async (id: string, patch: Partial<Omit<Bill, 'id' | 'created_at'>>) => {
      if (db.updateBill && db.getBills) {
        await db.updateBill(id, patch);
        const updated = await db.getBills();
        setBills(updated);
        return;
      }

      const next = bills.map(b => (b.id === id ? ({ ...b, ...patch } as Bill) : b));
      await persistBills(next);
    },
    [bills, db, persistBills],
  );

  const deleteBill = useCallback(
    async (id: string) => {
      if (db.deleteBill && db.getBills) {
        await db.deleteBill(id);
        const updated = await db.getBills();
        setBills(updated);
        return;
      }

      const next = bills.filter(b => b.id !== id);
      await persistBills(next);
    },
    [bills, db, persistBills],
  );

  const markBillPaid = useCallback(
    async (id: string, dueDate: Date, proofUri?: string) => {
      const ym = format(dueDate, 'yyyy-MM');
      const target = bills.find(b => b.id === id);
      if (!target) return;
      if (target.payments?.[ym]) return;

      trackAction('BILL_PAY');
      const paidAt = new Date().toISOString();
      await addTransaction({
        type: 'expense',
        amount: target.amount,
        category: target.category,
        date: paidAt,
        merchant_name: target.name,
        is_manual_entry: true,
        ...(proofUri ? { receipt_image_url: proofUri } : {}),
        payment_status: 'paid',
      });

      const updatedTx = await db.getTransactions();
      const linked = updatedTx.find(t => t.date === paidAt && t.merchant_name === target.name && t.amount === target.amount && t.category === target.category);

      if (db.createBillPayment && db.getBills && linked?.id) {
        const dueMonth = format(dueDate, 'yyyy-MM-01');
        await db.createBillPayment(id, dueMonth, linked.id, linked.receipt_image_url);
        const updatedBills = await db.getBills();
        setBills(updatedBills);
        return;
      }

      const next = bills.map(b => {
        if (b.id !== id) return b;
        const payments = { ...(b.payments || {}) };
        payments[ym] = { paid_at: paidAt, transaction_id: linked?.id, ...(proofUri ? { proof_uri: proofUri } : {}) };
        return { ...b, payments };
      });
      await persistBills(next);
    },
    [addTransaction, bills, db, persistBills],
  );

  return (
    <FinancialContext.Provider
      value={{
        transactions,
        budgets,
        savingsGoals,
        user,
        isLoading,
        updateUser,
        changeCurrency,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        stopRecurring,
        resumeRecurring,
        updateBudgetLimit,
        addSavingsGoal,
        addSavingsContribution,

        bills,
        upcomingBills,
        addBill,
        updateBill,
        deleteBill,
        markBillPaid,

        notifications,
        markNotificationRead,
        clearNotification,
        saveNotification,

        balance,
        monthlyIncome,
        monthlySavingsContributions,
        monthlyExpenses,
        monthlySpendingByCategory,
        savingsRate,
        monthlyEstimatedTax,
        taxForTransaction,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancial = (): FinancialContextType => {
  const ctx = useContext(FinancialContext);
  if (!ctx) throw new Error('useFinancial must be used within FinancialProvider');
  return ctx;
};
