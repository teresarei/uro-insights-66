import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDiary } from '@/context/DiaryContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Brain, 
  HeartPulse, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  Clock,
  Stethoscope,
  FileText,
  Save,
  Loader2,
  Edit,
  Plus
} from 'lucide-react';
import { ClinicalPattern } from '@/types/urotracker';
import { TreatmentPlan } from '@/types/roles';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export function DoctorInsightsView() {
  const { user, selectedPatient } = useAuth();
  const { entries, getStats, getEntriesLast48Hours } = useDiary();
  const stats = getStats();
  const recentEntries = getEntriesLast48Hours();
  
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [planText, setPlanText] = useState('');
  const [clinicianNotes, setClinicianNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedPatient) {
      fetchTreatmentPlans();
    }
  }, [selectedPatient]);

  const fetchTreatmentPlans = async () => {
    if (!selectedPatient) return;
    
    const { data, error } = await supabase
      .from('treatment_plans')
      .select('*')
      .eq('patient_id', selectedPatient.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setTreatmentPlans(data as TreatmentPlan[]);
    }
  };

  // Generate clinical patterns (same as patient view)
  const generatePatterns = (): ClinicalPattern[] => {
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
          reasoning: `Frequent voids (${stats.avgVoidsPerDay}/day) with ${urgencyRate > 0.3 ? 'frequent urgency episodes' : 'lower-than-average volumes'} suggest an overactive bladder pattern.`,
          recommendation: 'Consider behavioral therapy, bladder training, and potentially antimuscarinic medications.',
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
        reasoning: `${stressLeakages.length} leakage event(s) triggered by physical stress suggest stress incontinence.`,
        recommendation: 'Consider pelvic floor muscle training, pessary evaluation, or surgical options.',
      });
    }

    const urgeLeakages = leakages.filter(l => l.trigger === 'urgency');
    if (urgeLeakages.length > 0) {
      patterns.push({
        name: 'Urge Incontinence',
        probability: urgeLeakages.length > 3 ? 'high' : 'moderate',
        reasoning: `${urgeLeakages.length} leakage event(s) associated with urgency.`,
        recommendation: 'Bladder retraining, scheduled voiding, and antimuscarinic or beta-3 agonist medications.',
      });
    }

    if (stats.nightVoids >= 2 * uniqueDays) {
      patterns.push({
        name: 'Nocturia',
        probability: stats.nightVoids >= 3 * uniqueDays ? 'high' : 'moderate',
        reasoning: `Averaging ${(stats.nightVoids / uniqueDays).toFixed(1)} nighttime voids.`,
        recommendation: 'Evaluate for nocturnal polyuria, consider desmopressin if appropriate.',
      });
    }

    if (patterns.length === 0 && entries.length > 0) {
      patterns.push({
        name: 'No Concerning Patterns',
        probability: 'low',
        reasoning: 'Voiding patterns appear within normal ranges.',
        recommendation: 'Continue monitoring. Reassess if symptoms change.',
      });
    }

    return patterns;
  };

  const patterns = generatePatterns();

  const handleSaveTreatmentPlan = async () => {
    if (!user?.doctorId || !selectedPatient || !planText.trim()) return;
    
    setSaving(true);
    
    try {
      // For now, we'll save without a recording_block_id as we may not have one
      // In a real implementation, you'd select a specific recording block
      const { error } = await supabase
        .from('treatment_plans')
        .insert({
          doctor_id: user.doctorId,
          patient_id: selectedPatient.id,
          recording_block_id: '00000000-0000-0000-0000-000000000000', // Placeholder
          plan_text: planText,
          clinician_notes: clinicianNotes || null,
        });
      
      if (error) throw error;
      
      toast({
        title: 'Behandlingsplan sparad',
        description: 'Behandlingsplanen har lagts till för patienten.',
      });
      
      setIsEditing(false);
      setPlanText('');
      setClinicianNotes('');
      fetchTreatmentPlans();
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte spara behandlingsplanen.',
        variant: 'destructive',
      });
    }
    
    setSaving(false);
  };

  const probabilityColors = {
    high: 'bg-destructive/10 text-destructive border-destructive/20',
    moderate: 'bg-warning-soft text-warning-foreground border-warning-foreground/20',
    low: 'bg-success-soft text-success border-success/20',
  };

  const probabilityIcons = {
    high: AlertTriangle,
    moderate: Clock,
    low: CheckCircle,
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Kliniska Insikter
        </h2>
        <p className="text-muted-foreground">
          Baserat på EAU-riktlinjer och patientens dagbok
        </p>
      </div>

      {/* Clinical patterns */}
      <div className="space-y-4">
        {patterns.map((pattern, index) => {
          const ProbabilityIcon = probabilityIcons[pattern.probability];
          return (
            <Card key={index} variant="elevated">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="h-5 w-5 text-primary" />
                    <span className="font-semibold">{pattern.name}</span>
                  </div>
                  <Badge variant="outline" className={cn("flex items-center gap-1", probabilityColors[pattern.probability])}>
                    <ProbabilityIcon className="h-3 w-3" />
                    {pattern.probability === 'high' ? 'Hög' : pattern.probability === 'moderate' ? 'Måttlig' : 'Låg'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{pattern.reasoning}</p>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-sm">
                    <strong>Rekommendation:</strong> {pattern.recommendation}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Treatment Plan Section - Doctor Only */}
      <Card variant="elevated" className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Behandlingsplan
            <Badge variant="outline" className="ml-2 text-xs">Endast vårdgivare</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isEditing ? (
            <>
              {treatmentPlans.length > 0 ? (
                <div className="space-y-4">
                  {treatmentPlans.map((plan) => (
                    <div key={plan.id} className="p-4 rounded-lg bg-muted/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(plan.created_at).toLocaleDateString('sv-SE')}
                        </span>
                      </div>
                      <p className="text-sm">{plan.plan_text}</p>
                      {plan.clinician_notes && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">Kliniska anteckningar:</p>
                          <p className="text-sm italic">{plan.clinician_notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Ingen behandlingsplan har lagts till ännu.
                </p>
              )}
              
              <Button onClick={() => setIsEditing(true)} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Lägg till behandlingsplan
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plan">Behandlingsplan</Label>
                <Textarea
                  id="plan"
                  placeholder="Beskriv behandlingsplanen..."
                  value={planText}
                  onChange={(e) => setPlanText(e.target.value)}
                  rows={4}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Kliniska anteckningar (valfritt)</Label>
                <Textarea
                  id="notes"
                  placeholder="Ytterligare anteckningar..."
                  value={clinicianNotes}
                  onChange={(e) => setClinicianNotes(e.target.value)}
                  rows={2}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleSaveTreatmentPlan} 
                  disabled={!planText.trim() || saving}
                  className="flex-1 gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Spara
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false);
                    setPlanText('');
                    setClinicianNotes('');
                  }}
                >
                  Avbryt
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
