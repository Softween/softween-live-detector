import { createContext, useState, useEffect, type ReactNode } from 'react';
import mixpanel from 'mixpanel-browser';
import { api } from '../api/client';

interface User {
  id: string;
  email: string;
  name: string;
  email_verified: number;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const userData = await api.auth.login({ email, password });
    setUser(userData);
    mixpanel.identify(userData.id);
    mixpanel.people.set({ '$name': userData.name, '$email': userData.email });
  }

  async function register(email: string, password: string, name: string) {
    const userData = await api.auth.register({ email, password, name });
    setUser(userData);
    mixpanel.identify(userData.id);
    mixpanel.people.set({ '$name': userData.name, '$email': userData.email });
  }

  async function logout() {
    await api.auth.logout();
    setUser(null);
    mixpanel.reset();
  }

  async function refreshUser() {
    try {
      const userData = await api.auth.me();
      setUser(userData);
    } catch {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
