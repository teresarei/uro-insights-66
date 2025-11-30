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
    <div className="space-y-4 sm:space-y-6 animate-slide-up">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Mina Patienter
        </h1>
        <p className="text-sm text-muted-foreground">
          {patients.length} patienter tilldelade
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Sök patient..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 text-sm"
        />
      </div>

      {/* Patient list */}
      <div className="space-y-2 sm:space-y-3">
        {filteredPatients.length === 0 ? (
          <Card>
            <CardContent className="py-8 sm:py-12 text-center">
              <User className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
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
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{patient.display_name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground font-mono truncate">
                        {patient.personal_number}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 sm:gap-3 shrink-0">
                    {patient.meets48hRequirement !== undefined && (
                      <Badge 
                        variant={patient.meets48hRequirement ? 'default' : 'secondary'}
                        className={`text-xs ${patient.meets48hRequirement 
                          ? 'bg-success/10 text-success border-success/20' 
                          : 'bg-warning-soft text-warning-foreground border-warning/20'
                        }`}
                      >
                        {patient.meets48hRequirement ? (
                          <><CheckCircle className="h-3 w-3 mr-0.5 sm:mr-1" /> <span className="hidden xs:inline">≥48h</span></>
                        ) : (
                          <><AlertTriangle className="h-3 w-3 mr-0.5 sm:mr-1" /> <span className="hidden xs:inline">&lt;48h</span></>
                        )}
                      </Badge>
                    )}
                    
                    <Button variant="ghost" size="icon" className="h-8 w-8">
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
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-info-foreground">
            <strong>Tips:</strong> Klicka på en patient för att se deras dagbok och lägga till behandlingsplan.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
