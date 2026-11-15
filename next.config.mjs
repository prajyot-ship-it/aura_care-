const isGitHubPages = process.env.GITHUB_PAGES === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(isGitHubPages
    ? {
        output: "export",
        basePath: "/aura_care-",
        assetPrefix: "/aura_care-/",
        images: {
          unoptimized: true,
        },
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
