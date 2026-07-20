import { createContext } from 'react';
import type { AuthMember } from '../shared';

export interface AuthContextValue {
  member: AuthMember | null;
  isReady: boolean;
  login: (id: string, passwd: string) => Promise<AuthMember>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
