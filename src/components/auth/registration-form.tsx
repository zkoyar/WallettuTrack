"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { LoaderCircle, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";

export function RegistrationForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 12) {
      toast.error(t("Password must be at least 12 characters"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(t(data?.error ?? "Registration failed"));
        if (response.status === 403) router.refresh();
        return;
      }

      const signInResponse = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (signInResponse?.error) {
        toast.success(t("Account created. You can now sign in."));
        router.push("/login");
      } else {
        router.push("/onboarding");
        router.refresh();
      }
    } catch {
      toast.error(t("Connection error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Wallet className="size-6" />
        </div>
        <CardTitle className="text-xl">{t("Create your account")}</CardTitle>
        <CardDescription>
          {t("Set up the administrator for this installation")}
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{t("Name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={100}
              autoComplete="name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">{t("Email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">{t("Password")}</Label>
            <Input
              id="password"
              type="password"
              minLength={12}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              {t("Use at least 12 characters, preferably a long passphrase.")}
            </p>
          </div>
        </CardContent>
        <CardFooter className="mt-4 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <LoaderCircle className="animate-spin" />}
            {t("Register")}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t("Already have an account?")}{" "}
            <Link href="/login" className="font-medium underline underline-offset-4">
              {t("Sign in")}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
