import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Alleen POST' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';

  try {
    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: ud, error: guErr } = await admin.auth.getUser(jwt);
    if (guErr || !ud?.user?.id) {
      return new Response(JSON.stringify({ error: 'Login verplicht.' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const uid = ud.user.id;

    const listed = await admin.storage.from('partner_avatars').list(uid);
    const names = listed.data ?? [];
    if (names.length > 0) {
      const paths = names.map((f) => `${uid}/${f.name}`);
      const rm = await admin.storage.from('partner_avatars').remove(paths);
      if (rm.error) {
        console.warn('[delete-account] storage remove', rm.error.message);
      }
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(uid);

    if (delErr) {
      console.error('[delete-account]', delErr.message);
      return new Response(JSON.stringify({ error: 'Kon account niet verwijderen.' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[delete-account]', e);
    return new Response(JSON.stringify({ error: 'Onverwachte fout' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
