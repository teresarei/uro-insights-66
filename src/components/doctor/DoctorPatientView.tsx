import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DiaryProvider } from '@/context/DiaryContext';
import { DoctorHeader } from './DoctorHeader';
import { DoctorPatientDashboard } from './DoctorPatientDashboard';
import { DoctorEntriesView } from './DoctorEntriesView';
import { DoctorInsightsView } from './DoctorInsightsView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, List, Brain, FileText } from 'lucide-react';

type DoctorViewTab = 'dashboard' | 'entries' | 'insights';

export function DoctorPatientView() {
  const { selectedPatient } = useAuth();
  const [currentTab, setCurrentTab] = useState<DoctorViewTab>('dashboard');

  if (!selectedPatient) {
    return null;
  }

  return (
    <DiaryProvider>
      <div className="min-h-screen bg-background gradient-surface">
        <DoctorHeader showBackButton />
        <main className="container max-w-4xl px-4 py-8">
          <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as DoctorViewTab)}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="dashboard" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Översikt</span>
              </TabsTrigger>
              <TabsTrigger value="entries" className="gap-2">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Dagbok</span>
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-2">
                <Brain className="h-4 w-4" />
                <span className="hidden sm:inline">Insikter</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <DoctorPatientDashboard />
            </TabsContent>
            <TabsContent value="entries">
              <DoctorEntriesView />
            </TabsContent>
            <TabsContent value="insights">
              <DoctorInsightsView />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </DiaryProvider>
  );
}
