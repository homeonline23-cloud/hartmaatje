import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { GesprekContent } from "@/components/GesprekContent";
import { companions, type CompanionId } from "@/lib/companions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function GesprekPage({ params }: Props) {
  const { id } = await params;
  const companion = companions.find((c) => c.id === id);
  if (!companion) notFound();

  return (
    <AppShell>
      <GesprekContent
        companionId={companion.id as CompanionId}
        companionName={companion.name}
        portrait={companion.portrait}
      />
    </AppShell>
  );
}

export function generateStaticParams() {
  return companions.map((c) => ({ id: c.id }));
}
