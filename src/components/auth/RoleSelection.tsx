import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Stethoscope, Shield, Activity } from 'lucide-react';

interface RoleSelectionProps {
  onSelectRole: (role: 'patient' | 'doctor') => void;
}

export function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  return (
    <div className="min-h-screen bg-background gradient-surface flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8 animate-slide-up">
        {/* Logo/Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-elevated">
                <Activity className="h-10 w-10 text-primary-foreground" />
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Void.AI</h1>
            <p className="text-muted-foreground">Digital Bladder Diary System</p>
          </div>
        </div>

        <Card variant="elevated" className="border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Välkommen</CardTitle>
            <CardDescription>
              Välj hur du vill logga in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full h-20 flex flex-col gap-2 hover:border-primary hover:bg-primary/5"
              onClick={() => onSelectRole('patient')}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#235971]/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-[#235971]" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">Jag är Patient</p>
                  <p className="text-sm text-muted-foreground font-normal">Logga in med BankID</p>
                </div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full h-20 flex flex-col gap-2 hover:border-primary hover:bg-primary/5"
              onClick={() => onSelectRole('doctor')}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Stethoscope className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">Jag är Vårdgivare</p>
                  <p className="text-sm text-muted-foreground font-normal">Logga in med användarnamn</p>
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Security notice */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>Säker anslutning • GDPR-kompatibel</span>
        </div>
      </div>
    </div>
  );
}
