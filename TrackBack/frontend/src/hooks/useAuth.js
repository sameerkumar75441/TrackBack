import { useContext } from 'react';
import AuthContext from '../context/authContext.js';

export default function useAuth() {
  return useContext(AuthContext);
}
