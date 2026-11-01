import type { Metadata } from "next";
import { AuthForm } from "@/components/site/AuthForm";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
