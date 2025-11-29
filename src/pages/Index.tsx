import { AuthProvider, useAuth } from '@/context/AuthContext';
import { DiaryProvider, useDiary } from '@/context/DiaryContext';
import { BankIDLogin } from '@/components/auth/BankIDLogin';
import { Header } from '@/components/urotracker/Header';
import { Dashboard } from '@/components/urotracker/Dashboard';
import { NewEntryPage } from '@/components/urotracker/NewEntryPage';
import { UserProfile } from '@/components/urotracker/UserProfile';
import { EntriesOverview } from '@/components/urotracker/EntriesOverview';
import { RecordingBlocksTimeline } from '@/components/urotracker/RecordingBlocksTimeline';

function AppContent() {
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

function AuthenticatedApp() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <BankIDLogin />;
  }

  return (
    <DiaryProvider>
      <AppContent />
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
