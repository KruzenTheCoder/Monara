/**
 * FirebaseAdapter — Firestore implementation of DatabaseAdapter.
 *
 * Collection structure:
 *   users/{userId}                    → UserProfile
 *   users/{userId}/transactions/{id}  → Transaction
 *   users/{userId}/budgets/{id}       → Budget
 *   users/{userId}/streak_history/{date} → StreakEntry
 *   rewards/{id}                      → Reward (global collection)
 *   users/{userId}/redemptions/{id}   → Redemption
 *
 * To use:
 *   npm install firebase
 *   import { FirebaseAdapter } from './db/FirebaseAdapter';
 *   const adapter = new FirebaseAdapter();
 *
 * Firestore Security Rules are included in firestore.rules below this file.
 */

// NOTE: Uncomment when firebase is installed.
// import {
//   getFirestore,
//   doc, getDoc, setDoc, updateDoc, deleteDoc,
//   collection, addDoc, query, where, orderBy, getDocs,
//   Timestamp, writeBatch,
//   serverTimestamp,
// } from 'firebase/firestore';
// import { getAuth } from 'firebase/auth';

import { Transaction, Budget } from '../types';
import {
  DatabaseAdapter,
  UserProfile,
  TransactionInput,
  AddTransactionResult,
} from './DatabaseAdapter';
import { format } from 'date-fns';

/**
 * Placeholder: When you install Firebase, uncomment the imports above
 * and remove the `throw` guard from each method.
 * 
 * This class shows the exact Firestore queries you will need.
 */
export class FirebaseAdapter implements DatabaseAdapter {
  // private db = getFirestore();
  // private auth = getAuth();

  // private get uid(): string {
  //   const u = this.auth.currentUser;
  //   if (!u) throw new Error('Not authenticated');
  //   return u.uid;
  // }

  /* ── Profile ── */
  async getProfile(): Promise<UserProfile | null> {
    throw new Error('Firebase not configured — install firebase and uncomment imports');
    // const snap = await getDoc(doc(this.db, 'users', this.uid));
    // if (!snap.exists()) return null;
    // return { id: snap.id, ...snap.data() } as UserProfile;
  }

  async updateProfile(data: Partial<UserProfile>): Promise<void> {
    throw new Error('Firebase not configured');
    // await updateDoc(doc(this.db, 'users', this.uid), {
    //   ...data,
    //   updated_at: serverTimestamp(),
    // });
  }

  /* ── Transactions ── */
  async getTransactions(): Promise<Transaction[]> {
    throw new Error('Firebase not configured');
    // const q = query(
    //   collection(this.db, 'users', this.uid, 'transactions'),
    //   orderBy('date', 'desc'),
    // );
    // const snap = await getDocs(q);
    // return snap.docs.map(d => ({
    //   id: d.id,
    //   user_id: this.uid,
    //   ...d.data(),
    //   date: (d.data().date as Timestamp).toDate().toISOString(),
    // })) as Transaction[];
  }

  async addTransaction(input: TransactionInput): Promise<AddTransactionResult> {
    throw new Error('Firebase not configured');
    // const txRef = await addDoc(
    //   collection(this.db, 'users', this.uid, 'transactions'),
    //   {
    //     ...input,
    //     date: Timestamp.fromDate(new Date(input.date)),
    //     recurring_frequency: input.recurring?.frequency || null,
    //     recurring_stopped_at: input.recurring?.stopped_at || null,
    //     created_at: serverTimestamp(),
    //     updated_at: serverTimestamp(),
    //   },
    // );
    //
    // // Streak logic (runs client-side, since Firestore has no stored procs)
    // const profileRef = doc(this.db, 'users', this.uid);
    // const profileSnap = await getDoc(profileRef);
    // const profile = profileSnap.data() || {};
    //
    // const today = format(new Date(), 'yyyy-MM-dd');
    // const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
    // let pointsEarned = 0;
    //
    // if (profile.last_log_date !== today) {
    //   const newStreak = profile.last_log_date === yesterday
    //     ? (profile.current_streak || 0) + 1 : 1;
    //   const bonus = newStreak % 7 === 0 ? 100 : newStreak % 5 === 0 ? 50 : 0;
    //   pointsEarned = 10 + bonus;
    //
    //   await updateDoc(profileRef, {
    //     current_streak: newStreak,
    //     total_points: (profile.total_points || 0) + pointsEarned,
    //     last_log_date: today,
    //   });
    //
    //   // Record streak history
    //   await setDoc(
    //     doc(this.db, 'users', this.uid, 'streak_history', today),
    //     { streak_count: newStreak, points_earned: pointsEarned, logged_at: serverTimestamp() },
    //   );
    //
    //   return { transaction_id: txRef.id, points_earned: pointsEarned, current_streak: newStreak };
    // }
    //
    // return { transaction_id: txRef.id, points_earned: 0, current_streak: profile.current_streak || 0 };
  }

