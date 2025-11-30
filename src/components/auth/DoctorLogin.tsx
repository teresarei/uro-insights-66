import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Stethoscope, CheckCircle2, AlertCircle, ArrowLeft, Lock, User } from 'lucide-react';

type AuthStep = 'input' | 'authenticating' | 'success' | 'error';

interface DoctorLoginProps {
  onBack: () => void;
}

export function DoctorLogin({ onBack }: DoctorLoginProps) {
  const { loginAsDoctor, isAuthenticating } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<AuthStep>('input');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Fyll i alla fält');
      return;
    }

    setStep('authenticating');
    
    const result = await loginAsDoctor(username, password);
    
    if (result.error) {
      setStep('error');
      setError(result.error);
    } else {
      setStep('success');
    }
  };

  return (
    <div className="min-h-screen bg-background gradient-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-slide-up">
        {/* Back button */}
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Tillbaka
        </Button>

        {/* Doctor Login Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-elevated">
                <Stethoscope className="h-10 w-10 text-primary-foreground" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-success flex items-center justify-center">
                <Lock className="h-3 w-3 text-white" />
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Vårdgivare</h1>
            <p className="text-sm text-muted-foreground">Logga in med ditt vårdgivarkonto</p>
          </div>
        </div>

        <Card variant="elevated" className="border-2">
          {step === 'input' && (
            <>
              <CardHeader className="text-center">
                <CardTitle>Inloggning</CardTitle>
                <CardDescription>
                  Ange ditt användarnamn och lösenord
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Användarnamn</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="username"
                        type="text"
                        placeholder="dr.andersson"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="h-12 pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Lösenord</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 pl-10"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </p>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-12"
                    disabled={isAuthenticating}
                  >
                    Logga in
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {step === 'authenticating' && (
            <CardContent className="py-12">
              <div className="text-center space-y-6">
                <div className="relative mx-auto w-24 h-24">
                  <div className="absolute inset-0 rounded-full border-4 border-muted animate-pulse" />
                  <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    Verifierar inloggningsuppgifter...
                  </h3>
                </div>
              </div>
            </CardContent>
          )}

          {step === 'success' && (
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Inloggning lyckades!
                </h3>
                <p className="text-muted-foreground">
                  Du omdirigeras till patientöversikten...
                </p>
              </div>
            </CardContent>
          )}

          {step === 'error' && (
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Inloggningen misslyckades
                </h3>
                <p className="text-muted-foreground">{error}</p>
                <Button onClick={() => setStep('input')}>
                  Försök igen
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Demo notice */}
        <Card className="bg-info-soft border-info/30">
          <CardContent className="p-4 text-center space-y-2">
            <p className="text-sm text-info-foreground">
              <strong>Demo-konton:</strong>
            </p>
            <div className="text-xs text-info-foreground/80 space-y-1">
              <p>Användarnamn: <code className="bg-info/20 px-1 rounded">dr.andersson</code></p>
              <p>Lösenord: <code className="bg-info/20 px-1 rounded">demo123</code></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
