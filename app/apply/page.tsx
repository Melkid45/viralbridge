import type { Metadata } from "next";
import ApplyBlock from "../_components/_sections/ApplyBlock/ApplyBlock";

export const metadata: Metadata = {
  title: "Company application — Viral Bridge",
  description: "Tell us enough to understand the business and start your company scan.",
};

export default function ApplyPage() {
  return <ApplyBlock />;
}
