#!/usr/bin/env node
// Activación automática de la nube de Coach JP (Supabase + sitio en GitHub Pages), de punta a punta:
//   1. Crea (o reutiliza) el proyecto de Supabase en São Paulo.
//   2. Prepara la base con supabase/migrations (sólo si falta).
//   3. Configura el login: acceso de alumnos sin cuenta, URL del sitio y registro del coach sin esperas.
//   4. Deja la conexión fija para el sitio: cloud.config.json (+ commit y push) o variables de GitHub con `gh`.
//
// Requiere un token personal de Supabase: https://supabase.com/dashboard/account/tokens
//   SUPABASE_ACCESS_TOKEN=sbp_… node scripts/setup-cloud.mjs [opciones]
// Opciones:
//   --ref <ref>        usar un proyecto existente en vez de crear uno
//   --name <nombre>    nombre del proyecto nuevo (por defecto coach-jp-nutrition)
//   --region <región>  por defecto sa-east-1 (São Paulo)
//   --site <url>       URL pública del Builder (por defecto, la de GitHub Pages del repo)
//   --commit           guarda cloud.config.json, hace commit y push a la rama actual (dispara el deploy)
//   --github           además carga SUPABASE_URL / SUPABASE_ANON_KEY en GitHub y corre el workflow (requiere `gh`)
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const API = 'https://api.supabase.com';
const args = process.argv.slice(2);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d;
};
const sh = (c) => execSync(c, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
const step = (m) => console.log(`\n▸ ${m}`);
const ok = (m) => console.log(`  ✓ ${m}`);
const die = (m) => {
  console.error(`\n✗ ${m}`);
  process.exit(1);
};

let token = process.env.SUPABASE_ACCESS_TOKEN || '';
if (!token) {
  console.log('Necesito tu token personal de Supabase (se usa sólo en esta terminal).');
  console.log('Crealo en: https://supabase.com/dashboard/account/tokens');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  token = (await rl.question('Pegá el token (sbp_…): ')).trim();
  rl.close();
}
if (!token) die('Falta el token de Supabase.');

async function api(method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!r.ok) {
    const e = new Error(`${method} ${path} → ${r.status}: ${typeof data === 'string' ? data : (data?.message ?? JSON.stringify(data))}`);
    e.status = r.status;
    throw e;
  }
  return data;
}
const sql = (ref, query) => api('POST', `/v1/projects/${ref}/database/query`, { query });

// URL pública del sitio a partir del remoto de git (https://<owner>.github.io/<repo>/nutrition/).
function defaultSite() {
  try {
    const remote = sh('git remote get-url origin');
    const m = /github\.com[/:]([^/]+)\/([^/.]+)(\.git)?$/.exec(remote) || /\/git\/([^/]+)\/([^/.]+)/.exec(remote);
    if (m) return /\.github\.io$/i.test(m[2]) ? `https://${m[1].toLowerCase()}.github.io/nutrition/` : `https://${m[1].toLowerCase()}.github.io/${m[2]}/nutrition/`;
  } catch {}
  return '';
}

// ---------------------------------------------------------------------------------------------------------
step('Conectando con tu cuenta de Supabase');
const orgs = await api('GET', '/v1/organizations').catch((e) => die(e.status === 401 ? 'El token de Supabase no es válido.' : e.message));
if (!orgs?.length) die('Tu cuenta de Supabase no tiene ninguna organización. Creá una en https://supabase.com/dashboard.');
ok(`Cuenta OK · organización: ${orgs[0].name}`);

let ref = opt('ref', '');
const name = opt('name', 'coach-jp-nutrition');
const region = opt('region', 'sa-east-1');
if (!ref) {
  const projects = await api('GET', '/v1/projects');
  const existing = projects.find((p) => p.name === name);
  if (existing) {
    ref = existing.id ?? existing.ref;
    ok(`Uso el proyecto existente "${name}" (${ref})`);
  } else {
    step(`Creando el proyecto "${name}" en ${region === 'sa-east-1' ? 'São Paulo' : region}`);
    const body = { name, organization_id: orgs[0].id, db_pass: randomBytes(18).toString('base64url'), region };
    let created;
    try {
      created = await api('POST', '/v1/projects', body);
    } catch (e) {
      // Versiones nuevas de la API identifican la organización por slug.
      if (e.status !== 400 && e.status !== 422) throw e;
      created = await api('POST', '/v1/projects', { ...body, organization_slug: orgs[0].slug ?? orgs[0].id });
    }
    ref = created.id ?? created.ref;
    ok(`Proyecto creado (${ref}). La contraseña de la base se generó al azar: si alguna vez la necesitás, la reseteás desde el panel.`);
  }
}

