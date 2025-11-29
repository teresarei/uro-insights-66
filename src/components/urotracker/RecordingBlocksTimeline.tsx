import { useState, useEffect } from 'react';
import { format, differenceInHours } from 'date-fns';
import { useDiary } from '@/context/DiaryContext';
import { useRecordingBlocks } from '@/hooks/useRecordingBlocks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar,
  Droplets,
  AlertTriangle,
  GlassWater,
  Clock,
  CheckCircle,
  ChevronRight,
  ArrowRight,
  ExternalLink,
  Save,
  Loader2,
  Brain,
  FileText,
  HeartPulse,
  Info
} from 'lucide-react';
import { RecordingBlock, ClinicalPattern } from '@/types/urotracker';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const GUIDELINE_URLS: Record<string, string> = {
  'Overactive Bladder (OAB)': 'https://uroweb.org/guidelines/non-neurogenic-female-luts',
  'Stress Urinary Incontinence': 'https://uroweb.org/guidelines/non-neurogenic-female-luts/chapter/stress-urinary-incontinence',
  'Urge Incontinence': 'https://uroweb.org/guidelines/non-neurogenic-female-luts',
  'Nocturia': 'https://uroweb.org/guidelines/non-neurogenic-male-luts/chapter/nocturia',
  'Polyuria': 'https://uroweb.org/guidelines/non-neurogenic-male-luts',
  'default': 'https://uroweb.org/guidelines/non-neurogenic-female-luts',
};

