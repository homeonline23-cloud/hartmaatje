import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

/** Server-side veilige systeembediening + geheugen (NL) — Google Gemini. */
export const PROMPT_VERSION = '2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const jsonHeaders = {
  ...cors,
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
};

type Body = {
  thread_id?: string | null;
  threadId?: string | null;
  message?: string;
};

type ThreadRow = {
  id: string;
  user_id: string;
  memory_summary_nl: string | null;
};

type FactRow = { title: string | null; body: string };

type ChatTurn = { role: 'user' | 'assistant'; content: string };

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function nlSystemPrompt(profile: {
  display_name?: string | null;
  address_form?: string | null;
}): string {
  const name = profile.display_name?.trim();
  const nameLine = name
    ? `De gebruiker heet (${name}). Groet deze naam af en toe kort als het natuurlijk is.`
    : 'Je kent nog geen roep­naam; vraag desgewenst vriendelijk op welke naam ze prettig vinden.';

  const addr =
    profile.address_form === 'informeel'
      ? 'Gebruik de informele Nederlands‑vorm (“je/jij”).'
      : 'Gebruik de beleefde vorm (“u”). Vermijd stijve informeel tenzij de gebruiker dat vraagt.';

  return [
    `Je bent een warme digitale gesprekspartner (AI) voor oudere mensen op de Nederlandse markt.`,
    `PROMPT_VERSIE: ${PROMPT_VERSION}`,
    nameLine,
    addr,
    `KRITISCHE FEITEN (niet doorbreken):`,
    `- Je bent géén echte mens, geen psycholoog, geen arts, geen jurist en geen financieel adviseur.`,
    `- Geef géén medische diagnosen of medicatie‑adviezen (“neem deze pil”), geen juridische of fiscale zekerheid.`,
    `- Spreek empathisch maar blijf bescheiden over wat je niet zeker weet.`,
    `- Bij gedachten aan zelf­doding, direct gevaar of ernstig geweld: moedig onmiddellijk contact met echte helpers aan (familie/huis­arts/dicht­bije mensen, 113.nl of 0900‑0113, of 112 bij acuut gevaar). Gebruik géén melodramatisering.`,
    `- Bij andere zorgelijke gezondheid: adviseer naar huisarts of professionele instanties.`,
    `STIJL:`,
    `- Nederlands met rustig tempo en korte, duidelijke zinnen.`,
    `- Gebruik zo min mogelijk jargon; leg termen kort uit.`,
    `- Af en toe een zachte open vraag om door te vragen.`,
    `- Gebruik géén hashtags of emoji.`,
    `GEHEUGEN‑INSTRUCTIE:`,
    `- Hieronder vindt u opgeslagen feiten/samenvating die de gebruiker in de app beheerd. Dit kan fout of verouderd zijn; spiegel beleefd waar passend.`,
    `- Noem géén diagnoses of zekerheid over medische diagnoses op basis daarvan.`,
    `- Als iets tegenstrijdig klinkt, vraag vriendelijk of het nog zo klopt.`,
  ].join('\n');
}

function formatMemoryFacts(facts: FactRow[]): string {
  const lines: string[] = [];
  let total = 0;
  const cap = 2800;
  for (const row of facts) {
    const t = row.title?.trim();
    const b = row.body.trim();
    const bullet = t ? `• ${t} — ${b}` : `• ${b}`;
    if (total + bullet.length > cap) break;
    lines.push(bullet);
    total += bullet.length + 1;
  }
  if (!lines.length) return '';
  return `\n---\nHANDMATIG OPSLAGEN FEITEN (door gebruiker invoer‑/wisbaar)\n${lines.join(
    '\n',
  )}\n---`;
}

function formatThreadSummaryBlock(summaryNl: string | null): string {
  const t = summaryNl?.trim();
  if (!t) return '';
  const clipped = t.length > 900 ? `${t.slice(0, 896)} …` : t;
  return `\n---\nLOPEND THREAD‑SAMENVATTING (automatisch; maximaal circa 900 tekens naar dit model gestuurd)\n${clipped}\n---`;
}

function crisisAddendum(text: string): string | undefined {
  const t = text.toLowerCase();
  if (
    /(zelfmoord|zelf.+doden|wil dood|wil sterven|aan mijn einde wil|leven.?be)eind/i.test(t) ||
    /schade aan mezelf| mijzelf kapot maken/i.test(t)
  ) {
    return `NOODCONTEXTSIGNAAL gedetecteerd: blijf kort, praktisch en zonder oordeel. Moedig onmiddellijk contact met echte helpers (113.nl, 0900‑0113 en/of 112 indien urgent) aan. Herhaal géén extreme details uit gebruikers‑teksten.`;
  }
  return undefined;
}

type GeminiResult = {
  ok: boolean;
  raw: string;
  text?: string;
  parsed?: Record<string, unknown>;
};

