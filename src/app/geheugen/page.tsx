import { redirect } from "next/navigation";

/** Old Overzicht / geheugen route → Bioscoop Kamer */
export default function GeheugenRedirectPage() {
  redirect("/bioscoop");
}
