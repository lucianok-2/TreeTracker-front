/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración básica sin TypeScript strict
  reactStrictMode: false,

  // Desactivar ESLint y TypeScript checking durante el build para producción
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Deshabilitar optimizaciones que pueden causar problemas
  experimental: {},
  turbopack: {},
  // Configuración de webpack para evitar problemas de case-sensitivity
  webpack: (config, { dev, isServer }) => {
    config.resolve.fallback = { fs: false, path: false };

    // Fix case sensitivity issues on Windows
    config.resolve.symlinks = false;

    // Disable case sensitive paths in webpack
    if (config.resolve.plugins) {
      config.resolve.plugins = config.resolve.plugins.filter(
        plugin => plugin.constructor.name !== 'CaseSensitivePathsPlugin'
      );
    }

    // Add watch options to prevent issues
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
      poll: 1000,
      aggregateTimeout: 300,
    };

    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
