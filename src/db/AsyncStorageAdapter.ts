/**
 * AsyncStorageAdapter — local-only implementation of DatabaseAdapter.
 * This is the current default; data lives on-device via AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { Transaction, Budget, AppNotification } from '../types';
import {
  DatabaseAdapter,
  UserProfile,
  TransactionInput,
  AddTransactionResult,
} from './DatabaseAdapter';

const KEYS = {
  TRANSACTIONS: '@monara:transactions',
  BUDGETS: '@monara:budgets',
  USER: '@monara:user',
  NOTIFICATIONS: '@monara:notifications',
};

const LOCAL_USER_ID = 'local';

const DEFAULT_BUDGETS: Budget[] = [
  { id: 'b1', user_id: LOCAL_USER_ID, category: 'Housing & Rent', monthly_limit: 1500 },
  { id: 'b2', user_id: LOCAL_USER_ID, category: 'Food & Dining', monthly_limit: 500 },
  { id: 'b3', user_id: LOCAL_USER_ID, category: 'Transport', monthly_limit: 150 },
  { id: 'b4', user_id: LOCAL_USER_ID, category: 'Entertainment', monthly_limit: 200 },
  { id: 'b5', user_id: LOCAL_USER_ID, category: 'Shopping', monthly_limit: 300 },
  { id: 'b6', user_id: LOCAL_USER_ID, category: 'Health & Medical', monthly_limit: 100 },
  { id: 'b7', user_id: LOCAL_USER_ID, category: 'Utilities', monthly_limit: 200 },
];

const DEFAULT_PROFILE: UserProfile = {
  id: LOCAL_USER_ID,
  display_name: 'Kruz',
  subscription_tier: 'Free',
  currency: 'USD',
  country_code: 'US',
  theme: 'default',
  tax_enabled: false,
  tax_mode: 'exclusive',
  target_monthly_budget: 0,
  current_streak: 0,
  total_points: 0,
  last_log_date: null,
};

export class AsyncStorageAdapter implements DatabaseAdapter {
  /* ── internal caches ── */
  private _transactions: Transaction[] = [];
  private _budgets: Budget[] = DEFAULT_BUDGETS;
  private _notifications: AppNotification[] = [];
  private _profile: UserProfile = { ...DEFAULT_PROFILE };
  private _loaded = false;

  /* ── ensure data is loaded ── */
  private async _ensureLoaded() {
    if (this._loaded) return;
    const [txRaw, bdRaw, usrRaw, notifRaw] = await Promise.all([
      AsyncStorage.getItem(KEYS.TRANSACTIONS),
      AsyncStorage.getItem(KEYS.BUDGETS),
      AsyncStorage.getItem(KEYS.USER),
      AsyncStorage.getItem(KEYS.NOTIFICATIONS),
    ]);
    if (txRaw) this._transactions = JSON.parse(txRaw);
    if (bdRaw) this._budgets = JSON.parse(bdRaw);
    else await AsyncStorage.setItem(KEYS.BUDGETS, JSON.stringify(DEFAULT_BUDGETS));
    if (usrRaw) this._profile = { ...DEFAULT_PROFILE, ...JSON.parse(usrRaw) };
    if (notifRaw) this._notifications = JSON.parse(notifRaw);
    this._loaded = true;
  }

  /* ── persist helpers ── */
  private async _saveTx() {
    await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(this._transactions));
  }
  private async _saveBudgets() {
    await AsyncStorage.setItem(KEYS.BUDGETS, JSON.stringify(this._budgets));
  }
  private async _saveProfile() {
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(this._profile));
  }
  private async _saveNotifications() {
    await AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(this._notifications));
  }

  /* ── Profile ── */
  async getProfile(): Promise<UserProfile> {
    await this._ensureLoaded();
    return { ...this._profile };
  }

  async updateProfile(data: Partial<UserProfile>): Promise<void> {
    await this._ensureLoaded();
    this._profile = { ...this._profile, ...data };
    await this._saveProfile();
  }

  /* ── Transactions ── */
  async getTransactions(): Promise<Transaction[]> {
    await this._ensureLoaded();
    return [...this._transactions];
  }

  async addTransaction(input: TransactionInput): Promise<AddTransactionResult> {
    await this._ensureLoaded();

    const newTx: Transaction = {
      ...input,
      id: `tx_${Date.now()}`,
      user_id: LOCAL_USER_ID,
    };
    this._transactions = [newTx, ...this._transactions];
    await this._saveTx();

    // Streak logic
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
    let pointsEarned = 0;

    if (this._profile.last_log_date !== today) {
      const newStreak =
        this._profile.last_log_date === yesterday
          ? this._profile.current_streak + 1
          : 1;
      const bonus = newStreak % 7 === 0 ? 100 : newStreak % 5 === 0 ? 50 : 0;
      pointsEarned = 10 + bonus;

      this._profile.current_streak = newStreak;
      this._profile.total_points += pointsEarned;
      this._profile.last_log_date = today;
      await this._saveProfile();
    }

    return {
      transaction_id: newTx.id,
      points_earned: pointsEarned,
      current_streak: this._profile.current_streak,
    };
  }

  async updateTransaction(id: string, patch: Partial<TransactionInput>): Promise<void> {
    await this._ensureLoaded();
    this._transactions = this._transactions.map(t =>
      t.id === id ? { ...t, ...patch } as Transaction : t,
    );
    await this._saveTx();
  }

  async deleteTransaction(id: string): Promise<void> {
    await this._ensureLoaded();
    this._transactions = this._transactions.filter(t => t.id !== id);
    await this._saveTx();
  }

  /* ── Recurring ── */
  async stopRecurring(id: string): Promise<void> {
    await this._ensureLoaded();
    this._transactions = this._transactions.map(t => {
      if (t.id !== id || !t.recurring) return t;
      return { ...t, recurring: { ...t.recurring, stopped_at: new Date().toISOString() } };
    });
    await this._saveTx();
  }

  async resumeRecurring(id: string): Promise<void> {
    await this._ensureLoaded();
    this._transactions = this._transactions.map(t => {
      if (t.id !== id || !t.recurring) return t;
      const { stopped_at, ...rest } = t.recurring;
      return { ...t, recurring: rest };
    });
    await this._saveTx();
  }

  /* ── Budgets ── */
  async getBudgets(): Promise<Budget[]> {
    await this._ensureLoaded();
    return [...this._budgets];
  }

  async updateBudgetLimit(category: string, limit: number): Promise<void> {
    const all = await this.getBudgets();
    
    if (limit <= 0) {
      const filtered = all.filter(b => b.category !== category);
      await AsyncStorage.setItem(KEYS.BUDGETS, JSON.stringify(filtered));
      this._budgets = filtered;
      return;
    }

    const idx = all.findIndex(b => b.category === category);
    if (idx !== -1) {
      all[idx].monthly_limit = limit;
    } else {
      all.push({
        id: Math.random().toString(),
        user_id: 'local',
        category,
        monthly_limit: limit,
      });
    }
    await AsyncStorage.setItem(KEYS.BUDGETS, JSON.stringify(all));
    this._budgets = all;
  }

  /* ── Currency ── */
  async changeCurrency(newCurrency: string, conversionRate: number): Promise<void> {
    await this._ensureLoaded();

    this._transactions = this._transactions.map(tx => ({
      ...tx,
      amount: Math.round(tx.amount * conversionRate * 100) / 100,
    }));

    this._budgets = this._budgets.map(b => ({
      ...b,
      monthly_limit: Math.round(b.monthly_limit * conversionRate * 100) / 100,
    }));

    this._profile.currency = newCurrency;

    await Promise.all([this._saveTx(), this._saveBudgets(), this._saveProfile()]);
  }

  /* ── Savings (Stubs for local fallback) ── */
  async getSavingsGoals(): Promise<import('../types').SavingsGoal[]> {
    return []; // NotImplemented natively in local yet, stubbed.
  }
  async addSavingsGoal(goal: Omit<import('../types').SavingsGoal, 'id' | 'user_id'>): Promise<void> {}
  async updateSavingsGoal(id: string, patch: Partial<Omit<import('../types').SavingsGoal, 'id' | 'user_id'>>): Promise<void> {}
  async addSavingsContribution(id: string, amount: number): Promise<void> {}

  /* ── Notifications ── */
  async getNotifications(): Promise<AppNotification[]> {
    await this._ensureLoaded();
    return [...this._notifications];
  }

  async saveNotification(notification: Omit<AppNotification, 'id' | 'user_id' | 'created_at'>): Promise<void> {
    await this._ensureLoaded();

    // Prevent duplicate unread notifications with same title/message
    const existing = this._notifications.find(n => n.title === notification.title && n.message === notification.message && !n.is_read);
    if (existing) return;

    const newNotif: AppNotification = {
      ...notification,
      id: `notif_${Date.now()}`,
      user_id: LOCAL_USER_ID,
      created_at: new Date().toISOString(),
    };
    this._notifications = [newNotif, ...this._notifications];
    await this._saveNotifications();
  }

  async markNotificationRead(id: string): Promise<void> {
    await this._ensureLoaded();
    this._notifications = this._notifications.map(n => 
      n.id === id ? { ...n, is_read: true } : n
    );
    await this._saveNotifications();
  }

  async clearNotification(id: string): Promise<void> {
    await this._ensureLoaded();
    this._notifications = this._notifications.filter(n => n.id !== id);
    await this._saveNotifications();
  }
}
