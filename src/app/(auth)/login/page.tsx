"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { AnimatedLogo } from "@/components/shared/animated-logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        setError("Email není potvrzen. Zkontrolujte schránku nebo potvrďte ručně v Supabase.");
      } else if (error.message.includes("Invalid login credentials")) {
        setError("Nesprávný email nebo heslo.");
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex">
      {/* ═══════════ LEFT — BRANDING ═══════════ */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
           style={{ background: "#0B1414" }}>

        {/* Base gradient layer */}
        <div className="absolute inset-0"
             style={{
               background: "radial-gradient(ellipse at top left, #102A2B 0%, #0B1414 60%)",
             }} />

        {/* Animated gradient orbs (parallax blobs) */}
        <div className="absolute top-[15%] left-[10%] size-[420px] rounded-full opacity-40 blur-3xl animate-blob-slow"
             style={{ background: "radial-gradient(circle, #00818E 0%, transparent 70%)" }} />
        <div className="absolute bottom-[10%] right-[5%] size-[360px] rounded-full opacity-30 blur-3xl animate-blob-slow-reverse"
             style={{ background: "radial-gradient(circle, #FFAD00 0%, transparent 70%)" }} />
        <div className="absolute top-[40%] right-[20%] size-[280px] rounded-full opacity-20 blur-3xl animate-blob-slow"
             style={{ background: "radial-gradient(circle, #00A3B3 0%, transparent 70%)", animationDelay: "3s" }} />

        {/* Animated grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
             style={{
               backgroundImage: `linear-gradient(#00A3B3 1px, transparent 1px),
                                 linear-gradient(90deg, #00A3B3 1px, transparent 1px)`,
               backgroundSize: "60px 60px",
             }} />

        {/* Floating dots (particles) */}
        <div className="absolute inset-0">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute size-1 rounded-full bg-lagoon/40 animate-float"
              style={{
                left: `${(i * 83) % 100}%`,
                top: `${(i * 127) % 100}%`,
                animationDelay: `${i * 0.8}s`,
                animationDuration: `${8 + (i % 4) * 2}s`,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-12">
          {/* Animated Logo */}
          <div className="mb-10 animate-fade-in-up">
            <AnimatedLogo size={200} className="drop-shadow-2xl" />
          </div>

          {/* Title with gradient accent */}
          <h1 className="text-5xl font-bold text-white mb-3 tracking-tight animate-fade-in-up"
              style={{ animationDelay: "0.2s" }}>
            RehaGym{" "}
            <span className="bg-gradient-to-r from-orange-300 to-orange bg-clip-text text-transparent">
              ONE
            </span>
          </h1>

          {/* Tagline */}
          <p className="text-white/70 text-base italic tracking-wide mb-2 animate-fade-in-up"
             style={{ animationDelay: "0.4s" }}>
            s respektem k pohybu a zdraví
          </p>

          {/* Decorative line */}
          <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-lagoon to-transparent my-6 animate-fade-in-up"
               style={{ animationDelay: "0.5s" }} />

          {/* Description */}
          <div className="max-w-md animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
            <p className="text-white/50 text-sm leading-relaxed">
              Integrovaný provozní systém pro správu klientů, rezervací,
              zdravotních záznamů a financí.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-8 animate-fade-in-up"
               style={{ animationDelay: "0.8s" }}>
            {["CRM", "Rezervace", "Zdraví", "Finance", "Vedení"].map((tag, i) => (
              <span
                key={tag}
                className="px-3 py-1 text-xs rounded-full border border-lagoon/30 text-lagoon/80 bg-lagoon/5 backdrop-blur-sm"
                style={{ animationDelay: `${0.9 + i * 0.1}s` }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom brand strip */}
        <div className="absolute bottom-6 left-0 right-0 text-center text-white/30 text-[11px] tracking-wider">
          REHABILITACE · FITNESS · ZDRAVÍ
        </div>
      </div>

      {/* ═══════════ RIGHT — LOGIN FORM ═══════════ */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-muted/30 to-muted/5 relative">
        {/* Mobile: subtle gradient background */}
        <div className="absolute inset-0 lg:hidden"
             style={{
               background: "radial-gradient(ellipse at top, rgba(0,129,142,0.05) 0%, transparent 60%)",
             }} />

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

          <Card className="border-0 shadow-2xl shadow-primary/5 backdrop-blur-sm bg-card/95 animate-fade-in-up"
                style={{ animationDelay: "0.1s" }}>
            <CardContent className="pt-10 pb-10 px-10">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Přihlášení</h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Vítejte zpět. Zadejte své přihlašovací údaje.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="vas@email.cz"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Heslo
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
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

                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 animate-shake">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 font-semibold text-base bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all shadow-lg shadow-primary/20"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Přihlašování...
                    </>
                  ) : (
                    "Přihlásit se"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <a
                  href="/forgot-password"
                  className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Zapomenuté heslo?
                </a>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-8 animate-fade-in-up"
             style={{ animationDelay: "0.3s" }}>
            &copy; {new Date().getFullYear()} RehaGym s.r.o. &middot; Všechna práva vyhrazena
          </p>
        </div>
      </div>
    </div>
  );
}
