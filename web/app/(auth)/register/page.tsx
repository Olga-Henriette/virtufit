"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Badge,
  ArrowLeft,
  AlertCircle,
  UserCircle,
  Store,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/hooks/use-auth";
import { cn } from "@/lib/utils/cn";
import type { UserRole } from "@/lib/types";

const roles: { value: UserRole; label: string; icon: typeof UserCircle }[] = [
  { value: "client", label: "Client", icon: UserCircle },
  { value: "vendeur", label: "Vendeur", icon: Store },
  { value: "styliste", label: "Styliste", icon: Palette },
];

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("client");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  function validate(): boolean {
    const errors: FormErrors = {};
    if (!firstName.trim()) errors.firstName = "Requis";
    if (!lastName.trim()) errors.lastName = "Requis";

    if (!email.trim()) {
      errors.email = "L'email est requis.";
    } else if (!/^[\w.]+@[\w]+\.[a-z]{2,}$/i.test(email.trim())) {
      errors.email = "Format invalide.";
    }

    if (!password) {
      errors.password = "Requis.";
    } else if (password.length < 8) {
      errors.password = "Minimum 8 caractères.";
    } else if (!/(?=.*[A-Z])/.test(password)) {
      errors.password = "Au moins une majuscule.";
    } else if (!/(?=.*[0-9])/.test(password)) {
      errors.password = "Au moins un chiffre.";
    }

    if (confirmPassword !== password) {
      errors.confirmPassword = "Les mots de passe ne correspondent pas.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    if (!validate()) return;
    register({
      email: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4 py-10">
      <div className="w-full max-w-md">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="size-4" />
          Retour
        </button>

        <h1 className="mb-6 text-2xl font-bold text-text-primary">
          Créer un compte
        </h1>

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

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Prénom"
              icon={Badge}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              error={fieldErrors.firstName}
            />
            <Input
              label="Nom"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              error={fieldErrors.lastName}
            />
          </div>

          <div className="mt-4 space-y-4">
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
              autoComplete="new-password"
            />
            <Input
              label="Confirmer le mot de passe"
              icon={Lock}
              isPassword
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={fieldErrors.confirmPassword}
              autoComplete="new-password"
            />
          </div>

          <div className="mt-6">
            <p className="mb-2.5 text-sm font-medium text-text-primary">Je suis…</p>
            <div className="grid grid-cols-3 gap-2">
              {roles.map(({ value, label, icon: Icon }) => {
                const selected = role === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-md border-2 py-3 text-xs font-medium transition-colors",
                      selected
                        ? "border-primary-600 bg-primary-50 text-primary-700"
                        : "border-border bg-surface text-text-secondary hover:bg-surface-muted",
                    )}
                  >
                    <Icon className="size-5" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <Button type="submit" className="mt-6 w-full" isLoading={isLoading}>
            Créer mon compte
          </Button>

          <p className="mt-5 text-center text-sm text-text-secondary">
            Déjà un compte ?{" "}
            <Link href="/login" className="font-semibold text-primary-600 hover:text-primary-700">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}