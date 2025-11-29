import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserProfile, ViewType } from '@/types/urotracker';
import { useEntries } from '@/hooks/useEntries';
import { DiaryEntry, DiaryEntryInsert, ComputedStats } from '@/types/database';

interface DiaryContextType {
  // View management
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  
  // User profile (still local for now)
  userProfile: UserProfile;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  
  // Database entries
  entries: DiaryEntry[];
  loading: boolean;
  error: string | null;
  
  // Entry operations
  addVoidEntry: (data: { time: string; volume: number; urgency?: number; notes?: string; date?: string; source?: 'manual' | 'scan'; confidence?: 'high' | 'medium' | 'low' }) => Promise<void>;
  addIntakeEntry: (data: { time: string; volume: number; type?: string; notes?: string; date?: string; source?: 'manual' | 'scan'; confidence?: 'high' | 'medium' | 'low' }) => Promise<void>;
  addLeakageEntry: (data: { time: string; amount: 'small' | 'medium' | 'large'; trigger?: string; notes?: string; date?: string; source?: 'manual' | 'scan'; confidence?: 'high' | 'medium' | 'low' }) => Promise<void>;
  addMultipleEntries: (entries: DiaryEntryInsert[]) => Promise<DiaryEntry[]>;
  
  // Stats
  getStats: () => ComputedStats;
  getEntriesLast48Hours: () => DiaryEntry[];
  getVoidsPer24Hours: () => number;
}

const DiaryContext = createContext<DiaryContextType | undefined>(undefined);

export function DiaryProvider({ children }: { children: ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  
  const {
    entries,
    loading,
    error,
    addEntry,
    addEntries,
    getEntriesLast48Hours,
    computeStats,
    getVoidsPer24Hours,
  } = useEntries();

  const addVoidEntry = async (data: { 
    time: string; 
    volume: number; 
    urgency?: number; 
    notes?: string; 
    date?: string;
    source?: 'manual' | 'scan';
    confidence?: 'high' | 'medium' | 'low';
  }) => {
    const today = data.date || new Date().toISOString().split('T')[0];
    await addEntry({
      date: today,
      time: data.time + ':00',
      event_type: 'void',
      volume_ml: data.volume,
      urgency: data.urgency || null,
      notes: data.notes || null,
      source: data.source || 'manual',
      confidence: data.confidence || null,
    });
  };

  const addIntakeEntry = async (data: { 
    time: string; 
    volume: number; 
    type?: string; 
    notes?: string;
    date?: string;
    source?: 'manual' | 'scan';
    confidence?: 'high' | 'medium' | 'low';
  }) => {
    const today = data.date || new Date().toISOString().split('T')[0];
    await addEntry({
      date: today,
      time: data.time + ':00',
      event_type: 'intake',
      volume_ml: data.volume,
      intake_type: data.type || null,
      notes: data.notes || null,
      source: data.source || 'manual',
      confidence: data.confidence || null,
    });
  };

  const addLeakageEntry = async (data: { 
    time: string; 
    amount: 'small' | 'medium' | 'large'; 
    trigger?: string; 
    notes?: string;
    date?: string;
    source?: 'manual' | 'scan';
    confidence?: 'high' | 'medium' | 'low';
  }) => {
    const today = data.date || new Date().toISOString().split('T')[0];
    await addEntry({
      date: today,
      time: data.time + ':00',
      event_type: 'leakage',
      leakage_severity: data.amount,
      trigger: data.trigger || null,
      notes: data.notes || null,
      source: data.source || 'manual',
      confidence: data.confidence || null,
    });
  };

  const addMultipleEntries = async (newEntries: DiaryEntryInsert[]): Promise<DiaryEntry[]> => {
    return await addEntries(newEntries);
  };

  const updateUserProfile = (profile: Partial<UserProfile>) => {
    setUserProfile(prev => ({ ...prev, ...profile }));
  };

  const getStats = (): ComputedStats => {
    return computeStats();
  };

  return (
    <DiaryContext.Provider value={{
      currentView,
      setCurrentView,
      userProfile,
      updateUserProfile,
      entries,
      loading,
      error,
      addVoidEntry,
      addIntakeEntry,
      addLeakageEntry,
      addMultipleEntries,
      getStats,
      getEntriesLast48Hours,
      getVoidsPer24Hours,
    }}>
      {children}
    </DiaryContext.Provider>
  );
}

export function useDiary() {
  const context = useContext(DiaryContext);
  if (context === undefined) {
    throw new Error('useDiary must be used within a DiaryProvider');
  }
  return context;
}
