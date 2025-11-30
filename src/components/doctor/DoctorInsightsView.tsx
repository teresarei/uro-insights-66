import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDiary } from '@/context/DiaryContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  HeartPulse, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Stethoscope,
  Save,
  Loader2,
  Plus,
  Calendar,
  Activity,
  Droplets,
  Moon,
  Sun,
  FileText,
  ExternalLink
} from 'lucide-react';
import { ClinicalPattern } from '@/types/urotracker';
import { TreatmentPlan } from '@/types/roles';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { getValidationSummary } from '@/utils/recordingValidation';
import { NocturiaGuidance } from '@/components/urotracker/NocturiaGuidance';

// Helper to determine sex from Swedish personal number (9th digit: odd=male, even=female)
function getSexFromPersonalNumber(personalNumber: string | undefined): 'male' | 'female' | null {
  if (!personalNumber) return null;
  const digits = personalNumber.replace(/\D/g, '');
  // For 10-digit format (YYMMDD-XXXX), the 9th digit is at index 8
  // For 12-digit format (YYYYMMDD-XXXX), the 11th digit is the sex indicator
  let sexDigit: number;
  if (digits.length === 10) {
    sexDigit = parseInt(digits[8], 10);
  } else if (digits.length === 12) {
    sexDigit = parseInt(digits[10], 10);
  } else {
    return null;
  }
  return sexDigit % 2 === 1 ? 'male' : 'female';
}

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

  // Calculate validation summary
  const validationSummary = useMemo(() => {
    return getValidationSummary(entries);
  }, [entries]);

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

  // Generate clinical patterns
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
      const { error } = await supabase
        .from('treatment_plans')
        .insert({
          doctor_id: user.doctorId,
          patient_id: selectedPatient.id,
          recording_block_id: '00000000-0000-0000-0000-000000000000',
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

  // Calculate summary stats from entries
  const summaryStats = useMemo(() => {
    const voids = entries.filter(e => e.event_type === 'void');
    const leakages = entries.filter(e => e.event_type === 'leakage');
    const intakes = entries.filter(e => e.event_type === 'intake');
    const uniqueDays = new Set(entries.map(e => e.date)).size;
    
    return {
      voidCount: voids.length,
      leakageCount: leakages.length,
      intakeCount: intakes.length,
      totalDays: uniqueDays,
    };
  }, [entries]);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Kliniska Insikter
        </h2>
        <p className="text-muted-foreground">
          Baserat på EAU-riktlinjer och patientens dagbok
        </p>
      </div>

      {/* Data Validation Status */}
      <Card variant="elevated" className={cn(
        "border-2",
        validationSummary.meets48hRequirement ? "border-success/30" : "border-warning/30"
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Datakvalitet
            </span>
            <Badge 
              variant="outline" 
              className={cn(
                validationSummary.meets48hRequirement 
                  ? "bg-success-soft text-success border-success/30" 
                  : "bg-warning-soft text-warning-foreground border-warning/30"
              )}
            >
              {validationSummary.meets48hRequirement ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> Tillräcklig data</>
              ) : (
                <><AlertTriangle className="h-3 w-3 mr-1" /> Otillräcklig data</>
              )}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{validationSummary.loggedHours}h</p>
              <p className="text-xs text-muted-foreground">Loggade timmar</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{validationSummary.uniqueCalendarDays}</p>
              <p className="text-xs text-muted-foreground">Unika dagar</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Droplets className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{summaryStats.voidCount}</p>
              <p className="text-xs text-muted-foreground">Miktioner</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-warning-foreground" />
              <p className="text-2xl font-bold">{summaryStats.leakageCount}</p>
              <p className="text-xs text-muted-foreground">Läckage</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress mot 48h</span>
              <span className="font-medium">{Math.round(validationSummary.completionPercentage)}%</span>
            </div>
            <Progress value={validationSummary.completionPercentage} className="h-2" />
          </div>
          
          {!validationSummary.meets48hRequirement && (
            <Alert variant="destructive" className="bg-warning-soft border-warning/30">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Diagnostisk utvärdering kräver minst 48 timmar</AlertTitle>
              <AlertDescription>
                Patienten har endast {validationSummary.loggedHours} timmars data. 
                Fortsatt loggning rekommenderas innan fullständig klinisk bedömning.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Recording Block Summary */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Sammanfattning
          </CardTitle>
          <CardDescription>
            Övergripande statistik för patientens dagbok
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-warning-soft/30 border border-warning/20">
              <div className="flex items-center gap-2 mb-2">
                <Sun className="h-5 w-5 text-warning-foreground" />
                <span className="font-medium">Dagtid (06-22)</span>
              </div>
              <p className="text-2xl font-bold">{stats.dayVoids}</p>
              <p className="text-sm text-muted-foreground">miktioner</p>
            </div>
            
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Moon className="h-5 w-5 text-primary" />
                <span className="font-medium">Nattetid (22-06)</span>
              </div>
              <p className="text-2xl font-bold">{stats.nightVoids}</p>
              <p className="text-sm text-muted-foreground">miktioner</p>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Min volym</p>
              <p className="text-lg font-semibold">{stats.minVolume || 0} ml</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/10">
              <p className="text-xs text-muted-foreground mb-1">Median</p>
              <p className="text-lg font-semibold">{stats.medianVolume || 0} ml</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Max volym</p>
              <p className="text-lg font-semibold">{stats.maxVolume || 0} ml</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clinical Patterns - Only show if sufficient data */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-primary" />
          Diagnostisk Sannolikhetsrankning
        </h3>
        
        {!validationSummary.meets48hRequirement ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Otillräcklig data för diagnostik</AlertTitle>
            <AlertDescription>
              Diagnostisk bedömning kräver minst 48 timmars loggad data. 
              Nuvarande data: {validationSummary.loggedHours} timmar.
            </AlertDescription>
          </Alert>
        ) : (
          patterns.map((pattern, index) => {
            const ProbabilityIcon = probabilityIcons[pattern.probability];
            const patientSex = getSexFromPersonalNumber(selectedPatient?.personal_number);
            const isNocturiaPattern = pattern.name === 'Nocturia';
            const showNocturiaGuidance = isNocturiaPattern && 
              patientSex === 'male' && 
              (pattern.probability === 'high' || pattern.probability === 'moderate');
            
            return (
              <div key={index} className="space-y-4">
                <Card variant="elevated">
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
              
              {/* Show Nocturia Guidance after the Nocturia pattern card */}
              {showNocturiaGuidance && (
                <NocturiaGuidance 
                  isMalePatient={true}
                  hasNocturiaDiagnosis={true}
                />
              )}
            </div>
          );
          })
        )}
      </div>

      {/* Guideline Reference */}
      <Card variant="elevated" className="bg-info-soft/30 border-info/20">
        <CardContent className="p-4 flex items-center gap-3">
          <ExternalLink className="h-5 w-5 text-info" />
          <div>
            <p className="text-sm font-medium">Riktlinjereferens</p>
            <p className="text-xs text-muted-foreground">
              Baserat på EAU Guidelines on Urinary Incontinence (2023)
            </p>
          </div>
        </CardContent>
      </Card>

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
                          {format(new Date(plan.created_at), 'd MMMM yyyy', { locale: sv })}
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
