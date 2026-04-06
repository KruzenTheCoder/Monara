/**
 * Database barrel — re-exports everything and provides a factory function.
 *
 * Usage:
 *   import { createAdapter } from '../db';
 *   const db = createAdapter('local');     // AsyncStorage
 *   const db = createAdapter('supabase');  // Supabase
 *   const db = createAdapter('firebase');  // Firebase
 */

export type { DatabaseAdapter, UserProfile, TransactionInput, AddTransactionResult, MonthlySummary, SpendingHistoryEntry, RedeemResult } from './DatabaseAdapter';
export { AsyncStorageAdapter } from './AsyncStorageAdapter';
export { SupabaseAdapter } from './SupabaseAdapter';
export { FirebaseAdapter } from './FirebaseAdapter';

import { DatabaseAdapter } from './DatabaseAdapter';
import { AsyncStorageAdapter } from './AsyncStorageAdapter';
import { SupabaseAdapter } from './SupabaseAdapter';
import { FirebaseAdapter } from './FirebaseAdapter';

export type BackendType = 'local' | 'supabase' | 'firebase';

/**
 * Create the right adapter based on environment or user choice.
 *
 * How to switch backends:
 *   1. Set EXPO_PUBLIC_DB_BACKEND=supabase in .env
 *   2. Or pass directly: createAdapter('supabase')
 */
export function createAdapter(backend?: BackendType): DatabaseAdapter {
  const choice = backend
    || (process.env.EXPO_PUBLIC_DB_BACKEND as BackendType)
    || 'local';

  switch (choice) {
    case 'supabase':
      return new SupabaseAdapter();
    case 'firebase':
      return new FirebaseAdapter();
    case 'local':
    default:
      return new AsyncStorageAdapter();
  }
}

/** Singleton adapter instance — import this in your context */
let _instance: DatabaseAdapter | null = null;
export function getAdapter(): DatabaseAdapter {
  if (!_instance) {
    _instance = createAdapter();
  }
  return _instance;
}
