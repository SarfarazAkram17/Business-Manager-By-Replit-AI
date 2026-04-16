import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useGetMe, useLogin, useLogout, useRegister } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import type { User, LoginBody, RegisterBody } from "@workspace/api-client-react/src/generated/api.schemas";
import { useToast } from "@/hooks/use-toast";
import { QueryClient, useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null | undefined;
  isLoading: boolean;
  login: (data: LoginBody) => Promise<void>;
  register: (data: RegisterBody) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useGetMe({
    query: {
      retry: false,
    }
  });

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();

  const login = async (data: LoginBody) => {
    try {
      await loginMutation.mutateAsync({ data });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: err?.message || "Invalid credentials",
      });
      throw err;
    }
  };

  const register = async (data: RegisterBody) => {
    try {
      await registerMutation.mutateAsync({ data });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: err?.message || "Something went wrong",
      });
      throw err;
    }
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
      queryClient.setQueryData(["/api/auth/me"], null);
      setLocation("/login");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: err?.message || "Something went wrong",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
