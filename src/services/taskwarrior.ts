import { exec } from 'child_process';
import { promisify } from 'util';
import {
  Task,
  TaskUpdate,
  TaskQuery,
  TaskwarriorTask,
  RecurrenceFrequency,
  TaskDependency,
  TaskPriority,
} from '../types/task';

export const execAsync = promisify(exec);

export class TaskWarriorService {
  private readonly environmentVariables: Record<string, string | undefined>;

  constructor(options?: { taskData?: string; taskRc?: string; additionalEnvVars?: Record<string, string> }) {
    this.mapTask = this.mapTask.bind(this);
    this.parseTaskwarriorTimestamp = this.parseTaskwarriorTimestamp.bind(this);
    this.formatDateForTaskwarrior = this.formatDateForTaskwarrior.bind(this);

    this.environmentVariables = {
      ...process.env,
      ...(options?.taskData && { TASKDATA: options.taskData }),
      ...(options?.taskRc && { TASKRC: options.taskRc }),
      ...options?.additionalEnvVars,
    };
  }

  private async executeCommand(command: string): Promise<string> {
    const { stdout } = await execAsync(command, {
      env: this.environmentVariables,
    });
    return stdout;
  }

  async listTasks(query: TaskQuery): Promise<Task[]> {
    try {
      const queryString = query.query
        ? `${this.sanitizeQuery(query.query)}${query.query.includes('+DELETED') ? '' : ' -DELETED'}`
        : '-DELETED';
      const command = `task ${queryString} export`;
      const stdout = await this.executeCommand(command);
      const tasks = JSON.parse(stdout) as TaskwarriorTask[];
      return tasks.map((task: TaskwarriorTask) => this.mapTask(task));
    } catch (error) {
      console.error('Failed to list tasks:', error);
      throw error;
    }
  }

  async getTask(uuid: string): Promise<Task | null> {
    try {
      const stdout = await this.executeCommand(`task ${uuid} export`);
      const tasks = JSON.parse(stdout) as TaskwarriorTask[];
      return tasks.length ? this.mapTask(tasks[0]) : null;
    } catch (error) {
      console.error('Failed to get task:', error);
      return null;
    }
  }

  private async getAvailableItems(command: string, headerText: string): Promise<string[]> {
    try {
      const stdout = await this.executeCommand(command);
      // Split by newlines and skip the header line
      const lines = stdout.split('\n').slice(1);
      const items: string[] = [];

      for (const line of lines) {
        // Skip empty lines and the summary line
        if (!line.trim() || line.toLowerCase().includes(headerText.toLowerCase())) continue;

        // Extract item name (first word before whitespace)
        const item = line.trim().split(/\s+/)[0];
        if (item) {
          items.push(item);
        }
      }

      return items;
    } catch (error) {
      console.error(`Failed to get available ${headerText}s:`, error);
      throw error;
    }
  }

  async getAvailableProjects(): Promise<string[]> {
    return this.getAvailableItems('task projects', 'project');
  }

  async getAvailableTags(): Promise<string[]> {
    return this.getAvailableItems('task tags', 'tag');
  }

  async createTask(task: TaskUpdate): Promise<Task> {
    const args = this.buildTaskArgs(task);
    const stdout = await this.executeCommand(`task add ${args.join(' ')}`);
    // Extract UUID from "Created task UUID." response
    const uuid = stdout.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1];
    if (!uuid) throw new Error('Failed to create task');

