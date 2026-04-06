/**
 * SupabaseAdapter — cloud implementation of DatabaseAdapter.
 *
 * Uses the Supabase client + stored procedures (RPC) from the migration.
 * Ready to drop in when you have a Supabase project configured.
 */

import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { AppNotification, Bill, Transaction, Budget } from '../types';
import {
  DatabaseAdapter,
  UserProfile,
  TransactionInput,
  AddTransactionResult,
  MonthlySummary,
  SpendingHistoryEntry,
  RedeemResult,
} from './DatabaseAdapter';

/* ─── Map DB row → Transaction ─── */
function rowToTransaction(row: any): Transaction {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    amount: Number(row.amount),
    category: row.category,
    date: row.date,
    due_date: row.due_date || null,
    merchant_name: row.merchant_name || undefined,
    note: row.note || undefined,
    receipt_image_url: row.receipt_image_url || undefined,
    is_manual_entry: row.is_manual_entry,
    payment_status: row.payment_status || undefined,
    recurring: row.recurring_frequency
      ? {
          frequency: row.recurring_frequency,
          stopped_at: row.recurring_stopped_at || undefined,
        }
      : undefined,
  };
}

/* ─── Map DB row → Budget ─── */
function rowToBudget(row: any): Budget {
  return {
    id: row.id,
    user_id: row.user_id,
    category: row.category,
    monthly_limit: Number(row.monthly_limit),
  };
}

/* ─── Map DB row → UserProfile ─── */
function rowToProfile(row: any): UserProfile {
  return {
    id: row.id,
    display_name: row.display_name,
    email: row.email || undefined,
    avatar_url: row.avatar_url || undefined,
    subscription_tier: row.subscription_tier,
    currency: row.currency,
    country_code: row.country_code,
    theme: row.theme,
    tax_enabled: row.tax_enabled,
    tax_mode: row.tax_mode,
    target_monthly_budget: Number(row.target_monthly_budget) || 0,
    current_streak: row.current_streak,
    total_points: row.total_points,
    last_log_date: row.last_log_date || null,
  };
}

