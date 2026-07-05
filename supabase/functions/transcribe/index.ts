import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

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

type Body = { audio_base64?: string; mime_type?: string };

const MAX_CHARS = 6_800_000; // ruw plafond (base64)
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Methode niet toegestaan' }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';

  try {
    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const model = Deno.env.get('GEMINI_MODEL')?.trim() || 'gemini-2.0-flash';

    if (!geminiKey) {
      return new Response(JSON.stringify({ error: 'Server mist GEMINI_API_KEY.' }), {
        status: 503,
        headers: jsonHeaders,
      });
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: 'Login vereist' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const uid = userData.user.id;
    const { data: rateOk, error: rateErr } = await admin.rpc('rate_limit_try_consume', {
      p_user_id: uid,
      p_kind: 'transcribe',
    });
    if (rateErr) {
      console.warn('[transcribe] rate_limit', rateErr.message);
    } else if (rateOk === false) {
      return new Response(
        JSON.stringify({
          error:
            'Er zijn nu te veel spraak­opnames achter elkaar. Wacht een uur of typ uw bericht.',
        }),
        { status: 429, headers: jsonHeaders },
      );
    }

    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return new Response(JSON.stringify({ error: 'Ongeldig JSON‑lichaam' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const b64 = typeof body.audio_base64 === 'string' ? body.audio_base64.trim() : '';
    if (!b64) {
      return new Response(JSON.stringify({ error: 'Geen audiobestand doorgegeven.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }
    if (b64.length > MAX_CHARS) {
      return new Response(JSON.stringify({ error: 'Opname te lang voor verwerking.' }), {
        status: 413,
        headers: jsonHeaders,
      });
    }

    // Gemini kent geen "webm"; browseropnames (audio/webm;codecs=opus) mappen we naar ogg.
    const rawMime =
      typeof body.mime_type === 'string' && body.mime_type.startsWith('audio/')
        ? body.mime_type.split(';')[0].trim()
        : 'audio/ogg';
    const mime = rawMime === 'audio/webm' ? 'audio/ogg' : rawMime;

    const geminiBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                'Transcribeer de volgende Nederlandse audio exact naar tekst. ' +
                'Geef uitsluitend de uitgesproken tekst terug, zonder aanhalingstekens, ' +
                'zonder uitleg en zonder tijdsaanduidingen. Als er niets verstaanbaar is, geef een lege tekst.',
            },
            { inline_data: { mime_type: mime, data: b64 } },
          ],
        },
      ],
      generationConfig: { temperature: 0 },
    };

    const resp = await fetch(
      `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': geminiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geminiBody),
      },
    );

    const rawText = await resp.text();

    if (!resp.ok) {
      console.error('[transcribe] Gemini HTTP', resp.status, rawText.slice(0, 300));
      return new Response(JSON.stringify({ error: 'Spraakherkenning werkte deze keer niet.' }), {
        status: 502,
        headers: jsonHeaders,
      });
    }

    try {
      const json = JSON.parse(rawText) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const parts = json.candidates?.[0]?.content?.parts ?? [];
      const out = parts
        .map((p) => (typeof p.text === 'string' ? p.text : ''))
        .join('')
        .trim();
      return new Response(JSON.stringify({ text: out || '' }), {
        status: 200,
        headers: jsonHeaders,
      });
    } catch {
      console.error('[transcribe] parse', rawText.slice(0, 320));
      return new Response(JSON.stringify({ error: 'Onverwacht antwoord bij spraakherkenning.' }), {
        status: 502,
        headers: jsonHeaders,
      });
    }
  } catch (e) {
    console.error('[transcribe]', e);
    return new Response(JSON.stringify({ error: 'Serverfout' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
