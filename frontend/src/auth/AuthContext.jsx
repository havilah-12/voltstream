import { createContext, useContext, useMemo, useState } from "react";

const AUTH_STORAGE_KEY = "voltstream_user";
const TOUR_PAGES = ["/", "/analytics", "/devices", "/billing", "/chat"];
const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const storedUser = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const auth = useMemo(() => {
    const saveUser = (nextUser) => {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
    };

    const updateSeenTours = (path) => {
      if (!user) return;
      const seenTours = { ...(user.seenTours ?? {}), [path]: true };
      const hasFinishedAllTours = TOUR_PAGES.every((tourPath) => seenTours[tourPath]);
      saveUser({
        ...user,
        seenTours,
        hasSeenIntro: hasFinishedAllTours,
        tourPending: !hasFinishedAllTours,
      });
    };

    return {
      user,
      isAuthenticated: Boolean(user),
      login: ({ email }) => {
        const nextUser = {
          name: email.split("@")[0] || "Prosumer",
          email,
          hasSeenIntro: true,
          tourPending: false,
        };
        saveUser(nextUser);
      },
      signup: ({ name, email }) => {
        const nextUser = {
          name: name || email.split("@")[0] || "Prosumer",
          email,
          hasSeenIntro: false,
          tourPending: true,
          tourDismissed: false,
          seenTours: {},
        };
        saveUser(nextUser);
      },
      completeIntro: () => {
        if (!user) return;
        saveUser({ ...user, hasSeenIntro: true });
      },
      completePageTour: (path) => {
        updateSeenTours(path);
      },
      dismissTour: (path) => {
        updateSeenTours(path);
      },
      logout: () => {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        setUser(null);
      },
    };
  }, [user]);

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside AuthProvider");
  return auth;
}
