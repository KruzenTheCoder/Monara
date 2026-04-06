/* ────────────────────────────────────────────────────────
 *  Monara Gamification Engine — Pure Logic (no side-effects)
 *
 *  "Reward consistency, not intensity."
 * ──────────────────────────────────────────────────────── */

import {
  GamificationProfile,
  GamificationAction,
  GamificationEvent,
  XPRewardResult,
  Badge,
  BadgeId,
  Milestone,
  MilestoneId,
  LevelInfo,
  LevelTier,
  WeeklyConsistency,
} from '../types/gamification';

/* ═══════════════════════════════════════════════════════
 *  LEVEL THRESHOLDS (from spec image)
 * ═══════════════════════════════════════════════════════ */

const LEVEL_THRESHOLDS: { level: number; xp: number; tier: LevelTier }[] = [
  { level: 1, xp: 0, tier: 'Getting Started' },
  { level: 2, xp: 50, tier: 'Getting Started' },
  { level: 3, xp: 120, tier: 'Getting Started' },
  { level: 4, xp: 220, tier: 'Getting Started' },
  { level: 5, xp: 350, tier: 'Getting Started' },
  { level: 6, xp: 550, tier: 'Building the Habit' },
  { level: 7, xp: 800, tier: 'Building the Habit' },
  { level: 8, xp: 1100, tier: 'Building the Habit' },
  { level: 9, xp: 1450, tier: 'Building the Habit' },
  { level: 10, xp: 1850, tier: 'Building the Habit' },
  { level: 11, xp: 2300, tier: 'Consistent Tracker' },
  { level: 12, xp: 2800, tier: 'Consistent Tracker' },
  { level: 13, xp: 3400, tier: 'Consistent Tracker' },
  { level: 14, xp: 4100, tier: 'Consistent Tracker' },
  { level: 15, xp: 4900, tier: 'Consistent Tracker' },
  { level: 16, xp: 5900, tier: 'Money Aware' },
  { level: 17, xp: 7000, tier: 'Money Aware' },
  { level: 18, xp: 8200, tier: 'Money Aware' },
  { level: 19, xp: 9500, tier: 'Money Aware' },
  { level: 20, xp: 11000, tier: 'Money Aware' },
  { level: 21, xp: 12500, tier: 'In Control' },
  { level: 22, xp: 14000, tier: 'In Control' },
  { level: 23, xp: 15500, tier: 'In Control' },
  { level: 24, xp: 17000, tier: 'In Control' },
  { level: 25, xp: 19000, tier: 'In Control' },
];

/* ═══════════════════════════════════════════════════════
 *  BADGE DEFINITIONS
 * ═══════════════════════════════════════════════════════ */

export const BADGE_DEFS: Omit<Badge, 'unlocked' | 'unlockedAt'>[] = [
  // Milestones
  { id: 'first_entry', name: 'First Step', description: 'Log your first transaction', emoji: '🎯', requirement: 'Log 1 transaction', category: 'milestone' },
  { id: 'streak_3', name: 'Warming Up', description: 'Reach a 3-day streak', emoji: '🔥', requirement: '3-day streak', category: 'streak' },
  { id: 'streak_7', name: 'On Fire', description: 'Log in 5 of the last 7 days', emoji: '⚡', requirement: '5 of 7 days active', category: 'streak' },
  { id: 'streak_14', name: 'Unstoppable', description: 'Reach a 14-day streak', emoji: '💪', requirement: '14-day streak', category: 'streak' },
  { id: 'streak_30', name: 'Legendary', description: 'Reach a 30-day streak', emoji: '👑', requirement: '30-day streak', category: 'streak' },
  { id: 'first_full_week', name: 'Full Week', description: 'Be active every day for a full week', emoji: '📅', requirement: '7/7 weekly consistency', category: 'milestone' },
  { id: 'entries_30', name: 'Dedicated Logger', description: 'Log 30 transactions', emoji: '📝', requirement: '30 entries logged', category: 'milestone' },
  { id: 'entries_100', name: 'Century Club', description: 'Log 100 transactions', emoji: '💯', requirement: '100 entries logged', category: 'milestone' },
  { id: 'entries_500', name: 'Finance Pro', description: 'Log 500 transactions', emoji: '🏆', requirement: '500 entries logged', category: 'milestone' },
  { id: 'budget_master', name: 'Budget Master', description: 'Create your first budget', emoji: '📊', requirement: 'Create a budget', category: 'milestone' },
  // Longevity
  { id: 'months_3', name: '3 Month Veteran', description: 'Active for 3 months', emoji: '🌱', requirement: '3 months with ≥80% activity', category: 'longevity' },
  { id: 'months_6', name: 'Half Year Hero', description: 'Active for 6 months', emoji: '🌿', requirement: '6 months with ≥80% activity', category: 'longevity' },
  { id: 'months_8', name: 'Seasoned Saver', description: 'Active for 8 months', emoji: '🌳', requirement: '8 months with ≥80% activity', category: 'longevity' },
  { id: 'months_10', name: 'Finance Veteran', description: 'Active for 10 months', emoji: '⭐', requirement: '10 months with ≥80% activity', category: 'longevity' },
  { id: 'months_12', name: 'Monara Master', description: 'Active for 12 months', emoji: '💎', requirement: '12 months with ≥80% activity', category: 'longevity' },
  // Special
  { id: 'all_milestones', name: 'Completionist', description: 'Unlock all milestone badges', emoji: '🏅', requirement: 'All milestones complete', category: 'special' },
];

