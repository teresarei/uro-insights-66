import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { DiaryProvider, useDiary } from '@/context/DiaryContext';
import { RoleSelection } from '@/components/auth/RoleSelection';
import { PatientLogin } from '@/components/auth/PatientLogin';
import { DoctorLogin } from '@/components/auth/DoctorLogin';
import { Header } from '@/components/urotracker/Header';
import { Dashboard } from '@/components/urotracker/Dashboard';
import { NewEntryPage } from '@/components/urotracker/NewEntryPage';
import { UserProfile } from '@/components/urotracker/UserProfile';
import { EntriesOverview } from '@/components/urotracker/EntriesOverview';
import { RecordingBlocksTimeline } from '@/components/urotracker/RecordingBlocksTimeline';
import { PatientList } from '@/components/doctor/PatientList';
import { DoctorPatientView } from '@/components/doctor/DoctorPatientView';
import { DoctorHeader } from '@/components/doctor/DoctorHeader';

type LoginScreen = 'selection' | 'patient' | 'doctor';

function PatientAppContent() {
  const { currentView } = useDiary();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'entry':
        return <NewEntryPage />;
      case 'overview':
        return <EntriesOverview />;
      case 'insights':
        return <RecordingBlocksTimeline />;
      case 'profile':
        return <UserProfile />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background gradient-surface">
      <Header />
      <main className="container max-w-4xl px-4 py-8">
        {renderView()}
      </main>
    </div>
  );
}

function DoctorApp() {
  const { selectedPatient } = useAuth();

  if (selectedPatient) {
    return <DoctorPatientView />;
  }

  return (
    <div className="min-h-screen bg-background gradient-surface">
      <DoctorHeader />
      <main className="container max-w-4xl px-4 py-8">
        <PatientList />
      </main>
    </div>
  );
}

function AuthenticatedApp() {
  const { isAuthenticated, user } = useAuth();
  const [loginScreen, setLoginScreen] = useState<LoginScreen>('selection');

  if (!isAuthenticated) {
    switch (loginScreen) {
      case 'patient':
        return <PatientLogin onBack={() => setLoginScreen('selection')} />;
      case 'doctor':
        return <DoctorLogin onBack={() => setLoginScreen('selection')} />;
      default:
        return <RoleSelection onSelectRole={(role) => setLoginScreen(role)} />;
    }
  }

  if (user?.role === 'doctor') {
    return <DoctorApp />;
  }

  return (
    <DiaryProvider>
      <PatientAppContent />
    </DiaryProvider>
  );
}

const Index = () => {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
};

export default Index;
