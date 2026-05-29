export const dynamic = "force-static";

export function GET() {
  const body = JSON.stringify({
    name: "MedAssist",
    short_name: "MedAssist",
    description: "Medical scribe for Indian doctors",
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
