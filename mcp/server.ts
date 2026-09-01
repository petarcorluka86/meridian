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

/**
 * What the client is told before it asks anything.
 *
 * Not a summary of the tools — they describe themselves. This is what none of
 * them can say on its own: what the vault is, and the two rules an agent would
 * otherwise have to break once to discover.
 */
const INSTRUCTIONS = `Meridian is a manager's hub over a folder of plain files — the vault. People, notes, tasks, hours and projects are files on disk; meetings, absences, approvals, pull requests and pay are cached copies of what BambooHR, Google Calendar and GitHub said when they were last asked.

Two things hold everywhere:

Nothing here writes to BambooHR, Google or GitHub, and nothing here reads from them either. Every source tool reads a cache and says how old it is. There is no way to refresh one from this server and that is deliberate — if the numbers are stale, say how old they are and carry on. Refreshing is somebody pressing the badge in the app.

A note's person comes from the folder it is in, and its project from its front matter. Use move_note to change who a note is about; editing a path by hand is not a supported way to do it.

Projects are yours to shape: create, phase, link and archive them, and file tasks under a phase. Deleting a project is the one project action that stays in the app — its confirmation promises what happens to the project's tasks and notes, and a promise is read by a person.`;

export function createServer(): McpServer {
  const server = new McpServer(
    { name: 'meridian-vault', version: '0.1.0' },
    { instructions: INSTRUCTIONS },
  );

  registerTools({
    tool: (name, description, inputSchema, handler, annotations) => {
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
        { description, inputSchema, ...(annotations ? { annotations } : {}) },
        handler as unknown as ToolCallback<typeof inputSchema>,
      );
    },
  } satisfies Tooling);

  return server;
}
