"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type AuthState } from "@/app/actions/auth";

const initialState: AuthState = {};

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "login" ? login : signup;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "login" ? "Log in" : "Create an account"}
        </h1>
        <p className="mt-2 text-sm text-black/60">
          {mode === "login" ? (
            <>
              New here?{" "}
              <Link href="/signup" className="font-medium text-foreground underline">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-foreground underline">
                Log in
              </Link>
            </>
          )}
        </p>

        <form action={formAction} className="mt-8 flex flex-col gap-4">
          {mode === "signup" && (
            <>
              <Field label="First name" name="firstName" autoComplete="given-name" />
              <Field label="Last name" name="lastName" autoComplete="family-name" />
            </>
          )}
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />

          {state.message && (
            <p className="text-sm text-red-600" role="alert">
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 h-11 rounded-full bg-accent px-5 text-sm font-medium text-black disabled:opacity-60"
          >
            {pending
              ? "Please wait…"
              : mode === "login"
                ? "Log in"
                : "Sign up"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        className="h-11 rounded-lg border border-black/15 bg-white px-3 font-normal outline-none focus:border-accent"
      />
    </label>
  );
}
