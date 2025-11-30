import { useDiary } from '@/context/DiaryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Droplet, 
  AlertTriangle, 
  Coffee, 
  Clock,
  Calendar,
  Info
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';

export function DoctorEntriesView() {
  const { entries } = useDiary();

  // Group entries by date
  const entriesByDate = entries.reduce((acc, entry) => {
    const date = entry.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, typeof entries>);

  // Sort dates descending
  const sortedDates = Object.keys(entriesByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'void': return <Droplet className="h-4 w-4 text-primary" />;
      case 'leakage': return <AlertTriangle className="h-4 w-4 text-warning-foreground" />;
      case 'intake': return <Coffee className="h-4 w-4 text-info" />;
      default: return null;
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'void': return 'Miktion';
      case 'leakage': return 'Läckage';
      case 'intake': return 'Vätskeintag';
      default: return type;
    }
  };

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Patienten har inga registreringar ännu
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Dagboksregistreringar
        </h2>
        <Badge variant="outline">{entries.length} totalt</Badge>
      </div>

      {/* Read-only notice */}
      <Card className="bg-info-soft border-info/30">
        <CardContent className="p-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-info" />
          <p className="text-sm text-info-foreground">
            Läsläge: Dagboksdata kan endast ändras av patienten.
          </p>
        </CardContent>
      </Card>

      <ScrollArea className="h-[600px]">
        <div className="space-y-6 pr-4">
          {sortedDates.map(date => (
            <div key={date} className="space-y-3">
              <div className="sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
                <h3 className="font-medium text-sm text-muted-foreground">
                  {format(parseISO(date), 'EEEE d MMMM yyyy', { locale: sv })}
                </h3>
              </div>
              
              {entriesByDate[date]
                .sort((a, b) => a.time.localeCompare(b.time))
                .map(entry => (
                  <Card key={entry.id} variant="elevated">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                            {getEventIcon(entry.event_type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{getEventLabel(entry.event_type)}</span>
                              <Badge variant="outline" className="text-xs">
                                {entry.source === 'scan' ? 'Skannad' : 'Manuell'}
                              </Badge>
                            </div>
                            
                            {entry.event_type === 'void' && (
                              <div className="text-sm text-muted-foreground mt-1">
                                <span className="font-medium text-foreground">{entry.volume_ml} ml</span>
                                {entry.urgency && (
                                  <span className="ml-2">• Trängsel: {entry.urgency}/5</span>
                                )}
                                {entry.uses_catheter && (
                                  <Badge variant="outline" className="ml-2 text-xs">Kateter</Badge>
                                )}
                              </div>
                            )}
                            
                            {entry.event_type === 'leakage' && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {entry.leakage_severity && (
                                  <Badge variant="secondary" className="text-xs mr-2">
                                    {entry.leakage_severity === 'small' ? 'Lite' : 
                                     entry.leakage_severity === 'medium' ? 'Måttligt' : 'Mycket'}
                                  </Badge>
                                )}
                                {entry.leakage_weight_g && (
                                  <span>{entry.leakage_weight_g}g</span>
                                )}
                                {entry.trigger && (
                                  <span className="ml-2">• {entry.trigger}</span>
                                )}
                              </div>
                            )}
                            
                            {entry.event_type === 'intake' && (
                              <div className="text-sm text-muted-foreground mt-1">
                                <span className="font-medium text-foreground">{entry.volume_ml} ml</span>
                                {entry.intake_type && (
                                  <span className="ml-2">• {entry.intake_type}</span>
                                )}
                              </div>
                            )}
                            
                            {entry.notes && (
                              <p className="text-sm text-muted-foreground mt-2 italic">
                                "{entry.notes}"
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                          <Clock className="h-3 w-3" />
                          {entry.time.slice(0, 5)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
