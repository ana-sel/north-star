/**
 * useAuth Hook
 * Manages authentication state and user session
 */

import { useEffect, useState } from 'react';
import { supabase } from '@lib/supabase';
import { User } from '../types/index';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check current session
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (data.session?.user) {
          setUser({
            id: data.session.user.id,
            email: data.session.user.email || '',
            created_at: data.session.user.created_at,
            updated_at: data.session.user.updated_at || '',
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Auth error');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Subscribe to auth changes
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          created_at: session.user.created_at,
          updated_at: session.user.updated_at || '',
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      data.subscription?.unsubscribe();
    };
  }, []);

  return { user, isLoading, error };
}
