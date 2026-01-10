import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export function UsernameModal() {
  const { needsUsername, setUsernameForOAuth } = useAuth();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!needsUsername) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!username.trim()) {
      setError("Username is required");
      setLoading(false);
      return;
    }

    if (username.trim().length < 2) {
      setError("Username must be at least 2 characters");
      setLoading(false);
      return;
    }

    const { error } = await setUsernameForOAuth(username.trim());

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md">
        <div className="w-full border-2 border-coffee bg-vanilla p-8 rounded-[10px] shadow-[inset_0_0_0_3px_var(--color-powder),0_0_10px_rgba(0,0,0,0.2)] flex flex-col items-center justify-center gap-5">
          <h2 className="text-2xl font-bold text-coffee">Choose Your Username</h2>
          <p className="text-coffee/70 text-center text-sm">
            Welcome! Please choose a username to complete your account setup.
          </p>
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              maxLength={15}
              autoFocus
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
  );
}
