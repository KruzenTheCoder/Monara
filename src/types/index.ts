export interface User {
  user_id: string;
  email: string;
  display_name: string;
  subscription_tier: 'Free' | 'Premium';
  current_streak: number;
  total_points: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  /** Short label for the payee or bill (e.g. Netflix). */
  merchant_name?: string;
  note?: string;
  receipt_image_url?: string;
  is_manual_entry: boolean;
  payment_status?: 'paid' | 'unpaid';
  due_date?: string | null;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    /** ISO timestamp when the user stopped this recurring payment. Null/undefined = active. */
    stopped_at?: string;
  };
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  cost_in_points: number;
  type: 'discount' | 'theme' | 'content';
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  color: string;
}

export interface CategoryDef {
  id: string;
  label: string;
  color: string;
  iconName: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'spending' | 'budget' | 'goals' | 'streak' | 'insights';
  priority: 'high' | 'medium' | 'low';
  is_read: boolean;
  created_at: string;
}

export type BillSchedule =
  | { type: 'monthly'; day: number }
  | { type: 'once'; date: string };

export interface Bill {
  id: string;
  name: string;
  amount: number;
  category: string;
  schedule: BillSchedule;
  payments?: Record<string, { paid_at: string; transaction_id?: string; proof_uri?: string }>;
  created_at: string;
}

export const EXPENSE_CATEGORIES: CategoryDef[] = [
  { id: 'food', label: 'Food & Dining', color: '#F59E0B', iconName: 'Coffee' },
  { id: 'transport', label: 'Transport', color: '#3B82F6', iconName: 'Car' },
  { id: 'housing', label: 'Housing & Rent', color: '#06B6D4', iconName: 'Home' },
  { id: 'shopping', label: 'Shopping', color: '#EC4899', iconName: 'ShoppingBag' },
  { id: 'entertainment', label: 'Entertainment', color: '#3E92CC', iconName: 'Tv' },
  { id: 'health', label: 'Health & Medical', color: '#EF4444', iconName: 'Heart' },
  { id: 'utilities', label: 'Utilities', color: '#10B981', iconName: 'Zap' },
  { id: 'education', label: 'Education', color: '#F97316', iconName: 'BookOpen' },
  { id: 'other_exp', label: 'Other', color: '#6B7280', iconName: 'MoreHorizontal' },
];

export const INCOME_CATEGORIES: CategoryDef[] = [
  { id: 'salary', label: 'Salary', color: '#10B981', iconName: 'Briefcase' },
  { id: 'freelance', label: 'Freelance', color: '#3B82F6', iconName: 'Laptop' },
  { id: 'investment', label: 'Investment', color: '#3E92CC', iconName: 'TrendingUp' },
  { id: 'gift', label: 'Gift', color: '#F472B6', iconName: 'Gift' },
  { id: 'other_inc', label: 'Other', color: '#6B7280', iconName: 'Plus' },
];
