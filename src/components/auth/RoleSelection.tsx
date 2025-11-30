import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Stethoscope, Shield, Activity } from 'lucide-react';

interface RoleSelectionProps {
  onSelectRole: (role: 'patient' | 'doctor') => void;
}

export function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  return (
    <div className="min-h-screen bg-background gradient-surface flex items-center justify-center p-3 sm:p-4 safe-area-inset">
      <div className="w-full max-w-lg space-y-6 sm:space-y-8 animate-slide-up">
        {/* Logo/Header */}
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center shadow-elevated">
                <Activity className="h-8 w-8 sm:h-10 sm:w-10 text-primary-foreground" />
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Void.AI</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Digital Bladder Diary System</p>
          </div>
        </div>

        <Card variant="elevated" className="border-2">
          <CardHeader className="text-center p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Välkommen</CardTitle>
            <CardDescription className="text-sm">
              Välj hur du vill logga in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
            <Button 
              variant="outline" 
              className="w-full h-auto min-h-[70px] sm:h-20 flex gap-3 p-3 sm:p-4 hover:border-primary hover:bg-primary/5"
              onClick={() => onSelectRole('patient')}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#235971]/10 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-[#235971]" />
              </div>
              <div className="text-left min-w-0">
                <p className="font-semibold text-foreground text-sm sm:text-base">Jag är Patient</p>
                <p className="text-xs sm:text-sm text-muted-foreground font-normal">Logga in med BankID</p>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full h-auto min-h-[70px] sm:h-20 flex gap-3 p-3 sm:p-4 hover:border-primary hover:bg-primary/5"
              onClick={() => onSelectRole('doctor')}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="text-left min-w-0">
                <p className="font-semibold text-foreground text-sm sm:text-base">Jag är Vårdgivare</p>
                <p className="text-xs sm:text-sm text-muted-foreground font-normal">Logga in med användarnamn</p>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Security notice */}
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>Säker anslutning • GDPR-kompatibel</span>
        </div>
      </div>
    </div>
  );
}
