import { useState } from 'react';
import { useDiary } from '@/context/DiaryContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { 
  User, 
  Plus, 
  X, 
  Save,
  Shield,
  Info
} from 'lucide-react';

export function UserProfile() {
  const { userProfile, updateUserProfile } = useDiary();
  
  const [sex, setSex] = useState(userProfile.sex || '');
  const [age, setAge] = useState(userProfile.age?.toString() || '');
  const [newMedication, setNewMedication] = useState('');
  const [medications, setMedications] = useState<string[]>(userProfile.medications || []);
  const [newCondition, setNewCondition] = useState('');
  const [conditions, setConditions] = useState<string[]>(userProfile.conditions || []);

  const handleAddMedication = () => {
    if (newMedication.trim() && !medications.includes(newMedication.trim())) {
      setMedications([...medications, newMedication.trim()]);
      setNewMedication('');
    }
  };

  const handleRemoveMedication = (med: string) => {
    setMedications(medications.filter(m => m !== med));
  };

  const handleAddCondition = () => {
    if (newCondition.trim() && !conditions.includes(newCondition.trim())) {
      setConditions([...conditions, newCondition.trim()]);
      setNewCondition('');
    }
  };

  const handleRemoveCondition = (cond: string) => {
    setConditions(conditions.filter(c => c !== cond));
  };

  const handleSave = () => {
    updateUserProfile({
      sex: sex as any || undefined,
      age: age ? parseInt(age) : undefined,
      medications: medications.length > 0 ? medications : undefined,
      conditions: conditions.length > 0 ? conditions : undefined,
    });

    toast({
      title: "Profile updated",
      description: "Your information has been saved securely.",
    });
  };

  const commonConditions = [
    'Diabetes',
    'Enlarged prostate (BPH)',
    'Urinary tract infection (UTI)',
    'Interstitial cystitis',
    'Neurological condition',
    'Heart failure',
    'Kidney disease',
    'Previous pelvic surgery',
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">
          Your Profile
        </h1>
        <p className="text-muted-foreground">
          This information helps provide more personalized insights
        </p>
      </div>

      {/* Privacy notice */}
      <Card variant="insight">
        <CardContent className="flex gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info/10">
            <Shield className="h-5 w-5 text-info" />
          </div>
          <div>
            <p className="font-medium text-foreground">Your privacy matters</p>
            <p className="text-sm text-muted-foreground">
              All your data is stored locally on your device. We don't share your information with anyone.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Basic info */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-highlight">
              <User className="h-4 w-4 text-highlight-strong" />
            </div>
            Basic Information
          </CardTitle>
          <CardDescription>
            Help us tailor the analysis to your situation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sex">Sex assigned at birth</Label>
              <Select value={sex} onValueChange={setSex}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for clinical pattern recognition
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                placeholder="Your age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="h-11"
                min={1}
                max={120}
              />
              <p className="text-xs text-muted-foreground">
                Age-specific patterns vary
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medications */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Current Medications</CardTitle>
          <CardDescription>
            Some medications can affect bladder function
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add a medication..."
              value={newMedication}
              onChange={(e) => setNewMedication(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMedication()}
              className="h-11"
            />
            <Button 
              variant="soft" 
              size="icon" 
              onClick={handleAddMedication}
              className="h-11 w-11 shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {medications.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {medications.map((med) => (
                <Badge 
                  key={med} 
                  variant="secondary"
                  className="flex items-center gap-1 px-3 py-1.5 text-sm"
                >
                  {med}
                  <button
                    onClick={() => handleRemoveMedication(med)}
                    className="ml-1 hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          
          {medications.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No medications added yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Medical conditions */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Relevant Medical Conditions</CardTitle>
          <CardDescription>
            Pre-existing conditions that may affect urinary patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add a condition..."
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCondition()}
              className="h-11"
            />
            <Button 
              variant="soft" 
              size="icon" 
              onClick={handleAddCondition}
              className="h-11 w-11 shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick add common conditions */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Quick add:</p>
            <div className="flex flex-wrap gap-2">
              {commonConditions
                .filter(c => !conditions.includes(c))
                .slice(0, 4)
                .map((condition) => (
                  <Button
                    key={condition}
                    variant="outline"
                    size="sm"
                    onClick={() => setConditions([...conditions, condition])}
                    className="text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {condition}
                  </Button>
                ))}
            </div>
          </div>
          
          {conditions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {conditions.map((cond) => (
                <Badge 
                  key={cond} 
                  variant="secondary"
                  className="flex items-center gap-1 px-3 py-1.5 text-sm"
                >
                  {cond}
                  <button
                    onClick={() => handleRemoveCondition(cond)}
                    className="ml-1 hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          
          {conditions.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No conditions added yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Save button */}
      <Button 
        variant="hero" 
        size="lg" 
        className="w-full"
        onClick={handleSave}
      >
        <Save className="h-5 w-5" />
        Save Profile
      </Button>

      {/* Info note */}
      <Card variant="warm">
        <CardContent className="flex gap-3 p-4">
          <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            This information is optional but helps generate more relevant clinical insights. 
            You can update it anytime.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
