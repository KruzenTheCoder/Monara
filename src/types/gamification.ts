/* ────────────────────────────────────────────────────────
 *  Monara Gamification & Rewards — Type Definitions
 * ──────────────────────────────────────────────────────── */

// ── Action types that earn XP ──
export type GamificationAction =
  | 'LOGIN'
  | 'EXPENSE_LOG'
  | 'INCOME_LOG'
  | 'BUDGET_CREATE'
  | 'DASHBOARD_VIEW'
  | 'BILL_PAY'
  | 'SAVINGS_CONTRIBUTION';

// ── Event types emitted by the engine ──
export type GamificationEventType =
  | 'XP_EARNED'
  | 'LEVEL_UP'
  | 'BADGE_UNLOCKED'
  | 'STREAK_UPDATED'
  | 'MILESTONE_REACHED'
  | 'WEEKLY_BONUS';

export interface GamificationEvent {
  type: GamificationEventType;
  payload: {
    xp?: number;
    totalXP?: number;
    level?: number;
    previousLevel?: number;
    badge?: Badge;
    milestone?: Milestone;
    streak?: number;
    weeklyDays?: number;
    weeklyBonus?: number;
    message?: string;
  };
  timestamp: string;
}

// ── Action log entry ──
export interface ActionLog {
  id: string;
  userId: string;
  actionType: GamificationAction;
  timestamp: string;
  xpEarned: number;
}

// ── Badge definitions ──
export type BadgeId =
  | 'first_entry'
  | 'streak_3'
  | 'streak_7'
  | 'streak_14'
  | 'streak_30'
  | 'first_full_week'
  | 'entries_30'
  | 'entries_100'
  | 'entries_500'
  | 'budget_master'
  | 'months_3'
  | 'months_6'
  | 'months_8'
  | 'months_10'
  | 'months_12'
  | 'all_milestones';

export interface Badge {
  id: BadgeId;
  name: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  unlockedAt?: string;
  requirement: string;
  category: 'milestone' | 'streak' | 'longevity' | 'special';
}

// ── Milestone definitions ──
export type MilestoneId =
  | 'first_entry'
  | 'first_3_days'
  | 'first_7_days'
  | 'first_week'
  | 'first_month'
  | 'entries_50'
  | 'entries_100'
  | 'level_5'
  | 'level_10'
  | 'level_15'
  | 'level_20'
  | 'level_25';

export interface Milestone {
  id: MilestoneId;
  name: string;
  description: string;
  achieved: boolean;
  achievedAt?: string;
  xpReward: number;
}

// ── Level tier names ──
export type LevelTier =
  | 'Getting Started'
  | 'Building the Habit'
  | 'Consistent Tracker'
  | 'Money Aware'
  | 'In Control';

export interface LevelInfo {
  level: number;
  tier: LevelTier;
  xpRequired: number;
  xpForNext: number;
  motivationMessage: string;
}

// ── Weekly consistency tracking ──
export interface WeeklyConsistency {
  weekStart: string; // ISO date of Monday
  activeDays: string[]; // ISO dates of active days
  bonusClaimed: boolean;
}

// ── Core gamification profile ──
export interface GamificationProfile {
  userId: string;
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  signupDate: string;
  weeklyConsistency: WeeklyConsistency;
  badges: Badge[];
  milestones: Milestone[];
  totalEntries: number;
  todayActionCount: number;
  todayDate: string;
  /** Pending events to show to the user (consumed by UI) */
  pendingEvents: GamificationEvent[];
  /** ISO date strings for each unique day the user opened the app */
  loginTimestamps: string[];
}

// ── XP Reward result from engine ──
export interface XPRewardResult {
  xpEarned: number;
  events: GamificationEvent[];
  newLevel?: number;
  newStreak?: number;
  badgesUnlocked: Badge[];
  milestonesReached: Milestone[];
}
