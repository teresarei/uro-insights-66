import { useState } from 'react';
import { useDiary } from '@/context/DiaryContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { 
  Droplets, 
  GlassWater, 
  AlertTriangle,
  Clock,
  Gauge,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

type EntryType = 'void' | 'intake' | 'leakage';

export function EntryForm() {
  const { addVoidEvent, addLeakageEvent, addFluidIntake, setCurrentView } = useDiary();
  const [activeTab, setActiveTab] = useState<EntryType>('void');
  
  // Void form state
  const [voidTime, setVoidTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });
  const [voidVolume, setVoidVolume] = useState('');
  const [voidUrgency, setVoidUrgency] = useState<string>('');
  const [voidNotes, setVoidNotes] = useState('');

  // Intake form state
  const [intakeTime, setIntakeTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });
  const [intakeVolume, setIntakeVolume] = useState('');
  const [intakeType, setIntakeType] = useState('water');
  const [intakeNotes, setIntakeNotes] = useState('');

  // Leakage form state
  const [leakageTime, setLeakageTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });
  const [leakageAmount, setLeakageAmount] = useState<string>('');
  const [leakageTrigger, setLeakageTrigger] = useState('');
  const [leakageNotes, setLeakageNotes] = useState('');

  const getTimestamp = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const timestamp = new Date();
    timestamp.setHours(hours, minutes, 0, 0);
    return timestamp;
  };

  const handleVoidSubmit = () => {
    if (!voidVolume) {
      toast({
        title: "Missing information",
        description: "Please enter the volume voided.",
        variant: "destructive",
      });
      return;
    }

    addVoidEvent({
      timestamp: getTimestamp(voidTime),
      volume: parseInt(voidVolume),
      urgency: voidUrgency ? parseInt(voidUrgency) as 1 | 2 | 3 | 4 | 5 : undefined,
      notes: voidNotes || undefined,
    });

    toast({
      title: "Entry logged! 🎉",
      description: "Your bathroom visit has been recorded.",
    });

    // Reset form
    setVoidVolume('');
    setVoidUrgency('');
    setVoidNotes('');
  };

  const handleIntakeSubmit = () => {
    if (!intakeVolume) {
      toast({
        title: "Missing information",
        description: "Please enter the fluid volume.",
        variant: "destructive",
      });
      return;
    }

    addFluidIntake({
      timestamp: getTimestamp(intakeTime),
      volume: parseInt(intakeVolume),
      type: intakeType,
      notes: intakeNotes || undefined,
    });

    toast({
      title: "Intake logged! 💧",
      description: "Your fluid intake has been recorded.",
    });

    // Reset form
    setIntakeVolume('');
    setIntakeType('water');
    setIntakeNotes('');
  };

  const handleLeakageSubmit = () => {
    if (!leakageAmount) {
      toast({
        title: "Missing information",
        description: "Please select the leakage amount.",
        variant: "destructive",
      });
      return;
    }

    addLeakageEvent({
      timestamp: getTimestamp(leakageTime),
      amount: leakageAmount as 'small' | 'medium' | 'large',
      trigger: leakageTrigger || undefined,
      notes: leakageNotes || undefined,
    });

    toast({
      title: "Event recorded",
      description: "Your leakage event has been logged.",
    });

    // Reset form
    setLeakageAmount('');
    setLeakageTrigger('');
    setLeakageNotes('');
  };

  const quickVolumes = [150, 200, 250, 300, 350, 400];
  const quickIntakes = [150, 200, 250, 330, 500];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">
          Log a new entry
        </h1>
        <p className="text-muted-foreground">
          Track your bathroom visits, fluid intake, and any incidents—one step at a time.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EntryType)}>
        <TabsList className="grid w-full grid-cols-3 h-12 p-1 bg-muted rounded-xl">
          <TabsTrigger 
            value="void" 
            className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-soft gap-2"
          >
            <Droplets className="h-4 w-4" />
            <span className="hidden sm:inline">Bathroom</span>
          </TabsTrigger>
          <TabsTrigger 
            value="intake"
            className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-soft gap-2"
          >
            <GlassWater className="h-4 w-4" />
            <span className="hidden sm:inline">Fluid</span>
          </TabsTrigger>
          <TabsTrigger 
            value="leakage"
            className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-soft gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Leakage</span>
          </TabsTrigger>
        </TabsList>

        {/* Void Entry Form */}
        <TabsContent value="void" className="mt-6">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-highlight">
                  <Droplets className="h-4 w-4 text-highlight-strong" />
                </div>
                Bathroom Visit
              </CardTitle>
              <CardDescription>
                Record when and how much you voided
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="void-time" className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Time
                  </Label>
                  <Input
                    id="void-time"
                    type="time"
                    value={voidTime}
                    onChange={(e) => setVoidTime(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="void-volume" className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    Volume (ml)
                  </Label>
                  <Input
                    id="void-volume"
                    type="number"
                    placeholder="e.g., 250"
                    value={voidVolume}
                    onChange={(e) => setVoidVolume(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Quick select volume</Label>
                <div className="flex flex-wrap gap-2">
                  {quickVolumes.map((vol) => (
                    <Button
                      key={vol}
                      type="button"
                      variant={voidVolume === vol.toString() ? 'soft' : 'outline'}
                      size="sm"
                      onClick={() => setVoidVolume(vol.toString())}
                    >
                      {vol}ml
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="void-urgency">Urgency level (optional)</Label>
                <Select value={voidUrgency} onValueChange={setVoidUrgency}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="How urgent was it?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - No urgency</SelectItem>
                    <SelectItem value="2">2 - Mild urgency</SelectItem>
                    <SelectItem value="3">3 - Moderate urgency</SelectItem>
                    <SelectItem value="4">4 - Strong urgency</SelectItem>
                    <SelectItem value="5">5 - Couldn't wait</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="void-notes">Notes (optional)</Label>
                <Textarea
                  id="void-notes"
                  placeholder="Any additional context... (e.g., woke up at night, felt incomplete)"
                  value={voidNotes}
                  onChange={(e) => setVoidNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <Button 
                variant="hero" 
                size="lg" 
                className="w-full"
                onClick={handleVoidSubmit}
              >
                <CheckCircle2 className="h-5 w-5" />
                Log Bathroom Visit
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fluid Intake Form */}
        <TabsContent value="intake" className="mt-6">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info-soft">
                  <GlassWater className="h-4 w-4 text-info" />
                </div>
                Fluid Intake
              </CardTitle>
              <CardDescription>
                Track what and how much you drank
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="intake-time" className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Time
                  </Label>
                  <Input
                    id="intake-time"
                    type="time"
                    value={intakeTime}
                    onChange={(e) => setIntakeTime(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="intake-volume" className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    Volume (ml)
                  </Label>
                  <Input
                    id="intake-volume"
                    type="number"
                    placeholder="e.g., 250"
                    value={intakeVolume}
                    onChange={(e) => setIntakeVolume(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Quick select volume</Label>
                <div className="flex flex-wrap gap-2">
                  {quickIntakes.map((vol) => (
                    <Button
                      key={vol}
                      type="button"
                      variant={intakeVolume === vol.toString() ? 'soft' : 'outline'}
                      size="sm"
                      onClick={() => setIntakeVolume(vol.toString())}
                    >
                      {vol}ml
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="intake-type">Beverage type</Label>
                <Select value={intakeType} onValueChange={setIntakeType}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="What did you drink?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="water">💧 Water</SelectItem>
                    <SelectItem value="coffee">☕ Coffee</SelectItem>
                    <SelectItem value="tea">🍵 Tea</SelectItem>
                    <SelectItem value="juice">🧃 Juice</SelectItem>
                    <SelectItem value="soda">🥤 Soda</SelectItem>
                    <SelectItem value="alcohol">🍺 Alcohol</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="intake-notes">Notes (optional)</Label>
                <Textarea
                  id="intake-notes"
                  placeholder="Any additional context..."
                  value={intakeNotes}
                  onChange={(e) => setIntakeNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <Button 
                variant="hero" 
                size="lg" 
                className="w-full"
                onClick={handleIntakeSubmit}
              >
                <CheckCircle2 className="h-5 w-5" />
                Log Fluid Intake
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leakage Form */}
        <TabsContent value="leakage" className="mt-6">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-soft">
                  <AlertTriangle className="h-4 w-4 text-warning-foreground" />
                </div>
                Leakage Event
              </CardTitle>
              <CardDescription>
                It's okay—tracking this helps identify patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leakage-time" className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Time
                  </Label>
                  <Input
                    id="leakage-time"
                    type="time"
                    value={leakageTime}
                    onChange={(e) => setLeakageTime(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leakage-amount">Amount</Label>
                  <Select value={leakageAmount} onValueChange={setLeakageAmount}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="How much?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small (few drops)</SelectItem>
                      <SelectItem value="medium">Medium (wet underwear)</SelectItem>
                      <SelectItem value="large">Large (wet clothes)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leakage-trigger">What triggered it? (optional)</Label>
                <Select value={leakageTrigger} onValueChange={setLeakageTrigger}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select a trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cough">Coughing</SelectItem>
                    <SelectItem value="sneeze">Sneezing</SelectItem>
                    <SelectItem value="laugh">Laughing</SelectItem>
                    <SelectItem value="exercise">Exercise/Physical activity</SelectItem>
                    <SelectItem value="lifting">Lifting something</SelectItem>
                    <SelectItem value="urgency">Strong urgency</SelectItem>
                    <SelectItem value="unknown">Not sure</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leakage-notes">Notes (optional)</Label>
                <Textarea
                  id="leakage-notes"
                  placeholder="Any additional context..."
                  value={leakageNotes}
                  onChange={(e) => setLeakageNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <Button 
                variant="hero" 
                size="lg" 
                className="w-full"
                onClick={handleLeakageSubmit}
              >
                <CheckCircle2 className="h-5 w-5" />
                Log Leakage Event
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Encouragement */}
      <Card variant="highlight" className="animate-fade-in">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-highlight-strong/10">
            <Sparkles className="h-5 w-5 text-highlight-strong" />
          </div>
          <div>
            <p className="font-medium text-foreground">You're doing great!</p>
            <p className="text-sm text-muted-foreground">
              Consistent tracking helps you and your healthcare provider understand your patterns better.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
