import { z } from "zod";

export const TASK_PROMPTS = {
  "today-project": {
    name: "today-project",
    description: "Get all tasks for a specific project that are scheduled for today",
    argsSchema: z.object({
      project: z.string().describe("Project name to filter tasks")
    })
  },
  "start-work": {
    name: "start-work",
    description: "Start working on a task and add a note about what you're working on",
    argsSchema: z.object({
      id: z.string().describe("Task ID to start working on"),
      focus: z.string().describe("What you're specifically working on")
    })
  },
  "complete-with-review": {
    name: "complete-with-review",
    description: "Mark a task as complete and add a review note about what was accomplished",
    argsSchema: z.object({
      id: z.string().describe("Task ID to complete"),
      accomplished: z.string().describe("What was accomplished in this task")
    })
  },
  "search-notes": {
    name: "search-notes",
    description: "Find all notes and annotations for tasks matching a description",
    argsSchema: z.object({
      description: z.string().describe("Task description to search for (can be partial)")
    })
  }
} as const;

export type TaskPromptName = keyof typeof TASK_PROMPTS;

export const getPromptMessage = (name: TaskPromptName, args: Record<string, string>) => {
  switch (name) {
    case "today-project":
      return `List all tasks in project "${args.project}" that are scheduled for today`;
    
    case "start-work":
      return `Start working on task ${args.id} and add a note that I'm focusing on: ${args.focus}`;
    
    case "complete-with-review":
      return `Mark task ${args.id} as complete and add a note about what was accomplished: ${args.accomplished}`;
    
    case "search-notes":
      return `Find all tasks with description containing "${args.description}" and show their notes and annotations`;
    
    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}; 