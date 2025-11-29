import { useState, useRef } from 'react';
import { useDiary } from '@/context/DiaryContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Camera, 
  Upload, 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Trash2,
  Lightbulb,
  X,
  FileCheck
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ParsedEntry {
  time: string;
  volume?: number;
  urgency?: number | null;
  amount?: 'small' | 'medium' | 'large';
  type?: string | null;
  trigger?: string | null;
  notes?: string | null;
  confidence: 'high' | 'medium' | 'low';
  selected?: boolean;
}

interface ParsedData {
  voids: ParsedEntry[];
  intakes: ParsedEntry[];
  leakages: ParsedEntry[];
  rawText?: string;
  parsingNotes?: string;
  overallConfidence: 'high' | 'medium' | 'low';
}

export function DiaryScanner() {
  const { addVoidEvent, addFluidIntake, addLeakageEvent, setCurrentView } = useDiary();
  const [images, setImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [selectedVoids, setSelectedVoids] = useState<Set<number>>(new Set());
  const [selectedIntakes, setSelectedIntakes] = useState<Set<number>>(new Set());
  const [selectedLeakages, setSelectedLeakages] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image too large. Please use images under 10MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const processImages = async () => {
    if (images.length === 0) {
      toast.error('Please add at least one image');
      return;
    }

    setIsProcessing(true);
    setParsedData(null);

    try {
      const { data, error } = await supabase.functions.invoke('parse-diary-image', {
        body: { images }
      });

      if (error) {
        console.error('Function error:', error);
        toast.error(error.message || 'Failed to process images');
        return;
      }

      if (!data.success) {
        toast.error(data.error || 'Failed to parse diary');
        return;
      }

      const parsed = data.data as ParsedData;
      setParsedData(parsed);
      
      // Select all high/medium confidence entries by default
      setSelectedVoids(new Set(
        parsed.voids
          .map((_, i) => i)
          .filter(i => parsed.voids[i].confidence !== 'low')
      ));
      setSelectedIntakes(new Set(
        parsed.intakes
          .map((_, i) => i)
          .filter(i => parsed.intakes[i].confidence !== 'low')
      ));
      setSelectedLeakages(new Set(
        parsed.leakages
          .map((_, i) => i)
          .filter(i => parsed.leakages[i].confidence !== 'low')
      ));

      toast.success('Diary parsed successfully! Review the entries below.');
    } catch (err) {
      console.error('Error processing images:', err);
      toast.error('Failed to process images. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const importSelectedEntries = () => {
    if (!parsedData) return;

    const today = new Date();
    let imported = 0;

    // Import voids
    selectedVoids.forEach(index => {
      const entry = parsedData.voids[index];
      const [hours, minutes] = entry.time.split(':').map(Number);
      const timestamp = new Date(today);
      timestamp.setHours(hours, minutes, 0, 0);

      addVoidEvent({
        timestamp,
        volume: entry.volume || 0,
        urgency: entry.urgency as 1 | 2 | 3 | 4 | 5 | undefined,
        notes: entry.notes || undefined
      });
      imported++;
    });

    // Import intakes
    selectedIntakes.forEach(index => {
      const entry = parsedData.intakes[index];
      const [hours, minutes] = entry.time.split(':').map(Number);
      const timestamp = new Date(today);
      timestamp.setHours(hours, minutes, 0, 0);

      addFluidIntake({
        timestamp,
        volume: entry.volume || 0,
        type: entry.type || undefined,
        notes: entry.notes || undefined
      });
      imported++;
    });

    // Import leakages
    selectedLeakages.forEach(index => {
      const entry = parsedData.leakages[index];
      const [hours, minutes] = entry.time.split(':').map(Number);
      const timestamp = new Date(today);
      timestamp.setHours(hours, minutes, 0, 0);

      addLeakageEvent({
        timestamp,
        amount: entry.amount || 'small',
        trigger: entry.trigger || undefined,
        notes: entry.notes || undefined
      });
      imported++;
    });

    toast.success(`Imported ${imported} entries to your diary!`);
    setParsedData(null);
    setImages([]);
    setCurrentView('dashboard');
  };

  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return <Badge className="bg-success text-success-foreground">High confidence</Badge>;
      case 'medium':
        return <Badge className="bg-warning text-warning-foreground">Medium confidence</Badge>;
      case 'low':
        return <Badge variant="destructive">Low confidence - please verify</Badge>;
    }
  };

  if (parsedData) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Review Parsed Entries</h1>
            <p className="text-muted-foreground">
              Select the entries you want to import. Low confidence items need verification.
            </p>
          </div>
          {getConfidenceBadge(parsedData.overallConfidence)}
        </div>

        {parsedData.parsingNotes && (
          <Card variant="warm" className="border-warning/30">
            <CardContent className="p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-warning-foreground flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">{parsedData.parsingNotes}</p>
            </CardContent>
          </Card>
        )}

        {/* Voids Section */}
        {parsedData.voids.length > 0 && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-lg">Void Events ({parsedData.voids.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {parsedData.voids.map((entry, index) => (
                <div 
                  key={index}
                  className={`flex items-center gap-4 p-3 rounded-xl border ${
                    selectedVoids.has(index) ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-transparent'
                  }`}
                >
                  <Checkbox
                    checked={selectedVoids.has(index)}
                    onCheckedChange={(checked) => {
                      const newSet = new Set(selectedVoids);
                      if (checked) newSet.add(index);
                      else newSet.delete(index);
                      setSelectedVoids(newSet);
                    }}
                  />
                  <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                    <span className="font-medium">{entry.time}</span>
                    <span>{entry.volume}ml</span>
                    <span>{entry.urgency ? `Urgency: ${entry.urgency}` : ''}</span>
                  </div>
                  {getConfidenceBadge(entry.confidence)}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Intakes Section */}
        {parsedData.intakes.length > 0 && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-lg">Fluid Intake ({parsedData.intakes.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {parsedData.intakes.map((entry, index) => (
                <div 
                  key={index}
                  className={`flex items-center gap-4 p-3 rounded-xl border ${
                    selectedIntakes.has(index) ? 'bg-info/5 border-info/30' : 'bg-muted/30 border-transparent'
                  }`}
                >
                  <Checkbox
                    checked={selectedIntakes.has(index)}
                    onCheckedChange={(checked) => {
                      const newSet = new Set(selectedIntakes);
                      if (checked) newSet.add(index);
                      else newSet.delete(index);
                      setSelectedIntakes(newSet);
                    }}
                  />
                  <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                    <span className="font-medium">{entry.time}</span>
                    <span>{entry.volume}ml</span>
                    <span className="capitalize">{entry.type || 'Unknown'}</span>
                  </div>
                  {getConfidenceBadge(entry.confidence)}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Leakages Section */}
        {parsedData.leakages.length > 0 && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-lg">Leakage Events ({parsedData.leakages.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {parsedData.leakages.map((entry, index) => (
                <div 
                  key={index}
                  className={`flex items-center gap-4 p-3 rounded-xl border ${
                    selectedLeakages.has(index) ? 'bg-warning/5 border-warning/30' : 'bg-muted/30 border-transparent'
                  }`}
                >
                  <Checkbox
                    checked={selectedLeakages.has(index)}
                    onCheckedChange={(checked) => {
                      const newSet = new Set(selectedLeakages);
                      if (checked) newSet.add(index);
                      else newSet.delete(index);
                      setSelectedLeakages(newSet);
                    }}
                  />
                  <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                    <span className="font-medium">{entry.time}</span>
                    <span className="capitalize">{entry.amount}</span>
                    <span>{entry.trigger || ''}</span>
                  </div>
                  {getConfidenceBadge(entry.confidence)}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button 
            variant="outline" 
            onClick={() => {
              setParsedData(null);
              setImages([]);
            }}
            className="flex-1"
          >
            <X className="h-5 w-5" />
            Cancel
          </Button>
          <Button 
            variant="hero" 
            onClick={importSelectedEntries}
            disabled={selectedVoids.size + selectedIntakes.size + selectedLeakages.size === 0}
            className="flex-1"
          >
            <FileCheck className="h-5 w-5" />
            Import {selectedVoids.size + selectedIntakes.size + selectedLeakages.size} Entries
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Scan Handwritten Diary</h1>
        <p className="text-muted-foreground">
          Take photos of your paper diary and we'll convert it to digital data.
        </p>
      </div>

      {/* Tips Card */}
      <Card variant="warm" className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium text-foreground">Tips for best results:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use good lighting—natural daylight works best</li>
                <li>• Keep the page flat and fill the frame</li>
                <li>• Make sure text is clearly visible and in focus</li>
                <li>• You can upload multiple pages at once</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image Upload Area */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Upload Images</CardTitle>
          <CardDescription>
            Add photos of your handwritten bladder diary
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Hidden inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Upload buttons */}
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-5 w-5" />
              Take Photo
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-5 w-5" />
              Upload Image
            </Button>
          </div>

          {/* Image previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {images.map((img, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={img} 
                    alt={`Diary page ${index + 1}`}
                    className="w-full h-32 object-cover rounded-xl border border-border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="absolute bottom-2 left-2">
                    <Badge variant="secondary" className="text-xs">
                      Page {index + 1}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {images.length === 0 && (
            <div 
              className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                JPG, PNG up to 10MB each
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Process Button */}
      <Button 
        variant="hero" 
        size="lg" 
        className="w-full"
        onClick={processImages}
        disabled={images.length === 0 || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing with AI...
          </>
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5" />
            Process {images.length} Image{images.length !== 1 ? 's' : ''}
          </>
        )}
      </Button>
    </div>
  );
}
