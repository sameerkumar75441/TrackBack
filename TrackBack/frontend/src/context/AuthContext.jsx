import { useEffect, useState } from 'react';
import api from '../services/api.js';
import AuthContext from './authContext.js';

const tokenKey = 'trackback_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(() => !localStorage.getItem(tokenKey));

  const logout = () => {
    localStorage.removeItem(tokenKey);
    setUser(null);
  };

  useEffect(() => {
    if (!localStorage.getItem(tokenKey)) return undefined;
    let active = true;
    api.get('/auth/me')
      .then(({ user: currentUser }) => { if (active) setUser(currentUser); })
      .catch(() => { if (active) logout(); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const authenticate = async (path, body) => {
    const data = await api.post(path, body);
    localStorage.setItem(tokenKey, data.token);
    setUser(data.user);
    return data;
  };

  return <AuthContext.Provider value={{ user, ready, login: body => authenticate('/auth/login', body), register: body => authenticate('/auth/register', body), logout }}>{children}</AuthContext.Provider>;
}
