"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { companions, type CompanionId } from "@/lib/companions";
import { STORIES, type StoryId } from "@/lib/stories";
import { getStoryText } from "@/lib/storyText";
import { APP_LANGS, type AppLang } from "@/i18n/config";
import { BackToSettingsLink } from "@/components/BackToSettingsLink";
import { useI18n } from "@/i18n/LanguageProvider";

type LangJobState = {
  status?: string;
  output_name?: string;
  error?: string;
};

type JobStatus = {
  id: string;
  status: "queued" | "running" | "done" | "error" | string;
  message?: string;
  error?: string;
  source_lang?: string;
  target_lang?: string;
  target_langs?: string[];
  languages?: Record<string, LangJobState>;
  companion?: string | null;
};

const LANG_LABEL: Record<AppLang, string> = {
  nl: "Nederlands",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
};

const PLAYABLE_STORIES = STORIES.filter((s) => s.playable);

function defaultTargets(source: AppLang): AppLang[] {
  return APP_LANGS.filter((l) => l !== source);
}

export function DubberKamer() {
  const { t, lang } = useI18n();
  const d = t.dubber;
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [sourceLang, setSourceLang] = useState<AppLang>("nl");
  const [targetLangs, setTargetLangs] = useState<AppLang[]>(() =>
    defaultTargets("nl")
  );
  const [companion, setCompanion] = useState<CompanionId | "">("maarten");
  const [job, setJob] = useState<JobStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [storyId, setStoryId] = useState<StoryId>(
    PLAYABLE_STORIES[0]?.id ?? "labyrinth-dreams-reality"
  );
  const [savingStory, setSavingStory] = useState(false);
  const [storyMsg, setStoryMsg] = useState<string | null>(null);
  const [installLang, setInstallLang] = useState<AppLang>("en");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/dubber/health")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setApiOk(Boolean(j?.ok));
      })
      .catch(() => {
        if (!cancelled) setApiOk(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!job?.id) return;
    if (job.status === "done" || job.status === "error") return;

    const timer = window.setInterval(() => {
      void fetch(`/api/dubber/jobs/${job.id}`)
        .then((r) => r.json())
        .then((j: JobStatus) => {
          if (j?.id) setJob(j);
        })
        .catch(() => undefined);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [job?.id, job?.status]);

  const toggleTarget = (code: AppLang) => {
    setTargetLangs((prev) => {
      if (prev.includes(code)) {
        return prev.filter((x) => x !== code);
      }
      return [...prev, code];
    });
  };

  const start = async () => {
    setError(null);
    setStoryMsg(null);
    if (!file) {
      setError(d.needFile);
      return;
    }
    const targets = targetLangs.filter((l) => l !== sourceLang);
    if (targets.length === 0) {
      setError(d.needDifferentLang);
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("source_lang", sourceLang);
      form.append("target_langs", targets.join(","));
      if (companion) form.append("companion", companion);

      const res = await fetch("/api/dubber/jobs", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.detail === "string" ? data.detail : d.startFailed
        );
      }
      setJob(data as JobStatus);
      const firstDone = (data as JobStatus).target_langs?.[0] as AppLang | undefined;
      if (firstDone) setInstallLang(firstDone);
    } catch (err) {
      setError(err instanceof Error ? err.message : d.startFailed);
    } finally {
      setBusy(false);
    }
  };

  const saveForStories = async () => {
    if (!job?.id) return;
    const voice = companion || (job.companion as CompanionId | null);
    if (!voice) {
      setStoryMsg(d.saveStoryFail);
      return;
    }
    const langState = job.languages?.[installLang];
    if (langState?.status !== "done") {
      setStoryMsg(d.saveStoryFail);
      return;
    }
    setSavingStory(true);
    setStoryMsg(null);
    try {
      const form = new FormData();
      form.append("story_id", storyId);
      form.append("companion", voice);
      form.append("lang", installLang);
      const res = await fetch(`/api/dubber/jobs/${job.id}/install-story`, {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || d.saveStoryFail);
      }
      setStoryMsg(data?.message || d.saveStoryOk);
    } catch (err) {
      setStoryMsg(err instanceof Error ? err.message : d.saveStoryFail);
    } finally {
      setSavingStory(false);
    }
  };

  const working =
    busy || job?.status === "queued" || job?.status === "running";

  const finishedLangs = (job?.target_langs || []).filter(
    (code) => job?.languages?.[code]?.status === "done"
  );

  return (
    <div className="hm-card mx-auto w-full max-w-3xl overflow-hidden">
      <div className="border-b border-[#e8dfd0]/55 px-4 py-3">
        <header className="relative flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 text-center">
            <h2 className="text-xl font-bold leading-tight text-[#3f6339] sm:text-2xl">
              {d.title}
            </h2>
            <p className="mt-1 text-sm font-medium leading-snug text-[#3f6339] sm:text-base">
              {d.subtitle}
            </p>
          </div>
          <div className="shrink-0">
            <BackToSettingsLink />
          </div>
        </header>
        {apiOk === false ? (
          <p className="mt-2 text-sm font-semibold text-red-700">{d.offline}</p>
        ) : null}
        {apiOk === true ? (
          <p className="mt-2 text-sm font-semibold text-[#3f6339]">{d.online}</p>
        ) : null}
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        <label className="block">
          <span className="mb-1 block text-base font-bold text-[#3f6339]">
            {d.pickVideo}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm,.mkv"
            className="block w-full text-base text-[#3f6339] file:mr-3 file:rounded-xl file:border-0 file:bg-[#3f6339] file:px-4 file:py-2.5 file:text-base file:font-bold file:text-white"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setJob(null);
              setError(null);
              setStoryMsg(null);
            }}
            disabled={working}
          />
          {file ? (
            <p className="mt-1 text-sm text-[#3f6339]/80">
              {file.name} ({Math.max(1, Math.round(file.size / (1024 * 1024)))}{" "}
              MB)
            </p>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-1 block text-base font-bold text-[#3f6339]">
            {d.sourceLang}
          </span>
          <select
            className="w-full rounded-xl border-2 border-[#e8dfd0] bg-white px-3 py-2.5 text-base font-semibold text-[#3f6339]"
            value={sourceLang}
            disabled={working}
            onChange={(e) => {
              const next = e.target.value as AppLang;
              setSourceLang(next);
              setTargetLangs(defaultTargets(next));
            }}
          >
            {APP_LANGS.map((code) => (
              <option key={code} value={code}>
                {LANG_LABEL[code]}
              </option>
            ))}
          </select>
        </label>

        <fieldset disabled={working}>
          <legend className="mb-1 text-base font-bold text-[#3f6339]">
            {d.targetLang}
          </legend>
          <p className="mb-2 text-sm text-[#3f6339]/85">{d.targetLangsHint}</p>
          <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setTargetLangs(defaultTargets(sourceLang))}
              className="shrink-0 rounded-full border-2 border-[#3f6339] bg-[#3f6339] px-2.5 py-1.5 text-sm font-bold text-white sm:px-3 sm:text-base"
            >
              {d.selectAllTargets}
            </button>
            {APP_LANGS.filter((code) => code !== sourceLang).map((code) => {
              const on = targetLangs.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleTarget(code)}
                  className={`shrink-0 rounded-full border-2 px-2.5 py-1.5 text-sm font-bold sm:px-3 sm:text-base ${
                    on
                      ? "border-[#3f6339] bg-[#3f6339] text-white"
                      : "border-[#e8dfd0] bg-white text-[#3f6339]"
                  }`}
                >
                  {LANG_LABEL[code]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset disabled={working}>
          <legend className="mb-2 text-base font-bold text-[#3f6339]">
            {d.pickCompanion}
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setCompanion("")}
              className={`rounded-xl border-2 px-2 py-2 text-sm font-bold sm:text-base ${
                companion === ""
                  ? "border-[#3f6339] bg-[#3f6339] text-white"
                  : "border-[#e8dfd0] bg-white/80 text-[#3f6339]"
              }`}
            >
              {d.autoVoice}
            </button>
            {companions.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCompanion(c.id)}
                className={`rounded-xl border-2 px-2 py-2 text-sm font-bold sm:text-base ${
                  companion === c.id
                    ? "border-[#3f6339] bg-[#3f6339] text-white"
                    : "border-[#e8dfd0] bg-white/80 text-[#3f6339]"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          disabled={working || apiOk === false}
          onClick={() => void start()}
          className="hm-dark w-full rounded-xl px-4 py-3 text-lg font-bold shadow-md transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
        >
          {working ? d.working : d.start}
        </button>

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-base font-semibold text-red-800">
            {error}
          </p>
        ) : null}

        {job ? (
          <div className="rounded-xl border-2 border-[#e8dfd0] bg-white/70 px-3 py-3">
            <p className="text-base font-bold text-[#3f6339]">
              {job.status === "done"
                ? d.statusDone
                : job.status === "error"
                  ? d.statusError
                  : job.status === "running"
                    ? d.statusRunning
                    : d.statusQueued}
            </p>
            <p className="mt-1 text-sm text-[#3f6339]/90">
              {job.message || ""}
            </p>
            {job.error ? (
              <p className="mt-2 text-sm text-red-700">{job.error}</p>
            ) : null}

            {(job.target_langs || []).length > 0 ? (
              <ul className="mt-3 space-y-2">
                {(job.target_langs || []).map((code) => {
                  const st = job.languages?.[code]?.status || "queued";
                  const ready = st === "done";
                  return (
                    <li
                      key={code}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e8dfd0] bg-white px-3 py-2"
                    >
                      <span className="text-base font-bold text-[#3f6339]">
                        {LANG_LABEL[code as AppLang] || code.toUpperCase()}
                        <span className="ml-2 text-sm font-semibold opacity-70">
                          {st}
                        </span>
                      </span>
                      {ready ? (
                        <a
                          href={`/api/dubber/jobs/${job.id}/download?lang=${code}`}
                          className="rounded-xl bg-[#3f6339] px-3 py-1.5 text-sm font-bold text-white"
                        >
                          {d.download}
                        </a>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {finishedLangs.length > 0 ? (
              <div className="mt-4 border-t border-[#e8dfd0] pt-3">
                <p className="text-base font-bold text-[#3f6339]">
                  {d.saveStoryTitle}
                </p>
                <label className="mt-2 block">
                  <span className="mb-1 block text-sm font-semibold text-[#3f6339]">
                    {d.saveStoryPick}
                  </span>
                  <select
                    className="w-full rounded-xl border-2 border-[#e8dfd0] bg-white px-3 py-2.5 text-base font-semibold text-[#3f6339]"
                    value={storyId}
                    onChange={(e) => setStoryId(e.target.value as StoryId)}
                  >
                    {PLAYABLE_STORIES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-2 block">
                  <span className="mb-1 block text-sm font-semibold text-[#3f6339]">
                    {d.targetLang}
                  </span>
                  <select
                    className="w-full rounded-xl border-2 border-[#e8dfd0] bg-white px-3 py-2.5 text-base font-semibold text-[#3f6339]"
                    value={installLang}
                    onChange={(e) => setInstallLang(e.target.value as AppLang)}
                  >
                    {finishedLangs.map((code) => (
                      <option key={code} value={code}>
                        {LANG_LABEL[code as AppLang] || code}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={savingStory || (!companion && !job.companion)}
                  onClick={() => void saveForStories()}
                  className="mt-3 w-full rounded-xl border-2 border-[#3f6339] bg-white px-4 py-3 text-lg font-bold text-[#3f6339] transition hover:bg-[#3f6339] hover:text-white disabled:opacity-60"
                >
                  {savingStory ? d.saveStoryWorking : d.saveStoryBtn}
                </button>
                {storyMsg ? (
                  <p className="mt-2 text-sm font-semibold text-[#3f6339]">
                    {storyMsg}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <p className="text-center text-sm leading-snug text-[#3f6339]/80">
          {d.hint}
        </p>
      </div>

      {/* Direct MP3 upload — separate from the dubbing pipeline */}
      <DirectMp3Upload />
    </div>
  );
}

function DirectMp3Upload() {
  const { t, lang } = useI18n();
  const d = t.dubber;
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [storyId, setStoryId] = useState<StoryId>(
    PLAYABLE_STORIES[0]?.id ?? "sweet-dreams-do-come-true"
  );
  const [companion, setCompanion] = useState<CompanionId>("peter");
  const [uploadLang, setUploadLang] = useState<AppLang>("nl");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const upload = async () => {
    if (!file) {
      setMsg(d.directNeedFile);
      setIsError(true);
      return;
    }
    setBusy(true);
    setMsg(null);
    setIsError(false);
    try {
      const form = new FormData();
      form.append("story_id", storyId);
      form.append("companion", companion);
      form.append("lang", uploadLang);
      form.append("file", file);
      const res = await fetch("/api/stories/upload-audio", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.detail === "string" ? data.detail : d.directFail
        );
      }
      setMsg(d.directOk);
      setIsError(false);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setMsg(err instanceof Error ? err.message : d.directFail);
      setIsError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-[#e8dfd0]/55 px-4 py-4 sm:px-5 sm:py-5">
      <h3 className="text-lg font-bold text-[#3f6339]">{d.directTitle}</h3>
      <p className="mt-0.5 text-sm text-[#3f6339]/80">{d.directSubtitle}</p>

      <div className="mt-4 space-y-3">
        {/* Story */}
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-[#3f6339]">
            {d.saveStoryPick}
          </span>
          <select
            className="w-full rounded-xl border-2 border-[#e8dfd0] bg-white px-3 py-2.5 text-base font-semibold text-[#3f6339]"
            value={storyId}
            disabled={busy}
            onChange={(e) => setStoryId(e.target.value as StoryId)}
          >
            {PLAYABLE_STORIES.map((s) => {
              const row = getStoryText(s, lang);
              return (
                <option key={s.id} value={s.id}>
                  {row.title}
                </option>
              );
            })}
          </select>
        </label>

        {/* Companion */}
        <fieldset disabled={busy}>
          <legend className="mb-1 text-sm font-bold text-[#3f6339]">
            {d.pickCompanion}
          </legend>
          <div className="grid grid-cols-4 gap-1.5">
            {companions.map((c) => {
              const active = companion === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCompanion(c.id)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 px-1 py-2 text-xs font-bold transition ${
                    active
                      ? "border-[#3f6339] bg-[#3f6339] text-white"
                      : "border-[#e8dfd0] bg-white/80 text-[#3f6339] hover:bg-white"
                  }`}
                >
                  <div className="relative h-10 w-10 overflow-hidden rounded-full bg-[#e8dfd0]">
                    <Image
                      src={c.portrait}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Language */}
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-[#3f6339]">
            {d.directLang}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {APP_LANGS.map((code) => {
              const active = uploadLang === code;
              return (
                <button
                  key={code}
                  type="button"
                  disabled={busy}
                  onClick={() => setUploadLang(code)}
                  className={`rounded-full border-2 px-3 py-1.5 text-sm font-bold ${
                    active
                      ? "border-[#3f6339] bg-[#3f6339] text-white"
                      : "border-[#e8dfd0] bg-white text-[#3f6339]"
                  }`}
                >
                  {code.toUpperCase()}
                </button>
              );
            })}
          </div>
        </label>

        {/* File */}
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-[#3f6339]">
            {d.directFile}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="audio/mp3,audio/mpeg,.mp3"
            disabled={busy}
            className="block w-full text-sm text-[#3f6339] file:mr-3 file:rounded-xl file:border-0 file:bg-[#3f6339] file:px-3 file:py-2 file:text-sm file:font-bold file:text-white"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setMsg(null);
            }}
          />
          {file ? (
            <p className="mt-1 text-sm text-[#3f6339]/70">
              {file.name} ({Math.max(1, Math.round(file.size / (1024 * 1024)))}{" "}
              MB)
            </p>
          ) : null}
        </label>

        <button
          type="button"
          disabled={busy}
          onClick={() => void upload()}
          className="hm-dark w-full rounded-xl px-4 py-3 text-base font-bold shadow-md transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? d.directWorking : d.directBtn}
        </button>

        {msg ? (
          <p
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${
              isError
                ? "bg-red-50 text-red-800"
                : "bg-[#edf5e8] text-[#3f6339]"
            }`}
          >
            {msg}
          </p>
        ) : null}
      </div>
    </div>
  );
}
