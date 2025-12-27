/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "../supabaseClient";
import type { User, Session, AuthError } from "@supabase/supabase-js";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    username: string,
  ) => Promise<{ error: AuthError | null }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: {
    username?: string;
  }) => Promise<{ error: AuthError | null }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    // Check if username exists
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username)
      .maybeSingle();

    if (existingUser) {
      return {
        error: {
          message: "Username already taken",
          name: "AuthError",
          status: 400,
        } as AuthError,
      };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: "https://www.racecard.io/confirm",
        data: { username },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (data: { username?: string }) => {
    if (data.username) {
      // Check if username exists
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", data.username)
        .maybeSingle();

      if (existingUser) {
        return {
          error: {
            message: "Username already taken",
            name: "AuthError",
            status: 400,
          } as AuthError,
        };
      }

      // Update profiles table
      if (user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({ id: user.id, username: data.username });

        if (profileError) {
          return {
            error: {
              message: profileError.message,
              name: "PostgrestError",
              status: 500,
            } as AuthError,
          };
        }
      }
    }

    const { error } = await supabase.auth.updateUser({
      data: data,
    });
    // Manually update local state if successful to reflect changes immediately
    if (!error && user) {
      const {
        data: { user: updatedUser },
      } = await supabase.auth.getUser();
      setUser(updatedUser);
    }
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signUp, signIn, signOut, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
