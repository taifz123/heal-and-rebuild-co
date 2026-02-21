import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Mail, Lock, Chrome } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const utils = trpc.useUtils();

  // Password login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // OTP state
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Auth config (which methods are available)
  const [authConfig, setAuthConfig] = useState<{
    methods: { password: boolean; google: boolean; emailOtp: boolean };
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/config")
      .then((r) => r.json())
      .then(setAuthConfig)
      .catch(() => {});
  }, []);

  // Show error from Google OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const error = params.get("error");
    if (error) {
      toast.error(decodeURIComponent(error));
    }
  }, [searchString]);

  // OTP countdown timer
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // ── Password Login ──────────────────────────────────────────────────
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Login failed");
        return;
      }
      await utils.auth.me.invalidate();
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // ── OTP Request ─────────────────────────────────────────────────────
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send code");
        return;
      }
      setOtpSent(true);
      setOtpCountdown(60);
      toast.success("Verification code sent to your email");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setOtpLoading(false);
    }
  };

  // ── OTP Verify ──────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: otpEmail, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Verification failed");
        return;
      }
      await utils.auth.me.invalidate();
      toast.success("Welcome!");
      navigate("/dashboard");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Google Login ────────────────────────────────────────────────────
  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-3xl font-bold tracking-tight cursor-pointer">
              HEAL & REBUILD CO
            </h1>
          </Link>
        </div>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-2xl font-light">Sign In</CardTitle>
            <CardDescription>
              Choose your preferred sign-in method
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google OAuth Button */}
            {authConfig?.methods.google && (
              <>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleGoogleLogin}
                >
                  <Chrome className="h-4 w-4" />
                  Continue with Google
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Tabs: Email OTP / Password */}
            <Tabs defaultValue="otp" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="otp" className="gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  Email Code
                </TabsTrigger>
                <TabsTrigger value="password" className="gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  Password
                </TabsTrigger>
              </TabsList>

              {/* ── Email OTP Tab ─────────────────────────────────────── */}
              <TabsContent value="otp" className="space-y-4 mt-4">
                {!otpSent ? (
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp-email">Email</Label>
                      <Input
                        id="otp-email"
                        type="email"
                        placeholder="you@example.com"
                        value={otpEmail}
                        onChange={(e) => setOtpEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={otpLoading}
                    >
                      {otpLoading ? "Sending..." : "Send Login Code"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      We'll send a 6-digit code to your email. No password
                      needed.
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp-code">Verification Code</Label>
                      <Input
                        id="otp-code"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="000000"
                        value={otpCode}
                        onChange={(e) =>
                          setOtpCode(e.target.value.replace(/\D/g, ""))
                        }
                        required
                        autoComplete="one-time-code"
                        className="text-center text-2xl tracking-[0.5em] font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the 6-digit code sent to{" "}
                        <strong>{otpEmail}</strong>
                      </p>
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={otpLoading || otpCode.length !== 6}
                    >
                      {otpLoading ? "Verifying..." : "Verify & Sign In"}
                    </Button>
                    <div className="flex items-center justify-between">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setOtpSent(false);
                          setOtpCode("");
                        }}
                      >
                        Change email
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={otpCountdown > 0 || otpLoading}
                        onClick={async () => {
                          setOtpLoading(true);
                          try {
                            const res = await fetch("/api/auth/otp/request", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({ email: otpEmail }),
                            });
                            const data = await res.json();
                            if (res.ok) {
                              setOtpCountdown(60);
                              setOtpCode("");
                              toast.success("New code sent");
                            } else {
                              toast.error(data.error || "Failed to resend");
                            }
                          } catch {
                            toast.error("Failed to resend code");
                          } finally {
                            setOtpLoading(false);
                          }
                        }}
                      >
                        {otpCountdown > 0
                          ? `Resend in ${otpCountdown}s`
                          : "Resend code"}
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>

              {/* ── Password Tab ──────────────────────────────────────── */}
              <TabsContent value="password" className="space-y-4 mt-4">
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="text-center text-sm text-muted-foreground pt-2">
              Don't have an account?{" "}
              <Link href="/register">
                <span className="text-foreground underline cursor-pointer hover:no-underline">
                  Create one
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
