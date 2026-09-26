/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  output: 'export',
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
  webpack(config) {
    // El runtime de la PWA del atleta se importa como texto crudo y se embebe en el index.html exportado.
    config.module.rules.push({ test: /\.raw\.js$/, type: 'asset/source' });
    return config;
  },
};

export default nextConfig;
