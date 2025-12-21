import { useAuth } from "../hooks/useAuth";

export function UserStatusHeader() {
  const { user, signOut } = useAuth();

  const redirectLogin = () => {
    window.open("/auth?closeTab=true", "_blank");
  };

  return (
    <div>
      {user ? (
        <div className="flex gap-4 items-center">
          <div className="text-xs">
            Logged in on {user.user_metadata.username || user.email}
          </div>
          <button
            onClick={signOut}
            className="border-2 border-coffee bg-terracotta text-vanilla px-3 py-1 hover:bg-coffee transition-colors text-xs font-bold"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <button
          onClick={() => redirectLogin()}
          className="border-2 border-coffee bg-powder text-coffee px-3 py-1 hover:bg-coffee hover:text-vanilla transition-colors text-xs font-bold"
        >
          Log In
        </button>
      )}
    </div>
  );
}
