import { createContext, ReactNode, useEffect, useState } from 'react';
import Router from 'next/router';
import { api } from '../services/api';
import { setCookie, parseCookies } from 'nookies';

type User = {
  email: string;
  permissions: string[];
  roles: string[];
};

type SignInCredentials = {
  email: string;
  password: string;
};

type AuthContextData = {
  signIn(credentials: SignInCredentials): Promise<void>;
  user: User;
  isAuthenticated: boolean;
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext({} as AuthContextData);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User>();
  const isAuthenticated = !!user;

  useEffect(() => {
    const { 'auth.token': token } = parseCookies();
    if (token) {
      api.get('/me').then((res) => {
        const { email, permissions, roles } = res.data;
        setUser({ email, permissions, roles });
      });
    }
  }, []);

  async function signIn({ email, password }: SignInCredentials) {
    try {
      const response = await api.post('sessions', {
        email,
        password,
      });

      const { token, refreshToken, permissions, roles } = response.data;

      setTokens({ token, refreshToken });

      setUser({ email, permissions, roles });

      api.defaults.headers['Authorization'] = `Bearer ${token}`;

      Router.push('/dashboard');
    } catch (err) {
      console.log(err);
    }
  }
  return (
    <AuthContext.Provider value={{ signIn, isAuthenticated, user }}>
      {children}
    </AuthContext.Provider>
  );
}

type Tokens = {
  token: string;
  refreshToken: string;
};

function setTokens({ token, refreshToken }: Tokens) {
  setCookie(undefined, 'auth.token', token, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
  setCookie(undefined, 'auth.refreshToken', refreshToken, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
}
