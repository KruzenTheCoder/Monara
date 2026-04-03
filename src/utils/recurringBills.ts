import { addDays, addWeeks, addMonths, addYears, startOfDay, isBefore } from 'date-fns';
import { Transaction } from '../types';

export type UpcomingBill = {
  id: string;
  sourceTxId: string;
  name: string;
  amount: number;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDue: Date;
};

function advance(next: Date, frequency: UpcomingBill['frequency']): Date {
  switch (frequency) {
    case 'daily':
      return addDays(next, 1);
    case 'weekly':
      return addWeeks(next, 1);
    case 'monthly':
      return addMonths(next, 1);
    case 'yearly':
      return addYears(next, 1);
    default:
      return addMonths(next, 1);
  }
}

/** Next due date on or after today from the anchor transaction date. */
export function getNextDueDate(anchor: Date, frequency: UpcomingBill['frequency'], from: Date = new Date()): Date {
  const today = startOfDay(from);
  let next = startOfDay(anchor);
  let guard = 0;
  while (isBefore(next, today) && guard < 500) {
    next = advance(next, frequency);
    guard += 1;
  }
  return next;
}

export function buildUpcomingBills(transactions: Transaction[], limit = 20): UpcomingBill[] {
  const now = new Date();
  const rows: UpcomingBill[] = [];

  for (const t of transactions) {
    if (t.type !== 'expense' || !t.recurring?.frequency) continue;
    const freq = t.recurring.frequency;
    const anchor = new Date(t.date);
    const nextDue = getNextDueDate(anchor, freq, now);
    const name =
      (t.merchant_name && t.merchant_name.trim()) ||
      (t.note && t.note.trim()) ||
      t.category;

    rows.push({
      id: `${t.id}_${nextDue.getTime()}`,
      sourceTxId: t.id,
      name,
      amount: t.amount,
      category: t.category,
      frequency: freq,
      nextDue,
    });
  }

  rows.sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime());
  return rows.slice(0, limit);
}