/** Roept Google Gemini generateContent aan. system + wisselende user/model beurten. */
async function geminiGenerate(params: {
  apiKey: string;
  model: string;
  systemInstruction?: string;
  turns: ChatTurn[];
  temperature: number;
  maxOutputTokens: number;
}): Promise<GeminiResult> {
  const { apiKey, model, systemInstruction, turns, temperature, maxOutputTokens } = params;

  const contents = turns.map((t) => ({
    role: t.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: t.content }],
  }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
  };
  if (systemInstruction) {
    body.system_instruction = { parts: [{ text: systemInstruction }] };
  }

  const resp = await fetch(
    `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  const raw = await resp.text();
  let parsed: Record<string, unknown> | undefined;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    parsed = undefined;
  }

  let text: string | undefined;
  if (parsed) {
    const candidates = (parsed as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    }).candidates;
    const parts = candidates?.[0]?.content?.parts ?? [];
    const joined = parts
      .map((p) => (typeof p.text === 'string' ? p.text : ''))
      .join('')
      .trim();
    if (joined) text = joined;
  }

  return { ok: resp.ok, raw, text, parsed };
}

async function refreshThreadSummary(params: {
  admin: SupabaseClient;
  apiKey: string;
  model: string;
  threadId: string;
  prevSummaryNl: string | null;
}) {
  if (Deno.env.get('DISABLE_MEMORY_SUMMARY') === 'true') return;

  const { admin, apiKey, model, threadId, prevSummaryNl } = params;
  try {
    const { data: recent, error } = await admin
      .from('conversation_messages')
      .select('role, content')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(14);

    if (error || !recent?.length) return;

    const chron = [...recent].reverse();
    let transcriptLines = chron
      .map((m) => `${m.role === 'user' ? 'Gebruiker' : 'Assistent'}: ${m.content}`)
      .join('\n');
    if (transcriptLines.length > 4200) {
      transcriptLines = transcriptLines.slice(-4200);
    }

    const summaryModel =
      Deno.env.get('GEMINI_SUMMARIZER_MODEL')?.trim() || model;

    const systemInstruction = [
      `Je ondersteunt elders een AI‑gesprekpartner voor ouderen. Maak NU alleen een korte lopende samenvatting in het Nederlands (max circa 560 tekens).`,
      `Gebruik géén koppen of opsommingstekens. Gebruik doorlopende zinnen.`,
      `Neem géén diagnoses. Schrijf geen medisch advies.`,
      `Integreer relevante stemming, hobby's, relaties‑namen waar genoemd, en openstaande vraagstukken zonder oordeel.`,
      `Het vorige overzicht (als aanwezig) mag je inhoudelijk vervangen of inkorten.`,
    ].join(' ');

    const userText = [
      prevSummaryNl?.trim()
        ? `Voorgaand overzicht (mag geactualiseerd worden):\n${prevSummaryNl.trim()}\n\n`
        : `Er was nog géén overzicht.\n`,
      `Laatste uitleg‑segment van het gesprek:\n`,
      transcriptLines,
    ].join('');

    const res = await geminiGenerate({
      apiKey,
      model: summaryModel,
      systemInstruction,
      turns: [{ role: 'user', content: userText }],
      temperature: 0.35,
      maxOutputTokens: 320,
    });

    if (!res.ok) {
      console.warn('[chat] summarize HTTP', res.raw.slice(0, 300));
      return;
    }

    let nextSummary = res.text?.trim();
    if (!nextSummary?.length) return;
    if (nextSummary.length > 580) nextSummary = nextSummary.slice(0, 576) + ' …';

    const up = await admin
      .from('conversation_threads')
      .update({ memory_summary_nl: nextSummary })
      .eq('id', threadId);

    if (up.error) console.warn('[chat] summarize save', up.error.message);
  } catch (e) {
    console.warn('[chat] summarize exception', String(e));
  }
}

