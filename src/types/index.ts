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
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
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

export interface CategoryDef {
  id: string;
  label: string;
  color: string;
  iconName: string;
}

export const EXPENSE_CATEGORIES: CategoryDef[] = [
  { id: 'food', label: 'Food & Dining', color: '#F59E0B', iconName: 'Coffee' },
  { id: 'transport', label: 'Transport', color: '#3B82F6', iconName: 'Car' },
  { id: 'housing', label: 'Housing & Rent', color: '#06B6D4', iconName: 'Home' },
  { id: 'shopping', label: 'Shopping', color: '#EC4899', iconName: 'ShoppingBag' },
  { id: 'entertainment', label: 'Entertainment', color: '#8B5CF6', iconName: 'Tv' },
  { id: 'health', label: 'Health & Medical', color: '#EF4444', iconName: 'Heart' },
  { id: 'utilities', label: 'Utilities', color: '#10B981', iconName: 'Zap' },
  { id: 'education', label: 'Education', color: '#F97316', iconName: 'BookOpen' },
  { id: 'other_exp', label: 'Other', color: '#6B7280', iconName: 'MoreHorizontal' },
];

export const INCOME_CATEGORIES: CategoryDef[] = [
  { id: 'salary', label: 'Salary', color: '#10B981', iconName: 'Briefcase' },
  { id: 'freelance', label: 'Freelance', color: '#3B82F6', iconName: 'Laptop' },
  { id: 'investment', label: 'Investment', color: '#A78BFA', iconName: 'TrendingUp' },
  { id: 'gift', label: 'Gift', color: '#F472B6', iconName: 'Gift' },
  { id: 'other_inc', label: 'Other', color: '#6B7280', iconName: 'Plus' },
];
