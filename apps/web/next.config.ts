import type { NextConfig } from 'next';
import { resolve } from 'node:path';

const serverApiBaseUrl = process.env.SERVER_API_BASE_URL ?? 'http://localhost:3001/api';
const workspaceRoot = resolve(import.meta.dirname, '../..');

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  output: 'standalone',
  reactStrictMode: false,
  turbopack: {
    root: workspaceRoot,
  },
  async rewrites() {
    return [
      {
        destination: `${serverApiBaseUrl}/:path*`,
        source: '/backend/:path*',
      },
    ];
  },
};

export default nextConfig;
