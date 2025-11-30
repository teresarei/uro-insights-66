import { DiaryEntry } from '@/types/database';

/**
 * Calculate the number of unique logged hours from diary entries
 * Each hour that contains at least one event counts as "logged"
 */
export function calculateLoggedHours(entries: DiaryEntry[]): number {
  const uniqueHours = new Set<string>();
  
  entries.forEach(entry => {
    // Create a unique key for each date-hour combination
    const hour = entry.time.split(':')[0];
    const hourKey = `${entry.date}-${hour}`;
    uniqueHours.add(hourKey);
  });
  
  return uniqueHours.size;
}

/**
 * Calculate unique calendar days that have entries
 */
export function calculateUniqueDays(entries: DiaryEntry[]): number {
  const uniqueDays = new Set<string>();
  
  entries.forEach(entry => {
    uniqueDays.add(entry.date);
  });
  
  return uniqueDays.size;
}

/**
 * Check if the entries meet the 48-hour minimum requirement
 * This can be:
 * - 48 continuous logged hours, OR
 * - At least 2 separate 24-hour calendar days with entries
 */
export function meets48HourRequirement(entries: DiaryEntry[]): boolean {
  const loggedHours = calculateLoggedHours(entries);
  const uniqueDays = calculateUniqueDays(entries);
  
  // Requirement is met if:
  // 1. At least 48 unique hours have entries, OR
  // 2. At least 2 calendar days have entries (representing 2 x 24h periods)
  return loggedHours >= 48 || uniqueDays >= 2;
}

/**
 * Calculate completion percentage towards the 48-hour goal
 */
export function calculateCompletionPercentage(entries: DiaryEntry[]): number {
  const loggedHours = calculateLoggedHours(entries);
  const uniqueDays = calculateUniqueDays(entries);
  
  // Calculate percentage based on both metrics
  const hourPercentage = (loggedHours / 48) * 100;
  const dayPercentage = (uniqueDays / 2) * 100;
  
  // Use the higher of the two percentages
  return Math.min(100, Math.max(hourPercentage, dayPercentage));
}

/**
 * Get a validation summary for a set of entries
 */
export interface ValidationSummary {
  loggedHours: number;
  uniqueCalendarDays: number;
  meets48hRequirement: boolean;
  completionPercentage: number;
  statusText: string;
  statusVariant: 'success' | 'warning' | 'destructive';
}

export function getValidationSummary(entries: DiaryEntry[]): ValidationSummary {
  const loggedHours = calculateLoggedHours(entries);
  const uniqueCalendarDays = calculateUniqueDays(entries);
  const meets48hRequirement = meets48HourRequirement(entries);
  const completionPercentage = calculateCompletionPercentage(entries);
  
  let statusText: string;
  let statusVariant: 'success' | 'warning' | 'destructive';
  
  if (meets48hRequirement) {
    statusText = '✓ Sufficient Data: ≥48 hours recorded';
    statusVariant = 'success';
  } else if (completionPercentage >= 50) {
    statusText = `⚠ Partial Data: ${loggedHours}h logged (${Math.round(completionPercentage)}%)`;
    statusVariant = 'warning';
  } else {
    statusText = `✗ Insufficient Data: Only ${loggedHours}h recorded`;
    statusVariant = 'destructive';
  }
  
  return {
    loggedHours,
    uniqueCalendarDays,
    meets48hRequirement,
    completionPercentage,
    statusText,
    statusVariant,
  };
}
