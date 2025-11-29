// Database types for diary_entries table
export type EventType = 'void' | 'leakage' | 'intake';
export type LeakageSeverity = 'small' | 'medium' | 'large';
export type EntrySource = 'scan' | 'manual';
export type Confidence = 'high' | 'medium' | 'low';

export interface DiaryEntry {
  id: string;
  user_id: string | null;
  date: string; // ISO date string (YYYY-MM-DD)
  time: string; // Time string (HH:MM:SS)
  event_type: EventType;
  volume_ml: number | null;
  urgency: number | null;
  leakage_severity: LeakageSeverity | null;
  intake_type: string | null;
  trigger: string | null;
  notes: string | null;
  source: EntrySource;
  confidence: Confidence | null;
  dry_pad_weight_g: number | null;
  wet_pad_weight_g: number | null;
  leakage_weight_g: number | null;
  created_at: string;
  updated_at: string;
}

export interface DiaryEntryInsert {
  user_id?: string | null;
  date: string;
  time: string;
  event_type: EventType;
  volume_ml?: number | null;
  urgency?: number | null;
  leakage_severity?: LeakageSeverity | null;
  intake_type?: string | null;
  trigger?: string | null;
  notes?: string | null;
  source?: EntrySource;
  confidence?: Confidence | null;
  dry_pad_weight_g?: number | null;
  wet_pad_weight_g?: number | null;
  leakage_weight_g?: number | null;
}

export interface DiaryEntryUpdate {
  date?: string;
  time?: string;
  event_type?: EventType;
  volume_ml?: number | null;
  urgency?: number | null;
  leakage_severity?: LeakageSeverity | null;
  intake_type?: string | null;
  trigger?: string | null;
  notes?: string | null;
  source?: EntrySource;
  confidence?: Confidence | null;
  dry_pad_weight_g?: number | null;
  wet_pad_weight_g?: number | null;
  leakage_weight_g?: number | null;
}

// Stats computed from entries
export interface ComputedStats {
  totalVoids: number;
  totalLeakages: number;
  totalIntake: number;
  medianVolume: number;
  maxVolume: number;
  minVolume: number;
  avgVoidsPerDay: number;
  avgLeakagesPerDay: number;
  dayVoids: number;
  nightVoids: number;
  totalLeakageWeight: number; // Total leakage weight in grams
}

// Filter options for entries overview
export interface EntryFilters {
  startDate?: string;
  endDate?: string;
  eventTypes?: EventType[];
  sortBy?: 'date' | 'time' | 'event_type';
  sortOrder?: 'asc' | 'desc';
}
