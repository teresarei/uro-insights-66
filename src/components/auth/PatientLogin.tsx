import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Smartphone, Shield, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

type AuthStep = 'input' | 'waiting' | 'success' | 'error';

interface PatientLoginProps {
  onBack: () => void;
}

export function PatientLogin({ onBack }: PatientLoginProps) {
  const { loginAsPatient, isAuthenticating } = useAuth();
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
      await loginAsPatient(personalNumber);
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
    <div className="min-h-screen bg-background gradient-surface flex items-center justify-center p-3 sm:p-4 safe-area-inset">
      <div className="w-full max-w-md space-y-4 sm:space-y-6 animate-slide-up">
        {/* Back button */}
        <Button variant="ghost" onClick={onBack} className="gap-2 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Tillbaka
        </Button>

        {/* BankID Logo/Header */}
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-[#235971] flex items-center justify-center shadow-elevated">
                <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary flex items-center justify-center">
                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">BankID</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Säker inloggning för patienter</p>
          </div>
        </div>

        <Card variant="elevated" className="border-2">
          {step === 'input' && (
            <>
              <CardHeader className="text-center p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Logga in med BankID</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Ange ditt personnummer för att starta autentisering
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="personnummer" className="text-sm">Personnummer</Label>
                    <Input
                      id="personnummer"
                      type="text"
                      placeholder="ÅÅÅÅMMDD-XXXX"
                      value={formatInput(personalNumber)}
                      onChange={(e) => setPersonalNumber(e.target.value)}
                      className="h-11 sm:h-12 text-center text-base sm:text-lg font-mono"
                      maxLength={13}
                    />
                    {error && (
                      <p className="text-xs sm:text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                        <span>{error}</span>
                      </p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 sm:h-12 bg-[#235971] hover:bg-[#1a4555] text-white text-sm sm:text-base"
                    disabled={isAuthenticating}
                  >
                    Öppna BankID
                  </Button>

                  <p className="text-[10px] sm:text-xs text-center text-muted-foreground">
                    Detta är en demo-implementation av BankID för Void.AI
                  </p>
                </form>
              </CardContent>
            </>
          )}

          {step === 'waiting' && (
            <CardContent className="py-8 sm:py-12">
              <div className="text-center space-y-4 sm:space-y-6">
                <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24">
                  <div className="absolute inset-0 rounded-full border-4 border-muted animate-pulse" />
                  <div className="absolute inset-2 rounded-full bg-[#235971]/10 flex items-center justify-center">
                    <Smartphone className="h-8 w-8 sm:h-10 sm:w-10 text-[#235971] animate-bounce" />
                  </div>
                </div>
                
                <div className="space-y-1 sm:space-y-2">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">
                    Starta BankID-appen
                  </h3>
                  <p className="text-sm text-muted-foreground px-4">
                    Öppna BankID-appen på din mobil och legitimera dig
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                  Väntar på svar från BankID...
                </div>

                <Button 
                  variant="outline" 
                  onClick={() => setStep('input')}
                  className="mt-4 text-sm"
                >
                  Avbryt
                </Button>
              </div>
            </CardContent>
          )}

          {step === 'success' && (
            <CardContent className="py-8 sm:py-12">
              <div className="text-center space-y-4">
                <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8 text-success" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground">
                  Inloggning lyckades!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Du omdirigeras till Void.AI...
                </p>
              </div>
            </CardContent>
          )}

          {step === 'error' && (
            <CardContent className="py-8 sm:py-12">
              <div className="text-center space-y-4">
                <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8 text-destructive" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground">
                  Något gick fel
                </h3>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button onClick={() => setStep('input')} className="text-sm">
                  Försök igen
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Demo notice */}
        <Card className="bg-warning-soft border-warning/30">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xs sm:text-sm text-warning-foreground">
              <strong>Demo:</strong> Detta är en mockup av BankID. Ange valfritt personnummer för att testa.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
