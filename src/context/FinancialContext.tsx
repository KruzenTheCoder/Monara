import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, isThisMonth } from 'date-fns';
import { Transaction, Budget } from '../types';
import { convertAmount } from '../utils/currencies';

const KEYS = {
  TRANSACTIONS: '@monara:transactions',
  BUDGETS: '@monara:budgets',
  USER: '@monara:user',
};

export interface UserData {
  display_name: string;
  current_streak: number;
  total_points: number;
  last_log_date: string | null;
  currency: string;
}

const DEFAULT_BUDGETS: Budget[] = [
  { id: 'b1', user_id: 'local', category: 'Housing & Rent', monthly_limit: 1500 },
  { id: 'b2', user_id: 'local', category: 'Food & Dining', monthly_limit: 500 },
  { id: 'b3', user_id: 'local', category: 'Transport', monthly_limit: 150 },
  { id: 'b4', user_id: 'local', category: 'Entertainment', monthly_limit: 200 },
  { id: 'b5', user_id: 'local', category: 'Shopping', monthly_limit: 300 },
  { id: 'b6', user_id: 'local', category: 'Health & Medical', monthly_limit: 100 },
  { id: 'b7', user_id: 'local', category: 'Utilities', monthly_limit: 200 },
];

const DEFAULT_USER: UserData = {
  display_name: 'Kruz',
  current_streak: 0,
  total_points: 0,
  last_log_date: null,
  currency: 'USD',
};

interface FinancialContextType {
  transactions: Transaction[];
  budgets: Budget[];
  user: UserData;
  isLoading: boolean;
  updateUser: (data: Partial<UserData>) => Promise<void>;
  changeCurrency: (newCurrency: string) => Promise<void>;
  addTransaction: (t: Omit<Transaction, 'id' | 'user_id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateBudgetLimit: (id: string, limit: number) => Promise<void>;
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySpendingByCategory: Record<string, number>;
  savingsRate: number;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>(DEFAULT_BUDGETS);
  const [user, setUser] = useState<UserData>(DEFAULT_USER);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [txRaw, bdRaw, usrRaw] = await Promise.all([
          AsyncStorage.getItem(KEYS.TRANSACTIONS),
          AsyncStorage.getItem(KEYS.BUDGETS),
          AsyncStorage.getItem(KEYS.USER),
        ]);
        if (txRaw) setTransactions(JSON.parse(txRaw));
        if (bdRaw) setBudgets(JSON.parse(bdRaw));
        else await AsyncStorage.setItem(KEYS.BUDGETS, JSON.stringify(DEFAULT_BUDGETS));
        if (usrRaw) {
          const parsedUser = JSON.parse(usrRaw);
          setUser({ ...DEFAULT_USER, ...parsedUser });
        }
      } catch (e) {
        console.error('Error loading financial data:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const balance = useMemo(
    () => transactions.reduce((sum, t) => (t.type === 'income' ? sum + t.amount : sum - t.amount), 0),
    [transactions],
  );

  const monthlyIncome = useMemo(
    () =>
      transactions
        .filter(t => t.type === 'income' && isThisMonth(new Date(t.date)))
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions],
  );

  const monthlyExpenses = useMemo(
    () =>
      transactions
        .filter(t => t.type === 'expense' && isThisMonth(new Date(t.date)))
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions],
  );

  const monthlySpendingByCategory = useMemo(
    () =>
      transactions
        .filter(t => t.type === 'expense' && isThisMonth(new Date(t.date)))
        .reduce(
          (acc, t) => ({ ...acc, [t.category]: (acc[t.category] || 0) + t.amount }),
          {} as Record<string, number>,
        ),
    [transactions],
  );

  const savingsRate = useMemo(() => {
    if (monthlyIncome === 0) return 0;
    return Math.max(0, ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100);
  }, [monthlyIncome, monthlyExpenses]);

  const addTransaction = useCallback(
    async (t: Omit<Transaction, 'id' | 'user_id'>) => {
      const newTx: Transaction = { ...t, id: `tx_${Date.now()}`, user_id: 'local' };
      const updated = [newTx, ...transactions];
      setTransactions(updated);
      await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(updated));

      const today = format(new Date(), 'yyyy-MM-dd');
      const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
      let { current_streak, total_points, last_log_date } = user;

      if (last_log_date !== today) {
        current_streak = last_log_date === yesterday ? current_streak + 1 : 1;
        const bonus = current_streak % 7 === 0 ? 100 : current_streak % 5 === 0 ? 50 : 0;
        total_points += 10 + bonus;
        const updatedUser = { ...user, current_streak, total_points, last_log_date: today };
        setUser(updatedUser);
        await AsyncStorage.setItem(KEYS.USER, JSON.stringify(updatedUser));
      }
    },
    [transactions, user],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      const updated = transactions.filter(t => t.id !== id);
      setTransactions(updated);
      await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(updated));
    },
    [transactions],
  );

  const updateUser = useCallback(
    async (data: Partial<UserData>) => {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      await AsyncStorage.setItem(KEYS.USER, JSON.stringify(updatedUser));
    },
    [user],
  );

  const changeCurrency = useCallback(
    async (newCurrency: string) => {
      const oldCurrency = user.currency || 'USD';
      if (oldCurrency === newCurrency) return;

      // 1. Convert all transaction amounts
      const updatedTransactions = transactions.map(tx => ({
        ...tx,
        amount: convertAmount(tx.amount, oldCurrency, newCurrency),
      }));

      // 2. Convert all budget limits
      const updatedBudgets = budgets.map(b => ({
        ...b,
        monthly_limit: convertAmount(b.monthly_limit, oldCurrency, newCurrency),
      }));

      // 3. Update User
      const updatedUser = { ...user, currency: newCurrency };

      setTransactions(updatedTransactions);
      setBudgets(updatedBudgets);
      setUser(updatedUser);

      await Promise.all([
        AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(updatedTransactions)),
        AsyncStorage.setItem(KEYS.BUDGETS, JSON.stringify(updatedBudgets)),
        AsyncStorage.setItem(KEYS.USER, JSON.stringify(updatedUser)),
      ]);
    },
    [user, transactions, budgets],
  );

  const updateBudgetLimit = useCallback(
    async (id: string, limit: number) => {
      const updated = budgets.map(b => (b.id === id ? { ...b, monthly_limit: limit } : b));
      setBudgets(updated);
      await AsyncStorage.setItem(KEYS.BUDGETS, JSON.stringify(updated));
    },
    [budgets],
  );

  return (
    <FinancialContext.Provider
      value={{
        transactions,
        budgets,
        user,
        isLoading,
        updateUser,
        changeCurrency,
        addTransaction,
        deleteTransaction,
        updateBudgetLimit,
        balance,
        monthlyIncome,
        monthlyExpenses,
        monthlySpendingByCategory,
        savingsRate,
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
