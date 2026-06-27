"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Mail, Lock, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/hooks/use-auth";

export default function LoginPage() {
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  function validate(): boolean {
    const errors: typeof fieldErrors = {};
    if (!email.trim()) {
      errors.email = "L'email est requis.";
    } else if (!/^[\w.]+@[\w]+\.[a-z]{2,}$/i.test(email.trim())) {
      errors.email = "Format d'email invalide.";
    }
    if (!password) {
      errors.password = "Le mot de passe est requis.";
    } else if (password.length < 8) {
      errors.password = "Minimum 8 caractères.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    if (!validate()) return;
    login({ email: email.trim(), password });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex size-20 items-center justify-center rounded-2xl bg-primary-100">
            <Sparkles className="size-9 text-primary-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-primary-700">VirtuFit</h1>
          <p className="mt-2 text-text-secondary">Essayez avant d&apos;acheter</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border bg-surface p-8 shadow-sm"
        >
          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-danger">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Adresse email"
              type="email"
              placeholder="vous@exemple.com"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              autoComplete="email"
            />
            <Input
              label="Mot de passe"
              icon={Lock}
              isPassword
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              autoComplete="current-password"
            />
          </div>

          <div className="mt-3 flex justify-end">
            <Link
              href="#"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <Button type="submit" className="mt-6 w-full" isLoading={isLoading}>
            Se connecter
          </Button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-sm text-text-muted">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Link href="/register">
            <Button type="button" variant="outline" className="w-full">
              Créer un compte
            </Button>
          </Link>
        </form>
      </div>
    </div>
  );
}