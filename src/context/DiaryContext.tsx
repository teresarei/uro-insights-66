import React, { createContext, useContext, useState, ReactNode } from 'react';
import { 
  VoidEvent, 
  LeakageEvent, 
  FluidIntake, 
  DiaryEntry, 
  UserProfile,
  DiaryStats,
  ViewType 
} from '@/types/urotracker';

interface DiaryContextType {
  entries: DiaryEntry[];
  userProfile: UserProfile;
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  addVoidEvent: (event: Omit<VoidEvent, 'id'>) => void;
  addLeakageEvent: (event: Omit<LeakageEvent, 'id'>) => void;
  addFluidIntake: (intake: Omit<FluidIntake, 'id'>) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  importData: (entries: DiaryEntry[]) => void;
  getStats: () => DiaryStats;
  clearData: () => void;
  getEntriesLast48Hours: () => DiaryEntry[];
  getVoidsPer24Hours: () => number;
}

const DiaryContext = createContext<DiaryContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substr(2, 9);

// Sample data for demonstration
const generateSampleData = (): DiaryEntry[] => {
  const entries: DiaryEntry[] = [];
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const voids: VoidEvent[] = [];
    const intakes: FluidIntake[] = [];
    const leakages: LeakageEvent[] = [];
    
    // Generate 6-10 voids per day
    const voidCount = Math.floor(Math.random() * 5) + 6;
    for (let j = 0; j < voidCount; j++) {
      const hour = Math.floor(Math.random() * 18) + 6; // 6am to midnight
      const timestamp = new Date(date);
      timestamp.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
      
      voids.push({
        id: generateId(),
        timestamp,
        volume: Math.floor(Math.random() * 300) + 100, // 100-400ml
        urgency: (Math.floor(Math.random() * 5) + 1) as 1 | 2 | 3 | 4 | 5,
      });
    }
    
    // Generate 4-8 fluid intakes per day
    const intakeCount = Math.floor(Math.random() * 5) + 4;
    for (let j = 0; j < intakeCount; j++) {
      const hour = Math.floor(Math.random() * 16) + 7;
      const timestamp = new Date(date);
      timestamp.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
      
      const types = ['water', 'coffee', 'tea', 'juice', 'other'];
      intakes.push({
        id: generateId(),
        timestamp,
        volume: Math.floor(Math.random() * 300) + 150,
        type: types[Math.floor(Math.random() * types.length)],
      });
    }
    
    // Occasional leakage events (0-2 per day)
    if (Math.random() > 0.6) {
      const leakageCount = Math.floor(Math.random() * 2) + 1;
      for (let j = 0; j < leakageCount; j++) {
        const hour = Math.floor(Math.random() * 18) + 6;
        const timestamp = new Date(date);
        timestamp.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
        
        const amounts: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
        const triggers = ['cough', 'sneeze', 'exercise', 'urgency', 'unknown'];
        leakages.push({
          id: generateId(),
          timestamp,
          amount: amounts[Math.floor(Math.random() * amounts.length)],
          trigger: triggers[Math.floor(Math.random() * triggers.length)],
        });
      }
    }
    
    entries.push({
      date,
      voids: voids.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
      intakes: intakes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
      leakages: leakages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
    });
  }
  
  return entries;
};

