import { TaskResourceHandler } from '../task-resource-handler.js';
import { TaskWarriorService } from '../../services/taskwarrior.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Task } from '../../types/task.js';
import {
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  CompleteRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

describe('TaskResourceHandler', () => {
  let handler: TaskResourceHandler;
  let mockTaskService: jest.Mocked<TaskWarriorService>;
  let mockServer: jest.Mocked<McpServer>;
  let mockSetRequestHandler: jest.Mock;

  beforeEach(() => {
    mockTaskService = {
      listTasks: jest.fn(),
      getTask: jest.fn(),
      getAvailableProjects: jest.fn(),
      getAvailableTags: jest.fn(),
    } as unknown as jest.Mocked<TaskWarriorService>;

    mockSetRequestHandler = jest.fn();
    mockServer = {
      server: {
        setRequestHandler: mockSetRequestHandler,
      },
    } as unknown as jest.Mocked<McpServer>;

    handler = new TaskResourceHandler(mockTaskService);
  });

  describe('listResources', () => {
    it('should return task resources', async () => {
      const mockTasks: Task[] = [
        {
          id: '1',
          description: 'Test task 1',
          status: 'pending',
          project: 'test',
          tags: ['test'],
          entry: '2024-03-20T12:00:00Z',
          modified: '2024-03-20T12:00:00Z',
        },
      ];
      mockTaskService.listTasks.mockResolvedValue(mockTasks);

      const resources = await handler.listResources();
      expect(resources).toEqual([
        {
          uri: 'task:///task/1',
          name: 'Task 1',
          description: 'Test task 1',
          mimeType: 'application/json',
          text: JSON.stringify(mockTasks[0]),
        },
      ]);
    });
  });

  describe('listResourceTemplates', () => {
    it('should return all resource templates', async () => {
      const templates = await handler.listResourceTemplates();
      expect(templates).toEqual([
        {
          uriTemplate: 'task:///task/{id}',
          name: 'Task Detail',
          description: 'Detailed information about a specific task',
          mimeType: 'application/json',
        },
        {
          uriTemplate: 'task:///project/{name}',
          name: 'Project Tasks',
          description: 'Tasks belonging to a specific project',
          mimeType: 'application/json',
        },
        {
          uriTemplate: 'task:///tag/{name}',
          name: 'Tagged Tasks',
          description: 'Tasks with a specific tag',
          mimeType: 'application/json',
        },
      ]);
    });
  });

  describe('readResource', () => {
    const mockTask: Task = {
      id: '1',
      description: 'Test task',
      status: 'pending',
      project: 'test',
      tags: ['test'],
      entry: '2024-03-20T12:00:00Z',
      modified: '2024-03-20T12:00:00Z',
    };

    it('should handle task list resource', async () => {
      mockTaskService.listTasks.mockResolvedValue([mockTask]);
      const result = await handler.readResource('task:///list');
      expect(result).toEqual({
        contents: [
          {
            uri: 'task:///list',
            mimeType: 'application/json',
            text: JSON.stringify([mockTask]),
          },
        ],
      });
      expect(mockTaskService.listTasks).toHaveBeenCalledWith({ query: 'status:pending' });
    });

    it('should handle task detail resource', async () => {
      mockTaskService.getTask.mockResolvedValue(mockTask);
      const result = await handler.readResource('task:///task/1');
      expect(result).toEqual({
        contents: [
          {
            uri: 'task:///task/1',
            mimeType: 'application/json',
            text: JSON.stringify(mockTask),
          },
        ],
      });
      expect(mockTaskService.getTask).toHaveBeenCalledWith('1');
    });

    it('should handle project resource', async () => {
      mockTaskService.listTasks.mockResolvedValue([mockTask]);
      const result = await handler.readResource('task:///project/test');
      expect(result).toEqual({
        contents: [
          {
            uri: 'task:///project/test',
            mimeType: 'application/json',
            text: JSON.stringify([mockTask]),
          },
        ],
      });
      expect(mockTaskService.listTasks).toHaveBeenCalledWith({ query: 'project:test status:pending' });
    });

    it('should handle tag resource', async () => {
      mockTaskService.listTasks.mockResolvedValue([mockTask]);
      const result = await handler.readResource('task:///tag/test');
      expect(result).toEqual({
        contents: [
          {
            uri: 'task:///tag/test',
            mimeType: 'application/json',
            text: JSON.stringify([mockTask]),
          },
        ],
      });
      expect(mockTaskService.listTasks).toHaveBeenCalledWith({ query: `"+(test)" status:pending` });
    });

    it('should throw error for unknown resource', async () => {
      await expect(handler.readResource('task:///unknown')).rejects.toThrow('Unknown resource URI');
    });
  });

  describe('subscriptions', () => {
    it('should manage subscriptions', () => {
      const uri = 'task:///list';
      handler.subscribe(uri);
      expect(handler.getSubscriptions()).toEqual([uri]);
      handler.unsubscribe(uri);
      expect(handler.getSubscriptions()).toEqual([]);
    });
  });

  describe('registerResources', () => {
    it('should register all resource handlers with the server', () => {
      handler.registerResources(mockServer);

      expect(mockSetRequestHandler).toHaveBeenCalledTimes(6);

      // Verify each handler was registered
      const calls = mockSetRequestHandler.mock.calls;

      // List resources handler - returns actual resources
      expect(calls[0][0]).toBe(ListResourcesRequestSchema);

      // List resource templates handler - returns templates
      expect(calls[1][0]).toBe(ListResourceTemplatesRequestSchema);

      // Read resource handler
      expect(calls[2][0]).toBe(ReadResourceRequestSchema);

      // Subscribe handler
      expect(calls[3][0]).toBe(SubscribeRequestSchema);

      // Unsubscribe handler
      expect(calls[4][0]).toBe(UnsubscribeRequestSchema);

      // Completion handler
      expect(calls[5][0]).toBe(CompleteRequestSchema);
    });

    it('should register handlers with correct response types', async () => {
      // Setup mock tasks
      const mockTasks: Task[] = [
        {
          id: '1',
          description: 'Test task 1',
          status: 'pending',
          project: 'test',
          tags: ['test'],
          entry: '2024-03-20T12:00:00Z',
          modified: '2024-03-20T12:00:00Z',
        },
      ];
      mockTaskService.listTasks.mockResolvedValue(mockTasks);
      mockTaskService.getTask.mockResolvedValue(mockTasks[0]);

      handler.registerResources(mockServer);

      const calls = mockSetRequestHandler.mock.calls;

      // Test list resources handler - returns actual resources
      const listResourcesHandler = calls[0][1];
      const listResourcesResult = await listResourcesHandler();
      expect(listResourcesResult).toEqual({
        resources: mockTasks.map(task => ({
          uri: `task:///task/${task.id}`,
          name: `Task ${task.id}`,
          description: task.description,
          mimeType: 'application/json',
          text: JSON.stringify(task),
        })),
      });

      // Test list resource templates handler - returns templates
      const listTemplatesHandler = calls[1][1];
      const listTemplatesResult = await listTemplatesHandler();
      expect(listTemplatesResult).toEqual({
        resourceTemplates: [
          {
            uriTemplate: 'task:///task/{id}',
            name: 'Task Detail',
            description: 'Detailed information about a specific task',
            mimeType: 'application/json',
          },
          {
            uriTemplate: 'task:///project/{name}',
            name: 'Project Tasks',
            description: 'Tasks belonging to a specific project',
            mimeType: 'application/json',
          },
          {
            uriTemplate: 'task:///tag/{name}',
            name: 'Tagged Tasks',
            description: 'Tasks with a specific tag',
            mimeType: 'application/json',
          },
        ],
      });

      // Test read resource handler
      const readResourceHandler = calls[2][1];
      const readResourceResult = await readResourceHandler({ params: { uri: 'task:///task/1' } });
      expect(readResourceResult).toEqual(await handler.readResource('task:///task/1'));

      // Test subscribe handler
      const subscribeHandler = calls[3][1];
      const subscribeResult = await subscribeHandler({ params: { uri: 'task:///task/1' } });
      expect(subscribeResult).toEqual({});
      expect(handler.getSubscriptions()).toContain('task:///task/1');

      // Test unsubscribe handler
      const unsubscribeHandler = calls[4][1];
      const unsubscribeResult = await unsubscribeHandler({ params: { uri: 'task:///task/1' } });
      expect(unsubscribeResult).toEqual({});
      expect(handler.getSubscriptions()).not.toContain('task:///task/1');
    });
  });

  describe('completion handling', () => {
    it('should handle project completions', async () => {
      const mockProjects = ['development', 'backend'];
      mockTaskService.getAvailableProjects.mockResolvedValue(mockProjects);

      const result = await handler.registerResources(mockServer);

      // Get the completion handler
      const completionHandler = mockSetRequestHandler.mock.calls.find(call => call[0] === CompleteRequestSchema)?.[1];

      const completionResult = await completionHandler({
        params: {
          ref: { uri: 'task:///project/' },
          argument: { value: 'dev' },
        },
      });

      expect(completionResult).toEqual({
        completion: {
          values: ['development'],
          total: 1,
          hasMore: false,
        },
      });
    });

    it('should handle tag completions', async () => {
      const mockTags = ['bug', 'feature'];
      mockTaskService.getAvailableTags.mockResolvedValue(mockTags);

      const result = await handler.registerResources(mockServer);

      // Get the completion handler
      const completionHandler = mockSetRequestHandler.mock.calls.find(call => call[0] === CompleteRequestSchema)?.[1];

      const completionResult = await completionHandler({
        params: {
          ref: { uri: 'task:///tag/' },
          argument: { value: 'bug' },
        },
      });

      expect(completionResult).toEqual({
        completion: {
          values: ['bug'],
          total: 1,
          hasMore: false,
        },
      });
    });

    it('should return empty completions for unknown resource types', async () => {
      const result = await handler.registerResources(mockServer);

      // Get the completion handler
      const completionHandler = mockSetRequestHandler.mock.calls.find(call => call[0] === CompleteRequestSchema)?.[1];

      const completionResult = await completionHandler({
        params: {
          ref: { uri: 'task:///unknown/' },
          argument: { value: 'test' },
        },
      });

      expect(completionResult).toEqual({
        completion: {
          values: [],
          total: 0,
          hasMore: false,
        },
      });
    });

    it('should handle completion requests with invalid ref types', async () => {
      const result = await handler.registerResources(mockServer);

      // Get the completion handler
      const completionHandler = mockSetRequestHandler.mock.calls.find(call => call[0] === CompleteRequestSchema)?.[1];

      const completionResult = await completionHandler({
        params: {
          ref: { type: 'invalid' },
          argument: { value: 'test' },
        },
      });

      expect(completionResult).toEqual({
        completion: {
          values: [],
          total: 0,
          hasMore: false,
        },
      });
    });
  });
});
