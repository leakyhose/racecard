import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [needsUsername, setNeedsUsername] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const hasHandledCallback = useRef(false);

  useEffect(() => {
    document.title = "RaceCard";
  }, []);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Prevent double execution
      if (hasHandledCallback.current) return;
      hasHandledCallback.current = true;
      
      try {
        // Get the session from URL hash (OAuth callback)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          setError("Authentication failed. Please try again.");
          setIsCheckingUser(false);
          return;
        }

        if (!session?.user) {
          // No session yet, wait for auth state change
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              subscription.unsubscribe();
              await checkUserProfile(session.user.id, session.user.user_metadata);
            }
          });
          
          // Set a timeout to handle cases where the callback fails
          const timeoutId = setTimeout(() => {
            setError("Authentication timed out. Please try again.");
            setIsCheckingUser(false);
          }, 10000);
          
          // Clean up timeout if component unmounts
          return () => clearTimeout(timeoutId);
        }

        // Session exists, check profile
        await checkUserProfile(session.user.id, session.user.user_metadata);
      } catch (err) {
        console.error("OAuth callback error:", err);
        setError("An error occurred. Please try again.");
        setIsCheckingUser(false);
      }
    };

    const checkUserProfile = async (id: string, userMetadata: Record<string, unknown> | undefined) => {
      setUserId(id);
      
      // Check if user already has a username set in metadata
      const existingUsername = userMetadata?.username as string | undefined;
      
      if (existingUsername) {
        // User already has a username, redirect to home
        navigate("/");
        return;
      }

      // Check if profile exists in profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", id)
        .maybeSingle();

      if (profile?.username) {
        // Profile exists, update user metadata and redirect
        await supabase.auth.updateUser({
          data: { username: profile.username },
        });
        navigate("/");
        return;
      }

      // User needs to set a username
      setNeedsUsername(true);
      setIsCheckingUser(false);
    };

    handleOAuthCallback();
  }, [navigate]);

  const handleSetUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!username.trim()) {
      setError("Username is required");
      setLoading(false);
      return;
    }

    if (!userId) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    // Check if username exists
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username.trim())
      .maybeSingle();

    if (existingUser) {
      setError("Username already taken");
      setLoading(false);
      return;
    }

    // Create profile with username
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: userId, username: username.trim() });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    // Update user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: { username: username.trim() },
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Redirect to home
    navigate("/");
  };

  if (isCheckingUser && !needsUsername) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6 select-none">
        <h1 className="text-5xl md:text-6xl font-black text-coffee tracking-tighter">RaceCard</h1>
        <div className="text-coffee font-bold">Setting up your account...</div>
        {error && (
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 border-2 border-terracotta bg-terracotta/20 text-coffee font-bold text-sm rounded-md">
              {error}
            </div>
            <button
              onClick={() => navigate("/auth")}
              className="text-coffee font-bold hover:text-terracotta transition-colors text-sm"
            >
              ← Back to Login
            </button>
          </div>
        )}
      </div>
    );
  }

  if (needsUsername) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6 select-none">
        <div className="flex flex-col items-center w-full max-w-md z-10">
          <h1 className="text-5xl md:text-6xl font-black text-coffee tracking-tighter mb-6 text-center">RaceCard</h1>
          
          <div className="w-full">
            {/* Under Card */}
            <div className="shadow-[0_0_10px_rgba(0,0,0,0.2)] border-2 border-coffee absolute rounded-[10px] bg-vanilla -z-10" style={{ width: 'inherit', height: 'inherit' }}></div>
            
            {/* Top Card */}
            <div className="w-full border-2 border-coffee bg-vanilla p-8 rounded-[10px] shadow-[inset_0_0_0_3px_var(--color-powder)] flex flex-col items-center justify-center gap-5">
              <h2 className="text-2xl font-bold text-coffee">Choose Your Username</h2>
              <p className="text-coffee/70 text-center text-sm">
                Welcome! Please choose a username to complete your account setup.
              </p>
              <form onSubmit={handleSetUsername} className="w-full space-y-4">
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  maxLength={15}
                  className="w-full p-3 border-2 border-coffee rounded-md bg-white placeholder-coffee/50 focus:outline-none focus:ring-2 focus:ring-powder font-bold text-coffee select-text"
                />
                {error && (
                  <div className="p-2 border-2 border-terracotta bg-terracotta/20 text-coffee font-bold text-sm rounded-md">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full rounded-md bg-coffee border-none p-0 cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="block w-full h-full rounded-md border-2 border-coffee px-2 py-3 font-bold text-lg text-coffee bg-powder -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0">
                    {loading ? "Loading..." : "Continue"}
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6 select-none">
      <h1 className="text-5xl md:text-6xl font-black text-coffee tracking-tighter">RaceCard</h1>
      <div className="text-coffee font-bold">Completing sign in...</div>
    </div>
  );
}
