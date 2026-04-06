import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { User } from "../types";
import api from "../api/client";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );
  const [user, setUser] = useState<User | null>(null);

  // On mount: if we have a saved token, restore the user profile
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken && !user) {
      api
        .get("/api/v1/auth/me", {
          headers: { Authorization: `Bearer ${savedToken}` },
        })
        .then((res) => setUser(res.data))
        .catch(() => {
          // Token is invalid/expired — clear it
          localStorage.removeItem("token");
          setToken(null);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function login(newToken: string, newUser: User) {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
