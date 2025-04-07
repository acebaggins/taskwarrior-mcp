import { z } from 'zod';

export type TaskStatus = 'pending' | 'completed' | 'deleted' | 'recurring' | 'waiting';
export type TaskPriority = 'H' | 'M' | 'L';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Task {
  id: string;
  description: string;
  status: TaskStatus;
  project?: string;
  tags?: string[];
  due?: string;
  start?: string;
  end?: string;
  priority?: TaskPriority;
  urgency?: number;
  wait?: string;
  scheduled?: string;
  dependencies?: string[];
  annotations?: {
    date: string;
    description: string;
  }[];
  entry: string;
  modified: string;
  recurrence?: {
    frequency: RecurrenceFrequency;
    interval: number;
    until?: string;
  };
}

export interface TaskUpdate {
  description?: string;
  project?: string;
  tags?: string[];
  due?: string;
  start?: string;
  end?: string;
  priority?: TaskPriority;
  wait?: string;
  scheduled?: string;
  recurrence?: {
    frequency: RecurrenceFrequency;
    interval: number;
    until?: string;
  };
}

export interface TaskQuery {
  query?: string;
}

export interface TaskDependency {
  dependencies: string[];
}

export interface TaskwarriorTask {
  uuid: string;
  description: string;
  status: string;
  project?: string;
  tags?: string[];
  due?: string;
  start?: string;
  end?: string;
  priority?: string;
  urgency?: number;
  wait?: string;
  scheduled?: string;
  depends?: string[];
  annotations?: {
    entry: string;
    description: string;
  }[];
  entry: string;
  modified: string;
  recur?: string;
  until?: string;
}

export const TaskUpdateSchema = z.object({
  description: z.string().optional(),
  project: z.string().optional(),
  tags: z.array(z.string()).optional(),
  due: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  priority: z.enum(['H', 'M', 'L']).optional(),
  wait: z.string().optional(),
  scheduled: z.string().optional(),
  recurrence: z
    .object({
      frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
      interval: z.number(),
      until: z.string().optional(),
    })
    .optional(),
});
