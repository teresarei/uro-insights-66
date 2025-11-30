import { useState } from 'react';
import { Droplets, LayoutDashboard, PlusCircle, Brain, User, List, LogOut, FileDown, Shield, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDiary } from '@/context/DiaryContext';
import { useAuth } from '@/context/AuthContext';
import { ViewType } from '@/types/urotracker';
import { cn } from '@/lib/utils';
import { ExportDialog } from './ExportDialog';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleNavClick = (view: ViewType) => {
    setCurrentView(view);
    setMobileNavOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md safe-area-inset">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
          {/* Logo */}
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-1.5 sm:gap-2 transition-transform hover:scale-105"
          >
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl gradient-hero shadow-soft">
              <Droplets className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            </div>
            <span className="text-lg sm:text-xl font-semibold text-foreground">Void.AI</span>
            <Badge variant="outline" className="hidden sm:flex text-xs">
              Patient
            </Badge>
          </button>

          {/* Desktop navigation */}
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

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Export button - desktop */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportOpen(true)}
              className="hidden sm:flex gap-2"
            >
              <FileDown className="h-4 w-4" />
              <span className="hidden md:inline">Export PDF</span>
            </Button>

            {/* User menu */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full">
                    <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                      <AvatarFallback className="bg-[#235971] text-white text-xs sm:text-sm">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-popover" align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium break-words">{user.name}</p>
                      <p className="text-xs text-muted-foreground font-mono break-all">
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

            {/* Mobile menu button */}
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 sm:h-9 sm:w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-2 mt-6">
                  {navItems.map(({ view, label, icon: Icon }) => (
                    <Button
                      key={view}
                      variant={currentView === view ? 'soft' : 'ghost'}
                      className={cn(
                        "justify-start gap-3 h-12",
                        currentView === view && "shadow-soft"
                      )}
                      onClick={() => handleNavClick(view)}
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </Button>
                  ))}
                  <div className="border-t my-4" />
                  <Button
                    variant="outline"
                    className="justify-start gap-3 h-12"
                    onClick={() => {
                      setExportOpen(true);
                      setMobileNavOpen(false);
                    }}
                  >
                    <FileDown className="h-5 w-5" />
                    Export PDF
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </>
  );
}
