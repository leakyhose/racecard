import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Confirm() {
  useEffect(() => {
    document.title = "Email Confirmed";
  }, []);

  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const redirectSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-light-vanilla text-coffee font-executive p-4">
      {user && (
        <div className="absolute top-4 right-4 flex items-center gap-4 border-2 border-coffee bg-vanilla px-4 py-2">
          <span className="text-sm">
            Signed in as: <span className="font-bold">{user.email}</span>
          </span>
          <button
            onClick={redirectSignOut}
            className="border-2 border-coffee bg-terracotta text-vanilla px-3 py-1 hover:bg-coffee transition-colors text-xs font-bold"
          >
            Sign Out
          </button>
        </div>
      )}
      <div className="w-full max-w-md border-3 border-coffee p-12 bg-vanilla shadow-[8px_8px_0px_0px_#644536]">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">✓</div>
          <h1 className="text-3xl tracking-widest font-bold mb-2">
            Email Confirmed
          </h1>
          <p className="text-coffee/70 mt-4">Your account is ready to use</p>
        </div>

        <button
          className="w-full border-3 border-coffee bg-powder text-coffee px-6 py-3 hover:bg-coffee hover:text-vanilla transition-colors font-bold tracking-wider"
          onClick={() => navigate("/")}
        >
          Continue to Home
        </button>
      </div>
    </div>
  );
}
