// Supabase local de prueba: Postgres REAL con las migraciones y permisos (RLS) de supabase/migrations,
// más una imitación mínima de Auth (email + contraseña, sesiones anónimas, refresh) y de la API REST (PostgREST)
// con lo que usan el Builder y la app del atleta. Sólo para pruebas: nunca en producción.
//
// Uso programático: const sb = await startFakeSupabase({ port }); … await sb.stop();
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const ROOT = new URL('../supabase/', import.meta.url).pathname;
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

export async function startFakeSupabase({ port = 0, users = [] } = {}) {
  const admin = new pg.Client();
  await admin.connect();
  const db = `cjp_e2e_${process.pid}_${Date.now().toString(36)}`;
  await admin.query(`create database ${db}`);
  const pool = new pg.Pool({ database: db, max: 8 });
  // Al borrar la base de prueba se cortan las conexiones abiertas: no es un error de la prueba.
  pool.on('error', () => {});
  admin.on('error', () => {});
  const boot = await pool.connect();
  await boot.query(readFileSync(ROOT + 'tests/shim.sql', 'utf8'));
  for (const f of readdirSync(ROOT + 'migrations').sort()) await boot.query(readFileSync(ROOT + 'migrations/' + f, 'utf8'));
  boot.release();

  const passwords = new Map(); // email → { id, password }
  const refresh = new Map(); // refresh_token → user
  for (const u of users) {
    const id = randomUUID();
    await pool.query('insert into auth.users (id, email, is_anonymous) values ($1, $2, false)', [id, u.email]);
    passwords.set(u.email.toLowerCase(), { id, password: u.password });
  }

  const session = (user) => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const claims = { sub: user.id, email: user.email ?? '', role: 'authenticated', aud: 'authenticated', is_anonymous: !!user.is_anonymous, exp };
    const access_token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(claims)}.fake`;
    const refresh_token = randomUUID();
    refresh.set(refresh_token, user);
    return {
      access_token,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: exp,
      refresh_token,
      user: { id: user.id, aud: 'authenticated', role: 'authenticated', email: user.email ?? '', is_anonymous: !!user.is_anonymous, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
    };
  };
  const claimsOf = (req) => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    if (!m) return null;
    try {
      const c = JSON.parse(Buffer.from(m[1].split('.')[1], 'base64url').toString());
      return c.exp > Date.now() / 1000 ? c : null;
    } catch {
      return null;
    }
  };

  // ---------- PostgREST mínimo ----------
  const ident = (s) => {
    if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw Object.assign(new Error(`identificador inválido: ${s}`), { http: 400 });
    return `"${s}"`;
  };
  const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);
  function where(params, vals) {
    const out = [];
    for (const [k, v] of params) {
      if (RESERVED.has(k)) continue;
      const m = /^(eq|neq|gt|gte|lt|lte|is|in)\.(.*)$/.exec(v);
      if (!m) throw Object.assign(new Error(`filtro no soportado: ${k}=${v}`), { http: 400 });
      const col = ident(k);
      const [, op, raw] = m;
      if (op === 'is') out.push(`${col} is ${{ null: 'null', true: 'true', false: 'false' }[raw] ?? 'null'}`);
      else if (op === 'in') {
        const items = raw.replace(/^\(|\)$/g, '').split(',');
        out.push(`${col}::text = any($${vals.push(items)})`);
      } else out.push(`${col}::text ${{ eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' }[op]} $${vals.push(raw)}`);
    }
    return out.length ? ` where ${out.join(' and ')}` : '';
  }
  // Comparación como texto: para fechas / números en la prueba alcanza (gte sobre fechas ISO ordena bien).
  const cols = (sel) => (!sel || sel === '*' ? '*' : sel.split(',').map((c) => (c.trim() === '*' ? '*' : ident(c.trim()))).join(', '));
  const pkCache = {};
  async function pk(client, table) {
    if (pkCache[table]) return pkCache[table];
    const { rows } = await client.query(
      `select a.attname from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey) where i.indrelid = $1::regclass and i.indisprimary`,
      [`public.${table}`],
    );
    return (pkCache[table] = rows.map((r) => r.attname));
  }

  async function rest(client, method, path, params, body, prefer) {
    const rpc = /^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(path);
    if (rpc) {
      const { rows: fn } = await client.query(
        `select p.proargnames as names, array(select format_type(t, null) from unnest(p.proargtypes) t) as types, p.pronargdefaults as ndef
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = $1`,
        [rpc[1]],
      );
      if (!fn.length) throw Object.assign(new Error('función inexistente'), { http: 404 });
      const vals = [];
      const args = [];
      fn[0].names.forEach((n, i) => {
        if (!(n in (body ?? {}))) return;
        const v = body[n];
        vals.push(v === null ? null : typeof v === 'object' ? JSON.stringify(v) : String(v));
        args.push(`${n} := $${vals.length}::${fn[0].types[i]}`);
      });
      const { rows } = await client.query(`select to_json(public.${rpc[1]}(${args.join(', ')})) as r`, vals);
      return { status: 200, body: rows[0].r };
    }
    const m = /^\/rest\/v1\/([a-z_]+)$/.exec(path);
    if (!m) throw Object.assign(new Error('ruta no soportada'), { http: 404 });
    const table = `public.${ident(m[1])}`;
    const vals = [];
    const ret = /return=representation/.test(prefer);
    const sel = params.get('select');
    if (method === 'GET') {
      let sql = `select ${cols(sel)} from ${table}${where(params, vals)}`;
      const ord = params.get('order');
      if (ord)
        sql += ' order by ' + ord.split(',').map((o) => { const [c, d] = o.split('.'); return `${ident(c)} ${d === 'desc' ? 'desc' : 'asc'}`; }).join(', ');
      if (params.get('limit')) sql += ` limit ${Number(params.get('limit')) | 0}`;
      const { rows } = await client.query(`select coalesce(json_agg(q), '[]'::json) as r from (${sql}) q`, vals);
      return { status: 200, body: rows[0].r };
    }
    if (method === 'POST') {
      const list = Array.isArray(body) ? body : [body];
      const keys = [...new Set(list.flatMap((r) => Object.keys(r)))];
      const kc = keys.map(ident).join(', ');
      let sql = `insert into ${table} (${kc}) select ${kc} from json_populate_recordset(null::${table}, $1::json)`;
      vals.push(JSON.stringify(list));
      if (/resolution=merge-duplicates/.test(prefer)) {
        const oc = params.get('on_conflict') ? params.get('on_conflict').split(',') : await pk(client, m[1]);
        const upd = keys.filter((k) => !oc.includes(k));
        sql += ` on conflict (${oc.map(ident).join(', ')}) do ${upd.length ? 'update set ' + upd.map((k) => `${ident(k)} = excluded.${ident(k)}`).join(', ') : 'nothing'}`;
      }
      if (ret) sql += ` returning ${cols(sel)}`;
      const { rows } = await client.query(ret ? `with q as (${sql}) select coalesce(json_agg(q), '[]'::json) as r from q` : sql, vals);
      return { status: 201, body: ret ? rows[0].r : null };
    }
    if (method === 'PATCH') {
      const keys = Object.keys(body ?? {});
      vals.push(JSON.stringify(body));
      const sets = keys.map((k) => `${ident(k)} = (json_populate_record(null::${table}, $1::json)).${ident(k)}`).join(', ');
      let sql = `update ${table} set ${sets}${where(params, vals)}`;
      if (ret) sql += ` returning ${cols(sel)}`;
      const { rows } = await client.query(ret ? `with q as (${sql}) select coalesce(json_agg(q), '[]'::json) as r from q` : sql, vals);
      return { status: ret ? 200 : 204, body: ret ? rows[0].r : null };
    }
    if (method === 'DELETE') {
      await client.query(`delete from ${table}${where(params, vals)}`, vals);
      return { status: 204, body: null };
    }
    throw Object.assign(new Error('método no soportado'), { http: 405 });
  }

  const HTTP_OF = { '42501': 403, '23505': 409, '23514': 400, '22008': 400, '22023': 400, P0002: 404, '28000': 401, '54000': 400, '40001': 409 };
  const server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', '*');
    if (req.method === 'OPTIONS') return res.writeHead(204).end();
    const url = new URL(req.url, 'http://x');
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString();
    let body = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {}
    const send = (status, data) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(data === null || data === undefined ? '' : JSON.stringify(data));
    };
    try {
      // ---------- Auth ----------
      if (url.pathname.startsWith('/auth/v1/')) {
        const p = url.pathname.slice(8);
        if (p === '/signup' && !body?.email) {
          const id = randomUUID();
          await pool.query('insert into auth.users (id, is_anonymous) values ($1, true)', [id]);
          return send(200, session({ id, is_anonymous: true }));
        }
        if (p === '/token' && url.searchParams.get('grant_type') === 'password') {
          const u = passwords.get(String(body?.email ?? '').toLowerCase());
          if (!u || u.password !== body?.password) return send(400, { error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials', code: 'invalid_credentials' });
          return send(200, session({ id: u.id, email: body.email.toLowerCase() }));
        }
        if (p === '/token' && url.searchParams.get('grant_type') === 'refresh_token') {
          const u = refresh.get(body?.refresh_token);
          if (!u) return send(400, { error: 'invalid_grant', error_description: 'Invalid Refresh Token', msg: 'Invalid Refresh Token' });
          refresh.delete(body.refresh_token);
          return send(200, session(u));
        }
        if (p === '/user') {
          const c = claimsOf(req);
          if (!c) return send(401, { msg: 'invalid JWT', code: 'bad_jwt' });
          return send(200, { id: c.sub, aud: 'authenticated', role: 'authenticated', email: c.email, is_anonymous: c.is_anonymous, app_metadata: {}, user_metadata: {} });
        }
        if (p === '/logout') return res.writeHead(204).end();
        if (p === '/otp' || p === '/recover') return send(200, {});
        return send(404, { msg: 'no soportado en la prueba' });
      }
      // ---------- REST ----------
      if (url.pathname.startsWith('/rest/v1/')) {
        const claims = claimsOf(req);
        const client = await pool.connect();
        try {
          await client.query('begin');
          await client.query(`set local role ${claims ? 'authenticated' : 'anon'}`);
          await client.query(`select set_config('request.jwt.claims', $1, true)`, [claims ? JSON.stringify(claims) : '']);
          const out = await rest(client, req.method, url.pathname, url.searchParams, body, String(req.headers.prefer ?? ''));
          await client.query('commit');
          let data = out.body;
          if (/vnd\.pgrst\.object/.test(String(req.headers.accept ?? '')) && Array.isArray(data)) {
            if (data.length !== 1) return send(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' });
            data = data[0];
          }
          return send(out.status, data);
        } catch (e) {
          await client.query('rollback').catch(() => {});
          return send(e.http ?? HTTP_OF[e.code] ?? 400, { code: e.code ?? 'PGRST000', message: e.message, details: e.detail ?? null, hint: null });
        } finally {
          client.release();
        }
      }
      send(404, { msg: 'ruta desconocida' });
    } catch (e) {
      send(500, { message: String(e?.message ?? e) });
    }
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}`;

  return {
    url,
    /** Consulta directa como superusuario (para verificar lo que llegó a la base). */
    sql: (q, v) => pool.query(q, v).then((r) => r.rows),
    stop: async () => {
      server.closeAllConnections?.();
      server.close();
      await pool.end().catch(() => {});
      await admin.query(`drop database if exists ${db} with (force)`);
      await admin.end();
    },
  };
}

// Modo servidor suelto: PGHOST=… node e2e/fake-supabase.mjs 54400 coach@jp.com clave
if (import.meta.url === `file://${process.argv[1]}`) {
  const [port, email, password] = process.argv.slice(2);
  const sb = await startFakeSupabase({ port: Number(port) || 54400, users: email ? [{ email, password }] : [] });
  console.log(`Supabase de prueba en ${sb.url}`);
  process.on('SIGINT', () => sb.stop().then(() => process.exit(0)));
}
