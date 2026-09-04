import { getOllamaReadiness } from "@/lib/ollama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = await getOllamaReadiness();
  return Response.json(readiness, {
    headers: { "Cache-Control": "no-store" },
  });
}
