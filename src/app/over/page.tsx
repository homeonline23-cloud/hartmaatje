import { redirect } from "next/navigation";

/** Old starter About page → the real HartMaatje Over page. */
export default function OverRedirectPage() {
  redirect("/app/over");
}
