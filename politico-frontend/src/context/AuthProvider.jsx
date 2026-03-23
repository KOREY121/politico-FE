import { useState }     from 'react';
import { AuthContext }  from './AuthContext';

export function AuthProvider({ children }) {
  const [voter, setVoter] = useState(() => {
    const v = sessionStorage.getItem('voter');
    return v ? JSON.parse(v) : null;
  });

  const isAdmin = voter?.is_staff || false;

  function login(voterData, tokens) {
    sessionStorage.setItem('access_token',  tokens.access);
    sessionStorage.setItem('refresh_token', tokens.refresh);
    sessionStorage.setItem('voter',         JSON.stringify(voterData));
    setVoter(voterData);
  }

  function logout() {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('voter');
    setVoter(null);
  }

  return (
    <AuthContext.Provider value={{ voter, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}