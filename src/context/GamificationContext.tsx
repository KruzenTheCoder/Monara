/* ────────────────────────────────────────────────────────
 *  Monara Gamification Context
 *
 *  Manages gamification state, persists to AsyncStorage,
 *  and exposes action triggers + event consumption for UI.
 * ──────────────────────────────────────────────────────── */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import {
  GamificationProfile,
  GamificationAction,
  GamificationEvent,
  XPRewardResult,
} from '../types/gamification';
import {
  createDefaultProfile,
  processAction,
  consumeEvents,
  getLevelForXP,
  getXPProgress,
  getNextStreakMilestone,
} from '../utils/gamificationEngine';

const STORAGE_KEY = '@monara:gamification';

/* ─── Context shape ─── */
interface GamificationContextType {
  profile: GamificationProfile;
  isLoaded: boolean;

  /** Trigger an action — returns the XP result */
  trackAction: (action: GamificationAction) => XPRewardResult | null;

  /** Get pending events for UI popups, then mark them consumed */
  consumePendingEvents: () => GamificationEvent[];

  /** Level info helpers */
  levelInfo: ReturnType<typeof getLevelForXP>;
  xpProgress: ReturnType<typeof getXPProgress>;
  nextStreakMilestone: ReturnType<typeof getNextStreakMilestone>;

  /** Force refresh from storage */
  reload: () => Promise<void>;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

/* ─── Provider ─── */
export const GamificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const userId = session?.user?.id || 'local';
  const storageKey = `${STORAGE_KEY}:${userId}`;

  const [profile, setProfile] = useState<GamificationProfile>(() => createDefaultProfile(userId));
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load from AsyncStorage ──
  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as GamificationProfile;
        // Merge with defaults to handle schema upgrades
        const defaults = createDefaultProfile(userId);
        const merged: GamificationProfile = {
          ...defaults,
          ...saved,
          badges: defaults.badges.map(db => {
            const existing = saved.badges?.find(b => b.id === db.id);
            return existing ? { ...db, ...existing } : db;
          }),
          milestones: defaults.milestones.map(dm => {
            const existing = saved.milestones?.find(m => m.id === dm.id);
            return existing ? { ...dm, ...existing } : dm;
          }),
          pendingEvents: saved.pendingEvents || [],
          loginTimestamps: saved.loginTimestamps || [],
        };
        setProfile(merged);
      } else {
        setProfile(createDefaultProfile(userId));
      }
    } catch (e) {
      console.error('Gamification load error:', e);
      setProfile(createDefaultProfile(userId));
    } finally {
      setIsLoaded(true);
    }
  }, [storageKey, userId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Debounced save to AsyncStorage ──
  const save = useCallback(
    (p: GamificationProfile) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        try {
          await AsyncStorage.setItem(storageKey, JSON.stringify(p));
        } catch (e) {
          console.error('Gamification save error:', e);
        }
      }, 500);
    },
    [storageKey],
  );

  // ── Track an action ──
  const trackAction = useCallback(
    (action: GamificationAction): XPRewardResult | null => {
      if (!isLoaded) return null;

      const { profile: newProfile, result } = processAction(profile, action);
      setProfile(newProfile);
      save(newProfile);
      return result;
    },
    [profile, isLoaded, save],
  );

  // ── Consume pending events (UI calls this after showing popups) ──
  const consumePendingEvents = useCallback((): GamificationEvent[] => {
    const events = [...profile.pendingEvents];
    if (events.length > 0) {
      const cleared = consumeEvents(profile);
      setProfile(cleared);
      save(cleared);
    }
    return events;
  }, [profile, save]);

  // ── Derived values ──
  const levelInfo = getLevelForXP(profile.totalXP);
  const xpProgress = getXPProgress(profile.totalXP);
  const nextStreakMilestone = getNextStreakMilestone(profile.currentStreak);

  return (
    <GamificationContext.Provider
      value={{
        profile,
        isLoaded,
        trackAction,
        consumePendingEvents,
        levelInfo,
        xpProgress,
        nextStreakMilestone,
        reload: load,
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
};

export const useGamification = (): GamificationContextType => {
  const ctx = useContext(GamificationContext);
  if (!ctx) throw new Error('useGamification must be used within GamificationProvider');
  return ctx;
};
