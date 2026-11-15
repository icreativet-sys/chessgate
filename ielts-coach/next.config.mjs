/** @type {import('next').NextConfig} */
const nextConfig = {
  // Grading/generation calls can take a while; keep them on the Node runtime.
  serverExternalPackages: ["@anthropic-ai/sdk"],
};
export default nextConfig;
