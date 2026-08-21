/**
 * MCP server over the vault: stdio in, the vault's own store layer out.
 *
 * The outbound guard is installed here too, so nothing reachable through this
 * server can make a request the app itself would refuse.
 *
 * Everything else is in server.ts and tools.ts, because this file connects to
 * stdio the moment it is imported and nothing that does that can be tested.
 */
import { installNetGuard } from '../src/lib/net-guard.js';

installNetGuard();

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

await createServer().connect(new StdioServerTransport());