  async updateTransaction(id: string, patch: Partial<TransactionInput>): Promise<void> {
    throw new Error('Firebase not configured');
    // const ref = doc(this.db, 'users', this.uid, 'transactions', id);
    // const update: any = { ...patch, updated_at: serverTimestamp() };
    // if (patch.recurring !== undefined) {
    //   update.recurring_frequency = patch.recurring?.frequency || null;
    //   update.recurring_stopped_at = patch.recurring?.stopped_at || null;
    //   delete update.recurring;
    // }
    // await updateDoc(ref, update);
  }

  async deleteTransaction(id: string): Promise<void> {
    throw new Error('Firebase not configured');
    // await deleteDoc(doc(this.db, 'users', this.uid, 'transactions', id));
  }

  /* ── Recurring ── */
  async stopRecurring(id: string): Promise<void> {
    throw new Error('Firebase not configured');
    // await updateDoc(doc(this.db, 'users', this.uid, 'transactions', id), {
    //   recurring_stopped_at: new Date().toISOString(),
    //   updated_at: serverTimestamp(),
    // });
  }

  async resumeRecurring(id: string): Promise<void> {
    throw new Error('Firebase not configured');
    // await updateDoc(doc(this.db, 'users', this.uid, 'transactions', id), {
    //   recurring_stopped_at: null,
    //   updated_at: serverTimestamp(),
    // });
  }

  /* ── Budgets ── */
  async getBudgets(): Promise<Budget[]> {
    throw new Error('Firebase not configured');
    // const q = query(
    //   collection(this.db, 'users', this.uid, 'budgets'),
    //   orderBy('category'),
    // );
    // const snap = await getDocs(q);
    // return snap.docs.map(d => ({ id: d.id, user_id: this.uid, ...d.data() })) as Budget[];
  }

  async updateBudgetLimit(id: string, limit: number): Promise<void> {
    throw new Error('Firebase not configured');
    // await updateDoc(doc(this.db, 'users', this.uid, 'budgets', id), {
    //   monthly_limit: limit,
    //   updated_at: serverTimestamp(),
    // });
  }

  /* ── Currency ── */
  async changeCurrency(newCurrency: string, conversionRate: number): Promise<void> {
    throw new Error('Firebase not configured');
    // // Firestore has no stored procs, so batch update client-side
    // const batch = writeBatch(this.db);
    //
    // // Convert transactions
    // const txSnap = await getDocs(collection(this.db, 'users', this.uid, 'transactions'));
    // txSnap.docs.forEach(d => {
    //   batch.update(d.ref, { amount: Math.round(d.data().amount * conversionRate * 100) / 100 });
    // });
    //
    // // Convert budgets
    // const bdSnap = await getDocs(collection(this.db, 'users', this.uid, 'budgets'));
    // bdSnap.docs.forEach(d => {
    //   batch.update(d.ref, { monthly_limit: Math.round(d.data().monthly_limit * conversionRate * 100) / 100 });
    // });
    //
    // // Update currency
    // batch.update(doc(this.db, 'users', this.uid), { currency: newCurrency });
    //
    // await batch.commit();
  }

  async getSavingsGoals(): Promise<import('../types').SavingsGoal[]> {
    throw new Error('Firebase not configured');
  }

  async addSavingsGoal(goal: Omit<import('../types').SavingsGoal, 'id' | 'user_id'>): Promise<void> {
    throw new Error('Firebase not configured');
  }

  async updateSavingsGoal(id: string, patch: Partial<Omit<import('../types').SavingsGoal, 'id' | 'user_id'>>): Promise<void> {
    throw new Error('Firebase not configured');
  }

  async addSavingsContribution(id: string, amount: number): Promise<void> {
    throw new Error('Firebase not configured');
  }
}
