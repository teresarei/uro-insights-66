import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, Doctor, Patient } from '@/types/roles';

interface User {
  id: string;
  name: string;
  personalNumber?: string;
  username?: string;
  authenticatedAt: Date;
  role: AppRole;
  doctorId?: string;
  patientId?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  loginAsPatient: (personalNumber: string) => Promise<void>;
  loginAsDoctor: (username: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
  selectedPatient: Patient | null;
  setSelectedPatient: (patient: Patient | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'void_ai_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser({
          ...parsed,
          authenticatedAt: new Date(parsed.authenticatedAt),
        });
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const loginAsPatient = async (personalNumber: string): Promise<void> => {
    setIsAuthenticating(true);
    
    // Simulate BankID authentication delay (3-5 seconds)
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
    
    const formattedPersonnummer = formatPersonnummer(personalNumber);
    
    // Check if patient exists, if not create one
    const { data: existingPatient } = await supabase
      .from('patients')
      .select('*')
      .eq('personal_number', formattedPersonnummer)
      .maybeSingle();

    let patientId: string;
    let displayName: string;

    if (existingPatient) {
      patientId = existingPatient.id;
      displayName = existingPatient.display_name;
    } else {
      // Create new patient
      displayName = generateSwedishName();
      const { data: newPatient, error } = await supabase
        .from('patients')
        .insert({
          personal_number: formattedPersonnummer,
          display_name: displayName,
        })
        .select()
        .single();

      if (error || !newPatient) {
        setIsAuthenticating(false);
        throw new Error('Failed to create patient record');
      }
      patientId = newPatient.id;
    }

    // Create user object
    const mockUser: User = {
      id: `patient_${personalNumber.replace(/\D/g, '')}`,
      name: displayName,
      personalNumber: formattedPersonnummer,
      authenticatedAt: new Date(),
      role: 'patient',
      patientId: patientId,
    };

    setUser(mockUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
    setIsAuthenticating(false);
  };

  const loginAsDoctor = async (username: string, password: string): Promise<{ error?: string }> => {
    setIsAuthenticating(true);
    
    try {
      // Check doctor credentials
      const { data: doctor, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('username', username)
        .eq('password_hash', password)
        .maybeSingle();

      if (error || !doctor) {
        setIsAuthenticating(false);
        return { error: 'Ogiltigt användarnamn eller lösenord' };
      }

      // Create user object
      const doctorUser: User = {
        id: `doctor_${doctor.id}`,
        name: doctor.display_name,
        username: doctor.username,
        authenticatedAt: new Date(),
        role: 'doctor',
        doctorId: doctor.id,
      };

      setUser(doctorUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(doctorUser));
      setIsAuthenticating(false);
      return {};
    } catch (e) {
      setIsAuthenticating(false);
      return { error: 'Ett fel uppstod vid inloggning' };
    }
  };

  const logout = () => {
    setUser(null);
    setSelectedPatient(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isAuthenticating,
      loginAsPatient,
      loginAsDoctor,
      logout,
      selectedPatient,
      setSelectedPatient,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper to format Swedish personnummer
function formatPersonnummer(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 12) {
    return `${digits.slice(0, 8)}-${digits.slice(8)}`;
  }
  return input;
}

// Generate a random Swedish name for demo
function generateSwedishName(): string {
  const firstNames = ['Erik', 'Anna', 'Lars', 'Maria', 'Johan', 'Eva', 'Anders', 'Karin', 'Per', 'Lena', 'Karl', 'Ingrid'];
  const lastNames = ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Gustafsson'];
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}
