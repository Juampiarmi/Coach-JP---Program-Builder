import { readFileSync } from 'node:fs';

/**
 * Export 100% estático (carpeta out/) para publicar el Command Builder en GitHub Pages.
 *
 * basePath adaptativo, en este orden:
 *  1. NEXT_PUBLIC_BASE_PATH explícito (ej. "/Coach-JP---Program-Builder/nutrition").
 *  2. En GitHub Actions: "/<repo>/nutrition" a partir de GITHUB_REPOSITORY
 *     (o "/nutrition" si el repo es el sitio de usuario <usuario>.github.io).
 *  3. Local: sin basePath (npm run dev / npx serve out).
 */
function resolveBasePath() {
  const explicit = process.env.NEXT_PUBLIC_BASE_PATH;
  if (explicit !== undefined) return explicit.replace(/\/+$/, '');
  const repo = process.env.GITHUB_ACTIONS && process.env.GITHUB_REPOSITORY?.split('/')[1];
  if (repo) return /\.github\.io$/i.test(repo) ? '/nutrition' : `/${repo}/nutrition`;
  return '';
}

const basePath = resolveBasePath();

/**
 * Conexión a Supabase: variables del build (GitHub → Settings → Variables) o, si no están, cloud.config.json.
 * URL y clave pública (anon) son públicas por diseño: la seguridad la dan los permisos por fila de la base.
 */
function resolveCloud() {
  let file = {};
  // Pruebas del modo local / asistente: compilar ignorando la conexión fijada en el repo.
  if (process.env.CJP_IGNORE_CLOUD_CONFIG) return { url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '' };
  try {
    file = JSON.parse(readFileSync(new URL('./cloud.config.json', import.meta.url), 'utf8'));
  } catch {}
  return {
    url: (process.env.NEXT_PUBLIC_SUPABASE_URL || file.supabaseUrl || '').trim(),
    key: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || file.anonKey || '').trim(),
  };
}
const cloud = resolveCloud();
// El post-build (app del atleta en out/plan/) lee las mismas variables.
process.env.NEXT_PUBLIC_SUPABASE_URL = cloud.url;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = cloud.key;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_SUPABASE_URL: cloud.url, NEXT_PUBLIC_SUPABASE_ANON_KEY: cloud.key, NEXT_PUBLIC_REPO: process.env.GITHUB_REPOSITORY ?? '' },
};

export default nextConfig;