/* ═══════════════════════════════════════════════════════
 *  MILESTONE DEFINITIONS
 * ═══════════════════════════════════════════════════════ */

export const MILESTONE_DEFS: Omit<Milestone, 'achieved' | 'achievedAt'>[] = [
  { id: 'first_entry', name: 'First Entry', description: 'Log your first transaction', xpReward: 10 },
  { id: 'first_3_days', name: 'First 3 Days', description: 'Active for 3 days', xpReward: 20 },
  { id: 'first_7_days', name: 'First 7 Days', description: 'Active for 7 days', xpReward: 50 },
  { id: 'first_week', name: 'First Full Week', description: 'Complete a full week', xpReward: 75 },
  { id: 'first_month', name: 'First Month', description: 'Active for 30 days', xpReward: 200 },
  { id: 'entries_50', name: '50 Entries', description: 'Log 50 transactions', xpReward: 50 },
  { id: 'entries_100', name: '100 Entries', description: 'Log 100 transactions', xpReward: 100 },
  { id: 'level_5', name: 'Level 5', description: 'Reach level 5', xpReward: 30 },
  { id: 'level_10', name: 'Level 10', description: 'Reach level 10', xpReward: 75 },
  { id: 'level_15', name: 'Level 15', description: 'Reach level 15', xpReward: 150 },
  { id: 'level_20', name: 'Level 20', description: 'Reach level 20', xpReward: 300 },
  { id: 'level_25', name: 'Level 25', description: 'Reach max level', xpReward: 500 },
];

/* ═══════════════════════════════════════════════════════
 *  ANTI-ABUSE CONSTANTS
 * ═══════════════════════════════════════════════════════ */

const MAX_DAILY_LOG_XP = 10; // Max 10 logs count toward XP per day
const COOLDOWN_MS = 30_000; // 30s cooldown between same action type
const SIGNUP_DOUBLE_XP_DAYS = 3; // First 3 days = double XP

/* ═══════════════════════════════════════════════════════
 *  XP REWARD AMOUNTS
 * ═══════════════════════════════════════════════════════ */

const ACTION_XP: Record<GamificationAction, number> = {
  LOGIN: 2,
  EXPENSE_LOG: 5,
  INCOME_LOG: 5,
  BUDGET_CREATE: 30,
  DASHBOARD_VIEW: 0, // Optional, tiny engagement
  BILL_PAY: 5,
  SAVINGS_CONTRIBUTION: 5,
};

const STREAK_BONUSES: { days: number; xp: number }[] = [
  { days: 1, xp: 10 },  // Daily streak bonus (first day double)
  { days: 3, xp: 20 },
  { days: 7, xp: 50 },
  { days: 14, xp: 100 },
  { days: 30, xp: 200 },
  { days: 60, xp: 500 },
  { days: 100, xp: 1000 },
];

const WEEKLY_BONUSES: { days: number; xp: number }[] = [
  { days: 3, xp: 10 },
  { days: 5, xp: 40 },
  { days: 7, xp: 75 },
];

