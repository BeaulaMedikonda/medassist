export const dynamic = "force-static";

export function GET() {
  const body = JSON.stringify({
    name: "Hello Doctor",
    short_name: "Hello Doctor",
    description: "AI medical scribe for Indian doctors",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#059669",
    icons: [],
  });
  return new Response(body, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
