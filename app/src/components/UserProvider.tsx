"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

interface UserContextType {
  userId: string | null;
  currentModule: string | null;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  userId: null,
  currentModule: null,
  loading: true,
});

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [currentModule, setCurrentModule] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initUser() {
      try {
        // Check localStorage for existing user
        const storedUserId = localStorage.getItem("fd_user_id");

        const res = await fetch("/api/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: storedUserId }),
        });

        const data = await res.json();
        localStorage.setItem("fd_user_id", data.userId);
        setUserId(data.userId);
        setCurrentModule(data.currentModule);
      } catch (error) {
        console.error("Failed to initialize user:", error);
      } finally {
        setLoading(false);
      }
    }

    initUser();
  }, []);

  return (
    <UserContext.Provider value={{ userId, currentModule, loading }}>
      {children}
    </UserContext.Provider>
  );
}