export function RecordingBlocksTimeline() {
  const { entries, setCurrentView } = useDiary();
  const { blocks, loading, generateBlocksFromEntries, updateTreatmentPlan } = useRecordingBlocks();
  const [selectedBlock, setSelectedBlock] = useState<RecordingBlock | null>(null);
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Generate blocks when entries change
  useEffect(() => {
    if (entries.length > 0) {
      generateBlocksFromEntries(entries);
    }
  }, [entries, generateBlocksFromEntries]);

  const handleOpenBlock = (block: RecordingBlock) => {
    setSelectedBlock(block);
    setTreatmentPlan(block.treatment_plan || '');
  };

  const handleSaveTreatmentPlan = async () => {
    if (!selectedBlock) return;
    
    setIsSaving(true);
    try {
      await updateTreatmentPlan(selectedBlock.id, treatmentPlan);
      setSelectedBlock(prev => prev ? { ...prev, treatment_plan: treatmentPlan, treatment_plan_updated_at: new Date().toISOString() } : null);
    } catch (err) {
      console.error('Failed to save treatment plan:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const getGuidelineUrl = (patterns: ClinicalPattern[]) => {
    if (patterns.length === 0) return GUIDELINE_URLS.default;
    const primaryPattern = patterns.find(p => p.probability === 'high') || patterns[0];
    return GUIDELINE_URLS[primaryPattern.name] || GUIDELINE_URLS.default;
  };

  const probabilityColors = {
    high: 'bg-destructive/10 text-destructive border-destructive/20',
    moderate: 'bg-warning-soft text-warning-foreground border-warning-foreground/20',
    low: 'bg-success-soft text-success border-success/20',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-info-soft mb-6">
          <Calendar className="h-10 w-10 text-info" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">No recording blocks yet</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          Start logging diary entries to automatically create 72-hour recording blocks for clinical analysis.
        </p>
        <Button variant="hero" onClick={() => setCurrentView('entry')}>
          Start Logging
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Recording History</h1>
        <p className="text-muted-foreground">
          72-hour recording blocks based on EAU clinical guidelines
        </p>
      </div>

      {/* Medical disclaimer */}
      <Card variant="warning">
        <CardContent className="flex gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-foreground/10">
            <Info className="h-5 w-5 text-warning-foreground" />
          </div>
          <div>
            <p className="font-medium text-warning-foreground">Medical Disclaimer</p>
            <p className="text-sm text-warning-foreground/80">
              These assessments provide guidance only. <strong>Only a healthcare professional can provide diagnosis and treatment.</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Blocks timeline */}
      <div className="space-y-4">
        {blocks.length === 0 ? (
          <Card variant="elevated" className="p-8 text-center">
            <p className="text-muted-foreground">
              Recording blocks are being generated from your diary entries...
            </p>
          </Card>
        ) : (
          blocks.map((block, index) => {
            const startDate = new Date(block.start_datetime);
            const endDate = new Date(block.end_datetime);
            const duration = differenceInHours(endDate, startDate);
            const primaryPattern = block.clinical_patterns.find(p => p.probability === 'high') 
              || block.clinical_patterns[0];

            return (
              <Card 
                key={block.id} 
                variant="elevated" 
                className="cursor-pointer hover:shadow-lg transition-shadow animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => handleOpenBlock(block)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Date range and status */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
                          </span>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "flex items-center gap-1",
                            block.status === 'complete' 
                              ? "bg-success-soft text-success border-success/20"
                              : "bg-warning-soft text-warning-foreground border-warning-foreground/20"
                          )}
                        >
                          {block.status === 'complete' ? (
                            <><CheckCircle className="h-3 w-3" /> Complete</>
                          ) : (
                            <><Clock className="h-3 w-3" /> In Progress</>
                          )}
                        </Badge>
                      </div>

                      {/* Quick stats */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <Droplets className="h-4 w-4 text-highlight-strong" />
                          <span>{block.void_count} voids</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4 text-warning-foreground" />
                          <span>{block.leakage_count} leakages</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <GlassWater className="h-4 w-4 text-info" />
                          <span>{block.total_intake_ml}ml intake</span>
                        </div>
                      </div>

                      {/* Primary assessment */}
                      {primaryPattern && (
                        <div className="flex items-center gap-2">
                          <HeartPulse className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{primaryPattern.name}</span>
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", probabilityColors[primaryPattern.probability])}
                          >
                            {primaryPattern.probability}
                          </Badge>
                        </div>
                      )}

                      {/* Treatment plan indicator */}
                      {block.treatment_plan && (
                        <div className="flex items-center gap-2 text-sm text-success">
                          <FileText className="h-4 w-4" />
                          <span>Treatment plan added</span>
                        </div>
                      )}
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Block detail dialog */}
      <Dialog open={!!selectedBlock} onOpenChange={(open) => !open && setSelectedBlock(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedBlock && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recording Block Details
                </DialogTitle>
                <DialogDescription>
                  {format(new Date(selectedBlock.start_datetime), 'MMM d')} – {format(new Date(selectedBlock.end_datetime), 'MMM d, yyyy')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-3 text-center">
                    <p className="text-2xl font-bold text-highlight-strong">{selectedBlock.void_count}</p>
                    <p className="text-xs text-muted-foreground">Total Voids</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-2xl font-bold text-warning-foreground">{selectedBlock.leakage_count}</p>
                    <p className="text-xs text-muted-foreground">Leakages</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-2xl font-bold text-info">{selectedBlock.total_intake_ml}</p>
                    <p className="text-xs text-muted-foreground">Intake (ml)</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{selectedBlock.median_void_volume || 0}</p>
                    <p className="text-xs text-muted-foreground">Median Vol (ml)</p>
                  </Card>
                </div>

                {/* Day/Night split */}
                <Card className="p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Day/Night Pattern
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Daytime (6am-10pm)</p>
                      <p className="font-medium">{selectedBlock.day_void_count} voids, {selectedBlock.day_voided_ml}ml</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nighttime (10pm-6am)</p>
                      <p className="font-medium">{selectedBlock.night_void_count} voids, {selectedBlock.night_voided_ml}ml</p>
                    </div>
                  </div>
                </Card>

                {/* Clinical patterns */}
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Clinical Assessment
                  </h3>
                  {selectedBlock.clinical_patterns.map((pattern, i) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-medium">{pattern.name}</span>
                        <Badge variant="outline" className={cn(probabilityColors[pattern.probability])}>
                          {pattern.probability}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{pattern.reasoning}</p>
                      <p className="text-sm bg-highlight/50 p-2 rounded">{pattern.recommendation}</p>
                    </Card>
                  ))}
                </div>

                {/* Guideline reference */}
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => window.open(getGuidelineUrl(selectedBlock.clinical_patterns), '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  View EAU Guideline Reference
                </Button>

                {/* Treatment plan */}
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Treatment Plan
                    {selectedBlock.treatment_plan_updated_at && (
                      <span className="text-xs text-muted-foreground font-normal">
                        Last updated: {format(new Date(selectedBlock.treatment_plan_updated_at), 'MMM d, yyyy HH:mm')}
                      </span>
                    )}
                  </h3>
                  <Textarea
                    placeholder="Enter treatment recommendations, behavioral therapy notes, fluid modification plans, bladder training schedule, medication notes, follow-up intervals..."
                    value={treatmentPlan}
                    onChange={(e) => setTreatmentPlan(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                  <Button
                    onClick={handleSaveTreatmentPlan}
                    disabled={isSaving || treatmentPlan === (selectedBlock.treatment_plan || '')}
                    className="gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Treatment Plan
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
