/**
 * Where the fifteen tools meet the SDK.
 *
 * Split out of vault-server.ts because that file connects to stdio the moment it
 * is imported, so nothing in it could be tested — and the join was the one part
 * worth testing. `registerTools` is pure registration; this is the wiring;
 * vault-server.ts is three lines of transport.
 */
import { McpServer, type ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools, type Tooling } from './tools.js';

export function createServer(): McpServer {
  const server = new McpServer({ name: 'meridian-vault', version: '0.1.0' });

  registerTools({
    tool: (name, description, inputSchema, handler) => {
      // The one assertion left, and it is on the argument type alone.
      //
      // This used to be `registerTools(server as unknown as Tooling)`, which
      // told TypeScript to stop looking at the whole join — while `.tool()` is
      // deprecated in the SDK and the dependency is `^1.30.0`, so the day the
      // method changed, type-check and build would both have stayed green and an
      // agent would simply have had no tools.
      //
      // What is left: `Tooling` types the handler's argument as
      // `z.infer<ZodObject<T>>` and the SDK types it as `ShapeOutput<T>`. For
      // these schemas those are the same type, but while T is generic TypeScript
      // sees two unrelated computations — it will not even take the direct
      // assertion — and teaching tools.ts the SDK's own generics would cost the
      // narrow interface a test can implement in five lines.
      //
      // The name, the config shape and the return type are all still checked, and
      // tests/unit/mcp-server.test.ts drives a real client over a real transport
      // to cover what this does not: that the tools arrive, that a schema reaches
      // the SDK, and that a bad argument is refused rather than handed on.
      server.registerTool(
        name,
        { description, inputSchema },
        handler as unknown as ToolCallback<typeof inputSchema>,
      );
    },
  } satisfies Tooling);

  return server;
}
