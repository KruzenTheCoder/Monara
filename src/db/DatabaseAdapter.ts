/**
 * DatabaseAdapter — abstract interface for all data operations.
 *
 * The app uses this interface so you can swap between:
 *   - AsyncStorageAdapter  (local/offline, current default)
 *   - SupabaseAdapter      (Supabase cloud)
 *   - FirebaseAdapter      (Firebase/Firestore cloud)
 *
 * Each adapter implements the same contract — the FinancialContext
 * doesn't care which backend is behind it.
 */

import { Transaction, Budget } from '../types';

/* ─── User profile shape ─── */
export interface UserProfile {
  id: string;
  display_name: string;
  email?: string;
  avatar_url?: string;
  subscription_tier: 'Free' | 'Premium';
  currency: string;
  country_code: string;
  theme: string;
  tax_enabled: boolean;
  tax_mode: 'inclusive' | 'exclusive';
  target_monthly_budget: number;
  current_streak: number;
  total_points: number;
  last_log_date: string | null;
}

/* ─── Transaction input (no id/user_id) ─── */
export type TransactionInput = Omit<Transaction, 'id' | 'user_id'>;

/* ─── Add transaction result (includes streak info) ─── */
export interface AddTransactionResult {
  transaction_id: string;
  points_earned: number;
  current_streak: number;
}

/* ─── Monthly summary ─── */
export interface MonthlySummary {
  year: number;
  month: number;
  income: number;
  expenses: number;
  balance: number;
  savings_rate: number;
  by_category: Array<{ category: string; total: number; count: number }>;
}

/* ─── Spending history entry ─── */
export interface SpendingHistoryEntry {
  month_start: string;
  label: string;
  income: number;
  expenses: number;
}

/* ─── Redemption result ─── */
export interface RedeemResult {
  success: boolean;
  error?: string;
  remaining_points?: number;
  needed?: number;
}

/* ─── The adapter interface ─── */
export interface DatabaseAdapter {
  // ── Auth / User ──
  getProfile(): Promise<UserProfile | null>;
  updateProfile(data: Partial<UserProfile>): Promise<void>;

  // ── Transactions ──
  getTransactions(): Promise<Transaction[]>;
  addTransaction(tx: TransactionInput): Promise<AddTransactionResult>;
  updateTransaction(id: string, patch: Partial<TransactionInput>): Promise<void>;
  deleteTransaction(id: string): Promise<void>;

  // ── Recurring ──
  stopRecurring(id: string): Promise<void>;
  resumeRecurring(id: string): Promise<void>;

  // ── Budgets ──
  getBudgets(): Promise<Budget[]>;
  updateBudgetLimit(category: string, limit: number): Promise<void>;

  // ── Currency ──
  changeCurrency(newCurrency: string, conversionRate: number): Promise<void>;

  // ── Savings ──
  getSavingsGoals(): Promise<import('../types').SavingsGoal[]>;
  addSavingsGoal(goal: Omit<import('../types').SavingsGoal, 'id' | 'user_id'>): Promise<void>;
  updateSavingsGoal(id: string, patch: Partial<Omit<import('../types').SavingsGoal, 'id' | 'user_id'>>): Promise<void>;
  addSavingsContribution(id: string, amount: number): Promise<void>;

  // ── Analytics (optional — can fallback to client-side) ──
  getMonthlySummary?(year: number, month: number): Promise<MonthlySummary>;
  getSpendingHistory?(months: number): Promise<SpendingHistoryEntry[]>;

  // ── Rewards ──
  redeemReward?(rewardId: string): Promise<RedeemResult>;

  // ── Bills (optional) ──
  getBills?(): Promise<import('../types').Bill[]>;
  addBill?(bill: Omit<import('../types').Bill, 'id' | 'created_at' | 'payments'>): Promise<void>;
  updateBill?(id: string, patch: Partial<Omit<import('../types').Bill, 'id' | 'created_at'>>): Promise<void>;
  deleteBill?(id: string): Promise<void>;
  createBillPayment?(
    billId: string,
    dueMonth: string,
    transactionId: string,
    proofUrl?: string,
  ): Promise<void>;

  // ── Onboarding (optional) ──
  getOnboarding?(): Promise<{ completed: boolean; completed_at?: string | null; answers?: any } | null>;
  saveOnboarding?(payload: { answers: any; completed: boolean; completed_at?: string | null }): Promise<void>;

  // ── Notifications ──
  getNotifications?(): Promise<import('../types').AppNotification[]>;
  saveNotification?(notification: Omit<import('../types').AppNotification, 'id' | 'user_id' | 'created_at'>): Promise<void>;
  markNotificationRead?(id: string): Promise<void>;
  clearNotification?(id: string): Promise<void>;
}
