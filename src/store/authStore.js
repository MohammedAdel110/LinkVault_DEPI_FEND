import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      setToken: (token) => {
        try {
          const decoded = jwtDecode(token);
          
          // Extract email from ASP.NET claim or standard fields
          const email = 
            decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
            decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
            decoded.email || 
            decoded.Email || 
            decoded.unique_name || 
            decoded.sub;
            
          const name = 
            decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'] ||
            decoded.given_name || 
            decoded.firstName;

          set({ 
            token, 
            user: { 
              email: email || 'User',
              name: name || '',
              exp: decoded.exp 
            } 
          });
        } catch (e) {
          console.error("Failed to decode token", e);
          set({ token: null, user: null });
        }
      },

      logout: () => set({ token: null, user: null }),

      isAuthenticated: () => {
        const { token, user } = get();
        if (!token || !user) return false;
        if (user.exp && Date.now() >= user.exp * 1000) {
          // Token expired
          set({ token: null, user: null });
          return false;
        }
        return true;
      }
    }),
    {
      name: 'lv-auth-storage',
    }
  )
);
