import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DiaryEntry, DiaryEntryInsert, DiaryEntryUpdate, EntryFilters, ComputedStats, EventType } from '@/types/database';
import { toast } from 'sonner';

export function useEntries() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all entries
  const fetchEntries = useCallback(async (filters?: EntryFilters) => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('diary_entries')
        .select('*');

      // Apply filters
      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }
      if (filters?.eventTypes && filters.eventTypes.length > 0) {
        query = query.in('event_type', filters.eventTypes);
      }

      // Apply sorting
      const sortBy = filters?.sortBy || 'date';
      const sortOrder = filters?.sortOrder || 'desc';
      
      if (sortBy === 'date') {
        query = query.order('date', { ascending: sortOrder === 'asc' })
                     .order('time', { ascending: sortOrder === 'asc' });
      } else {
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      
      setEntries(data as DiaryEntry[] || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch entries';
      setError(message);
      console.error('Error fetching entries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Add a new entry
  const addEntry = async (entry: DiaryEntryInsert): Promise<DiaryEntry | null> => {
    try {
      const { data, error: insertError } = await supabase
        .from('diary_entries')
        .insert(entry)
        .select()
        .single();

      if (insertError) throw insertError;

      const newEntry = data as DiaryEntry;
      setEntries(prev => [newEntry, ...prev]);
      return newEntry;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add entry';
      toast.error(message);
      console.error('Error adding entry:', err);
      return null;
    }
  };

  // Add multiple entries at once
  const addEntries = async (newEntries: DiaryEntryInsert[]): Promise<DiaryEntry[]> => {
    try {
      const { data, error: insertError } = await supabase
        .from('diary_entries')
        .insert(newEntries)
        .select();

      if (insertError) throw insertError;

      const addedEntries = data as DiaryEntry[] || [];
      setEntries(prev => [...addedEntries, ...prev]);
      return addedEntries;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add entries';
      toast.error(message);
      console.error('Error adding entries:', err);
      return [];
    }
  };

  // Update an entry
  const updateEntry = async (id: string, updates: DiaryEntryUpdate): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('diary_entries')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      setEntries(prev => prev.map(entry => 
        entry.id === id ? { ...entry, ...updates } : entry
      ));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update entry';
      toast.error(message);
      console.error('Error updating entry:', err);
      return false;
    }
  };

  // Delete an entry
  const deleteEntry = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('diary_entries')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setEntries(prev => prev.filter(entry => entry.id !== id));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete entry';
      toast.error(message);
      console.error('Error deleting entry:', err);
      return false;
    }
  };

  // Delete all entries
  const deleteAllEntries = async (): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('diary_entries')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (deleteError) throw deleteError;

      setEntries([]);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete all entries';
      toast.error(message);
      console.error('Error deleting all entries:', err);
      return false;
    }
  };

  // Get entries for a specific date range (for dashboard)
  const getEntriesInRange = useCallback((startDate: Date, endDate: Date): DiaryEntry[] => {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    
    return entries.filter(entry => {
      return entry.date >= start && entry.date <= end;
    });
  }, [entries]);

  // Get entries for the last 48 hours
  const getEntriesLast48Hours = useCallback((): DiaryEntry[] => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const cutoffDate = cutoff.toISOString().split('T')[0];
    const cutoffTime = cutoff.toTimeString().split(' ')[0];

    return entries.filter(entry => {
      if (entry.date > cutoffDate) return true;
      if (entry.date === cutoffDate && entry.time >= cutoffTime) return true;
      return false;
    });
  }, [entries]);

  // Compute statistics from entries
  const computeStats = useCallback((entriesSubset?: DiaryEntry[]): ComputedStats => {
    const data = entriesSubset || getEntriesLast48Hours();
    
    const voids = data.filter(e => e.event_type === 'void');
    const leakages = data.filter(e => e.event_type === 'leakage');
    const intakes = data.filter(e => e.event_type === 'intake');

    const volumes = voids
      .map(v => v.volume_ml)
      .filter((v): v is number => v !== null && v > 0);
    
    const sortedVolumes = [...volumes].sort((a, b) => a - b);
    const medianVolume = sortedVolumes.length > 0
      ? sortedVolumes[Math.floor(sortedVolumes.length / 2)]
      : 0;

    const dayVoids = voids.filter(v => {
      const hour = parseInt(v.time.split(':')[0]);
      return hour >= 7 && hour < 23;
    }).length;

    const nightVoids = voids.filter(v => {
      const hour = parseInt(v.time.split(':')[0]);
      return hour < 7 || hour >= 23;
    }).length;

    // Calculate unique days for averaging
    const uniqueDates = new Set(data.map(e => e.date));
    const dayCount = uniqueDates.size || 1;

    // Calculate total leakage weight from pad weights
    const totalLeakageWeight = leakages.reduce((sum, l) => {
      return sum + (l.leakage_weight_g || 0);
    }, 0);

    return {
      totalVoids: voids.length,
      totalLeakages: leakages.length,
      totalIntake: intakes.reduce((sum, i) => sum + (i.volume_ml || 0), 0),
      medianVolume,
      maxVolume: volumes.length > 0 ? Math.max(...volumes) : 0,
      minVolume: volumes.length > 0 ? Math.min(...volumes) : 0,
      avgVoidsPerDay: Math.round(voids.length / dayCount * 10) / 10,
      avgLeakagesPerDay: Math.round(leakages.length / dayCount * 10) / 10,
      dayVoids,
      nightVoids,
      totalLeakageWeight,
    };
  }, [getEntriesLast48Hours]);

  // Get entries in the last 24 hours
  const getEntriesLast24Hours = useCallback((): DiaryEntry[] => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const cutoffDate = cutoff.toISOString().split('T')[0];
    const cutoffTime = cutoff.toTimeString().split(' ')[0];

    return entries.filter(entry => {
      if (entry.date > cutoffDate) return true;
      if (entry.date === cutoffDate && entry.time >= cutoffTime) return true;
      return false;
    });
  }, [entries]);

  // Get voids in the last 24 hours
  const getVoidsPer24Hours = useCallback((): number => {
    return getEntriesLast24Hours().filter(e => e.event_type === 'void').length;
  }, [getEntriesLast24Hours]);

  // Get total leakage weight in the last 24 hours
  const getLeakageWeight24Hours = useCallback((): number => {
    return getEntriesLast24Hours()
      .filter(e => e.event_type === 'leakage')
      .reduce((sum, l) => sum + (l.leakage_weight_g || 0), 0);
  }, [getEntriesLast24Hours]);

  // Set up real-time subscription
  useEffect(() => {
    fetchEntries();

    const channel = supabase
      .channel('diary_entries_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'diary_entries'
        },
        (payload) => {
          console.log('Realtime update:', payload);
          if (payload.eventType === 'INSERT') {
            setEntries(prev => [payload.new as DiaryEntry, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setEntries(prev => prev.map(entry => 
              entry.id === payload.new.id ? payload.new as DiaryEntry : entry
            ));
          } else if (payload.eventType === 'DELETE') {
            setEntries(prev => prev.filter(entry => entry.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEntries]);

  return {
    entries,
    loading,
    error,
    fetchEntries,
    addEntry,
    addEntries,
    updateEntry,
    deleteEntry,
    deleteAllEntries,
    getEntriesInRange,
    getEntriesLast48Hours,
    getEntriesLast24Hours,
    computeStats,
    getVoidsPer24Hours,
    getLeakageWeight24Hours,
  };
}
