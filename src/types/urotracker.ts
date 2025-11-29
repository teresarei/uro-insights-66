export interface VoidEvent {
  id: string;
  timestamp: Date;
  volume: number; // in ml
  notes?: string;
  urgency?: 1 | 2 | 3 | 4 | 5; // 1-5 scale
}

export interface LeakageEvent {
  id: string;
  timestamp: Date;
  amount: 'small' | 'medium' | 'large';
  trigger?: string;
  notes?: string;
}

export interface FluidIntake {
  id: string;
  timestamp: Date;
  volume: number; // in ml
  type?: string; // water, coffee, tea, etc.
  notes?: string;
}

export interface UserProfile {
  sex?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  age?: number;
  medications?: string[];
  conditions?: string[];
}

export interface DiaryEntry {
  date: Date;
  voids: VoidEvent[];
  leakages: LeakageEvent[];
  intakes: FluidIntake[];
}

export interface DiaryStats {
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
}

export interface ClinicalPattern {
  name: string;
  probability: 'high' | 'moderate' | 'low';
  reasoning: string;
  recommendation: string;
}

export type ViewType = 'welcome' | 'dashboard' | 'entry' | 'insights' | 'profile' | 'scan';
