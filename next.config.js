const path = require("path");
 
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  async redirects() {
    return [
      {
        source: "/provider/:path*",
        destination: "/app-provider/:path*",
        permanent: true,
      },
      {
        source: "/super-admin/:path*",
        destination: "/app-provider/:path*",
        permanent: true,
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};
 
module.exports = nextConfig;
 
 
 