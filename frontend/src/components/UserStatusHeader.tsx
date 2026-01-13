import { useAuth } from "../hooks/useAuth";

export function UserStatusHeader() {
  const { user, signOut } = useAuth();

  const redirectLogin = () => {
    window.open("/auth?closeTab=true", "_blank");
  };

  return (
    <div>
      {user ? (
        <div className="flex gap-2 sm:gap-4 items-center">
          <div className="text-xs hidden sm:block">
            Logged in on {user.user_metadata.username || user.email}
          </div>
          <button
            onClick={signOut}
            className="rounded-md group relative bg-coffee border-none p-0 cursor-pointer outline-none"
          >
            <span className="rounded-md block w-full h-full border-2 border-coffee px-2 sm:px-3 py-1 font-bold text-vanilla bg-terracotta text-xs -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0">
              Sign Out
            </span>
          </button>
        </div>
      ) : (
        <button
          onClick={() => redirectLogin()}
          className="rounded-md group relative bg-coffee border-none p-0 cursor-pointer outline-none"
        >
          <span className="rounded-md block w-full h-full border-2 border-coffee px-2 sm:px-3 py-1 font-bold text-coffee bg-powder text-xs -translate-y-[0.05rem] transition-transform duration-100 ease-out group-hover:-translate-y-[0.175rem] group-active:translate-y-0">
            Log In
          </span>
        </button>
      )}
    </div>
  );
}
