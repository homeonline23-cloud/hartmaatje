import { AppShell } from "@/components/AppShell";
import { CompanionPicker } from "@/components/CompanionPicker";

/** Choose a companion — reached from the cover “Start gesprek” button. */
export default function MaatjesPage() {
  return (
    <AppShell compact>
      <CompanionPicker />
    </AppShell>
  );
}
