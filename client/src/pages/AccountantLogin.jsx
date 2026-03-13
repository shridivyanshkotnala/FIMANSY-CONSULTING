// AccountantLogin.jsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield } from "lucide-react";

import { useLoginMutation, useMeQuery } from "@/Redux/Slices/api/authApi";

export default function AccountantLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [login, { isLoading }] = useLoginMutation();

  // If already authenticated, redirect straight to the accountant dashboard
  const { data: me, isLoading: checkingAuth } = useMeQuery();

  useEffect(() => {
    if (!checkingAuth && me) {
      navigate("/accountant/dashboard", { replace: true });
    }
  }, [checkingAuth, me, navigate]);

  /*
    LOGIN HANDLER
    - Authenticates via backend API (POST /api/user/login)
    - On success RTK Query invalidates "Auth" tag → /me refetches
    - Redirects to accountant dashboard
  */
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      await login({ email, password }).unwrap();

      // login succeeded – navigate to accountant dashboard
      navigate("/accountant/dashboard", { replace: true });
    } catch (err) {
      toast({
        title: "Login Failed",
        description:
          err?.data?.message || "Invalid email or password",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto p-3 rounded-xl bg-primary/10 w-fit">
            <Shield className="h-8 w-8 text-primary" />
          </div>

          <CardTitle className="text-2xl font-bold">
            Accountant Portal
          </CardTitle>

          <CardDescription>
            Sign in to your professional workspace
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleLogin}
            className="space-y-4"
          >
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="acc-email">Email</Label>
              <Input
                id="acc-email"
                type="email"
                required
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="accountant@firm.com"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="acc-password">
                Password
              </Label>
              <Input
                id="acc-password"
                type="password"
                required
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="••••••••"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}