/* ═══════════════════════════════════════════════════════
 *  HELPER FUNCTIONS
 * ═══════════════════════════════════════════════════════ */

function isoDate(d: Date = new Date()): string {
  return d.toISOString().split('T')[0];
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00Z');
  const db = new Date(b + 'T00:00:00Z');
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

function getWeekStart(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  date.setDate(date.getDate() + diff);
  return isoDate(date);
}

function daysSinceSignup(signupDate: string): number {
  return Math.max(0, daysBetween(signupDate, isoDate()));
}

function makeEvent(
  type: GamificationEvent['type'],
  payload: GamificationEvent['payload'],
): GamificationEvent {
  return { type, payload, timestamp: new Date().toISOString() };
}

/* ═══════════════════════════════════════════════════════
 *  LEVEL MOTIVATION MESSAGES
 * ═══════════════════════════════════════════════════════ */

const LEVEL_MESSAGES: Record<number, string> = {
  1: "Every journey starts with a single step. You've got this!",
  2: "You're building momentum — keep showing up!",
  3: "Small wins compound. You're proving that already.",
  4: "Consistency beats perfection. Keep going!",
  5: "You've laid the foundation — real habits are forming.",
  6: "You're in the habit zone now. This is where it sticks.",
  7: "Most people quit by now. Not you.",
  8: "Your future self is already thanking you.",
  9: "Discipline is doing it even when it's boring. You're doing it.",
  10: "Double digits! You're officially committed.",
  11: "Tracking is your superpower now. Own it.",
  12: "You see patterns others miss. That's awareness.",
  13: "Consistency is a skill — and you're mastering it.",
  14: "Your money habits are becoming second nature.",
  15: "Halfway to the top. The view is already great.",
  16: "You're not just tracking — you're understanding your money.",
  17: "Financial awareness unlocked. Decisions are getting easier.",
  18: "You're in the top tier of money-conscious people.",
  19: "Almost at the summit. Don't slow down now.",
  20: "Level 20 — you've earned the title Money Aware.",
  21: "You're in control. Your finances work for you now.",
  22: "Few reach this level. Your dedication is rare.",
  23: "You've turned money management into a lifestyle.",
  24: "One level away from mastery. Legendary stuff.",
  25: "Max level. You are a Monara Master. Respect.",
};

export function getMotivationMessage(level: number): string {
  return LEVEL_MESSAGES[level] || LEVEL_MESSAGES[1];
}

/* ═══════════════════════════════════════════════════════
 *  LEVEL FUNCTIONS
 * ═══════════════════════════════════════════════════════ */

export function getLevelForXP(xp: number): LevelInfo {
  let current = LEVEL_THRESHOLDS[0];
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].xp) {
      current = LEVEL_THRESHOLDS[i];
      break;
    }
  }
  const nextIdx = LEVEL_THRESHOLDS.findIndex(t => t.level === current.level) + 1;
  const nextXP = nextIdx < LEVEL_THRESHOLDS.length
    ? LEVEL_THRESHOLDS[nextIdx].xp
    : current.xp + 2000;

  return {
    level: current.level,
    tier: current.tier,
    xpRequired: current.xp,
    xpForNext: nextXP,
    motivationMessage: getMotivationMessage(current.level),
  };
}

export function getXPProgress(xp: number): { current: number; needed: number; percent: number } {
  const info = getLevelForXP(xp);
  const current = xp - info.xpRequired;
  const needed = info.xpForNext - info.xpRequired;
  return { current, needed, percent: needed > 0 ? Math.min(current / needed, 1) : 1 };
}

export function getAllLevelThresholds() {
  return LEVEL_THRESHOLDS;
}

/* ═══════════════════════════════════════════════════════
 *  DEFAULT PROFILE
 * ═══════════════════════════════════════════════════════ */

export function createDefaultProfile(userId: string): GamificationProfile {
  const now = isoDate();
  return {
    userId,
    totalXP: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    signupDate: now,
    weeklyConsistency: { weekStart: getWeekStart(), activeDays: [], bonusClaimed: false },
    badges: BADGE_DEFS.map(b => ({ ...b, unlocked: false })),
    milestones: MILESTONE_DEFS.map(m => ({ ...m, achieved: false })),
    totalEntries: 0,
    todayActionCount: 0,
    todayDate: now,
    pendingEvents: [],
    loginTimestamps: [],
  };
}

