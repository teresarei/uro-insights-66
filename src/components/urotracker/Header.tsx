import { useState } from 'react';
import { Droplets, LayoutDashboard, PlusCircle, Brain, User, List, LogOut, FileDown, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDiary } from '@/context/DiaryContext';
import { useAuth } from '@/context/AuthContext';
import { ViewType } from '@/types/urotracker';
import { cn } from '@/lib/utils';
import { ExportDialog } from './ExportDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const navItems: { view: ViewType; label: string; icon: React.ElementType }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'entry', label: 'New Entry', icon: PlusCircle },
  { view: 'overview', label: 'All Entries', icon: List },
  { view: 'insights', label: 'Insights', icon: Brain },
  { view: 'profile', label: 'Profile', icon: User },
];

export function Header() {
  const { currentView, setCurrentView } = useDiary();
  const { user, logout } = useAuth();
  const [exportOpen, setExportOpen] = useState(false);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
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

          <nav className="hidden lg:flex items-center gap-1">
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

          <div className="flex items-center gap-2">
            {/* Export button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportOpen(true)}
              className="hidden sm:flex gap-2"
            >
              <FileDown className="h-4 w-4" />
              Export PDF
            </Button>

            {/* User menu */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-[#235971] text-white">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {user.personalNumber}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                    <Shield className="h-3 w-3 mr-2" />
                    Verified with BankID
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setExportOpen(true)} className="sm:hidden">
                    <FileDown className="h-4 w-4 mr-2" />
                    Export PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logga ut
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Mobile navigation */}
        <nav className="flex lg:hidden items-center gap-1 px-4 pb-2 overflow-x-auto">
          {navItems.map(({ view, label, icon: Icon }) => (
            <Button
              key={view}
              variant={currentView === view ? 'soft' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView(view)}
              className={cn(
                "flex-shrink-0 gap-1.5",
                currentView === view && "shadow-soft"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs">{label}</span>
            </Button>
          ))}
        </nav>
      </header>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </>
  );
}
