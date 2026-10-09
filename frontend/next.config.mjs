import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// This folder is opened through C:\Users\HP\Downloads, which is a link to
// D:\CDrive_Moved\Downloads. Turbopack joins those two absolute paths and
// then cannot read its cache. Pin the root to the real directory.
const projectRoot = fs.realpathSync(path.dirname(fileURLToPath(import.meta.url)));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