/* ═══════════════════════════════════════════════════════
 *  CORE ENGINE: processAction
 *
 *  Pure function — takes current profile + action, returns
 *  a new profile + result describing what happened.
 * ═══════════════════════════════════════════════════════ */

export function processAction(
  profile: GamificationProfile,
  action: GamificationAction,
): { profile: GamificationProfile; result: XPRewardResult } {
  const now = new Date();
  const today = isoDate(now);
  const events: GamificationEvent[] = [];
  const badgesUnlocked: Badge[] = [];
  const milestonesReached: Milestone[] = [];
  let xpEarned = 0;

  // Clone profile (shallow + deep where needed)
  const p: GamificationProfile = {
    ...profile,
    badges: profile.badges.map(b => ({ ...b })),
    milestones: profile.milestones.map(m => ({ ...m })),
    weeklyConsistency: {
      ...profile.weeklyConsistency,
      activeDays: [...profile.weeklyConsistency.activeDays],
    },
    pendingEvents: [...profile.pendingEvents],
    loginTimestamps: [...(profile.loginTimestamps || [])],
  };

  // ── Reset daily counter if new day ──
  if (p.todayDate !== today) {
    p.todayActionCount = 0;
    p.todayDate = today;
  }

  // ── Record login timestamp (unique per day, keep last 90 days) ──
  if (!p.loginTimestamps) p.loginTimestamps = [];
  if (!p.loginTimestamps.includes(today)) {
    p.loginTimestamps = [...p.loginTimestamps, today];
    // Prune to last 90 entries to avoid unbounded growth
    if (p.loginTimestamps.length > 90) {
      p.loginTimestamps = p.loginTimestamps.slice(-90);
    }
  }

  // ── Anti-abuse: max daily log count ──
  const isLogAction = action === 'EXPENSE_LOG' || action === 'INCOME_LOG' || action === 'BILL_PAY' || action === 'SAVINGS_CONTRIBUTION';
  if (isLogAction && p.todayActionCount >= MAX_DAILY_LOG_XP) {
    // Still count the entry but no XP
    p.totalEntries += 1;
    return { profile: p, result: { xpEarned: 0, events: [], badgesUnlocked: [], milestonesReached: [] } };
  }

  // ── Calculate base XP ──
  let baseXP = ACTION_XP[action] || 0;

  // Double XP for first 3 days after signup
  if (daysSinceSignup(p.signupDate) < SIGNUP_DOUBLE_XP_DAYS) {
    baseXP *= 2;
  }

  xpEarned += baseXP;
  if (isLogAction) {
    p.todayActionCount += 1;
    p.totalEntries += 1;
  }

  // ── Update streak ──
  const wasActiveToday = p.lastActiveDate === today;
  if (!wasActiveToday) {
    const yesterday = isoDate(new Date(now.getTime() - 86_400_000));
    if (p.lastActiveDate === yesterday) {
      // Continue streak
      p.currentStreak += 1;
    } else if (p.lastActiveDate === null) {
      // First ever activity
      p.currentStreak = 1;
    } else {
      // Streak broken (with 1-day grace: allow if missed only 1 day)
      const gap = daysBetween(p.lastActiveDate || today, today);
      if (gap === 2) {
        // Grace: 1 missed day, continue streak
        p.currentStreak += 1;
      } else {
        // Reset streak
        p.currentStreak = 1;
      }
    }
    p.lastActiveDate = today;
    p.longestStreak = Math.max(p.longestStreak, p.currentStreak);

    // Streak bonus XP
    let streakBonus = 0;
    for (const sb of STREAK_BONUSES) {
      if (p.currentStreak === sb.days) {
        streakBonus = sb.xp;
        break;
      }
    }
    // Daily streak maintenance bonus (+10 for showing up)
    if (p.currentStreak > 0 && streakBonus === 0) {
      streakBonus = 2; // Small daily bonus
    }
    if (streakBonus > 0) {
      xpEarned += streakBonus;
      events.push(makeEvent('STREAK_UPDATED', {
        streak: p.currentStreak,
        xp: streakBonus,
        message: `🔥 ${p.currentStreak}-day streak! +${streakBonus} MP`,
      }));
    }

    // ── Weekly consistency ──
    const currentWeekStart = getWeekStart(now);
    if (p.weeklyConsistency.weekStart !== currentWeekStart) {
      // New week — reset
      p.weeklyConsistency = { weekStart: currentWeekStart, activeDays: [today], bonusClaimed: false };
    } else if (!p.weeklyConsistency.activeDays.includes(today)) {
      p.weeklyConsistency.activeDays.push(today);
    }

    // Check weekly bonus (only once per threshold per week)
    if (!p.weeklyConsistency.bonusClaimed) {
      const daysActive = p.weeklyConsistency.activeDays.length;
      let weeklyBonus = 0;
      for (const wb of WEEKLY_BONUSES) {
        if (daysActive >= wb.days) {
          weeklyBonus = wb.xp;
        }
      }
      if (daysActive === 7 && weeklyBonus > 0) {
        p.weeklyConsistency.bonusClaimed = true;
        xpEarned += weeklyBonus;
        events.push(makeEvent('WEEKLY_BONUS', {
          weeklyDays: daysActive,
          weeklyBonus,
          xp: weeklyBonus,
          message: `📅 ${daysActive}/7 days this week! +${weeklyBonus} MP`,
        }));
      } else if (daysActive === 5) {
        xpEarned += 40;
        events.push(makeEvent('WEEKLY_BONUS', {
          weeklyDays: daysActive,
          weeklyBonus: 40,
          xp: 40,
          message: `📅 ${daysActive}/7 days this week! +40 MP`,
        }));
      } else if (daysActive === 3) {
        xpEarned += 10;
        events.push(makeEvent('WEEKLY_BONUS', {
          weeklyDays: daysActive,
          weeklyBonus: 10,
          xp: 10,
          message: `📅 ${daysActive}/7 days this week! +10 MP`,
        }));
      }
    }
  }

  // ── Apply XP ──
  p.totalXP += xpEarned;
  if (xpEarned > 0) {
    events.push(makeEvent('XP_EARNED', {
      xp: xpEarned,
      totalXP: p.totalXP,
      message: `+${xpEarned} MP`,
    }));
  }

  // ── Check level up ──
  const oldLevel = p.level;
  const newLevelInfo = getLevelForXP(p.totalXP);
  if (newLevelInfo.level > oldLevel) {
    p.level = newLevelInfo.level;
    events.push(makeEvent('LEVEL_UP', {
      level: newLevelInfo.level,
      previousLevel: oldLevel,
      totalXP: p.totalXP,
      message: `🎉 Level ${newLevelInfo.level}! ${newLevelInfo.tier}`,
    }));
  }

  // ── Check milestones ──
  const checkMilestone = (id: MilestoneId, condition: boolean) => {
    const m = p.milestones.find(ms => ms.id === id);
    if (m && !m.achieved && condition) {
      m.achieved = true;
      m.achievedAt = now.toISOString();
      p.totalXP += m.xpReward;
      xpEarned += m.xpReward;
      milestonesReached.push(m);
      events.push(makeEvent('MILESTONE_REACHED', {
        milestone: m,
        xp: m.xpReward,
        message: `🏆 Milestone: ${m.name}! +${m.xpReward} MP`,
      }));
    }
  };

  checkMilestone('first_entry', p.totalEntries >= 1);
  checkMilestone('first_3_days', p.currentStreak >= 3 || daysSinceSignup(p.signupDate) >= 3);
  checkMilestone('first_7_days', p.currentStreak >= 7 || daysSinceSignup(p.signupDate) >= 7);
  checkMilestone('first_week', p.weeklyConsistency.activeDays.length >= 7);
  checkMilestone('first_month', daysSinceSignup(p.signupDate) >= 30);
  checkMilestone('entries_50', p.totalEntries >= 50);
  checkMilestone('entries_100', p.totalEntries >= 100);
  checkMilestone('level_5', p.level >= 5);
  checkMilestone('level_10', p.level >= 10);
  checkMilestone('level_15', p.level >= 15);
  checkMilestone('level_20', p.level >= 20);
  checkMilestone('level_25', p.level >= 25);

  // ── Check badges ──
  const unlockBadge = (id: BadgeId, condition: boolean) => {
    const b = p.badges.find(bg => bg.id === id);
    if (b && !b.unlocked && condition) {
      b.unlocked = true;
      b.unlockedAt = now.toISOString();
      badgesUnlocked.push(b);
      events.push(makeEvent('BADGE_UNLOCKED', {
        badge: b,
        message: `${b.emoji} Badge: ${b.name}!`,
      }));
    }
  };

  unlockBadge('first_entry', p.totalEntries >= 1);
  unlockBadge('streak_3', p.currentStreak >= 3);
  // streak_7 requires 5 of the last 7 calendar days logged in
  const recentDays = (p.loginTimestamps || []).filter(d => {
    const diff = daysBetween(d, today);
    return diff >= 0 && diff < 7;
  });
  unlockBadge('streak_7', recentDays.length >= 5);
  unlockBadge('streak_14', p.currentStreak >= 14);
  unlockBadge('streak_30', p.currentStreak >= 30);
  unlockBadge('first_full_week', p.weeklyConsistency.activeDays.length >= 7);
  unlockBadge('entries_30', p.totalEntries >= 30);
  unlockBadge('entries_100', p.totalEntries >= 100);
  unlockBadge('entries_500', p.totalEntries >= 500);
  unlockBadge('budget_master', action === 'BUDGET_CREATE');

  // Longevity badges check
  const monthsSinceSignup = daysSinceSignup(p.signupDate) / 30;
  unlockBadge('months_3', monthsSinceSignup >= 3);
  unlockBadge('months_6', monthsSinceSignup >= 6);
  unlockBadge('months_8', monthsSinceSignup >= 8);
  unlockBadge('months_10', monthsSinceSignup >= 10);
  unlockBadge('months_12', monthsSinceSignup >= 12);

  // All milestones special badge (+2000 XP)
  const milestoneBadges = p.badges.filter(b => b.category === 'milestone');
  const allMilestonesUnlocked = milestoneBadges.every(b => b.unlocked);
  const allMilestonesBadge = p.badges.find(b => b.id === 'all_milestones');
  if (allMilestonesBadge && !allMilestonesBadge.unlocked && allMilestonesUnlocked && milestoneBadges.length > 0) {
    allMilestonesBadge.unlocked = true;
    allMilestonesBadge.unlockedAt = now.toISOString();
    p.totalXP += 2000;
    xpEarned += 2000;
    badgesUnlocked.push(allMilestonesBadge);
    events.push(makeEvent('BADGE_UNLOCKED', {
      badge: allMilestonesBadge,
      xp: 2000,
      message: `🏅 All milestones complete! +2000 MP`,
    }));
  }

  // Re-check level after milestone/badge XP
  const finalLevel = getLevelForXP(p.totalXP);
  if (finalLevel.level > p.level) {
    events.push(makeEvent('LEVEL_UP', {
      level: finalLevel.level,
      previousLevel: p.level,
      totalXP: p.totalXP,
      message: `🎉 Level ${finalLevel.level}! ${finalLevel.tier}`,
    }));
    p.level = finalLevel.level;
  }

  // Store pending events for UI consumption
  p.pendingEvents = [...p.pendingEvents, ...events];

  return {
    profile: p,
    result: {
      xpEarned,
      events,
      newLevel: p.level !== oldLevel ? p.level : undefined,
      newStreak: p.currentStreak,
      badgesUnlocked,
      milestonesReached,
    },
  };
}

/* ═══════════════════════════════════════════════════════
 *  UTILITY: consume pending events (UI marks them as shown)
 * ═══════════════════════════════════════════════════════ */

export function consumeEvents(profile: GamificationProfile): GamificationProfile {
  return { ...profile, pendingEvents: [] };
}

/* ═══════════════════════════════════════════════════════
 *  UTILITY: get next streak milestone
 * ═══════════════════════════════════════════════════════ */

export function getNextStreakMilestone(currentStreak: number): { target: number; xp: number } | null {
  for (const sb of STREAK_BONUSES) {
    if (sb.days > currentStreak) return { target: sb.days, xp: sb.xp };
  }
  return null;
}

export function getStreakMilestones() {
  return STREAK_BONUSES;
}
