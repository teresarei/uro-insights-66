import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  personalNumber: string; // Swedish personnummer format
  authenticatedAt: Date;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  login: (personalNumber: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'urotracker_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

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

  const login = async (personalNumber: string): Promise<void> => {
    setIsAuthenticating(true);
    
    // Simulate BankID authentication delay (3-5 seconds)
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
    
    // Create mock user from personnummer
    const mockUser: User = {
      id: `user_${personalNumber.replace(/\D/g, '')}`,
      name: generateSwedishName(),
      personalNumber: formatPersonnummer(personalNumber),
      authenticatedAt: new Date(),
    };

    setUser(mockUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
    setIsAuthenticating(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isAuthenticating,
      login,
      logout,
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
