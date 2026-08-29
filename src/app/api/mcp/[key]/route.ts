import { NextResponse } from "next/server";
import { authenticateMcpKey, MCP_TOOLS } from "@/lib/mcp-server";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * MCP transport (Streamable HTTP, stateless) for the LGNDRY agency server.
 *
 * The key travels in the URL path because the assistants this exists for —
 * Claude and ChatGPT custom connectors — cannot attach custom headers to a
 * remote MCP server. A secret-URL capability is the standard shape for that
 * constraint (Zapier MCP works the same way). Clients that CAN set headers
 * may instead call /api/mcp/bearer with `Authorization: Bearer <key>`.
 *
 * Stateless by design: no sessions, no SSE stream, every POST is
 * authenticated from scratch. GET (stream open) answers 405, which
 * spec-compliant clients treat as "this server doesn't push".
 */

const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
}

const rpcError = (id: JsonRpcRequest["id"], code: number, message: string) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code, message },
});

const rpcResult = (id: JsonRpcRequest["id"], result: unknown) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  result,
});

async function handleMessage(msg: JsonRpcRequest): Promise<object | null> {
  const { id, method, params } = msg;
  // Notifications (no id) get no response.
  const isNotification = id === undefined && method?.startsWith("notifications/");
  if (isNotification) return null;

  switch (method) {
    case "initialize": {
      const asked = params?.protocolVersion;
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(String(asked))
          ? asked
          : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: {
          name: "lgndry-agency",
          title: "LGNDRY Agency",
          version: "1.0.0",
        },
        instructions:
          "Read-only access to the LGNDRY marketing agency's client roster, finances, tasks and weekly ad reporting. All money values are formatted US dollars. Nothing here can modify agency data.",
      });
    }
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, {
        tools: MCP_TOOLS.map(({ name, description, inputSchema }) => ({
          name,
          description,
          inputSchema,
        })),
      });
    case "tools/call": {
      const name = String(params?.name ?? "");
      const tool = MCP_TOOLS.find((t) => t.name === name);
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${name}`);
      try {
        const args = (params?.arguments ?? {}) as Record<string, unknown>;
        const result = await tool.handler(args);
        return rpcResult(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        });
      } catch (err) {
        console.error(`MCP tool ${name} failed:`, err);
        return rpcResult(id, {
          content: [{ type: "text", text: "The tool failed — try again." }],
          isError: true,
        });
      }
    }
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    // "bearer" is the header-auth alias for clients that can set headers.
    const presented =
      key === "bearer"
        ? (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "")
        : key;

    const auth = await authenticateMcpKey(presented);
    if (!auth) {
      return NextResponse.json(
        { error: "Invalid or revoked key" },
        { status: 401 }
      );
    }

    // Per-key limit — generous for interactive use, hostile to scraping.
    const rate = checkRateLimit(`mcp:${auth.keyId}`, 60, 60_000);
    if (!rate.success) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(rpcError(null, -32700, "Parse error"), {
        status: 400,
      });
    }

    // Batch or single message.
    if (Array.isArray(body)) {
      const responses = (
        await Promise.all(body.map((m) => handleMessage(m as JsonRpcRequest)))
      ).filter((r): r is object => r !== null);
      if (!responses.length) return new Response(null, { status: 202 });
      return NextResponse.json(responses);
    }
    const response = await handleMessage(body as JsonRpcRequest);
    if (!response) return new Response(null, { status: 202 });
    return NextResponse.json(response);
  } catch (error) {
    console.error("MCP transport error:", error);
    return NextResponse.json(rpcError(null, -32603, "Internal error"), {
      status: 500,
    });
  }
}

/** No push stream — stateless server. */
export function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
export function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
