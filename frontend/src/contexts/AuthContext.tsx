/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "../supabaseClient";
import type { User, Session, AuthError } from "@supabase/supabase-js";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  needsUsername: boolean;
  signUp: (
    email: string,
    password: string,
    username: string,
  ) => Promise<{ error: AuthError | null }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: {
    username?: string;
  }) => Promise<{ error: AuthError | null }>;
  setUsernameForOAuth: (username: string) => Promise<{ error: AuthError | null }>;
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
  const [needsUsername, setNeedsUsername] = useState(false);

  // Check if user needs to set a username (for OAuth users)
  const checkNeedsUsername = async (currentUser: User) => {
    // If user already has a username in metadata, they don't need one
    if (currentUser.user_metadata?.username) {
      setNeedsUsername(false);
      return;
    }

    // Check if profile exists in profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (profile?.username) {
      // Profile exists, update user metadata
      await supabase.auth.updateUser({
        data: { username: profile.username },
      });
      setNeedsUsername(false);
      return;
    }

    // User needs to set a username
    setNeedsUsername(true);
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await checkNeedsUsername(session.user);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await checkNeedsUsername(session.user);
      } else {
        setNeedsUsername(false);
      }
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

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const setUsernameForOAuth = async (username: string) => {
    if (!user) {
      return {
        error: {
          message: "Not authenticated",
          name: "AuthError",
          status: 401,
        } as AuthError,
      };
    }

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

    // Create profile with username
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: user.id, username: username });

    if (profileError) {
      return {
        error: {
          message: profileError.message,
          name: "PostgrestError",
          status: 500,
        } as AuthError,
      };
    }

    // Update user metadata
    const { error } = await supabase.auth.updateUser({
      data: { username },
    });

    if (!error) {
      setNeedsUsername(false);
      // Refresh user data
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      setUser(updatedUser);
    }

    return { error };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      // Force state clear to ensure UI updates
      setSession(null);
      setUser(null);
    }
  };

  const updateProfile = async (data: { username?: string }) => {
    if (data.username) {
      // Check if username exists (excluding current user)
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", data.username)
        .neq("id", user?.id)
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
      value={{ user, session, loading, needsUsername, signUp, signIn, signInWithGoogle, signOut, updateProfile, setUsernameForOAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}
