"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { AnimatedLogo } from "@/components/shared/animated-logo";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Check if user arrived here with a valid recovery session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Heslo musí mít alespoň 6 znaků.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Hesla se neshodují.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    // Redirect to dashboard after 2s
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 2000);
  }

  return (
    <div className="min-h-screen flex">
      {/* Left branding */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{ background: "#0B1414" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at top left, #102A2B 0%, #0B1414 60%)",
          }}
        />
        <div
          className="absolute top-[15%] left-[10%] size-[420px] rounded-full opacity-40 blur-3xl animate-blob-slow"
          style={{
            background: "radial-gradient(circle, #00818E 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-[10%] right-[5%] size-[360px] rounded-full opacity-30 blur-3xl animate-blob-slow-reverse"
          style={{
            background: "radial-gradient(circle, #FFAD00 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 flex flex-col items-center text-center px-12">
          <div className="mb-10 animate-fade-in-up">
            <AnimatedLogo size={200} className="drop-shadow-2xl" />
          </div>
          <h1
            className="text-5xl font-bold text-white mb-3 tracking-tight animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            RehaGym{" "}
            <span className="bg-gradient-to-r from-orange-300 to-orange bg-clip-text text-transparent">
              ONE
            </span>
          </h1>
          <p
            className="text-white/70 text-base italic tracking-wide animate-fade-in-up"
            style={{ animationDelay: "0.4s" }}
          >
            s respektem k pohybu a zdraví
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-muted/30 to-muted/5 relative">
        <div className="w-full max-w-[420px] relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8 animate-fade-in-up">
            <AnimatedLogo size={100} className="mb-4" />
            <h1 className="text-2xl font-bold">
              RehaGym{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                ONE
              </span>
            </h1>
          </div>

          <Card
            className="border-0 shadow-2xl shadow-primary/5 backdrop-blur-sm bg-card/95 animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            <CardContent className="pt-10 pb-10 px-10">
              {success ? (
                <div className="text-center space-y-4">
                  <div className="mx-auto size-14 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="size-7 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground tracking-tight">
                      Heslo změněno
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2">
                      Přesměrovávám na dashboard...
                    </p>
                  </div>
                </div>
              ) : hasSession === false ? (
                <div className="text-center space-y-4">
                  <div className="mx-auto size-14 rounded-full bg-destructive/10 flex items-center justify-center">
                    <KeyRound className="size-7 text-destructive" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground tracking-tight">
                      Neplatný odkaz
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2">
                      Odkaz pro obnovení hesla vypršel nebo je neplatný.
                      Požádejte o nový.
                    </p>
                  </div>
                  <Link
                    href="/forgot-password"
                    className="inline-block text-sm text-primary hover:text-primary/80 transition-colors font-medium mt-4"
                  >
                    Vyžádat nový odkaz
                  </Link>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <div className="size-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <KeyRound className="size-5 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground tracking-tight">
                      Nové heslo
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1.5">
                      Zadejte nové heslo pro váš účet.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium">
                        Nové heslo
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          autoComplete="new-password"
                          className="h-11 pr-11 transition-all focus:ring-2 focus:ring-primary/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium">
                        Potvrzení hesla
                      </Label>
                      <Input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    {error && (
                      <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 animate-shake">
                        <p className="text-sm text-destructive">{error}</p>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11 font-semibold text-base bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all shadow-lg shadow-primary/20"
                      disabled={loading || hasSession === null}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Ukládám...
                        </>
                      ) : (
                        "Změnit heslo"
                      )}
                    </Button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
