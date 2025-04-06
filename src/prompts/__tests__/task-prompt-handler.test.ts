import { TaskPromptHandler } from "../task-prompt-handler.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ListPromptsRequestSchema, GetPromptRequestSchema, CompleteRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { CompletionService } from "../../services/completion.js";

describe("TaskPromptHandler", () => {
  let handler: TaskPromptHandler;
  let mockServer: jest.Mocked<McpServer>;
  let mockSetRequestHandler: jest.Mock;
  let mockCompletionService: jest.Mocked<CompletionService>;

  beforeEach(() => {
    mockSetRequestHandler = jest.fn();
    mockServer = {
      server: {
        setRequestHandler: mockSetRequestHandler
      }
    } as unknown as jest.Mocked<McpServer>;

    mockCompletionService = {
      completeProjects: jest.fn(),
      completeTags: jest.fn(),
      completeTaskDescriptions: jest.fn()
    } as unknown as jest.Mocked<CompletionService>;

    handler = new TaskPromptHandler(mockCompletionService);
  });

  describe("registerPrompts", () => {
    it("should register both prompt handlers with the server", () => {
      handler.registerPrompts(mockServer);

      expect(mockSetRequestHandler).toHaveBeenCalledTimes(3);
      
      // Verify each handler was registered
      const calls = mockSetRequestHandler.mock.calls;
      expect(calls[0][0]).toBe(ListPromptsRequestSchema);
      expect(calls[1][0]).toBe(GetPromptRequestSchema);
      expect(calls[2][0]).toBe(CompleteRequestSchema);
    });

    it("should register handlers with correct response types", async () => {
      handler.registerPrompts(mockServer);
      
      const calls = mockSetRequestHandler.mock.calls;
      
      // Test list prompts handler
      const listPromptsHandler = calls[0][1];
      const listPromptsResult = await listPromptsHandler();
      expect(listPromptsResult).toEqual({
        prompts: [
          {
            name: "today-project",
            description: "Get all tasks for a specific project that are scheduled for today",
            arguments: [
              {
                name: "project",
                description: "Project name to filter tasks",
                required: true
              }
            ]
          },
          {
            name: "start-work",
            description: "Start working on a task and add a note about what you're working on",
            arguments: [
              {
                name: "description",
                description: "Task description to start working on",
                required: true
              },
              {
                name: "focus",
                description: "What you're specifically working on",
                required: false
              }
            ]
          },
          {
            name: "complete-with-review",
            description: "Mark a task as complete and add a review note about what was accomplished",
            arguments: [
              {
                name: "description",
                description: "Task description to complete",
                required: true
              },
              {
                name: "accomplished",
                description: "What was accomplished in this task",
                required: true
              }
            ]
          },
          {
            name: "search-notes",
            description: "Display all annotations for tasks matching a description",
            arguments: [
              {
                name: "description",
                description: "Task description to search for (can be partial)",
                required: true
              }
            ]
          }
        ]
      });
      
      // Test get prompt handler
      const getPromptHandler = calls[1][1];
      const getPromptResult = await getPromptHandler({
        params: {
          name: "start-work",
          arguments: {
            description: "Implement new feature",
            focus: "implementing feature"
          }
        }
      });
      expect(getPromptResult).toEqual({
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: "Start working on task \"Implement new feature\" and add a note that I'm focusing on: implementing feature"
          }
        }]
      });
    });

    it("should throw error for unknown prompt", async () => {
      handler.registerPrompts(mockServer);
      
      const calls = mockSetRequestHandler.mock.calls;
      const getPromptHandler = calls[1][1];
      
      await expect(getPromptHandler({
        params: {
          name: "unknown-prompt",
          arguments: {}
        }
      })).rejects.toThrow("Prompt not found: unknown-prompt");
    });

    describe("completion handler", () => {
      it("should handle project completion for today-project prompt", async () => {
        handler.registerPrompts(mockServer);
        const calls = mockSetRequestHandler.mock.calls;
        const completionHandler = calls[2][1];

        mockCompletionService.completeProjects.mockResolvedValue({
          values: ["project1", "project2"],
          total: 2,
          hasMore: false
        });

        const result = await completionHandler({
          params: {
            ref: {
              type: "ref/prompt",
              name: "today-project"
            },
            argument: {
              name: "project",
              value: "proj"
            }
          }
        });

        expect(result).toEqual({
          completion: {
            values: ["project1", "project2"],
            total: 2,
            hasMore: false
          }
        });
        expect(mockCompletionService.completeProjects).toHaveBeenCalledWith("proj");
      });

      it("should handle task description completion for start-work prompt", async () => {
        handler.registerPrompts(mockServer);
        const calls = mockSetRequestHandler.mock.calls;
        const completionHandler = calls[2][1];

        mockCompletionService.completeTaskDescriptions.mockResolvedValue({
          values: ["Implement new feature", "Fix bug in login"],
          total: 2,
          hasMore: false
        });

        const result = await completionHandler({
          params: {
            ref: {
              type: "ref/prompt",
              name: "start-work"
            },
            argument: {
              name: "description",
              value: "impl"
            }
          }
        });

        expect(result).toEqual({
          completion: {
            values: ["Implement new feature", "Fix bug in login"],
            total: 2,
            hasMore: false
          }
        });
        expect(mockCompletionService.completeTaskDescriptions).toHaveBeenCalledWith("impl");
      });

      it("should handle task description completion for complete-with-review prompt", async () => {
        handler.registerPrompts(mockServer);
        const calls = mockSetRequestHandler.mock.calls;
        const completionHandler = calls[2][1];

        mockCompletionService.completeTaskDescriptions.mockResolvedValue({
          values: ["Implement new feature", "Fix bug in login"],
          total: 2,
          hasMore: false
        });

        const result = await completionHandler({
          params: {
            ref: {
              type: "ref/prompt",
              name: "complete-with-review"
            },
            argument: {
              name: "description",
              value: "impl"
            }
          }
        });

        expect(result).toEqual({
          completion: {
            values: ["Implement new feature", "Fix bug in login"],
            total: 2,
            hasMore: false
          }
        });
        expect(mockCompletionService.completeTaskDescriptions).toHaveBeenCalledWith("impl");
      });

      it("should handle task description completion for search-notes prompt", async () => {
        handler.registerPrompts(mockServer);
        const calls = mockSetRequestHandler.mock.calls;
        const completionHandler = calls[2][1];

        mockCompletionService.completeTaskDescriptions.mockResolvedValue({
          values: ["Implement new feature", "Fix bug in login"],
          total: 2,
          hasMore: false
        });

        const result = await completionHandler({
          params: {
            ref: {
              type: "ref/prompt",
              name: "search-notes"
            },
            argument: {
              name: "description",
              value: "impl"
            }
          }
        });

        expect(result).toEqual({
          completion: {
            values: ["Implement new feature", "Fix bug in login"],
            total: 2,
            hasMore: false
          }
        });
        expect(mockCompletionService.completeTaskDescriptions).toHaveBeenCalledWith("impl");
      });

      it("should return empty completion for unknown prompt", async () => {
        handler.registerPrompts(mockServer);
        const calls = mockSetRequestHandler.mock.calls;
        const completionHandler = calls[2][1];

        const result = await completionHandler({
          params: {
            ref: {
              type: "ref/prompt",
              name: "unknown-prompt"
            },
            argument: {
              name: "some-arg",
              value: "some-value"
            }
          }
        });

        expect(result).toEqual({
          completion: {
            values: [],
            total: 0,
            hasMore: false
          }
        });
      });

      it("should return empty completion for non-prompt ref type", async () => {
        handler.registerPrompts(mockServer);
        const calls = mockSetRequestHandler.mock.calls;
        const completionHandler = calls[2][1];

        const result = await completionHandler({
          params: {
            ref: {
              type: "ref/resource",
              uri: "some-uri"
            },
            argument: {
              name: "some-arg",
              value: "some-value"
            }
          }
        });

        expect(result).toEqual({
          completion: {
            values: [],
            total: 0,
            hasMore: false
          }
        });
      });
    });
  });
}); 