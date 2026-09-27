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

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
