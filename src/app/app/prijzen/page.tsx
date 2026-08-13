import { redirect } from "next/navigation";

/** HartMaatje is not a pricing-site. Send people home. */
export default function AppPrijzenRedirectPage() {
  redirect("/");
}
