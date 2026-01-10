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

  const checkNeedsUsername = async (currentUser: User) => {
    if (currentUser.user_metadata?.username) {
      setNeedsUsername(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (profile?.username) {
      await supabase.auth.updateUser({
        data: { username: profile.username },
      });
      setNeedsUsername(false);
      return;
    }

    setNeedsUsername(true);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await checkNeedsUsername(session.user);
      }
      setLoading(false);
    });

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

    const { error } = await supabase.auth.updateUser({
      data: { username },
    });

    if (!error) {
      setNeedsUsername(false);
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
      setSession(null);
      setUser(null);
    }
  };

  const updateProfile = async (data: { username?: string }) => {
    if (data.username) {
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
