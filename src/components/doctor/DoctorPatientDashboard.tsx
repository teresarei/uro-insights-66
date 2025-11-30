import { useAuth } from '@/context/AuthContext';
import { Dashboard } from '@/components/urotracker/Dashboard';

export function DoctorPatientDashboard() {
  const { selectedPatient } = useAuth();

  if (!selectedPatient) return null;

  return (
    <Dashboard 
      readOnly={true} 
      patientName={selectedPatient.display_name} 
    />
  );
}
