import { useState, useMemo } from 'react';
import { useEntries } from '@/hooks/useEntries';
import { DiaryEntry, EventType } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import {
  Droplets,
  GlassWater,
  AlertTriangle,
  Pencil,
  Trash2,
  Search,
  Filter,
  ArrowUpDown,
  Loader2,
  Calendar,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function EntriesOverview() {
  const { entries, loading, updateEntry, deleteEntry } = useEntries();
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Edit dialog
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [editForm, setEditForm] = useState({
    date: '',
    time: '',
    volume_ml: '',
    urgency: '',
    leakage_severity: '',
    intake_type: '',
    trigger: '',
    notes: '',
    dry_pad_weight_g: '',
    wet_pad_weight_g: '',
  });

  // Delete confirmation
  const [deletingEntry, setDeletingEntry] = useState<DiaryEntry | null>(null);

  // Filter and sort entries
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(entry =>
        entry.notes?.toLowerCase().includes(term) ||
        entry.intake_type?.toLowerCase().includes(term) ||
        entry.trigger?.toLowerCase().includes(term)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(entry => entry.event_type === typeFilter);
    }

    // Date range filter
    if (startDate) {
      result = result.filter(entry => entry.date >= startDate);
    }
    if (endDate) {
      result = result.filter(entry => entry.date <= endDate);
    }

    // Sort by date and time
    result.sort((a, b) => {
      const dateA = `${a.date} ${a.time}`;
      const dateB = `${b.date} ${b.time}`;
      return sortOrder === 'desc' 
        ? dateB.localeCompare(dateA) 
        : dateA.localeCompare(dateB);
    });

    return result;
  }, [entries, searchTerm, typeFilter, startDate, endDate, sortOrder]);

  const getEventIcon = (type: EventType) => {
    switch (type) {
      case 'void':
        return <Droplets className="h-4 w-4 text-primary" />;
      case 'intake':
        return <GlassWater className="h-4 w-4 text-info" />;
      case 'leakage':
        return <AlertTriangle className="h-4 w-4 text-warning-foreground" />;
    }
  };

  const getEventBadge = (type: EventType) => {
    switch (type) {
      case 'void':
        return <Badge className="bg-primary/10 text-primary border-primary/20">Void</Badge>;
      case 'intake':
        return <Badge className="bg-info/10 text-info border-info/20">Intake</Badge>;
      case 'leakage':
        return <Badge className="bg-warning-soft text-warning-foreground border-warning-foreground/20">Leakage</Badge>;
    }
  };

  const openEditDialog = (entry: DiaryEntry) => {
    setEditingEntry(entry);
    setEditForm({
      date: entry.date,
      time: entry.time.slice(0, 5), // Remove seconds
      volume_ml: entry.volume_ml?.toString() || '',
      urgency: entry.urgency?.toString() || 'none',
      leakage_severity: entry.leakage_severity || 'not_set',
      intake_type: entry.intake_type || '',
      trigger: entry.trigger || 'none',
      notes: entry.notes || '',
      dry_pad_weight_g: entry.dry_pad_weight_g?.toString() || '',
      wet_pad_weight_g: entry.wet_pad_weight_g?.toString() || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;

    // Calculate leakage weight if both pad weights are provided
    let leakageWeight: number | null = null;
    if (editForm.dry_pad_weight_g && editForm.wet_pad_weight_g) {
      leakageWeight = Math.max(0, parseFloat(editForm.wet_pad_weight_g) - parseFloat(editForm.dry_pad_weight_g));
    }

    const updates: Partial<DiaryEntry> = {
      date: editForm.date,
      time: editForm.time + ':00',
      volume_ml: editForm.volume_ml ? parseInt(editForm.volume_ml) : null,
      urgency: editForm.urgency && editForm.urgency !== 'none' ? parseInt(editForm.urgency) : null,
      leakage_severity: editForm.leakage_severity && editForm.leakage_severity !== 'not_set' ? editForm.leakage_severity as any : null,
      intake_type: editForm.intake_type || null,
      trigger: editForm.trigger && editForm.trigger !== 'none' ? editForm.trigger : null,
      notes: editForm.notes || null,
      dry_pad_weight_g: editForm.dry_pad_weight_g ? parseFloat(editForm.dry_pad_weight_g) : null,
      wet_pad_weight_g: editForm.wet_pad_weight_g ? parseFloat(editForm.wet_pad_weight_g) : null,
      leakage_weight_g: leakageWeight,
    };

    const success = await updateEntry(editingEntry.id, updates);
    if (success) {
      toast.success('Entry updated successfully');
      setEditingEntry(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingEntry) return;

    const success = await deleteEntry(deletingEntry.id);
    if (success) {
      toast.success('Entry deleted');
      setDeletingEntry(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'h:mm a');
    } catch {
      return timeStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Entries Overview</h1>
        <p className="text-muted-foreground">
          View, edit, and manage all your diary entries in one place.
        </p>
      </div>

      {/* Filters */}
      <Card variant="elevated">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes, triggers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="void">Voids</SelectItem>
                <SelectItem value="intake">Intakes</SelectItem>
                <SelectItem value="leakage">Leakages</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[140px]"
                placeholder="Start date"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[140px]"
                placeholder="End date"
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Entries count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredEntries.length} of {entries.length} entries
        </p>
        {(searchTerm || typeFilter !== 'all' || startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setTypeFilter('all');
              setStartDate('');
              setEndDate('');
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Entries Table */}
      <Card variant="elevated">
        <CardContent className="p-0">
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No entries found</h3>
              <p className="text-muted-foreground">
                {entries.length === 0 
                  ? "Start logging entries to see them here." 
                  : "Try adjusting your filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{getEventBadge(entry.event_type)}</TableCell>
                      <TableCell className="font-medium">
                        {formatDate(entry.date)}
                      </TableCell>
                      <TableCell>{formatTime(entry.time)}</TableCell>
                      <TableCell>
                        {entry.event_type === 'void' && (
                          <span>
                            {entry.volume_ml}ml
                            {entry.urgency && ` • Urgency: ${entry.urgency}`}
                          </span>
                        )}
                        {entry.event_type === 'intake' && (
                          <span>
                            {entry.volume_ml}ml
                            {entry.intake_type && ` • ${entry.intake_type}`}
                          </span>
                        )}
                        {entry.event_type === 'leakage' && (
                          <span className="capitalize">
                            {entry.leakage_weight_g 
                              ? `${entry.leakage_weight_g}g` 
                              : entry.leakage_severity || '—'}
                            {entry.trigger && ` • ${entry.trigger}`}
                            {entry.dry_pad_weight_g && entry.wet_pad_weight_g && (
                              <span className="text-muted-foreground text-xs ml-1">
                                ({entry.dry_pad_weight_g}→{entry.wet_pad_weight_g}g)
                              </span>
                            )}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {entry.notes || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(entry)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingEntry(entry)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingEntry && getEventIcon(editingEntry.event_type)}
              Edit {editingEntry?.event_type} entry
            </DialogTitle>
            <DialogDescription>
              Make changes to this diary entry.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={editForm.time}
                  onChange={(e) => setEditForm(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
            </div>

            {editingEntry?.event_type === 'void' && (
              <>
                <div className="space-y-2">
                  <Label>Volume (ml)</Label>
                  <Input
                    type="number"
                    value={editForm.volume_ml}
                    onChange={(e) => setEditForm(prev => ({ ...prev, volume_ml: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Urgency (1-5)</Label>
                  <Select 
                    value={editForm.urgency} 
                    onValueChange={(v) => setEditForm(prev => ({ ...prev, urgency: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="1">1 - No urgency</SelectItem>
                      <SelectItem value="2">2 - Mild</SelectItem>
                      <SelectItem value="3">3 - Moderate</SelectItem>
                      <SelectItem value="4">4 - Strong</SelectItem>
                      <SelectItem value="5">5 - Couldn't wait</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {editingEntry?.event_type === 'intake' && (
              <>
                <div className="space-y-2">
                  <Label>Volume (ml)</Label>
                  <Input
                    type="number"
                    value={editForm.volume_ml}
                    onChange={(e) => setEditForm(prev => ({ ...prev, volume_ml: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Beverage type</Label>
                  <Select 
                    value={editForm.intake_type} 
                    onValueChange={(v) => setEditForm(prev => ({ ...prev, intake_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="water">Water</SelectItem>
                      <SelectItem value="coffee">Coffee</SelectItem>
                      <SelectItem value="tea">Tea</SelectItem>
                      <SelectItem value="juice">Juice</SelectItem>
                      <SelectItem value="soda">Soda</SelectItem>
                      <SelectItem value="alcohol">Alcohol</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {editingEntry?.event_type === 'leakage' && (
              <>
                <div className="space-y-2">
                  <Label>Amount (optional if using pad weights)</Label>
                  <Select 
                    value={editForm.leakage_severity} 
                    onValueChange={(v) => setEditForm(prev => ({ ...prev, leakage_severity: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select amount" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_set">Not set</SelectItem>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dry pad weight (g)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editForm.dry_pad_weight_g}
                      onChange={(e) => setEditForm(prev => ({ ...prev, dry_pad_weight_g: e.target.value }))}
                      placeholder="e.g., 15"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Wet pad weight (g)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editForm.wet_pad_weight_g}
                      onChange={(e) => setEditForm(prev => ({ ...prev, wet_pad_weight_g: e.target.value }))}
                      placeholder="e.g., 45"
                    />
                  </div>
                </div>
                {editForm.dry_pad_weight_g && editForm.wet_pad_weight_g && (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm font-medium text-primary">
                      Calculated leakage: {Math.max(0, parseFloat(editForm.wet_pad_weight_g) - parseFloat(editForm.dry_pad_weight_g)).toFixed(1)}g
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Trigger</Label>
                  <Select 
                    value={editForm.trigger} 
                    onValueChange={(v) => setEditForm(prev => ({ ...prev, trigger: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="cough">Coughing</SelectItem>
                      <SelectItem value="sneeze">Sneezing</SelectItem>
                      <SelectItem value="laugh">Laughing</SelectItem>
                      <SelectItem value="exercise">Exercise</SelectItem>
                      <SelectItem value="lifting">Lifting</SelectItem>
                      <SelectItem value="urgency">Strong urgency</SelectItem>
                      <SelectItem value="unknown">Not sure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingEntry} onOpenChange={() => setDeletingEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this diary entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
