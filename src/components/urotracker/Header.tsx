import { Droplets, LayoutDashboard, PlusCircle, Brain, User, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDiary } from '@/context/DiaryContext';
import { ViewType } from '@/types/urotracker';
import { cn } from '@/lib/utils';

const navItems: { view: ViewType; label: string; icon: React.ElementType }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'entry', label: 'Log Entry', icon: PlusCircle },
  { view: 'scan', label: 'Scan Diary', icon: Camera },
  { view: 'insights', label: 'Insights', icon: Brain },
  { view: 'profile', label: 'Profile', icon: User },
];

export function Header() {
  const { currentView, setCurrentView } = useDiary();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-4">
        <button 
          onClick={() => setCurrentView('dashboard')}
          className="flex items-center gap-2 transition-transform hover:scale-105"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-hero shadow-soft">
            <Droplets className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold text-foreground">UroTracker</span>
        </button>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(({ view, label, icon: Icon }) => (
            <Button
              key={view}
              variant={currentView === view ? 'soft' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView(view)}
              className={cn(
                "gap-2",
                currentView === view && "shadow-soft"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </nav>

        {/* Mobile navigation */}
        <nav className="flex md:hidden items-center gap-1">
          {navItems.map(({ view, icon: Icon }) => (
            <Button
              key={view}
              variant={currentView === view ? 'soft' : 'ghost'}
              size="icon"
              onClick={() => setCurrentView(view)}
              className={cn(
                "h-9 w-9",
                currentView === view && "shadow-soft"
              )}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </nav>
      </div>
    </header>
  );
}
