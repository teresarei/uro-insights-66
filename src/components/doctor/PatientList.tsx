import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Search, 
  Calendar, 
  CheckCircle, 
  AlertTriangle,
  ChevronRight,
  Loader2,
  User
} from 'lucide-react';
import { Patient, DoctorPatientAssignment } from '@/types/roles';

interface PatientWithStats extends Patient {
  lastRecordingDate?: string;
  meets48hRequirement?: boolean;
}

export function PatientList() {
  const { user, setSelectedPatient } = useAuth();
  const [patients, setPatients] = useState<PatientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.doctorId) {
      fetchPatients();
    }
  }, [user?.doctorId]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      // Get doctor's assigned patients
      const { data: assignments, error: assignmentError } = await supabase
        .from('doctor_patient_assignments')
        .select(`
          *,
          patient:patients(*)
        `)
        .eq('doctor_id', user?.doctorId);

      if (assignmentError) throw assignmentError;

      // Get patient stats from recording blocks
      const patientIds = assignments?.map(a => (a.patient as unknown as Patient)?.id).filter(Boolean) || [];
      
      const patientsWithStats: PatientWithStats[] = [];

      for (const assignment of assignments || []) {
        const patient = assignment.patient as unknown as Patient;
        if (!patient) continue;

        // Get the latest recording block for this patient
        const { data: latestBlock } = await supabase
          .from('recording_blocks')
          .select('*')
          .eq('user_id', patient.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        patientsWithStats.push({
          ...patient,
          lastRecordingDate: latestBlock?.created_at,
          meets48hRequirement: latestBlock?.status === 'complete',
        });
      }

      setPatients(patientsWithStats);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
    setLoading(false);
  };

  const filteredPatients = patients.filter(patient => 
    patient.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.personal_number.includes(searchTerm)
  );

  const handleSelectPatient = (patient: PatientWithStats) => {
    setSelectedPatient(patient);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Mina Patienter
        </h1>
        <p className="text-muted-foreground">
          {patients.length} patienter tilldelade
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Sök patient (namn eller personnummer)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Patient list */}
      <div className="space-y-3">
        {filteredPatients.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'Inga patienter matchade sökningen' : 'Inga patienter tilldelade ännu'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPatients.map((patient) => (
            <Card 
              key={patient.id} 
              variant="elevated" 
              className="hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => handleSelectPatient(patient)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{patient.display_name}</h3>
                      <p className="text-sm text-muted-foreground font-mono">
                        {patient.personal_number}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {patient.lastRecordingDate && (
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground">Senaste registrering</p>
                        <p className="text-sm text-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(patient.lastRecordingDate).toLocaleDateString('sv-SE')}
                        </p>
                      </div>
                    )}
                    
                    {patient.meets48hRequirement !== undefined && (
                      <Badge 
                        variant={patient.meets48hRequirement ? 'default' : 'secondary'}
                        className={patient.meets48hRequirement 
                          ? 'bg-success/10 text-success border-success/20' 
                          : 'bg-warning-soft text-warning-foreground border-warning/20'
                        }
                      >
                        {patient.meets48hRequirement ? (
                          <><CheckCircle className="h-3 w-3 mr-1" /> ≥48h</>
                        ) : (
                          <><AlertTriangle className="h-3 w-3 mr-1" /> &lt;48h</>
                        )}
                      </Badge>
                    )}
                    
                    <Button variant="ghost" size="icon">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Info card */}
      <Card className="bg-info-soft border-info/30">
        <CardContent className="p-4">
          <p className="text-sm text-info-foreground">
            <strong>Tips:</strong> Klicka på en patient för att se deras dagbok, 
            insikter och för att lägga till behandlingsplan.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
