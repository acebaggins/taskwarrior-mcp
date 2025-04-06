#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { TaskWarriorService } from './services/taskwarrior.js';
import { TaskResourceHandler } from './resources/task-resource-handler.js';
import { TaskPromptHandler } from './prompts/task-prompt-handler.js';
import { CompletionService } from './services/completion.js';

async function main() {
  const taskService = new TaskWarriorService();
  const completionService = new CompletionService(taskService);
  const taskResourceHandler = new TaskResourceHandler(taskService);
  const taskPromptHandler = new TaskPromptHandler(completionService);
  
  const server = new McpServer({
    name: "taskwarrior-mcp",
    version: "1.0.0",
  }, {
    capabilities: {
      tools: {},
      prompts: {},
      resources: {
        subscribe: true
      },
      completions: {}
    },
  });

  // Setup tools
  server.tool(
    "create_task",
    "Create a new task in Taskwarrior. This is the primary way to add new tasks to your task list. You can specify the task's description, project, tags, priority, and various dates.",
    {
      description: z.string().describe("The main description of the task. This is what you'll see in task lists."),
      project: z.string().optional().describe("The project this task belongs to. Helps organize related tasks."),
      tags: z.array(z.string()).optional().describe("Tags to categorize and filter tasks. Useful for grouping similar tasks."),
      priority: z.enum(['H', 'M', 'L']).optional().describe("Task priority: H (High), M (Medium), L (Low)."),
      due: z.string().optional().describe("Due date in YYYY-MM-DD format. When the task needs to be completed."),
      wait: z.string().optional().describe("Date in YYYY-MM-DD format when the task becomes active."),
      scheduled: z.string().optional().describe("Date in YYYY-MM-DD format when the task should be started.")
    },
    async (params) => {
      try {
        const task = await taskService.createTask(params);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(task)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error creating task: ${error}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "start_task",
    "Start working on a task. This will start the task's timer and optionally add a note about why you're starting it. Useful for tracking time spent on tasks.",
    {
      id: z.string().describe("The ID of the task to start working on."),
      note: z.string().optional().describe("Optional note to add when starting the task.")
    },
    async (params) => {
      try {
        const task = await taskService.startTask(params.id);
        if (params.note) {
          await taskService.addAnnotation(params.id, params.note);
        }
        return {
          content: [{
            type: "text",
            text: JSON.stringify(task)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error starting task: ${error}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "stop_task",
    "Stop working on a task. This will stop the task's timer and optionally add a note about why you're stopping. Useful for tracking interruptions or when switching tasks.",
    {
      id: z.string().describe("The ID of the task to stop working on."),
      note: z.string().optional().describe("Optional note to add when stopping the task.")
    },
    async (params) => {
      try {
        const task = await taskService.stopTask(params.id);
        if (params.note) {
          await taskService.addAnnotation(params.id, params.note);
        }
        return {
          content: [{
            type: "text",
            text: JSON.stringify(task)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error stopping task: ${error}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "complete_task",
    "Mark a task as complete. This will mark the task as done and optionally add a note about the completion. Useful for tracking task completion and adding final notes.",
    {
      id: z.string().describe("The ID of the task to mark as complete."),
      note: z.string().optional().describe("Optional note to add when completing the task.")
    },
    async (params) => {
      try {
        const task = await taskService.completeTask(params.id);
        if (params.note) {
          await taskService.addAnnotation(params.id, params.note);
        }
        return {
          content: [{
            type: "text",
            text: JSON.stringify(task)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error completing task: ${error}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "add_note",
    "Add a note or annotation to a task. Annotations are timestamped and useful for tracking progress or changes over time. Regular notes are good for general information.",
    {
      id: z.string().describe("The ID of the task to add a note to."),
      note: z.string().describe("The note text to add to the task."),
      isAnnotation: z.boolean().optional().describe("If true, adds the note as an annotation (timestamped). If false, adds as a regular note.")
    },
    async (params) => {
      try {
        const task = await taskService.addAnnotation(params.id, params.note);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(task)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error adding note: ${error}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "update_task",
    "Update an existing task's properties. You can modify any aspect of the task including its description, project, tags, priority, and dates. Useful for keeping tasks up to date.",
    {
      id: z.string().describe("The ID of the task to update."),
      description: z.string().optional().describe("New description for the task."),
      project: z.string().optional().describe("New project for the task."),
      tags: z.array(z.string()).optional().describe("New tags for the task."),
      priority: z.enum(['H', 'M', 'L']).optional().describe("New priority for the task."),
      due: z.string().optional().describe("New due date in YYYY-MM-DD format."),
      wait: z.string().optional().describe("New wait date in YYYY-MM-DD format."),
      scheduled: z.string().optional().describe("New scheduled date in YYYY-MM-DD format.")
    },
    async (params) => {
      try {
        const { id, ...update } = params;
        const task = await taskService.updateTask(id, update);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(task)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error updating task: ${error}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "delete_task",
    "Delete a task from your task list. This operation cannot be undone, so use with caution. Useful for removing tasks that are no longer relevant.",
    {
      id: z.string().describe("The ID of the task to delete.")
    },
    async (params) => {
      try {
        await taskService.deleteTask(params.id);
        return {
          content: [{
            type: "text",
            text: "Task deleted successfully"
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error deleting task: ${error}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "get_task",
    "Get detailed information about a specific task. This will return all the task's properties including its description, project, tags, priority, dates, and any notes or annotations.",
    {
      id: z.string().describe("The ID of the task to retrieve.")
    },
    async (params) => {
      try {
        const task = await taskService.getTask(params.id);
        if (!task) {
          return {
            content: [{
              type: "text",
              text: "Task not found"
            }],
            isError: true
          };
        }
        return {
          content: [{
            type: "text",
            text: JSON.stringify(task)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error getting task: ${error}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "list_tasks",
    "List tasks with optional filtering. You can use Taskwarrior's powerful filter syntax to find specific tasks based on their properties, status, or content.",
    {
      query: z.string().optional().describe("Optional Taskwarrior filter query to filter the task list.")
    },
    async (params) => {
      try {
        const tasks = await taskService.listTasks(params);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(tasks)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error listing tasks: ${error}`
          }],
          isError: true
        };
      }
    }
  );

  // Register handlers
  taskResourceHandler.registerResources(server);
  taskPromptHandler.registerPrompts(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Taskwarrior MCP running on stdio");
}

main().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
}); 