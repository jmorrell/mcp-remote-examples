import { DurableObject } from 'cloudflare:workers'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { addCorsHeaders } from './OAuthProvider'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SSEEdgeTransport } from './sseEdge'

export abstract class MCPEntrypoint extends DurableObject {
  abstract server: McpServer

  static Router = class extends WorkerEntrypoint<{ MCP_OBJECT: DurableObjectNamespace<MCPEntrypoint> }> {
    async fetch(request: Request) {
      // const sessionId = c.req.query('sessionId');
      const sessionId = this.ctx.props.userEmail // todo: types
      const object = this.env.MCP_OBJECT.get(this.env.MCP_OBJECT.idFromName(sessionId))
      return object.fetch(request)
    }
  }
  transport = new SSEEdgeTransport('/sse/message', this.ctx.id.toString())

  async fetch(request: Request) {
    const url = new URL(request.url)

    if (url.pathname === '/sse') {
      await this.server.connect(this.transport)
      return addCorsHeaders(this.transport.sseResponse, request)
      // console.log(this.ctx.props)
      // console.log(Object.fromEntries(request.headers.entries()))

      // return new Response('Hello World', { status: 200 }), request)
    }

    if (url.pathname === '/sse/message') {
      return this.transport.handlePostMessage(request)
    }
    return new Response('Not Found', { status: 404 })
  }
}