step('Esperando a que el proyecto esté listo');
for (let i = 0; ; i++) {
  const p = await api('GET', `/v1/projects/${ref}`).catch(() => null);
  if (p?.status === 'ACTIVE_HEALTHY') break;
  if (p?.status && /PAUSED|INACTIVE/.test(p.status)) die(`El proyecto está pausado (${p.status}). Reactivalo desde https://supabase.com/dashboard/project/${ref}`);
  if (i > 90) die('El proyecto tarda demasiado en arrancar. Volvé a correr este script en unos minutos (reutiliza el proyecto).');
  if (i % 6 === 0) console.log(`  … ${p?.status ?? 'iniciando'}`);
  await new Promise((r) => setTimeout(r, 5000));
}
ok('Proyecto activo');
const url = `https://${ref}.supabase.co`;

step('Leyendo la clave pública');
const keys = await api('GET', `/v1/projects/${ref}/api-keys?reveal=true`);
const anon = keys.find((k) => k.name === 'anon') ?? keys.find((k) => k.type === 'publishable');
if (!anon?.api_key) die('No encontré la clave pública (anon) del proyecto.');
ok('Clave pública lista');

step('Preparando la base (tablas, permisos y funciones de Coach JP)');
const has = await sql(ref, "select to_regclass('public.athletes') is not null as ok");
if (has?.[0]?.ok) ok('La base ya estaba preparada');
else {
  for (const f of readdirSync(join(ROOT, 'supabase', 'migrations')).sort()) {
    await sql(ref, readFileSync(join(ROOT, 'supabase', 'migrations', f), 'utf8'));
    ok(`Aplicada ${f}`);
  }
}

step('Configurando el login');
const site = opt('site', defaultSite());
const auth = { external_anonymous_users_enabled: true, mailer_autoconfirm: true };
if (site) Object.assign(auth, { site_url: site, uri_allow_list: `${site.replace(/\/$/, '')}/**` });
await api('PATCH', `/v1/projects/${ref}/config/auth`, auth);
ok('Alumnos entran con su link (sin cuenta)');
ok('Tu cuenta de coach se crea desde el Builder, sin esperar emails');
if (site) ok(`Sitio: ${site}`);

step('Dejando la conexión fija para el sitio');
writeFileSync(join(ROOT, 'cloud.config.json'), JSON.stringify({ supabaseUrl: url, anonKey: anon.api_key }, null, 2) + '\n');
ok('cloud.config.json actualizado');
if (opt('github', false)) {
  try {
    sh(`gh variable set SUPABASE_URL --body "${url}"`);
    sh(`gh variable set SUPABASE_ANON_KEY --body "${anon.api_key}"`);
    ok('Variables cargadas en GitHub Actions');
  } catch (e) {
    console.log(`  ! No pude cargar las variables con gh (${String(e.message).split('\n')[0]}). Queda cloud.config.json.`);
  }
}
if (opt('commit', false)) {
  sh('git add cloud.config.json');
  try {
    sh('git commit -m "chore(nutrition): conectar la nube (Supabase)"');
  } catch {}
  const branch = sh('git rev-parse --abbrev-ref HEAD');
  sh(`git push origin HEAD:${branch}`);
  ok(`Commit y push a ${branch}: el deploy de Pages arranca solo`);
} else if (opt('github', false)) {
  try {
    sh('gh workflow run pages.yml');
    ok('Deploy de Pages disparado');
  } catch {}
}

console.log(`\n✅ Nube lista.
   Proyecto: https://supabase.com/dashboard/project/${ref}
   URL:      ${url}
   Builder:  ${site || '(tu sitio de GitHub Pages)'}  → "Entrar a la nube" → "Crear mi cuenta de coach"`);
