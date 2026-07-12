import { redirect } from "next/navigation";

/** Oude /app-link — alles staat nu op de homepage. */
export default function AppRedirectPage() {
  redirect("/");
}
