import { Resource, ResourceTemplate } from "@modelcontextprotocol/sdk/types.js";
import { TaskWarriorService } from "../services/taskwarrior.js";
import { Task } from "../types/task.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { 
  ListResourcesRequestSchema, 
  ListResourceTemplatesRequestSchema, 
  ReadResourceRequestSchema, 
  SubscribeRequestSchema, 
  UnsubscribeRequestSchema,
  CompleteRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { CompletionService } from "../services/completion.js";

export class TaskResourceHandler {
  private taskService: TaskWarriorService;
  private completionService: CompletionService;
  private subscriptions: Set<string> = new Set();

  constructor(taskService: TaskWarriorService) {
    this.taskService = taskService;
    this.completionService = new CompletionService(taskService);
  }

  registerResources(server: McpServer) {
    server.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: await this.listResources()
      };
    });

    server.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
      return {
        resourceTemplates: await this.listResourceTemplates()
      };
    });

    server.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      return this.readResource(request.params.uri);
    });

    server.server.setRequestHandler(SubscribeRequestSchema, async (request) => {
      this.subscribe(request.params.uri);
      return {};
    });

    server.server.setRequestHandler(UnsubscribeRequestSchema, async (request) => {
      this.unsubscribe(request.params.uri);
      return {};
    });

    server.server.setRequestHandler(CompleteRequestSchema, async (request) => {
      const { ref, argument } = request.params;
      
      // Handle project completions
      if (typeof ref.uri === 'string' && ref.uri.startsWith('task:///project/')) {
        return {
          completion: await this.completionService.completeProjects(argument.value)
        };
      }
      
      // Handle tag completions
      if (typeof ref.uri === 'string' && ref.uri.startsWith('task:///tag/')) {
        return {
          completion: await this.completionService.completeTags(argument.value)
        };
      }

      // Default empty completion for other resources
      return {
        completion: {
          values: [],
          total: 0,
          hasMore: false
        }
      };
    });
  }

  async listResources(): Promise<Resource[]> {
    const tasks = await this.taskService.listTasks({ query: "status:pending" });
    return tasks.map(task => ({
      uri: `task:///task/${task.id}`,
      name: `Task ${task.id}`,
      description: task.description,
      mimeType: "application/json",
      text: JSON.stringify(task)
    }));
  }

  async listResourceTemplates(): Promise<ResourceTemplate[]> {
    return [
      {
        uriTemplate: "task:///task/{id}",
        name: "Task Detail",
        description: "Detailed information about a specific task",
        mimeType: "application/json"
      },
      {
        uriTemplate: "task:///project/{name}",
        name: "Project Tasks",
        description: "Tasks belonging to a specific project",
        mimeType: "application/json"
      },
      {
        uriTemplate: "task:///tag/{name}",
        name: "Tagged Tasks",
        description: "Tasks with a specific tag",
        mimeType: "application/json"
      }
    ];
  }

  async readResource(uri: string): Promise<{ contents: { uri: string; mimeType: string; text: string }[] }> {
    if (uri === "task:///list") {
      const tasks = await this.taskService.listTasks({ query: "status:pending" });
      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify(tasks)
        }]
      };
    }

    // Handle task detail resource
    const taskDetailMatch = uri.match(/^task:\/\/\/task\/(.+)$/);
    if (taskDetailMatch) {
      const taskId = taskDetailMatch[1];
      const task = await this.taskService.getTask(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }
      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify(task)
        }]
      };
    }

    // Handle project resource
    const projectMatch = uri.match(/^task:\/\/\/project\/(.+)$/);
    if (projectMatch) {
      const projectName = decodeURIComponent(projectMatch[1]);
      const tasks = await this.taskService.listTasks({ query: `project:${projectName} status:pending` });
      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify(tasks)
        }]
      };
    }

    // Handle tag resource
    const tagMatch = uri.match(/^task:\/\/\/tag\/(.+)$/);
    if (tagMatch) {
      const tagName = decodeURIComponent(tagMatch[1]);
      const tasks = await this.taskService.listTasks({ query: `"+(${tagName})" status:pending` });
      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify(tasks)
        }]
      };
    }

    throw new Error(`Unknown resource URI: ${uri}`);
  }

  subscribe(uri: string): void {
    this.subscriptions.add(uri);
  }

  unsubscribe(uri: string): void {
    this.subscriptions.delete(uri);
  }

  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }
} 