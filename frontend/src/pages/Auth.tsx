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
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const closeTab = searchParams.get("closeTab") === "true";

  // Set page title
  useEffect(() => {
    document.title = "RaceCard";
  }, []);

  // Redirect if already logged in
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
      // Successful login with closeTab flag - close the window
      window.close();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden relative gap-6 select-none">
      {/* Main Content Column */}
      <div className="flex flex-col items-center w-full max-w-md z-10">
        {/* Title */}
        <h1 className="text-5xl md:text-6xl font-black text-coffee tracking-tighter mb-6 text-center">RaceCard</h1>

        {/* Toggle & Form Container */}
        <div className="w-full flex flex-col items-center space-y-6">
          {/* Toggle */}
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
              {/* Track */}
              <div className="w-14 h-6 bg-terracotta border-2 border-coffee rounded-[5px] shadow-[1px_1px_0px_0px_var(--color-coffee)] transition-colors duration-300 peer-checked:bg-powder box-border relative group">
                {/* Knob */}
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

          {/* Flipping Card Area */}
          <div className="w-full perspective-1000">
            <div className={`relative w-full transition-transform duration-700 transform-3d ${!isLogin ? 'rotate-y-180' : ''}`} style={{ minHeight: '380px' }}>
              
              {/* Front: Login */}
              <div className="absolute inset-0 backface-hidden w-full h-full">
                {/* Under Card */}
                <div className="shadow-[0_0_10px_rgba(0,0,0,0.2)] border-2 border-coffee absolute inset-0 rounded-[10px] bg-vanilla -z-10"></div>
                
                {/* Top Card */}
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
                      disabled={loading}
                      className="group relative w-full rounded-md bg-coffee border-none p-0 cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="block w-full h-full rounded-md border-2 border-coffee px-2 py-3 font-bold text-lg text-vanilla bg-terracotta -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0">
                        {loading ? "Loading..." : "Login"}
                      </span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Back: Sign Up */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 w-full h-full">
                {/* Under Card */}
                <div className="shadow-[0_0_10px_rgba(0,0,0,0.2)] border-2 border-coffee absolute inset-0 rounded-[10px] bg-vanilla -z-10"></div>
                
                {/* Top Card */}
                <div className="w-full h-full border-2 border-coffee bg-vanilla p-8 rounded-[10px] shadow-[inset_0_0_0_3px_var(--color-powder)] flex flex-col items-center justify-center gap-4">
                  <h2 className="text-2xl font-bold text-coffee">Create Account</h2>
                  <form onSubmit={handleSubmit} className="w-full space-y-3">
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
                      disabled={loading}
                      className="group relative w-full rounded-md bg-coffee border-none p-0 cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="block w-full h-full rounded-md border-2 border-coffee px-2 py-3 font-bold text-lg text-coffee bg-powder -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0">
                        {loading ? "Loading..." : "Sign Up"}
                      </span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Back to Home */}
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
