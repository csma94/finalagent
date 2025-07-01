import { useAuth as useClerkAuth } from '@clerk/clerk-react';

export function useAuth() {
  const { isSignedIn, isLoaded } = useClerkAuth();
  
  return { 
    isAuthenticated: isSignedIn, 
    isLoading: !isLoaded,
    user: isSignedIn ? {
      id: 'user-id',
      name: 'User Name',
      email: 'user@example.com'
    } : null
  };
}
