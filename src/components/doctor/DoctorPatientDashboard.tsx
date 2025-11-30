import { useAuth } from '@/context/AuthContext';
import { useDiary } from '@/context/DiaryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Calendar, 
  Droplet, 
  Activity,
  AlertTriangle,
  TrendingUp,
  Moon,
  Sun
} from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export function DoctorPatientDashboard() {
  const { selectedPatient } = useAuth();
  const { entries, getStats } = useDiary();
  const stats = getStats();

  if (!selectedPatient) return null;

  const voids = entries.filter(e => e.event_type === 'void');
  const leakages = entries.filter(e => e.event_type === 'leakage');
  const intakes = entries.filter(e => e.event_type === 'intake');
  const uniqueDays = new Set(entries.map(e => e.date)).size;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Patient Info Card */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{selectedPatient.display_name}</CardTitle>
              <p className="text-sm text-muted-foreground font-mono">
                {selectedPatient.personal_number}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  {uniqueDays} dagars data
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {entries.length} registreringar
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Droplet className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{voids.length}</p>
            <p className="text-xs text-muted-foreground">Miktioner</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 text-warning-foreground mx-auto mb-2" />
            <p className="text-2xl font-bold">{leakages.length}</p>
            <p className="text-xs text-muted-foreground">Läckage</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="h-6 w-6 text-info mx-auto mb-2" />
            <p className="text-2xl font-bold">{intakes.length}</p>
            <p className="text-xs text-muted-foreground">Vätskeintag</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.medianVolume || 0}</p>
            <p className="text-xs text-muted-foreground">Median ml</p>
          </CardContent>
        </Card>
      </div>

      {/* Day/Night Analysis */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-lg">Dag/Natt Analys</CardTitle>
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
        </CardContent>
      </Card>

      {/* Volume Stats */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-lg">Volymstatistik</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Min</p>
              <p className="text-lg font-semibold">{stats.minVolume || 0} ml</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/10">
              <p className="text-xs text-muted-foreground mb-1">Median</p>
              <p className="text-lg font-semibold">{stats.medianVolume || 0} ml</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Max</p>
              <p className="text-lg font-semibold">{stats.maxVolume || 0} ml</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Read-only notice */}
      <Card className="bg-info-soft border-info/30">
        <CardContent className="p-4 flex items-center gap-3">
          <Activity className="h-5 w-5 text-info" />
          <p className="text-sm text-info-foreground">
            <strong>Läsläge:</strong> Du ser patientens dagboksdata. 
            Gå till Insikter-fliken för att lägga till behandlingsplan.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
