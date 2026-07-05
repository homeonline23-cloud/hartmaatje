import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-retention-secret',
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  if (req.method !== 'POST') {
    return json({ error: 'Alleen POST' }, 405);
  }

  const secret = Deno.env.get('RETENTION_CRON_SECRET')?.trim() ?? '';
  const hdr = req.headers.get('x-retention-secret')?.trim() ?? '';
  if (!secret || hdr !== secret) {
    return json({ error: 'Niet toegestaan' }, 403);
  }

  try {
    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!url || !serviceKey) {
      return json({ error: 'Server­configuratie ontbreekt' }, 500);
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin.rpc('run_message_retention_sweep');
    if (error) {
      console.error('[retention-sweep]', error.message);
      return json({ error: 'Opschonen mislukt' }, 500);
    }

    return json({ ok: true, result: data ?? null }, 200);
  } catch (e) {
    console.error('[retention-sweep]', e);
    return json({ error: 'Onverwachte fout' }, 500);
  }
});
