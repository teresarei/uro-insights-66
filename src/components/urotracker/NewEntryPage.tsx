import { useState } from 'react';
import { PenLine, Camera, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { EntryForm } from './EntryForm';
import { DiaryScanner } from './DiaryScanner';

type EntryMethod = 'manual' | 'scan';
type CatheterSelection = 'yes' | 'no' | null;

export function NewEntryPage() {
  const [catheterSelection, setCatheterSelection] = useState<CatheterSelection>(null);
  const [method, setMethod] = useState<EntryMethod>('manual');

  // Reset catheter selection when user wants to start fresh
  const handleResetCatheter = () => {
    setCatheterSelection(null);
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">
          New Entry
        </h1>
        <p className="text-muted-foreground">
          Add entries manually or scan your paper diary
        </p>
      </div>

      {/* Step 1: Catheter question - shown first if not yet answered */}
      {catheterSelection === null ? (
        <Card variant="elevated" className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Before you begin</CardTitle>
            <CardDescription>
              This helps us record your data accurately
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Do you need to use a catheter?
              </Label>
              <RadioGroup
                value={catheterSelection || ''}
                onValueChange={(value) => setCatheterSelection(value as CatheterSelection)}
                className="grid grid-cols-2 gap-3"
              >
                <Label
                  htmlFor="catheter-yes"
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border-2 p-4 cursor-pointer transition-all",
                    "hover:border-primary/50 hover:bg-primary/5",
                    catheterSelection === 'yes' && "border-primary bg-primary/10"
                  )}
                >
                  <RadioGroupItem value="yes" id="catheter-yes" className="sr-only" />
                  <span className="text-base font-medium">Yes</span>
                </Label>
                <Label
                  htmlFor="catheter-no"
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border-2 p-4 cursor-pointer transition-all",
                    "hover:border-primary/50 hover:bg-primary/5",
                    catheterSelection === 'no' && "border-primary bg-primary/10"
                  )}
                >
                  <RadioGroupItem value="no" id="catheter-no" className="sr-only" />
                  <span className="text-base font-medium">No</span>
                </Label>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Catheter selection indicator */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">
                Catheter use: <span className="font-medium text-foreground">{catheterSelection === 'yes' ? 'Yes' : 'No'}</span>
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleResetCatheter}>
              Change
            </Button>
          </div>

          {/* Step 2: Entry method selector */}
          <div className="flex gap-2 p-1 bg-muted rounded-xl">
            <Button
              variant={method === 'manual' ? 'default' : 'ghost'}
              className={cn(
                "flex-1 gap-2 h-12 rounded-lg transition-all",
                method === 'manual' && "shadow-soft bg-card"
              )}
              onClick={() => setMethod('manual')}
            >
              <PenLine className="h-4 w-4" />
              Manual Entry
            </Button>
            <Button
              variant={method === 'scan' ? 'default' : 'ghost'}
              className={cn(
                "flex-1 gap-2 h-12 rounded-lg transition-all",
                method === 'scan' && "shadow-soft bg-card"
              )}
              onClick={() => setMethod('scan')}
            >
              <Camera className="h-4 w-4" />
              Scan Diary
            </Button>
          </div>

          {/* Step 3: Content based on method */}
          {method === 'manual' ? (
            <EntryForm usesCatheter={catheterSelection === 'yes'} />
          ) : (
            <DiaryScanner />
          )}
        </>
      )}
    </div>
  );
}
