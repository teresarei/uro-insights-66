import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RecordingBlock, ClinicalPattern } from '@/types/urotracker';
import { DiaryEntry } from '@/types/database';
import { Json } from '@/integrations/supabase/types';

const BLOCK_DURATION_HOURS = 72;

export function useRecordingBlocks() {
  const [blocks, setBlocks] = useState<RecordingBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBlocks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recording_blocks')
        .select('*')
        .order('start_datetime', { ascending: false });

      if (error) throw error;
      
      // Parse clinical_patterns from JSON and cast types properly
      const parsedBlocks: RecordingBlock[] = (data || []).map(block => ({
        id: block.id,
        user_id: block.user_id || undefined,
        start_datetime: block.start_datetime,
        end_datetime: block.end_datetime,
        status: block.status as 'incomplete' | 'complete',
        void_count: block.void_count || 0,
        leakage_count: block.leakage_count || 0,
        intake_count: block.intake_count || 0,
        total_voided_ml: block.total_voided_ml || 0,
        total_intake_ml: block.total_intake_ml || 0,
        total_leakage_weight_g: block.total_leakage_weight_g || 0,
        day_voided_ml: block.day_voided_ml || 0,
        night_voided_ml: block.night_voided_ml || 0,
        day_void_count: block.day_void_count || 0,
        night_void_count: block.night_void_count || 0,
        median_void_volume: block.median_void_volume,
        max_void_volume: block.max_void_volume,
        min_void_volume: block.min_void_volume,
        clinical_patterns: parseClinicalPatterns(block.clinical_patterns),
        overall_assessment: block.overall_assessment,
        treatment_plan: block.treatment_plan,
        treatment_plan_updated_at: block.treatment_plan_updated_at,
        created_at: block.created_at,
        updated_at: block.updated_at,
      }));
      
      setBlocks(parsedBlocks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch blocks');
    } finally {
      setLoading(false);
    }
  }, []);

  const generateBlocksFromEntries = useCallback(async (entries: DiaryEntry[]) => {
    if (entries.length === 0) return;

    // Sort entries by datetime
    const sortedEntries = [...entries].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });

    // Group entries into 72-hour blocks
    const blocksMap = new Map<string, DiaryEntry[]>();
    
    sortedEntries.forEach(entry => {
      const entryDate = new Date(`${entry.date}T${entry.time}`);
      
      // Find or create a block for this entry
      let foundBlock = false;
      for (const [blockStart, blockEntries] of blocksMap) {
        const blockStartDate = new Date(blockStart);
        const blockEndDate = new Date(blockStartDate.getTime() + BLOCK_DURATION_HOURS * 60 * 60 * 1000);
        
        if (entryDate >= blockStartDate && entryDate < blockEndDate) {
          blockEntries.push(entry);
          foundBlock = true;
          break;
        }
      }
      
      if (!foundBlock) {
        // Create a new block starting at midnight of the entry's date
        const blockStart = new Date(entry.date);
        blockStart.setHours(0, 0, 0, 0);
        blocksMap.set(blockStart.toISOString(), [entry]);
      }
    });

    // Create or update blocks in database
    for (const [blockStart, blockEntries] of blocksMap) {
      const startDate = new Date(blockStart);
      const endDate = new Date(startDate.getTime() + BLOCK_DURATION_HOURS * 60 * 60 * 1000);
      
      // Calculate statistics
      const voids = blockEntries.filter(e => e.event_type === 'void');
      const leakages = blockEntries.filter(e => e.event_type === 'leakage');
      const intakes = blockEntries.filter(e => e.event_type === 'intake');
      
      const voidVolumes = voids.map(v => v.volume_ml || 0).filter(v => v > 0);
      const totalVoided = voidVolumes.reduce((sum, v) => sum + v, 0);
      const totalIntake = intakes.reduce((sum, i) => sum + (i.volume_ml || 0), 0);
      const totalLeakage = leakages.reduce((sum, l) => sum + (l.leakage_weight_g || 0), 0);
      
      // Day/night split (6am-10pm = day)
      const dayVoids = voids.filter(v => {
        const hour = parseInt(v.time.split(':')[0]);
        return hour >= 6 && hour < 22;
      });
      const nightVoids = voids.filter(v => {
        const hour = parseInt(v.time.split(':')[0]);
        return hour < 6 || hour >= 22;
      });
      
      const sortedVolumes = [...voidVolumes].sort((a, b) => a - b);
      const medianVolume = sortedVolumes.length > 0 
        ? sortedVolumes[Math.floor(sortedVolumes.length / 2)] 
        : null;
      
      // Check if block already exists
      const { data: existingBlock } = await supabase
        .from('recording_blocks')
        .select('id')
        .eq('start_datetime', startDate.toISOString())
        .single();

      // Calculate if block is complete (72 hours have passed)
      const now = new Date();
      const isComplete = now >= endDate;

      // Generate clinical patterns
      const patterns = generateClinicalPatterns(voids, leakages, intakes);

      const blockData = {
        start_datetime: startDate.toISOString(),
        end_datetime: endDate.toISOString(),
        status: isComplete ? 'complete' as const : 'incomplete' as const,
        void_count: voids.length,
        leakage_count: leakages.length,
        intake_count: intakes.length,
        total_voided_ml: totalVoided,
        total_intake_ml: totalIntake,
        total_leakage_weight_g: totalLeakage,
        day_voided_ml: dayVoids.reduce((sum, v) => sum + (v.volume_ml || 0), 0),
        night_voided_ml: nightVoids.reduce((sum, v) => sum + (v.volume_ml || 0), 0),
        day_void_count: dayVoids.length,
        night_void_count: nightVoids.length,
        median_void_volume: medianVolume,
        max_void_volume: voidVolumes.length > 0 ? Math.max(...voidVolumes) : null,
        min_void_volume: voidVolumes.length > 0 ? Math.min(...voidVolumes) : null,
        clinical_patterns: patterns as unknown as Json,
        overall_assessment: patterns.length > 0 ? patterns[0].name : null,
      };

      if (existingBlock) {
        await supabase
          .from('recording_blocks')
          .update(blockData)
          .eq('id', existingBlock.id);
      } else {
        await supabase
          .from('recording_blocks')
          .insert(blockData);
      }
    }

    await fetchBlocks();
  }, [fetchBlocks]);

  const updateTreatmentPlan = useCallback(async (blockId: string, treatmentPlan: string) => {
    const { error } = await supabase
      .from('recording_blocks')
      .update({
        treatment_plan: treatmentPlan,
        treatment_plan_updated_at: new Date().toISOString(),
      })
      .eq('id', blockId);

    if (error) throw error;
    await fetchBlocks();
  }, [fetchBlocks]);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  return {
    blocks,
    loading,
    error,
    fetchBlocks,
    generateBlocksFromEntries,
    updateTreatmentPlan,
  };
}

