import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/storage/**',
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org", // izin untuk localhost Laravel
      },
      {
        protocol: "https",
        hostname: "localhost", // izin untuk localhost Laravel
      },
      {
        protocol: "https",
        hostname: "**.ngrok-free.app", // izin untuk localhost Laravel
      },
    ]
  },
  reactCompiler: true,
};

export default nextConfig;
