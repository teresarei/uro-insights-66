import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDiary } from '@/context/DiaryContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { generateDiaryPDF } from '@/utils/pdfExport';
import { toast } from 'sonner';
import { FileDown, FileText, Loader2 } from 'lucide-react';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const { user } = useAuth();
  const { entries, getStats, getEntriesLast48Hours } = useDiary();
  const [isExporting, setIsExporting] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Filter entries by date range if specified
      let filteredEntries = entries;
      if (startDate || endDate) {
        filteredEntries = entries.filter(entry => {
          if (startDate && entry.date < startDate) return false;
          if (endDate && entry.date > endDate) return false;
          return true;
        });
      }

      if (filteredEntries.length === 0) {
        toast.error('No entries found for the selected period');
        setIsExporting(false);
        return;
      }

      const stats = getStats();
      
      generateDiaryPDF({
        entries: filteredEntries,
        stats,
        patientName: user?.name,
        dateRange: startDate && endDate ? { start: startDate, end: endDate } : undefined,
      });

      toast.success('PDF exported successfully!');
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const recentEntries = getEntriesLast48Hours();
  const uniqueDates = new Set(entries.map(e => e.date));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Export Bladder Diary
          </DialogTitle>
          <DialogDescription>
            Generate a PDF report to share with your healthcare provider.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary info */}
          <div className="p-4 rounded-xl bg-muted/50 space-y-2">
            <p className="text-sm font-medium text-foreground">Report Summary</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Total entries:</span>
              <span className="font-medium">{entries.length}</span>
              <span className="text-muted-foreground">Days tracked:</span>
              <span className="font-medium">{uniqueDates.size}</span>
              <span className="text-muted-foreground">Recent (48h):</span>
              <span className="font-medium">{recentEntries.length} entries</span>
            </div>
          </div>

          {/* Optional date range */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Date Range (optional)</Label>
              <Badge variant="secondary" className="text-xs">Filter entries</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="start-date" className="text-xs text-muted-foreground">From</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end-date" className="text-xs text-muted-foreground">To</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to export all entries
            </p>
          </div>

          {user && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm">
                <span className="text-muted-foreground">Patient name on report: </span>
                <span className="font-medium">{user.name}</span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || entries.length === 0}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
