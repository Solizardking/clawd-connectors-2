#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { type ServerToolDef } from './tools.js';
export declare const SERVER_NAME = "clawd-connectors";
export declare const SERVER_VERSION = "0.3.0";
/** Build an MCP Server serving the given tool registry. */
export declare function createConnectorsMcpServer(tools: ServerToolDef[]): Server;
//# sourceMappingURL=server.d.ts.map