"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";

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
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-turquoise-dark items-center justify-center overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-turquoise-dark via-turquoise to-lagoon-dark opacity-90" />
        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `radial-gradient(circle at 25% 50%, rgba(0,129,142,0.3) 0%, transparent 50%),
                           radial-gradient(circle at 75% 50%, rgba(255,173,0,0.2) 0%, transparent 50%)`
        }} />

        <div className="relative z-10 flex flex-col items-center text-center px-12">
          <Image
            src="/rehagym-logo.png"
            alt="RehaGym"
            width={180}
            height={180}
            className="mb-8 drop-shadow-2xl"
            priority
          />
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            RehaGym <span className="text-orange">ONE</span>
          </h1>
          <p className="text-white/60 text-sm italic tracking-wide">
            s respektem k pohybu a zdraví
          </p>
          <div className="mt-12 max-w-sm">
            <p className="text-white/40 text-xs leading-relaxed">
              Integrovaný provozní systém pro správu klientů, rezervací, zdravotních záznamů a financí.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-muted/30">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <Image
              src="/rehagym-logo.png"
              alt="RehaGym"
              width={80}
              height={80}
              className="mb-4"
              priority
            />
            <h1 className="text-xl font-bold">
              RehaGym <span className="text-primary">ONE</span>
            </h1>
          </div>

          <Card className="border-0 shadow-xl shadow-black/5">
            <CardContent className="pt-8 pb-8 px-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground">Přihlášení</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Zadejte své přihlašovací údaje
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
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
                    className="h-10"
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
                      className="h-10 pr-10"
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
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-10 font-semibold"
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
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Zapomenuté heslo?
                </a>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            &copy; {new Date().getFullYear()} RehaGym s.r.o. &middot; Všechna práva vyhrazena
          </p>
        </div>
      </div>
    </div>
  );
}