export class SupabaseAdapter implements DatabaseAdapter {
  private async requireUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    return user.id;
  }

  /* ── Profile ── */
  async getProfile(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !data) return null;
    return rowToProfile(data);
  }

  async updateProfile(patch: Partial<UserProfile>): Promise<void> {
    const userId = await this.requireUserId();

    const { error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId);

    if (error) throw error;
  }

  /* ── Transactions ── */
  async getTransactions(): Promise<Transaction[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) throw error;
    return (data || []).map(rowToTransaction);
  }

  /* ── File Upload Helper ── */
  private async uploadReceiptImage(uri: string): Promise<string> {
    if (!uri.startsWith('file://')) return uri; // Already a remote URL

    const userId = await this.requireUserId();

    const ext = uri.substring(uri.lastIndexOf('.') + 1) || 'jpg';
    const filePath = `${userId}/${Date.now()}.${ext}`;

    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(filePath, decode(base64), {
        contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
      });

    if (error) throw error;

    // Get public URL
    const { data: publicData } = supabase.storage.from('receipts').getPublicUrl(filePath);
    return publicData.publicUrl;
  }

  async addTransaction(input: TransactionInput): Promise<AddTransactionResult> {
    let finalImageUrl = input.receipt_image_url || null;
    if (finalImageUrl?.startsWith('file://')) {
      finalImageUrl = await this.uploadReceiptImage(finalImageUrl);
    }

    const { data, error } = await supabase.rpc('add_transaction_with_streak', {
      p_type: input.type,
      p_amount: input.amount,
      p_category: input.category,
      p_date: input.date || new Date().toISOString(),
      p_due_date: input.type === 'expense' ? (input.due_date ? String(input.due_date).slice(0, 10) : null) : null,
      p_merchant_name: input.merchant_name || null,
      p_note: input.note || null,
      p_receipt_image_url: finalImageUrl,
      p_is_manual_entry: input.is_manual_entry ?? true,
      p_recurring_frequency: input.recurring?.frequency || null,
      p_payment_status: input.type === 'expense' ? (input.payment_status || 'paid') : null,
    });

    if (error) throw error;

    return {
      transaction_id: data.transaction_id,
      points_earned: data.points_earned,
      current_streak: data.current_streak,
    };
  }

  async updateTransaction(id: string, patch: Partial<TransactionInput>): Promise<void> {
    const updatePayload: any = {};
    if (patch.amount !== undefined) updatePayload.amount = patch.amount;
    if (patch.category !== undefined) updatePayload.category = patch.category;
    if (patch.merchant_name !== undefined) updatePayload.merchant_name = patch.merchant_name;
    if (patch.note !== undefined) updatePayload.note = patch.note;
    if (patch.date !== undefined) updatePayload.date = patch.date;
    if (patch.due_date !== undefined) updatePayload.due_date = patch.due_date ? String(patch.due_date).slice(0, 10) : null;
    if (patch.payment_status !== undefined) updatePayload.payment_status = patch.payment_status;
    
    if (patch.receipt_image_url !== undefined) {
      if (patch.receipt_image_url?.startsWith('file://')) {
        updatePayload.receipt_image_url = await this.uploadReceiptImage(patch.receipt_image_url);
      } else {
        updatePayload.receipt_image_url = patch.receipt_image_url;
      }
    }

    if (patch.recurring !== undefined) {
      updatePayload.recurring_frequency = patch.recurring?.frequency || null;
      updatePayload.recurring_stopped_at = patch.recurring?.stopped_at || null;
    }

    const { error } = await supabase
      .from('transactions')
      .update(updatePayload)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /* ── Recurring ── */
  async stopRecurring(id: string): Promise<void> {
    const { error } = await supabase.rpc('stop_recurring', {
      p_transaction_id: id,
    });
    if (error) throw error;
  }

  async resumeRecurring(id: string): Promise<void> {
    const { error } = await supabase.rpc('resume_recurring', {
      p_transaction_id: id,
    });
    if (error) throw error;
  }

  /* ── Budgets ── */
  async getBudgets(): Promise<Budget[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .order('category');

    if (error) throw error;
    return (data || []).map(rowToBudget);
  }

  async updateBudgetLimit(category: string, limit: number): Promise<void> {
    const userId = await this.requireUserId();

    // Make sure we have a category limit > 0 to upsert
    if (limit <= 0) {
      // Alternatively, we could delete it if limit is 0
      const { error } = await supabase
        .from('budgets')
        .delete()
        .match({ user_id: userId, category });
      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from('budgets')
      .upsert(
        { user_id: userId, category, monthly_limit: limit },
        { onConflict: 'user_id,category' }
      );

    if (error) throw error;
  }

  /* ── Currency ── */
  async changeCurrency(newCurrency: string, conversionRate: number): Promise<void> {
    const { error } = await supabase.rpc('change_currency', {
      p_new_currency: newCurrency,
      p_conversion_rate: conversionRate,
    });
    if (error) throw error;
  }

  /* ── Savings ── */
  async getSavingsGoals(): Promise<import('../types').SavingsGoal[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async addSavingsGoal(goal: Omit<import('../types').SavingsGoal, 'id' | 'user_id'>): Promise<void> {
    const userId = await this.requireUserId();

    const { error } = await supabase
      .from('savings_goals')
      .insert({
        user_id: userId,
        name: goal.name,
        target_amount: goal.target_amount,
        current_amount: goal.current_amount || 0,
        target_date: goal.target_date || null,
        color: goal.color || '#3E92CC'
      });

    if (error) throw error;
  }

  async updateSavingsGoal(id: string, patch: Partial<Omit<import('../types').SavingsGoal, 'id' | 'user_id'>>): Promise<void> {
    const { error } = await supabase
      .from('savings_goals')
      .update(patch)
      .eq('id', id);

    if (error) throw error;
  }

  async addSavingsContribution(id: string, amount: number): Promise<void> {
    // Need to increment current_amount. Since we don't have an RPC, we read then write.
    // In production, better to use an RPC `increment_savings` to prevent race conditions.
    const { data, error: fetchErr } = await supabase
      .from('savings_goals')
      .select('current_amount')
      .eq('id', id)
      .single();

    if (fetchErr) throw fetchErr;

    const newAmount = Number(data.current_amount) + amount;

    const { error: updateErr } = await supabase
      .from('savings_goals')
      .update({ current_amount: newAmount })
      .eq('id', id);

    if (updateErr) throw updateErr;
  }

  /* ── Analytics (server-side via stored procedures) ── */
  async getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
    const { data, error } = await supabase.rpc('get_monthly_summary', {
      p_year: year,
      p_month: month,
    });
    if (error) throw error;
    return data;
  }

  async getSpendingHistory(months: number): Promise<SpendingHistoryEntry[]> {
    const { data, error } = await supabase.rpc('get_spending_history', {
      p_months: months,
    });
    if (error) throw error;
    return data || [];
  }

  /* ── Rewards ── */
  async redeemReward(rewardId: string): Promise<RedeemResult> {
    const { data, error } = await supabase.rpc('redeem_reward', {
      p_reward_id: rewardId,
    });
    if (error) throw error;
    return data;
  }

  /* ── Notifications ── */
  async getNotifications(): Promise<AppNotification[]> {
    const userId = await this.requireUserId();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      message: row.message,
      type: row.type,
      priority: row.priority,
      is_read: row.is_read,
      created_at: row.created_at,
    }));
  }

  async saveNotification(notification: Omit<AppNotification, 'id' | 'user_id' | 'created_at'>): Promise<void> {
    const userId = await this.requireUserId();

    const { data: existing, error: existsErr } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('title', notification.title)
      .eq('message', notification.message)
      .eq('is_read', false)
      .limit(1);

    if (existsErr) throw existsErr;
    if (existing && existing.length > 0) return;

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        is_read: notification.is_read ?? false,
      });

    if (error) throw error;
  }

  async markNotificationRead(id: string): Promise<void> {
    const userId = await this.requireUserId();
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async clearNotification(id: string): Promise<void> {
    const userId = await this.requireUserId();
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  }

  /* ── Bills ── */
  async getBills(): Promise<Bill[]> {
    const userId = await this.requireUserId();

    const { data: billsRows, error: billsErr } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (billsErr) throw billsErr;

    const billsList = (billsRows || []).map((r: any): Bill => {
      const schedule =
        r.schedule_type === 'monthly'
          ? { type: 'monthly' as const, day: Number(r.schedule_day) }
          : { type: 'once' as const, date: new Date(r.schedule_date).toISOString() };

      return {
        id: r.id,
        name: r.name,
        amount: Number(r.amount),
        category: r.category,
        schedule,
        payments: {},
        created_at: r.created_at,
      };
    });

    const billIds = billsList.map(b => b.id);
    if (billIds.length === 0) return billsList;

    const { data: paymentsRows, error: payErr } = await supabase
      .from('bill_payments')
      .select('bill_id, due_month, paid_at, transaction_id, proof_url')
      .eq('user_id', userId)
      .in('bill_id', billIds);
    if (payErr) throw payErr;

    const byId = new Map<string, Bill>();
    billsList.forEach(b => byId.set(b.id, b));

    (paymentsRows || []).forEach((p: any) => {
      const bill = byId.get(p.bill_id);
      if (!bill) return;
      const ym = String(p.due_month).slice(0, 7);
      bill.payments = bill.payments || {};
      bill.payments[ym] = {
        paid_at: p.paid_at,
        transaction_id: p.transaction_id || undefined,
        ...(p.proof_url ? { proof_uri: p.proof_url } : {}),
      };
    });

    return billsList;
  }

  async addBill(bill: Omit<Bill, 'id' | 'created_at' | 'payments'>): Promise<void> {
    const userId = await this.requireUserId();
    const payload: any = {
      user_id: userId,
      name: bill.name,
      amount: bill.amount,
      category: bill.category,
      is_active: true,
    };
    if (bill.schedule.type === 'monthly') {
      payload.schedule_type = 'monthly';
      payload.schedule_day = bill.schedule.day;
      payload.schedule_date = null;
    } else {
      payload.schedule_type = 'once';
      payload.schedule_date = bill.schedule.date.slice(0, 10);
      payload.schedule_day = null;
    }

    const { error } = await supabase.from('bills').insert(payload);
    if (error) throw error;
  }

  async updateBill(id: string, patch: Partial<Omit<Bill, 'id' | 'created_at'>>): Promise<void> {
    const userId = await this.requireUserId();
    const payload: any = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.amount !== undefined) payload.amount = patch.amount;
    if (patch.category !== undefined) payload.category = patch.category;
    if (patch.schedule !== undefined) {
      if (patch.schedule.type === 'monthly') {
        payload.schedule_type = 'monthly';
        payload.schedule_day = patch.schedule.day;
        payload.schedule_date = null;
      } else {
        payload.schedule_type = 'once';
        payload.schedule_date = patch.schedule.date.slice(0, 10);
        payload.schedule_day = null;
      }
    }

    const { error } = await supabase
      .from('bills')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async deleteBill(id: string): Promise<void> {
    const userId = await this.requireUserId();
    const { error } = await supabase
      .from('bills')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async createBillPayment(billId: string, dueMonth: string, transactionId: string, proofUrl?: string): Promise<void> {
    const userId = await this.requireUserId();
    const { error } = await supabase
      .from('bill_payments')
      .upsert(
        {
          user_id: userId,
          bill_id: billId,
          due_month: dueMonth,
          transaction_id: transactionId,
          proof_url: proofUrl || null,
        },
        { onConflict: 'bill_id,due_month' },
      );
    if (error) throw error;
  }

  /* ── Onboarding ── */
  async getOnboarding(): Promise<{ completed: boolean; completed_at?: string | null; answers?: any } | null> {
    const userId = await this.requireUserId();
    const { data, error } = await supabase
      .from('onboarding_responses')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      return null;
    }

    return {
      completed: !!data.completed,
      completed_at: data.completed_at || null,
      answers: data.answers || undefined,
    };
  }

  async saveOnboarding(payload: { answers: any; completed: boolean; completed_at?: string | null }): Promise<void> {
    const userId = await this.requireUserId();
    const completedAt = payload.completed ? (payload.completed_at || new Date().toISOString()) : null;
    const { error } = await supabase
      .from('onboarding_responses')
      .upsert(
        {
          user_id: userId,
          answers: payload.answers || {},
          completed: payload.completed,
          completed_at: completedAt,
        },
        { onConflict: 'user_id' },
      );
    if (error) throw error;
  }
}
