export interface User {
  user_id: string;
  email: string;
  display_name: string;
  subscription_tier: 'Free' | 'Premium';
  current_streak: number;
  total_points: number;
  tax_enabled?: boolean;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  note?: string;
  receipt_image_url?: string;
  is_manual_entry: boolean;
  merchant_name?: string;
  recurring?: { frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' };
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
  type?: 'expense' | 'income';
  isCustom?: boolean;
}

export const EXPENSE_CATEGORIES: CategoryDef[] = [
  { id: 'food', label: 'Food & Dining', color: '#F59E0B', iconName: 'Coffee', type: 'expense' },
  { id: 'transport', label: 'Transport', color: '#3B82F6', iconName: 'Car', type: 'expense' },
  { id: 'housing', label: 'Housing & Rent', color: '#06B6D4', iconName: 'Home', type: 'expense' },
  { id: 'shopping', label: 'Shopping', color: '#EC4899', iconName: 'ShoppingBag', type: 'expense' },
  { id: 'entertainment', label: 'Entertainment', color: '#8B5CF6', iconName: 'Tv', type: 'expense' },
  { id: 'health', label: 'Health & Medical', color: '#EF4444', iconName: 'Heart', type: 'expense' },
  { id: 'utilities', label: 'Utilities', color: '#10B981', iconName: 'Zap', type: 'expense' },
  { id: 'education', label: 'Education', color: '#F97316', iconName: 'BookOpen', type: 'expense' },
  { id: 'other_exp', label: 'Other', color: '#6B7280', iconName: 'MoreHorizontal', type: 'expense' },
];

export const INCOME_CATEGORIES: CategoryDef[] = [
  { id: 'salary', label: 'Salary', color: '#10B981', iconName: 'Briefcase', type: 'income' },
  { id: 'freelance', label: 'Freelance', color: '#3B82F6', iconName: 'Laptop', type: 'income' },
  { id: 'investment', label: 'Investment', color: '#A78BFA', iconName: 'TrendingUp', type: 'income' },
  { id: 'gift', label: 'Gift', color: '#F472B6', iconName: 'Gift', type: 'income' },
  { id: 'other_inc', label: 'Other', color: '#6B7280', iconName: 'Plus', type: 'income' },
];