function parseClinicalPatterns(json: Json | null): ClinicalPattern[] {
  if (!json || !Array.isArray(json)) return [];
  
  return json.map((item: unknown) => {
    const obj = item as Record<string, unknown>;
    return {
      name: String(obj.name || ''),
      probability: (obj.probability as 'high' | 'moderate' | 'low') || 'low',
      reasoning: String(obj.reasoning || ''),
      recommendation: String(obj.recommendation || ''),
    };
  });
}

function generateClinicalPatterns(
  voids: DiaryEntry[],
  leakages: DiaryEntry[],
  intakes: DiaryEntry[]
): ClinicalPattern[] {
  const patterns: ClinicalPattern[] = [];
  const days = 3; // 72 hours = 3 days

  const avgVoidsPerDay = voids.length / days;
  const voidVolumes = voids.map(v => v.volume_ml || 0).filter(v => v > 0);
  const medianVolume = voidVolumes.length > 0
    ? [...voidVolumes].sort((a, b) => a - b)[Math.floor(voidVolumes.length / 2)]
    : 0;

  // OAB pattern
  if (avgVoidsPerDay > 8) {
    const urgentVoids = voids.filter(v => v.urgency && v.urgency >= 4);
    const urgencyRate = voids.length > 0 ? urgentVoids.length / voids.length : 0;
    
    if (urgencyRate > 0.3 || medianVolume < 200) {
      patterns.push({
        name: 'Overactive Bladder (OAB)',
        probability: urgencyRate > 0.5 ? 'high' : 'moderate',
        reasoning: `Frequent voids (${avgVoidsPerDay.toFixed(1)}/day) with ${urgencyRate > 0.3 ? 'frequent urgency' : 'low volumes'} suggest OAB.`,
        recommendation: 'Bladder training and behavioral modifications may help.',
      });
    }
  }

  // Stress incontinence
  const stressTriggers = ['cough', 'sneeze', 'laugh', 'exercise', 'lifting'];
  const stressLeakages = leakages.filter(l => l.trigger && stressTriggers.includes(l.trigger));
  
  if (stressLeakages.length > 0) {
    const rate = stressLeakages.length / (leakages.length || 1);
    patterns.push({
      name: 'Stress Urinary Incontinence',
      probability: rate > 0.7 ? 'high' : rate > 0.4 ? 'moderate' : 'low',
      reasoning: `${stressLeakages.length} leakage(s) triggered by physical stress.`,
      recommendation: 'Pelvic floor exercises (Kegels) are often effective.',
    });
  }

  // Urge incontinence
  const urgeLeakages = leakages.filter(l => l.trigger === 'urgency');
  if (urgeLeakages.length > 0) {
    patterns.push({
      name: 'Urge Incontinence',
      probability: urgeLeakages.length > 3 ? 'high' : 'moderate',
      reasoning: `${urgeLeakages.length} leakage(s) with strong urgency.`,
      recommendation: 'Bladder retraining and scheduled voiding may help.',
    });
  }

  // Nocturia
  const nightVoids = voids.filter(v => {
    const hour = parseInt(v.time.split(':')[0]);
    return hour < 6 || hour >= 22;
  });
  
  if (nightVoids.length >= 2 * days) {
    patterns.push({
      name: 'Nocturia',
      probability: nightVoids.length >= 3 * days ? 'high' : 'moderate',
      reasoning: `${(nightVoids.length / days).toFixed(1)} nighttime voids per night.`,
      recommendation: 'Reduce evening fluids, especially caffeine.',
    });
  }

  // Polyuria
  const avgDailyOutput = voidVolumes.reduce((sum, v) => sum + v, 0) / days;
  if (avgDailyOutput > 2500) {
    patterns.push({
      name: 'Polyuria',
      probability: avgDailyOutput > 3000 ? 'high' : 'moderate',
      reasoning: `High daily output (${Math.round(avgDailyOutput)}ml/day).`,
      recommendation: 'Review fluid intake and discuss with your doctor.',
    });
  }

  if (patterns.length === 0 && voids.length > 0) {
    patterns.push({
      name: 'No Concerning Patterns',
      probability: 'low',
      reasoning: 'Voiding patterns within normal ranges.',
      recommendation: 'Continue monitoring if concerns persist.',
    });
  }

  return patterns;
}
