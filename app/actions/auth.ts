"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  message?: string;
};

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function signup(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const firstName = field(formData, "firstName");
  const lastName = field(formData, "lastName");
  const email = field(formData, "email");
  const password = field(formData, "password");

  if (!firstName || !lastName || !email || !password) {
    return { message: "Fill in every field." };
  }

  if (password.length < 6) {
    return { message: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (error) {
    return { message: error.message };
  }

  if (data.user && data.user.identities?.length === 0) {
    return { message: "An account with this email already exists." };
  }

  if (!data.session) {
    return {
      message:
        "Account created, but Supabase did not start a session. Turn off Confirm email under Authentication → Sign In / Providers → Email, then log in.",
    };
  }

  redirect("/");
}

export async function login(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = field(formData, "email");
  const password = field(formData, "password");

  if (!email || !password) {
    return { message: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { message: error.message };
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
