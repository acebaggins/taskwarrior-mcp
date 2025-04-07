import { z } from 'zod';

export const TASK_PROMPTS = {
  'today-project': {
    name: 'today-project',
    description: 'Get all tasks for a specific project that are scheduled for today',
    argsSchema: z.object({
      project: z.string().describe('Project name to filter tasks'),
    }),
  },
  'start-work': {
    name: 'start-work',
    description: "Start working on a task and add a note about what you're working on",
    argsSchema: z.object({
      description: z.string().describe('Task description to start working on'),
      focus: z.string().optional().describe("What you're specifically working on"),
    }),
  },
  'complete-with-review': {
    name: 'complete-with-review',
    description: 'Mark a task as complete and add a review note about what was accomplished',
    argsSchema: z.object({
      description: z.string().describe('Task description to complete'),
      accomplished: z.string().describe('What was accomplished in this task'),
    }),
  },
  'search-notes': {
    name: 'search-notes',
    description: 'Display all annotations for tasks matching a description',
    argsSchema: z.object({
      description: z.string().describe('Task description to search for (can be partial)'),
    }),
  },
} as const;

export type TaskPromptName = keyof typeof TASK_PROMPTS;

export const getPromptMessage = (name: TaskPromptName, args: Record<string, string>): string => {
  switch (name) {
    case 'today-project':
      return `List all tasks in project "${args.project}" that are scheduled for today`;

    case 'start-work': {
      const focusNote = args.focus ? ` and add a note that I'm focusing on: ${args.focus}` : '';
      return `Start working on task "${args.description}"${focusNote}`;
    }

    case 'complete-with-review': {
      const accomplishedNote = args.accomplished ? `: ${args.accomplished}` : '';
      return `Mark task "${args.description}" as complete${accomplishedNote ? ` and add a note about what was accomplished${accomplishedNote}` : ''}`;
    }

    case 'search-notes':
      return `Find all tasks with description containing "${args.description}" and show their notes and annotations`;

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
};
