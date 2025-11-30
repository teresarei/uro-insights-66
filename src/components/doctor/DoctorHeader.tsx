import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  LogOut, 
  User, 
  Activity,
  Stethoscope,
  ArrowLeft,
  Menu
} from 'lucide-react';

interface DoctorHeaderProps {
  onBackToPatientList?: () => void;
  showBackButton?: boolean;
}

export function DoctorHeader({ onBackToPatientList, showBackButton }: DoctorHeaderProps) {
  const { user, logout, selectedPatient, setSelectedPatient } = useAuth();

  const handleBackToPatientList = () => {
    setSelectedPatient(null);
    onBackToPatientList?.();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          {showBackButton && selectedPatient && (
            <Button variant="ghost" size="sm" onClick={handleBackToPatientList} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Patientlista
            </Button>
          )}
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg hidden sm:block">Void.AI</span>
            <Badge variant="outline" className="hidden sm:flex text-xs">
              <Stethoscope className="h-3 w-3 mr-1" />
              Vårdgivare
            </Badge>
          </div>
        </div>

        {selectedPatient && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground hidden sm:inline">Patient:</span>
            <span className="font-medium">{selectedPatient.display_name}</span>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-1">
              <span className="font-medium">{user?.name}</span>
              <span className="text-xs text-muted-foreground font-normal">
                {user?.username}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logga ut
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
