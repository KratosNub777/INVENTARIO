import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Margen para imágenes de producto (el límite validado en la acción es 4 MB).
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
};

export default nextConfig;
