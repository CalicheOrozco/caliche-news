// Servidor MCP remoto (Streamable HTTP, sin sesión). Se conecta en Claude como conector personalizado:
//   https://<dominio>/mcp/<MCP_SECRET>
// vercel.json reescribe esa ruta a /api/mcp?key=<MCP_SECRET>.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { registerTools, INSTRUCTIONS } from './_lib/mcpTools.js'

const rpcError = (res, status, message) =>
  res.status(status).json({ jsonrpc: '2.0', error: { code: -32000, message }, id: null })

export default async function handler(req, res) {
  if (!process.env.MCP_SECRET || req.query.key !== process.env.MCP_SECRET) return rpcError(res, 401, 'No autorizado')
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return rpcError(res, 405, 'Method not allowed') }

  const server = new McpServer({ name: 'caliche-news', title: 'Caliche News', version: '1.0.0' }, { instructions: INSTRUCTIONS })
  registerTools(server)
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  res.on('close', () => { transport.close(); server.close() })
  try {
    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
  } catch (error) {
    console.error('MCP request failed:', error)
    if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null })
  }
}

// La consulta de candidatas lee muchos RSS: dale tiempo.
export const config = { maxDuration: 60 }
