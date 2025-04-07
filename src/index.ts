#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TaskWarriorService } from './services/taskwarrior.js';
import { TaskResourceHandler } from './resources/task-resource-handler.js';
import { TaskPromptHandler } from './prompts/task-prompt-handler.js';
import { CompletionService } from './services/completion.js';
import { TaskToolsHandler } from './tools/task-tools-handler.js';

async function main() {
  const taskService = new TaskWarriorService();
  const completionService = new CompletionService(taskService);
  const taskResourceHandler = new TaskResourceHandler(taskService);
  const taskPromptHandler = new TaskPromptHandler(completionService);
  const taskTools = new TaskToolsHandler(taskService);

  const server = new McpServer(
    {
      name: 'taskwarrior-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
        resources: {
          subscribe: true,
        },
        completions: {},
      },
    },
  );

  taskTools.registerTools(server);
  taskResourceHandler.registerResources(server);
  taskPromptHandler.registerPrompts(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Taskwarrior MCP running on stdio');
}

main().catch(error => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});
