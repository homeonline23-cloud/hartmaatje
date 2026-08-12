import { redirect } from "next/navigation";

// HartMaatje no longer uses cookies or any tracking — see the Privacy page.
export default function CookiesPage() {
  redirect("/privacy");
}