export function DiaryProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<DiaryEntry[]>(generateSampleData());
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

  const addVoidEvent = (event: Omit<VoidEvent, 'id'>) => {
    const newEvent: VoidEvent = { ...event, id: generateId() };
    const eventDate = new Date(event.timestamp);
    eventDate.setHours(0, 0, 0, 0);
    
    setEntries(prev => {
      const existingEntry = prev.find(
        e => e.date.toDateString() === eventDate.toDateString()
      );
      
      if (existingEntry) {
        return prev.map(e => 
          e.date.toDateString() === eventDate.toDateString()
            ? { ...e, voids: [...e.voids, newEvent].sort((a, b) => 
                a.timestamp.getTime() - b.timestamp.getTime()) }
            : e
        );
      }
      
      return [...prev, {
        date: eventDate,
        voids: [newEvent],
        intakes: [],
        leakages: [],
      }].sort((a, b) => a.date.getTime() - b.date.getTime());
    });
  };

  const addLeakageEvent = (event: Omit<LeakageEvent, 'id'>) => {
    const newEvent: LeakageEvent = { ...event, id: generateId() };
    const eventDate = new Date(event.timestamp);
    eventDate.setHours(0, 0, 0, 0);
    
    setEntries(prev => {
      const existingEntry = prev.find(
        e => e.date.toDateString() === eventDate.toDateString()
      );
      
      if (existingEntry) {
        return prev.map(e => 
          e.date.toDateString() === eventDate.toDateString()
            ? { ...e, leakages: [...e.leakages, newEvent].sort((a, b) => 
                a.timestamp.getTime() - b.timestamp.getTime()) }
            : e
        );
      }
      
      return [...prev, {
        date: eventDate,
        voids: [],
        intakes: [],
        leakages: [newEvent],
      }].sort((a, b) => a.date.getTime() - b.date.getTime());
    });
  };

  const addFluidIntake = (intake: Omit<FluidIntake, 'id'>) => {
    const newIntake: FluidIntake = { ...intake, id: generateId() };
    const intakeDate = new Date(intake.timestamp);
    intakeDate.setHours(0, 0, 0, 0);
    
    setEntries(prev => {
      const existingEntry = prev.find(
        e => e.date.toDateString() === intakeDate.toDateString()
      );
      
      if (existingEntry) {
        return prev.map(e => 
          e.date.toDateString() === intakeDate.toDateString()
            ? { ...e, intakes: [...e.intakes, newIntake].sort((a, b) => 
                a.timestamp.getTime() - b.timestamp.getTime()) }
            : e
        );
      }
      
      return [...prev, {
        date: intakeDate,
        voids: [],
        intakes: [newIntake],
        leakages: [],
      }].sort((a, b) => a.date.getTime() - b.date.getTime());
    });
  };

  const updateUserProfile = (profile: Partial<UserProfile>) => {
    setUserProfile(prev => ({ ...prev, ...profile }));
  };

  const importData = (newEntries: DiaryEntry[]) => {
    setEntries(newEntries);
  };

  const clearData = () => {
    setEntries([]);
  };

  const getEntriesLast48Hours = (): DiaryEntry[] => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    
    return entries.filter(entry => {
      // Check if any event in this entry is within 48 hours
      const hasRecentVoid = entry.voids.some(v => v.timestamp >= cutoff);
      const hasRecentIntake = entry.intakes.some(i => i.timestamp >= cutoff);
      const hasRecentLeakage = entry.leakages.some(l => l.timestamp >= cutoff);
      return hasRecentVoid || hasRecentIntake || hasRecentLeakage;
    }).map(entry => ({
      ...entry,
      voids: entry.voids.filter(v => v.timestamp >= cutoff),
      intakes: entry.intakes.filter(i => i.timestamp >= cutoff),
      leakages: entry.leakages.filter(l => l.timestamp >= cutoff),
    }));
  };

  const getVoidsPer24Hours = (): number => {
    const now = new Date();
    const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const voidsIn24h = entries.flatMap(e => e.voids).filter(v => v.timestamp >= cutoff24h);
    return voidsIn24h.length;
  };

  const getStats = (): DiaryStats => {
    // Use 48-hour filtered data for stats
    const recentEntries = getEntriesLast48Hours();
    const allVoids = recentEntries.flatMap(e => e.voids);
    const allLeakages = recentEntries.flatMap(e => e.leakages);
    const allIntakes = recentEntries.flatMap(e => e.intakes);
    
    const volumes = allVoids.map(v => v.volume);
    const sortedVolumes = [...volumes].sort((a, b) => a - b);
    
    const medianVolume = sortedVolumes.length > 0
      ? sortedVolumes[Math.floor(sortedVolumes.length / 2)]
      : 0;
    
    const dayVoids = allVoids.filter(v => {
      const hour = v.timestamp.getHours();
      return hour >= 7 && hour < 23;
    }).length;
    
    const nightVoids = allVoids.filter(v => {
      const hour = v.timestamp.getHours();
      return hour < 7 || hour >= 23;
    }).length;
    
    // Calculate time span for accurate per-day averages (max 2 days)
    const hoursCovered = Math.min(48, 
      allVoids.length > 0 || allIntakes.length > 0 || allLeakages.length > 0 
        ? 48 
        : 0
    );
    const dayCount = hoursCovered / 24 || 1;
    
    return {
      totalVoids: allVoids.length,
      totalLeakages: allLeakages.length,
      totalIntake: allIntakes.reduce((sum, i) => sum + i.volume, 0),
      medianVolume,
      maxVolume: Math.max(...volumes, 0),
      minVolume: volumes.length > 0 ? Math.min(...volumes) : 0,
      avgVoidsPerDay: Math.round(allVoids.length / dayCount * 10) / 10,
      avgLeakagesPerDay: Math.round(allLeakages.length / dayCount * 10) / 10,
      dayVoids,
      nightVoids,
    };
  };

  return (
    <DiaryContext.Provider value={{
      entries,
      userProfile,
      currentView,
      setCurrentView,
      addVoidEvent,
      addLeakageEvent,
      addFluidIntake,
      updateUserProfile,
      importData,
      getStats,
      clearData,
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
