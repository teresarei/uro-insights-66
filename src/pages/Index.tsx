import { DiaryProvider, useDiary } from '@/context/DiaryContext';
import { Header } from '@/components/urotracker/Header';
import { Dashboard } from '@/components/urotracker/Dashboard';
import { EntryForm } from '@/components/urotracker/EntryForm';
import { ClinicalInsights } from '@/components/urotracker/ClinicalInsights';
import { UserProfile } from '@/components/urotracker/UserProfile';
import { DiaryScanner } from '@/components/urotracker/DiaryScanner';

function AppContent() {
  const { currentView } = useDiary();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'entry':
        return <EntryForm />;
      case 'scan':
        return <DiaryScanner />;
      case 'insights':
        return <ClinicalInsights />;
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

const Index = () => {
  return (
    <DiaryProvider>
      <AppContent />
    </DiaryProvider>
  );
};

export default Index;
