import { useState } from 'react';
import { PenLine, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EntryForm } from './EntryForm';
import { DiaryScanner } from './DiaryScanner';

type EntryMethod = 'manual' | 'scan';

export function NewEntryPage() {
  const [method, setMethod] = useState<EntryMethod>('manual');

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

      {/* Entry method selector */}
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

      {/* Content based on method */}
      {method === 'manual' ? (
        <EntryForm />
      ) : (
        <DiaryScanner />
      )}
    </div>
  );
}
