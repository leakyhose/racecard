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
    <div className="min-h-screen flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md border-3 border-coffee bg-vanilla p-8 shadow-[8px_8px_0px_0px_#644536]">
        <h1 className="text-4xl font-bold text-coffee mb-8 text-center tracking-widest">
          {isLogin ? "Login" : "Sign Up"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div>
              <label className="block text-coffee font-bold mb-2 text-sm">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                maxLength={15}
                className="w-full px-4 py-3 border-2 border-coffee bg-white/50 text-coffee focus:outline-none focus:bg-white font-bold select-text"
                placeholder="Username"
              />
            </div>
          )}

          <div>
            <label className="block text-coffee font-bold mb-2 text-sm">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-coffee bg-white/50 text-coffee focus:outline-none focus:bg-white font-bold select-text"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-coffee font-bold mb-2 text-sm">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border-2 border-coffee bg-white/50 text-coffee focus:outline-none focus:bg-white font-bold select-text"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 border-2 border-terracotta bg-terracotta/20 text-coffee font-bold text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 border-2 border-powder bg-powder/20 text-coffee font-bold text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-terracotta text-vanilla px-6 py-3 font-bold hover:bg-coffee transition-colors tracking-widest border-2 border-coffee shadow-[4px_4px_0px_0px_#644536] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : isLogin ? "Login" : "Sign Up"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setSuccess("");
            }}
            className="text-coffee font-bold hover:text-terracotta transition-colors text-sm"
          >
            {isLogin
              ? "Don't have an account? Sign Up"
              : "Already have an account? Login"}
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-coffee/70 font-bold hover:text-coffee transition-colors text-sm"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
