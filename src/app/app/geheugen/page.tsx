"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getSupabase } from "@/lib/supabase";
import { AppPagePanel } from "@/components/AppPagePanel";
import { Card, ErrorBanner, PrimaryButton, TextField } from "@/components/ui";

type MemoryFact = {
  id: string;
  title: string | null;
  body: string;
  updated_at?: string | null;
};

export default function GeheugenPage() {
  const { session } = useAuth();
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const db = getSupabase();
    if (!db || !session?.user?.id) {
      setFacts([]);
      setLoadingList(false);
      return;
    }
    setLoadingList(true);
    const res = await db
      .from("memory_facts")
      .select("id,title,body,updated_at")
      .order("updated_at", { ascending: false });
    if (!res.error && res.data) setFacts(res.data as MemoryFact[]);
    setLoadingList(false);
  }, [session?.user?.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const cancelEdit = () => {
    setEditId(null);
    setDraftTitle("");
    setDraftBody("");
  };

  const onSaveDraft = async () => {
    const body = draftBody.trim();
    setError(null);
    if (!body) {
      setError("Schrijft u alstublieft wat ik mag onthouden.");
      return;
    }
    const db = getSupabase();
    if (!db || !session?.user?.id) {
      setError("Geheugen komt later — nu kunt u gewoon chatten via Gesprek.");
      return;
    }
    const titleTrim = draftTitle.trim() === "" ? null : draftTitle.trim();
    setBusy(true);
    if (editId) {
      const up = await db
        .from("memory_facts")
        .update({ title: titleTrim, body })
        .eq("id", editId)
        .eq("user_id", session.user.id);
      if (up.error) setError(up.error.message);
      else cancelEdit();
    } else {
      const ins = await db
        .from("memory_facts")
        .insert({ user_id: session.user.id, title: titleTrim, body });
      if (ins.error) setError(ins.error.message);
      else cancelEdit();
    }
    setBusy(false);
    await reload();
  };

  const onDelete = async (row: MemoryFact) => {
    if (
      !window.confirm(
        `"${(row.title ? `${row.title}: ` : "") + row.body}".slice(0, 80) wordt gewist. Doorgaan?`,
      )
    ) {
      return;
    }
    const db = getSupabase();
    if (!db || !session?.user?.id) return;
    await db
      .from("memory_facts")
      .delete()
      .eq("id", row.id)
      .eq("user_id", session.user.id);
    if (editId === row.id) cancelEdit();
    await reload();
  };

  return (
    <AppPagePanel
      title="Geheugen"
      intro="Hier bepaalt u wat HartMaatje van u mag onthouden. Zo voelen gesprekken vertrouwder aan. U kunt alles rustig aanpassen of wissen wanneer u wilt."
    >
      <Card>
        <h2 className="mb-3 text-xl font-semibold text-[#2c2416]">
          {editId ? "Herinnering wijzigen" : "Nieuwe herinnering"}
        </h2>
        <div className="space-y-4">
          <TextField
            label="Onderwerp (optioneel, bijv. Familie)"
            value={draftTitle}
            onChange={setDraftTitle}
          />
          <label className="block">
            <span className="mb-1 block text-lg font-medium text-[#2c2416]">
              Wat wilt u dat HartMaatje onthouden mag?
            </span>
            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-2xl border-2 border-[#d8ccb8] bg-white px-4 py-3 text-lg text-[#2c2416] focus:border-[#4a6741] focus:outline-none"
            />
          </label>
          <ErrorBanner message={error} />
          <PrimaryButton
            label={busy ? "Bezig…" : editId ? "Wijziging opslaan" : "Toevoegen"}
            disabled={busy}
            onClick={() => void onSaveDraft()}
          />
          {editId ? (
            <PrimaryButton
              label="Annuleer bewerking"
              variant="outline"
              onClick={cancelEdit}
              disabled={busy}
            />
          ) : null}
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-xl font-semibold text-[#2c2416] sm:text-2xl">
          Wat er nu wordt meegenomen ({facts.length})
        </h2>
        {loadingList ? (
          <p className="text-lg text-[#5c4a32] sm:text-xl">Laden…</p>
        ) : facts.length === 0 ? (
          <p className="text-lg text-[#5c4a32] sm:text-xl">
            U heeft nog niets toegevoegd. Schrijf hierboven iets op, zodat
            HartMaatje u beter leert kennen.
          </p>
        ) : (
          <div className="space-y-3">
            {facts.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border-2 border-[#d8ccb8] bg-white/90 p-4"
              >
                {item.title ? (
                  <p className="font-bold text-[#4a6741]">{item.title}</p>
                ) : null}
                <p className="mt-1 text-lg text-[#2c2416]">{item.body}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(item.id);
                      setDraftTitle(item.title ?? "");
                      setDraftBody(item.body);
                    }}
                    className="rounded-lg border-2 border-[#d8ccb8] px-4 py-2 font-medium text-[#4a6741]"
                  >
                    Wijzig
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDelete(item)}
                    className="rounded-lg border-2 border-red-300 px-4 py-2 font-medium text-red-700"
                  >
                    Wissen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppPagePanel>
  );
}
