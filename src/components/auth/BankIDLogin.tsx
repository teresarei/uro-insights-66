import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Smartphone, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type AuthStep = 'input' | 'waiting' | 'success' | 'error';

export function BankIDLogin() {
  const { login, isAuthenticating } = useAuth();
  const [personalNumber, setPersonalNumber] = useState('');
  const [step, setStep] = useState<AuthStep>('input');
  const [error, setError] = useState('');

  const validatePersonnummer = (value: string): boolean => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 10 || digits.length === 12;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validatePersonnummer(personalNumber)) {
      setError('Ange ett giltigt personnummer (10 eller 12 siffror)');
      return;
    }

    setStep('waiting');
    
    try {
      await login(personalNumber);
      setStep('success');
    } catch (err) {
      setStep('error');
      setError('Autentisering misslyckades. Försök igen.');
    }
  };

  const formatInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 8) return digits;
    if (digits.length <= 12) {
      return `${digits.slice(0, 8)}-${digits.slice(8)}`;
    }
    return `${digits.slice(0, 8)}-${digits.slice(8, 12)}`;
  };

  return (
    <div className="min-h-screen bg-background gradient-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-slide-up">
        {/* BankID Logo/Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-[#235971] flex items-center justify-center shadow-elevated">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">BankID</h1>
            <p className="text-sm text-muted-foreground">Säker inloggning till UroTracker</p>
          </div>
        </div>

        <Card variant="elevated" className="border-2">
          {step === 'input' && (
            <>
              <CardHeader className="text-center">
                <CardTitle>Logga in med BankID</CardTitle>
                <CardDescription>
                  Ange ditt personnummer för att starta autentisering
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="personnummer">Personnummer</Label>
                    <Input
                      id="personnummer"
                      type="text"
                      placeholder="ÅÅÅÅMMDD-XXXX"
                      value={formatInput(personalNumber)}
                      onChange={(e) => setPersonalNumber(e.target.value)}
                      className="h-12 text-center text-lg font-mono"
                      maxLength={13}
                    />
                    {error && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                      </p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-[#235971] hover:bg-[#1a4555] text-white"
                    disabled={isAuthenticating}
                  >
                    Öppna BankID
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Detta är en demo-implementation av BankID för UroTracker
                  </p>
                </form>
              </CardContent>
            </>
          )}

          {step === 'waiting' && (
            <CardContent className="py-12">
              <div className="text-center space-y-6">
                <div className="relative mx-auto w-24 h-24">
                  <div className="absolute inset-0 rounded-full border-4 border-muted animate-pulse" />
                  <div className="absolute inset-2 rounded-full bg-[#235971]/10 flex items-center justify-center">
                    <Smartphone className="h-10 w-10 text-[#235971] animate-bounce" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    Starta BankID-appen
                  </h3>
                  <p className="text-muted-foreground">
                    Öppna BankID-appen på din mobil och legitimera dig
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Väntar på svar från BankID...
                </div>

                <Button 
                  variant="outline" 
                  onClick={() => setStep('input')}
                  className="mt-4"
                >
                  Avbryt
                </Button>
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
                  Du omdirigeras till UroTracker...
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
                  Något gick fel
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
        <Card className="bg-warning-soft border-warning/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-warning-foreground">
              <strong>Demo:</strong> Detta är en mockup av BankID. Ange valfritt personnummer för att testa.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
