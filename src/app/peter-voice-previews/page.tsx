export default function PeterVoicePreviewsPage() {
  const samples = [
    { id: "welcome", label: "Welcome original", src: "/avatars/peter/welcome-peter.mp3" },
    { id: "echo", label: "echo (current live pick)", src: "/avatars/peter/voice-previews/peter-echo.mp3" },
    { id: "ash", label: "ash (Maarten family ~7)", src: "/avatars/peter/voice-previews/peter-ash.mp3" },
    { id: "alloy", label: "alloy", src: "/avatars/peter/voice-previews/peter-alloy.mp3" },
    { id: "sage", label: "sage", src: "/avatars/peter/voice-previews/peter-sage.mp3" },
    { id: "verse", label: "verse (old tin-can)", src: "/avatars/peter/voice-previews/peter-verse.mp3" },
    { id: "ballad", label: "ballad", src: "/avatars/peter/voice-previews/peter-ballad.mp3" },
  ] as const;

  return (
    <main
      style={{
        maxWidth: "40rem",
        margin: "2rem auto",
        padding: "0 1rem",
        fontFamily: "Georgia, serif",
        lineHeight: 1.45,
        background: "#f7f3ea",
        color: "#1c1915",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: "1.4rem" }}>Peter — live voice candidates</h1>
      <p style={{ color: "#5c5346" }}>
        Compare to the welcome video. Tell Auto which name fits best (~7 like
        Fenna/Maarten/Colette).
      </p>
      <ol>
        {samples.map((s) => (
          <li key={s.id} style={{ margin: "0.85rem 0" }}>
            {s.label}
            <div>
              <audio controls src={s.src} preload="none" />
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
