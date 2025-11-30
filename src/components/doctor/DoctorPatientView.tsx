import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DiaryProvider, useDiary } from '@/context/DiaryContext';
import { DoctorHeader } from './DoctorHeader';
import { DoctorPatientDashboard } from './DoctorPatientDashboard';
import { DoctorEntriesView } from './DoctorEntriesView';
import { DoctorInsightsView } from './DoctorInsightsView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, List, Brain, FileText } from 'lucide-react';
import { generateDoctorSummaryPDF } from '@/utils/pdfExport';
import { supabase } from '@/integrations/supabase/client';
import { TreatmentPlan } from '@/types/roles';
import { ClinicalPattern } from '@/types/urotracker';
import { toast } from '@/hooks/use-toast';

type DoctorViewTab = 'dashboard' | 'entries' | 'insights';

function DoctorPatientViewContent() {
  const { user, selectedPatient } = useAuth();
  const { entries, getStats, getEntriesLast48Hours } = useDiary();
  const [currentTab, setCurrentTab] = useState<DoctorViewTab>('dashboard');
  const [exporting, setExporting] = useState(false);
  const stats = getStats();
  const recentEntries = getEntriesLast48Hours();

  // Generate clinical patterns for export
  const clinicalPatterns = useMemo((): ClinicalPattern[] => {
    const patterns: ClinicalPattern[] = [];
    const voids = recentEntries.filter(e => e.event_type === 'void');
    const leakages = recentEntries.filter(e => e.event_type === 'leakage');
    const uniqueDays = new Set(recentEntries.map(e => e.date)).size || 1;

    if (stats.avgVoidsPerDay > 8) {
      const urgentVoids = voids.filter(v => v.urgency && v.urgency >= 4);
      const urgencyRate = voids.length > 0 ? urgentVoids.length / voids.length : 0;
      
      if (urgencyRate > 0.3 || stats.medianVolume < 200) {
        patterns.push({
          name: 'Overactive Bladder (OAB)',
          probability: urgencyRate > 0.5 ? 'high' : 'moderate',
          reasoning: `Frequent voids (${stats.avgVoidsPerDay}/day) with ${urgencyRate > 0.3 ? 'frequent urgency' : 'low volumes'}.`,
          recommendation: 'Behavioral therapy, bladder training, potentially antimuscarinic medications.',
        });
      }
    }

    const stressTriggers = ['cough', 'sneeze', 'laugh', 'exercise', 'lifting'];
    const stressLeakages = leakages.filter(l => l.trigger && stressTriggers.includes(l.trigger));
    
    if (stressLeakages.length > 0) {
      const rate = stressLeakages.length / (leakages.length || 1);
      patterns.push({
        name: 'Stress Urinary Incontinence',
        probability: rate > 0.7 ? 'high' : rate > 0.4 ? 'moderate' : 'low',
        reasoning: `${stressLeakages.length} leakage(s) triggered by physical stress.`,
        recommendation: 'Pelvic floor muscle training, pessary evaluation, or surgical options.',
      });
    }

    const urgeLeakages = leakages.filter(l => l.trigger === 'urgency');
    if (urgeLeakages.length > 0) {
      patterns.push({
        name: 'Urge Incontinence',
        probability: urgeLeakages.length > 3 ? 'high' : 'moderate',
        reasoning: `${urgeLeakages.length} leakage(s) with urgency.`,
        recommendation: 'Bladder retraining, scheduled voiding, medications.',
      });
    }

    if (stats.nightVoids >= 2 * uniqueDays) {
      patterns.push({
        name: 'Nocturia',
        probability: stats.nightVoids >= 3 * uniqueDays ? 'high' : 'moderate',
        reasoning: `Averaging ${(stats.nightVoids / uniqueDays).toFixed(1)} nighttime voids.`,
        recommendation: 'Evaluate for nocturnal polyuria, consider desmopressin.',
      });
    }

    return patterns;
  }, [recentEntries, stats]);

  const handleExportPDF = async () => {
    if (!selectedPatient || !user) return;
    
    setExporting(true);
    
    try {
      // Fetch treatment plans
      const { data: plans } = await supabase
        .from('treatment_plans')
        .select('*')
        .eq('patient_id', selectedPatient.id)
        .order('created_at', { ascending: false });

      // Get date range from entries
      const dates = entries.map(e => e.date).sort();
      const dateRange = dates.length > 0 
        ? { start: dates[0], end: dates[dates.length - 1] }
        : undefined;

      generateDoctorSummaryPDF({
        entries,
        stats,
        patientName: selectedPatient.display_name,
        patientPersonalNumber: selectedPatient.personal_number,
        doctorName: user.name,
        treatmentPlans: (plans as TreatmentPlan[]) || [],
        clinicalPatterns,
        dateRange,
      });

      toast({
        title: 'PDF exporterad',
        description: 'Den kliniska sammanfattningen har laddats ner.',
      });
    } catch (error) {
      toast({
        title: 'Exportfel',
        description: 'Kunde inte generera PDF-rapporten.',
        variant: 'destructive',
      });
    }
    
    setExporting(false);
  };

  if (!selectedPatient) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background gradient-surface">
      <DoctorHeader showBackButton />
      <main className="container max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as DoctorViewTab)} className="flex-1">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dashboard" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Översikt</span>
              </TabsTrigger>
              <TabsTrigger value="entries" className="gap-2">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Dagbok</span>
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-2">
                <Brain className="h-4 w-4" />
                <span className="hidden sm:inline">Insikter</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-4 gap-2"
            onClick={handleExportPDF}
            disabled={exporting}
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{exporting ? 'Exporterar...' : 'Exportera PDF'}</span>
          </Button>
        </div>

        <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as DoctorViewTab)}>
          <TabsContent value="dashboard">
            <DoctorPatientDashboard />
          </TabsContent>
          <TabsContent value="entries">
            <DoctorEntriesView />
          </TabsContent>
          <TabsContent value="insights">
            <DoctorInsightsView />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export function DoctorPatientView() {
  const { selectedPatient } = useAuth();

  if (!selectedPatient) {
    return null;
  }

  return (
    <DiaryProvider>
      <DoctorPatientViewContent />
    </DiaryProvider>
  );
}
