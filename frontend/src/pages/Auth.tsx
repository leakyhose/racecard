import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const closeTab = searchParams.get("closeTab") === "true";

  useEffect(() => {
    document.title = "RaceCard";
  }, []);

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!isLogin && !username.trim()) {
      setError("Username is required");
      setLoading(false);
      return;
    }

    const { error } = isLogin
      ? await signIn(email, password)
      : await signUp(email, password, username);

    setLoading(false);

    if (error) {
      if (error.message.includes("already registered")) {
        setError("This email is already registered. Please login instead.");
      } else if (error.message.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please try again.");
      } else {
        setError(error.message);
      }
    } else if (!isLogin) {
      setSuccess("Check your email to confirm your account!");
      setEmail("");
      setPassword("");
    } else if (isLogin && closeTab) {
      // Close popup window
      window.close();
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
    // Redirect will happen
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden relative gap-6 select-none">
      <div className="flex flex-col items-center w-full max-w-md z-10">
        <h1 className="text-5xl md:text-6xl font-black text-coffee tracking-tighter mb-6 text-center">RaceCard</h1>

        <div className="w-full flex flex-col items-center space-y-6">
          <div className="flex items-center gap-4 text-coffee font-bold text-xl">
            <span 
              className={`transition-opacity duration-300 cursor-pointer ${isLogin ? "opacity-100" : "opacity-50"}`}
              onClick={() => { setIsLogin(true); setError(""); setSuccess(""); }}
            >
              Login
            </span>
            
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={!isLogin}
                onChange={() => { setIsLogin(!isLogin); setError(""); setSuccess(""); }}
              />
              <div className="w-14 h-6 bg-terracotta border-2 border-coffee rounded-[5px] shadow-[1px_1px_0px_0px_var(--color-coffee)] transition-colors duration-300 peer-checked:bg-powder box-border relative group">
                <div
                  className={`absolute h-6 w-6 bg-vanilla border-2 border-coffee rounded-md shadow-[0px_3px_0px_0px_var(--color-coffee)] group-hover:shadow-[0px_5px_0px_0px_var(--color-coffee)] transition-all duration-300 -top-[5px] -left-0.5 group-hover:-translate-y-[0.09rem] ${!isLogin ? "translate-x-8" : ""}`}
                ></div>
              </div>
            </label>

            <span 
              className={`transition-opacity duration-300 cursor-pointer ${!isLogin ? "opacity-100" : "opacity-50"}`}
              onClick={() => { setIsLogin(false); setError(""); setSuccess(""); }}
            >
              Sign Up
            </span>
          </div>

          <div className="w-full perspective-1000">
            <div className={`relative w-full transition-transform duration-700 transform-3d ${!isLogin ? 'rotate-y-180' : ''}`} style={{ minHeight: '480px' }}>

              <div className="absolute inset-0 backface-hidden w-full h-full">
                <div className="shadow-[0_0_10px_rgba(0,0,0,0.2)] border-2 border-coffee absolute inset-0 rounded-[10px] bg-vanilla -z-10"></div>

                <div className="w-full h-full border-2 border-coffee bg-vanilla p-8 rounded-[10px] shadow-[inset_0_0_0_3px_var(--color-terracotta)] flex flex-col items-center justify-center gap-5">
                  <h2 className="text-2xl font-bold text-coffee">Welcome Back</h2>
                  <form onSubmit={handleSubmit} className="w-full space-y-4">
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full p-3 border-2 border-coffee rounded-md bg-white placeholder-coffee/50 focus:outline-none focus:ring-2 focus:ring-terracotta font-bold text-coffee select-text"
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full p-3 border-2 border-coffee rounded-md bg-white placeholder-coffee/50 focus:outline-none focus:ring-2 focus:ring-terracotta font-bold text-coffee select-text"
                    />
                    {error && isLogin && (
                      <div className="p-2 border-2 border-terracotta bg-terracotta/20 text-coffee font-bold text-sm rounded-md">
                        {error}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={loading || googleLoading}
                      className="group relative w-full rounded-md bg-coffee border-none p-0 cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="block w-full h-full rounded-md border-2 border-coffee px-2 py-3 font-bold text-lg text-vanilla bg-terracotta -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0">
                        {loading ? "Loading..." : "Login"}
                      </span>
                    </button>
                  </form>

                  <div className="w-full flex items-center gap-4">
                    <div className="flex-1 h-0.5 bg-coffee/30"></div>
                    <span className="text-coffee/50 text-sm font-bold">or</span>
                    <div className="flex-1 h-0.5 bg-coffee/30"></div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading || googleLoading}
                    className="group relative w-full rounded-md bg-coffee border-none p-0 cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center justify-center gap-3 w-full h-full rounded-md border-2 border-coffee px-2 py-3 font-bold text-lg text-coffee bg-white -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      {googleLoading ? "Loading..." : "Continue with Google"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="absolute inset-0 backface-hidden rotate-y-180 w-full h-full">
                <div className="shadow-[0_0_10px_rgba(0,0,0,0.2)] border-2 border-coffee absolute inset-0 rounded-[10px] bg-vanilla -z-10"></div>

                <div className="w-full h-full border-2 border-coffee bg-vanilla p-8 rounded-[10px] shadow-[inset_0_0_0_3px_var(--color-powder)] flex flex-col items-center justify-center gap-3">
                  <h2 className="text-2xl font-bold text-coffee">Create Account</h2>
                  <form onSubmit={handleSubmit} className="w-full space-y-2">
                    <input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      maxLength={15}
                      className="w-full p-3 border-2 border-coffee rounded-md bg-white placeholder-coffee/50 focus:outline-none focus:ring-2 focus:ring-powder font-bold text-coffee select-text"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full p-3 border-2 border-coffee rounded-md bg-white placeholder-coffee/50 focus:outline-none focus:ring-2 focus:ring-powder font-bold text-coffee select-text"
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full p-3 border-2 border-coffee rounded-md bg-white placeholder-coffee/50 focus:outline-none focus:ring-2 focus:ring-powder font-bold text-coffee select-text"
                    />
                    {error && !isLogin && (
                      <div className="p-2 border-2 border-terracotta bg-terracotta/20 text-coffee font-bold text-sm rounded-md">
                        {error}
                      </div>
                    )}
                    {success && !isLogin && (
                      <div className="p-2 border-2 border-mint bg-mint/20 text-coffee font-bold text-sm rounded-md">
                        {success}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={loading || googleLoading}
                      className="group relative w-full rounded-md bg-coffee border-none p-0 cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="block w-full h-full rounded-md border-2 border-coffee px-2 py-3 font-bold text-lg text-coffee bg-powder -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0">
                        {loading ? "Loading..." : "Sign Up"}
                      </span>
                    </button>
                  </form>

                  <div className="w-full flex items-center gap-4">
                    <div className="flex-1 h-0.5 bg-coffee/30"></div>
                    <span className="text-coffee/50 text-sm font-bold">or</span>
                    <div className="flex-1 h-0.5 bg-coffee/30"></div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading || googleLoading}
                    className="group relative w-full rounded-md bg-coffee border-none p-0 cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center justify-center gap-3 w-full h-full rounded-md border-2 border-coffee px-2 py-3 font-bold text-lg text-coffee bg-white -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      {googleLoading ? "Loading..." : "Continue with Google"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate("/")}
            className="text-coffee font-bold hover:text-terracotta transition-colors text-sm"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
