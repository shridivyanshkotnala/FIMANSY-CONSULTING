import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import {
  useLoginMutation,
  useSignupMutation,
  useMeQuery,
} from "@/Redux/Slices/api/authApi";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Name must be at least 2 characters"),
});

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location?.state?.from?.pathname || "/";

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");

  const [login, { isLoading: loginLoading }] = useLoginMutation();
  const [signup, { isLoading: signupLoading }] = useSignupMutation();

  // Check if already logged in — do NOT block render; redirect via effect
  const { data: me, isLoading: checkingAuth } = useMeQuery();

  // redirect AFTER render once /me resolves
  useEffect(() => {
    if (!checkingAuth && me) {
      navigate(from, { replace: true });
    }
  }, [checkingAuth, me, from, navigate]);


  // ---------------- LOGIN ----------------
  const handleLogin = async (e) => {
    e.preventDefault();

    const result = loginSchema.safeParse({
      email: loginEmail,
      password: loginPassword,
    });

    if (!result.success) {
      toast({
        title: "Validation Error",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    try {
      await login({
        email: loginEmail,
        password: loginPassword,
      }).unwrap();

    } catch (err) {
      toast({
        title: "Login Failed",
        description: err?.data?.message || "Invalid email or password",
        variant: "destructive",
      });
    }
  };

  // ---------------- SIGNUP ----------------
  const handleSignup = async (e) => {
    e.preventDefault();

    const result = signupSchema.safeParse({
      email: signupEmail,
      password: signupPassword,
      fullName: signupName,
    });

    if (!result.success) {
      toast({
        title: "Validation Error",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    try {
      await signup({
        email: signupEmail,
        password: signupPassword,
        fullName: signupName,
      }).unwrap();

      toast({
        title: "Account Created",
        description: "Welcome! Your account has been created successfully.",
      });

    } catch (err) {
      toast({
        title: "Sign Up Failed",
        description: err?.data?.message || "Signup failed",
        variant: "destructive",
      });
    }
  };

  // ---------------- UI ----------------
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <span className="text-2xl font-bold text-primary-foreground font-serif">
              F
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground font-serif">
            Fimansy
          </h1>
          <p className="text-muted-foreground text-center">
            Financial Management Consulting
          </p>
        </div>

        <Card>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* LOGIN */}
            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardHeader>
                  <CardTitle>Welcome back</CardTitle>
                  <CardDescription>
                    Sign in to your account to continue
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col items-center gap-2 ">
                  <Button type="submit" className="w-full" disabled={loginLoading}>
                    {loginLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                  <div className="mt-6 w-full ">
                    <div className="relative ">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mt-4 "
                      onClick={() => {
                        window.location.href = "http://localhost:8800/auth/google";
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 48 48"
                        className="w-5 h-5 mr-2"
                      >
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.34 1.22 8.27 2.26l6.16-6.16C34.64 2.02 29.76 0 24 0 14.64 0 6.4 5.64 2.44 13.84l7.4 5.74C11.76 13.1 17.38 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.5 24.5c0-1.64-.15-3.21-.43-4.74H24v9h12.74c-.55 2.97-2.2 5.48-4.69 7.18l7.2 5.6C43.94 37.36 46.5 31.43 46.5 24.5z" />
                        <path fill="#FBBC05" d="M9.84 28.58A14.5 14.5 0 019.5 24c0-1.6.27-3.14.74-4.58l-7.4-5.74A23.93 23.93 0 000 24c0 3.87.93 7.52 2.58 10.68l7.26-6.1z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.14 15.9-5.82l-7.2-5.6c-2 1.34-4.57 2.13-8.7 2.13-6.62 0-12.24-3.6-14.16-8.84l-7.26 6.1C6.4 42.36 14.64 48 24 48z" />
                      </svg>
                      Continue with Google
                    </Button>
                  </div>

                </CardFooter>
              </form>
            </TabsContent>

            {/* SIGNUP */}
            <TabsContent value="signup">
              <form onSubmit={handleSignup}>
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>
                    Get started with financial management
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      type="text"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col items-center gap-2">
                  <Button type="submit" className="w-full" disabled={signupLoading}>
                    {signupLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                  <div className="mt-6">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => {
                        window.location.href = "http://localhost:8800/auth/google";
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 48 48"
                        className="w-5 h-5 mr-2"
                      >
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.34 1.22 8.27 2.26l6.16-6.16C34.64 2.02 29.76 0 24 0 14.64 0 6.4 5.64 2.44 13.84l7.4 5.74C11.76 13.1 17.38 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.5 24.5c0-1.64-.15-3.21-.43-4.74H24v9h12.74c-.55 2.97-2.2 5.48-4.69 7.18l7.2 5.6C43.94 37.36 46.5 31.43 46.5 24.5z" />
                        <path fill="#FBBC05" d="M9.84 28.58A14.5 14.5 0 019.5 24c0-1.6.27-3.14.74-4.58l-7.4-5.74A23.93 23.93 0 000 24c0 3.87.93 7.52 2.58 10.68l7.26-6.1z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.14 15.9-5.82l-7.2-5.6c-2 1.34-4.57 2.13-8.7 2.13-6.62 0-12.24-3.6-14.16-8.84l-7.26 6.1C6.4 42.36 14.64 48 24 48z" />
                      </svg>
                      Continue with Google
                    </Button>
                  </div>

                </CardFooter>
              </form>
            </TabsContent>

          </Tabs>
        </Card>
      </div>
    </div>
  );
}
