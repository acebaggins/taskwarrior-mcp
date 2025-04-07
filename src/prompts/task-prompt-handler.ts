import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TASK_PROMPTS, getPromptMessage, TaskPromptName } from './prompts.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  CompleteRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { CompletionService } from '../services/completion.js';

export class TaskPromptHandler {
  private completionService: CompletionService;

  constructor(completionService: CompletionService) {
    this.completionService = completionService;
  }

  registerPrompts(server: McpServer): void {
    // Register list prompts handler
    server.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: Object.values(TASK_PROMPTS).map(prompt => ({
          name: prompt.name,
          description: prompt.description,
          arguments: Object.entries(prompt.argsSchema.shape).map(([name, schema]) => ({
            name,
            description: schema.description || '',
            required: !schema.isOptional(),
          })),
        })),
      };
    });

    // Register get prompt handler
    server.server.setRequestHandler(GetPromptRequestSchema, async request => {
      const prompt = TASK_PROMPTS[request.params.name as TaskPromptName];
      if (!prompt) {
        throw new Error(`Prompt not found: ${request.params.name}`);
      }

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: getPromptMessage(prompt.name as TaskPromptName, request.params.arguments || {}),
            },
          },
        ],
      };
    });

    // Register completion handler
    server.server.setRequestHandler(CompleteRequestSchema, async request => {
      const { ref, argument } = request.params;

      if (ref.type === 'ref/prompt') {
        const prompt = TASK_PROMPTS[ref.name as TaskPromptName];
        if (!prompt) {
          // Return empty completion for unknown prompts
          return {
            completion: {
              values: [],
              total: 0,
              hasMore: false,
            },
          };
        }

        // Handle project completion for today-project prompt
        if (ref.name === 'today-project' && argument.name === 'project') {
          return {
            completion: await this.completionService.completeProjects(argument.value),
          };
        }

        // Handle task description completion for start-work and complete-with-review prompts
        if ((ref.name === 'start-work' || ref.name === 'complete-with-review') && argument.name === 'description') {
          return {
            completion: await this.completionService.completeTaskDescriptions(argument.value),
          };
        }

        // Handle task description completion for search-notes prompt
        if (ref.name === 'search-notes' && argument.name === 'description') {
          return {
            completion: await this.completionService.completeTaskDescriptions(argument.value),
          };
        }
      }

      // Default empty completion for other cases
      return {
        completion: {
          values: [],
          total: 0,
          hasMore: false,
        },
      };
    });
  }
}