    // Get the newly created task
    const createdTask = await this.getTask(uuid);
    if (!createdTask) throw new Error('Failed to retrieve created task');
    return createdTask;
  }

  async updateTask(uuid: string, taskUpdate: TaskUpdate): Promise<Task> {
    const args = this.buildTaskArgs(taskUpdate);
    await this.executeCommand(`task ${uuid} modify ${args.join(' ')}`);
    const task = await this.getTask(uuid);
    if (!task) throw new Error('Failed to retrieve updated task');
    return task;
  }

  async updateDependencies(uuid: string, dependencies: TaskDependency): Promise<Task> {
    // Handle each dependency separately
    for (const dep of dependencies.dependencies) {
      await this.executeCommand(`task ${uuid} modify depends:${dep}`);
    }
    const task = await this.getTask(uuid);
    if (!task) throw new Error('Failed to retrieve task with updated dependencies');
    return task;
  }

  async deleteTask(uuid: string): Promise<boolean> {
    try {
      const task = await this.getTask(uuid);
      if (!task) return false;
      await this.executeCommand(`task ${uuid} delete rc.confirmation=off`);
      return true;
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  }

  async startTask(uuid: string): Promise<Task> {
    await this.executeCommand(`task ${uuid} start`);
    const task = await this.getTask(uuid);
    if (!task) throw new Error('Failed to retrieve started task');
    return task;
  }

  async stopTask(uuid: string): Promise<Task> {
    await this.executeCommand(`task ${uuid} stop`);
    const task = await this.getTask(uuid);
    if (!task) throw new Error('Failed to retrieve stopped task');
    return task;
  }

  async completeTask(uuid: string): Promise<Task> {
    await this.executeCommand(`task ${uuid} done`);
    const task = await this.getTask(uuid);
    if (!task) throw new Error('Failed to retrieve completed task');
    return task;
  }

  async addAnnotation(uuid: string, description: string): Promise<Task> {
    await this.executeCommand(`task ${uuid} annotate "${description}"`);
    const task = await this.getTask(uuid);
    if (!task) throw new Error('Failed to retrieve task with new annotation');
    return task;
  }

  private mapTask(task: TaskwarriorTask): Task {
    return {
      id: task.uuid,
      description: task.description,
      status: task.status as Task['status'],
      project: task.project,
      tags: task.tags,
      due: this.parseTaskWarriorTimestampUnsafe(task.due),
      start: this.parseTaskWarriorTimestampUnsafe(task.start),
      end: this.parseTaskWarriorTimestampUnsafe(task.end),
      priority: (task.priority as TaskPriority) || 'M', // Default to 'M' if not specified
      urgency: task.urgency,
      wait: this.parseTaskWarriorTimestampUnsafe(task.wait),
      scheduled: this.parseTaskWarriorTimestampUnsafe(task.scheduled),
      dependencies: task.depends,
      annotations:
        task.annotations?.map(ann => ({
          date: this.parseTaskwarriorTimestamp(ann.entry),
          description: ann.description,
        })) || [],
      entry: this.parseTaskwarriorTimestamp(task.entry),
      modified: this.parseTaskwarriorTimestamp(task.modified),
      recurrence: task.recur
        ? {
            frequency: this.mapRecurrenceFrequency(task.recur),
            interval: 1, // Taskwarrior doesn't support intervals in the same way
            until: this.parseTaskWarriorTimestampUnsafe(task.until),
          }
        : undefined,
    };
  }

  private mapRecurrenceFrequency(freq: string): RecurrenceFrequency {
    // Handle Taskwarrior's recurrence syntax
    const normalizedFreq = freq.toLowerCase().replace(/^recur:/, '');
    switch (normalizedFreq) {
      case 'daily':
        return 'daily';
      case 'weekly':
        return 'weekly';
      case 'monthly':
        return 'monthly';
      case 'yearly':
        return 'yearly';
      default:
        throw new Error(`Invalid recurrence frequency: ${freq}`);
    }
  }

  private buildTaskArgs(task: TaskUpdate): string[] {
    const args: string[] = [];

    if (task.description) {
      args.push(`"description:${task.description}"`);
    }
    if (task.tags) {
      task.tags.forEach(tag => args.push(`tag:${tag}`));
    }
    if (task.project) {
      args.push(`project:${task.project}`);
    }
    if (task.priority) {
      args.push(`priority:${task.priority}`);
    }
    if (task.due) {
      args.push(`due:${task.due}`);
    }
    if (task.wait) {
      args.push(`wait:${task.wait}`);
    }
    if (task.scheduled) {
      args.push(`scheduled:${task.scheduled}`);
    }
    if (task.recurrence) {
      const { frequency, interval, until } = task.recurrence;
      args.push(`recur:${frequency}`);
      if (interval > 1) {
        args.push(`interval:${interval}`);
      }
      if (until) {
        args.push(`until:${until}`);
      }
    }

    return args;
  }

  private parseTaskWarriorTimestampUnsafe(timestamp: string | undefined): string | undefined {
    if (!timestamp) return undefined;
    return this.parseTaskwarriorTimestamp(timestamp);
  }

  private parseTaskwarriorTimestamp(timestamp: string | undefined): string {
    if (!timestamp) return new Date().toISOString();

    // If it's already in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ), return as is
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}Z)?$/.test(timestamp)) {
      return timestamp;
    }

    // TaskWarrior format: YYYYMMDDTHHMMSSZ
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    const hour = timestamp.substring(9, 11);
    const minute = timestamp.substring(11, 13);
    const second = timestamp.substring(13, 15);

    // If we have a time component, include it
    if (hour && minute) {
      return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
    }
    // Otherwise just return the date
    return `${year}-${month}-${day}`;
  }

  private formatDateForTaskwarrior(date: string): string {
    // If it's already in the correct format (YYYY-MM-DD or YYYY-MM-DDTHH:mm), return as is
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(date)) {
      return date;
    }

    // Handle Taskwarrior format (e.g., 20250327T061405Z)
    const taskwarriorFormat = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/;
    if (taskwarriorFormat.test(date)) {
      const [, year, month, day, hours, minutes] = date.match(taskwarriorFormat) || [];
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // Otherwise parse and format from other date formats
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    // If the original date had a time component, include it
    if (date.includes('T')) {
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    return `${year}-${month}-${day}`;
  }

  private sanitizeQuery(query: string): string {
    // Remove any shell metacharacters that could be used for command injection
    return query.replace(/[;&|`$]/g, '');
  }
}