async function resolveThread(
  admin: SupabaseClient,
  userId: string,
  threadId: string | null,
): Promise<{ ok: true; row: ThreadRow } | { ok: false; status: number; msg: string }> {
  if (threadId) {
    const { data: th, error: thErr } = await admin
      .from('conversation_threads')
      .select('id,user_id,memory_summary_nl')
      .eq('id', threadId)
      .maybeSingle();
    const row = th as ThreadRow | null;
    if (thErr || !row || row.user_id !== userId) {
      return { ok: false, status: 403, msg: 'Gesprek niet gevonden' };
    }
    return { ok: true, row };
  }
  const ins = await admin.from('conversation_threads').insert({ user_id: userId }).select(
    'id,user_id,memory_summary_nl',
  ).single();
  const nrow = ins.data as ThreadRow | null;
  if (ins.error || !nrow?.id) {
    return { ok: false, status: 500, msg: 'Kon geen gesprek starten.' };
  }
  return { ok: true, row: nrow };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Methode niet toegestaan' }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const model =
      Deno.env.get('GEMINI_MODEL')?.trim() || 'gemini-2.0-flash';

    if (!geminiKey) {
      return new Response(JSON.stringify({ error: 'Server mist GEMINI_API_KEY‑geheim.' }), {
        status: 503,
        headers: jsonHeaders,
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: 'Login vereist' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const userId = userData.user.id;

    const { data: rateOk, error: rateErr } = await admin.rpc('rate_limit_try_consume', {
      p_user_id: userId,
      p_kind: 'chat',
    });
    if (rateErr) {
      console.warn('[chat] rate_limit', rateErr.message);
    } else if (rateOk === false) {
      return new Response(
        JSON.stringify({
          error:
            'U heeft tijdelijk het maximum aantal berichten bereikt. Wacht een uur of probeer het morgen opnieuw.',
        }),
        { status: 429, headers: jsonHeaders },
      );
    }
    let bodyParsed: Body;
    try {
      bodyParsed = (await req.json()) as Body;
    } catch {
      return new Response(JSON.stringify({ error: 'JSON ontbreekt' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    let messageRaw =
      typeof bodyParsed.message === 'string' ? bodyParsed.message.trim() : '';
    if (!messageRaw) {
      return new Response(JSON.stringify({ error: 'Leeg bericht' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }
    if (messageRaw.length > 6000) {
      messageRaw = messageRaw.slice(0, 6000);
    }

    const threadOutcome = await resolveThread(
      admin,
      userId,
      bodyParsed.thread_id ?? bodyParsed.threadId ?? null,
    );

    if (!threadOutcome.ok) {
      return new Response(JSON.stringify({ error: threadOutcome.msg }), {
        status: threadOutcome.status,
        headers: jsonHeaders,
      });
    }

    const threadRow = threadOutcome.row;

    const { data: profile } = await admin
      .from('profiles')
      .select('display_name, address_form')
      .eq('id', userId)
      .maybeSingle();

    const { data: factRowsRaw } = await admin
      .from('memory_facts')
      .select('title, body')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(48);

    const factRows = (factRowsRaw ?? []) as FactRow[];

    let systemPrompt = nlSystemPrompt(
      profile ?? { display_name: null, address_form: 'formeel' },
    );

    systemPrompt +=
      formatThreadSummaryBlock(threadRow.memory_summary_nl ?? null);
    systemPrompt += formatMemoryFacts(factRows);

    const add = crisisAddendum(messageRaw);
    if (add) systemPrompt = `${systemPrompt}\nEXTRA: ${add}`;

    const { data: history, error: histErr } = await admin
      .from('conversation_messages')
      .select('role, content')
      .eq('thread_id', threadRow.id)
      .order('created_at', { ascending: true })
      .limit(52);

    if (histErr) {
      console.error('[chat] history', histErr.message);
      return new Response(JSON.stringify({ error: 'Kon gespreks­geschiedenis niet laden.' }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const turns: ChatTurn[] = [
      ...(history ?? []).map((h) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user' as const, content: messageRaw },
    ];

    const main = await geminiGenerate({
      apiKey: geminiKey,
      model,
      systemInstruction: systemPrompt,
      turns,
      temperature: 0.75,
      maxOutputTokens: 640,
    });

    if (!main.ok) {
      console.error('[chat] Gemini HTTP', main.raw.slice(0, 400));
      const errObj = (main.parsed as { error?: { message?: string } } | undefined)?.error;
      console.error('[chat]', errObj?.message || 'Gemini fout');
      return new Response(JSON.stringify({ error: 'AI‑antwoord tijdelijk even niet beschikbaar.' }), {
        status: 502,
        headers: jsonHeaders,
      });
    }

    const assistantText = main.text?.trim() ||
      'Ik kon even geen duidelijke zin geven — probeert u het nog eens zo meteen?';

    const { error: umErr } = await admin.from('conversation_messages').insert({
      thread_id: threadRow.id,
      role: 'user',
      content: messageRaw,
    });
    if (umErr) {
      console.error('[chat] insert user', umErr.message);
      return new Response(JSON.stringify({ error: 'Kon uw bericht niet opslaan na het uitwerken.' }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const aiIns = await admin.from('conversation_messages').insert({
      thread_id: threadRow.id,
      role: 'assistant',
      content: assistantText,
      model,
    }).select('id').single();

    if (aiIns.error) console.error('[chat] insert ai', aiIns.error.message);

    void refreshThreadSummary({
      admin,
      apiKey: geminiKey,
      model,
      threadId: threadRow.id,
      prevSummaryNl: threadRow.memory_summary_nl ?? null,
    }).catch((e) =>
      console.warn('[chat] achter­grond‑samenvatting', typeof e === 'string' ? e : String(e))
    );

    return new Response(
      JSON.stringify({
        thread_id: threadRow.id,
        reply: assistantText,
        assistant_message_id: aiIns.data?.id ?? null,
        prompt_version: PROMPT_VERSION,
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (e) {
    console.error('[chat] Onverwacht', e);
    return new Response(JSON.stringify({ error: 'Onverwachte server‑fout' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
