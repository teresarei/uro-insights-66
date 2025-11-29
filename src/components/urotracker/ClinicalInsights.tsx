import { useDiary } from '@/context/DiaryContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Brain, 
  HeartPulse, 
  Info,
  ArrowRight,
  Stethoscope,
  CheckCircle,
  Clock
} from 'lucide-react';
import { ClinicalPattern } from '@/types/urotracker';
import { cn } from '@/lib/utils';

export function ClinicalInsights() {
  const { entries, getStats, userProfile, setCurrentView } = useDiary();
  const stats = getStats();

  // Generate clinical patterns based on diary data and EAU guidelines
  const generatePatterns = (): ClinicalPattern[] => {
    const patterns: ClinicalPattern[] = [];

    // Check for overactive bladder pattern
    // EAU: Frequency >8 voids/day with urgency
    if (stats.avgVoidsPerDay > 8) {
      const urgentVoids = entries.flatMap(e => e.voids).filter(v => v.urgency && v.urgency >= 4);
      const urgencyRate = urgentVoids.length / stats.totalVoids;
      
      if (urgencyRate > 0.3 || stats.medianVolume < 200) {
        patterns.push({
          name: 'Overactive Bladder (OAB)',
          probability: urgencyRate > 0.5 ? 'high' : 'moderate',
          reasoning: `Frequent voids (${stats.avgVoidsPerDay}/day) with ${urgencyRate > 0.3 ? 'frequent urgency episodes' : 'lower-than-average volumes'} suggest an overactive bladder pattern.`,
          recommendation: 'Bladder training and behavioral modifications may help. Discuss with your doctor about treatment options.',
        });
      }
    }

    // Check for stress incontinence
    // Based on leakage triggers
    const stressTriggers = ['cough', 'sneeze', 'laugh', 'exercise', 'lifting'];
    const stressLeakages = entries.flatMap(e => e.leakages).filter(
      l => l.trigger && stressTriggers.includes(l.trigger)
    );
    
    if (stressLeakages.length > 0) {
      const rate = stressLeakages.length / (stats.totalLeakages || 1);
      patterns.push({
        name: 'Stress Urinary Incontinence',
        probability: rate > 0.7 ? 'high' : rate > 0.4 ? 'moderate' : 'low',
        reasoning: `${stressLeakages.length} leakage event(s) triggered by physical stress (coughing, sneezing, exercise) suggest stress incontinence.`,
        recommendation: 'Pelvic floor exercises (Kegels) are often effective. Consider consulting a specialist or pelvic floor physiotherapist.',
      });
    }

    // Check for urge incontinence
    const urgeLeakages = entries.flatMap(e => e.leakages).filter(
      l => l.trigger === 'urgency'
    );
    
    if (urgeLeakages.length > 0) {
      patterns.push({
        name: 'Urge Incontinence',
        probability: urgeLeakages.length > 3 ? 'high' : 'moderate',
        reasoning: `${urgeLeakages.length} leakage event(s) associated with strong urgency before reaching the bathroom.`,
        recommendation: 'Bladder retraining and scheduled voiding may help. Medication options exist—discuss with your healthcare provider.',
      });
    }

    // Check for nocturia
    // EAU: ≥2 nighttime voids
    if (stats.nightVoids >= 2 * entries.length) {
      patterns.push({
        name: 'Nocturia',
        probability: stats.nightVoids >= 3 * entries.length ? 'high' : 'moderate',
        reasoning: `Averaging ${(stats.nightVoids / entries.length).toFixed(1)} nighttime voids may indicate nocturia. This can impact sleep quality.`,
        recommendation: 'Consider reducing evening fluid intake, especially caffeine and alcohol. Rule out other causes with your doctor.',
      });
    }

    // Check for polyuria
    const avgDailyOutput = entries.reduce((sum, e) => 
      sum + e.voids.reduce((s, v) => s + v.volume, 0), 0
    ) / entries.length;
    
    if (avgDailyOutput > 2500) {
      patterns.push({
        name: 'Polyuria (High Urine Output)',
        probability: avgDailyOutput > 3000 ? 'high' : 'moderate',
        reasoning: `Average daily urine output of ${Math.round(avgDailyOutput)}ml is higher than typical (>2.5L). This could relate to fluid intake, diabetes, or other conditions.`,
        recommendation: 'Review fluid intake patterns and discuss with your doctor, especially if accompanied by increased thirst.',
      });
    }

    // Check for low voided volumes (possible incomplete emptying)
    if (stats.medianVolume < 150 && stats.avgVoidsPerDay > 10) {
      patterns.push({
        name: 'Possible Incomplete Bladder Emptying',
        probability: 'moderate',
        reasoning: `Very frequent voids (${stats.avgVoidsPerDay}/day) with low median volume (${stats.medianVolume}ml) may suggest incomplete emptying.`,
        recommendation: 'Double voiding technique may help. Your doctor may recommend post-void residual measurement.',
      });
    }

    // If no patterns detected
    if (patterns.length === 0 && entries.length > 0) {
      patterns.push({
        name: 'No Concerning Patterns Detected',
        probability: 'low',
        reasoning: 'Your voiding diary shows patterns within normal ranges. Continue monitoring if you have concerns.',
        recommendation: 'Maintain good hydration habits and continue tracking if desired.',
      });
    }

    return patterns;
  };

  const patterns = generatePatterns();

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

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-info-soft mb-6">
          <Brain className="h-10 w-10 text-info" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Not enough data yet
        </h2>
        <p className="text-muted-foreground max-w-md mb-8">
          Log at least a few days of entries to generate meaningful clinical insights.
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
        <h1 className="text-2xl font-semibold text-foreground">
          Possible Clinical Patterns
        </h1>
        <p className="text-muted-foreground">
          Based on EAU guidelines and your {entries.length}-day diary
        </p>
      </div>

      {/* Important disclaimer */}
      <Card variant="warning">
        <CardContent className="flex gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-foreground/10">
            <Stethoscope className="h-5 w-5 text-warning-foreground" />
          </div>
          <div>
            <p className="font-medium text-warning-foreground">Medical Disclaimer</p>
            <p className="text-sm text-warning-foreground/80">
              These patterns may offer clues, but <strong>only a healthcare professional can give a diagnosis</strong>. 
              This tool is for informational purposes only and should not replace medical advice.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pattern cards */}
      <div className="space-y-4">
        {patterns.map((pattern, index) => {
          const ProbabilityIcon = probabilityIcons[pattern.probability];
          
          return (
            <Card 
              key={index} 
              variant="elevated" 
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <HeartPulse className="h-5 w-5 text-primary" />
                    {pattern.name}
                  </CardTitle>
                  <Badge 
                    variant="outline"
                    className={cn(
                      "flex items-center gap-1 px-2 py-1",
                      probabilityColors[pattern.probability]
                    )}
                  >
                    <ProbabilityIcon className="h-3 w-3" />
                    {pattern.probability.charAt(0).toUpperCase() + pattern.probability.slice(1)} likelihood
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Brain className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Pattern reasoning</p>
                      <p className="text-sm text-muted-foreground">{pattern.reasoning}</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 rounded-xl bg-highlight/50 border border-highlight-strong/10">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-highlight-strong mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">What you can do</p>
                      <p className="text-sm text-muted-foreground">{pattern.recommendation}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Encouragement */}
      <Card variant="success">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="font-medium text-foreground">Knowledge is power</p>
            <p className="text-sm text-muted-foreground">
              Bringing this data to your healthcare provider can lead to more productive conversations and better outcomes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Profile CTA if not filled */}
      {(!userProfile.sex || !userProfile.age) && (
        <Card variant="insight">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-info/10">
                <Info className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="font-medium text-foreground">Improve your insights</p>
                <p className="text-sm text-muted-foreground">
                  Add your profile information for more personalized analysis
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setCurrentView('profile')}>
              Complete Profile
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
