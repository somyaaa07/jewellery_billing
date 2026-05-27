import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { authAPI }   from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    if (token) {
      try {
        const d = jwtDecode(token);
        if (d.exp * 1000 > Date.now()) setUser(d);
        else localStorage.removeItem('jwtToken');
      } catch { localStorage.removeItem('jwtToken'); }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token, user: u } = res.data;
    localStorage.setItem('jwtToken', token);
    const decoded = jwtDecode(token);
    setUser({ ...decoded, ...u });
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('jwtToken');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout,
      isAuthenticated: !!user,
      isSuperAdmin:    user?.role === 'super_admin',
      isShopAdmin:     user?.role === 'shop_admin',
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};