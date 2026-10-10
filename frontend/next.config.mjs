import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// This folder is opened through C:\Users\HP\Downloads, which is a link to
// D:\CDrive_Moved\Downloads. Turbopack joins those two absolute paths and
// then cannot read its cache. Pin the root to the real directory.
const projectRoot = fs.realpathSync(path.dirname(fileURLToPath(import.meta.url)));

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://hostelmanagements.onrender.com/api';

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: projectRoot,
  },
  // Same-origin /api keeps the refresh cookie first-party; browsers drop cookies from another site (Render).
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL.replace(/\/$/, '')}/:path*` }];
  },
};

export default nextConfig;
