import { Task, TaskUpdate, TaskQuery } from './task';

export type MCPMessageType =
  | 'task.create'
  | 'task.update'
  | 'task.delete'
  | 'task.get'
  | 'task.list'
  | 'task.start'
  | 'task.stop'
  | 'task.complete'
  | 'task.annotate'
  | 'backup.create';

export interface MCPMessage<T = any> {
  type: MCPMessageType;
  payload: T;
}

export interface MCPResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Task-specific message payloads
export interface TaskCreatePayload extends TaskUpdate {}
export interface TaskUpdatePayload extends TaskUpdate {
  id: string;
}
export interface TaskDeletePayload {
  id: string;
}
export interface TaskGetPayload {
  id: string;
}
export interface TaskListPayload extends TaskQuery {}
export interface TaskStartPayload {
  id: string;
  note?: string;
}
export interface TaskStopPayload {
  id: string;
  note?: string;
}
export interface TaskCompletePayload {
  id: string;
  note?: string;
}
export interface TaskAnnotatePayload {
  id: string;
  note: string;
  isAnnotation?: boolean;
}

// Backup-specific message payloads
export interface BackupCreatePayload {
  // No additional payload needed for now
}

export interface MCPServerConfig {
  taskwarriorService: TaskwarriorService;
}

export interface TaskwarriorService {
  createTask(task: TaskUpdate): Promise<Task>;
  updateTask(id: string, task: TaskUpdate): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  getTask(id: string): Promise<Task | null>;
  listTasks(query: TaskQuery): Promise<Task[]>;
  startTask(id: string, note?: string): Promise<Task>;
  stopTask(id: string, note?: string): Promise<Task>;
  completeTask(id: string, note?: string): Promise<Task>;
  addNote(id: string, note: string, isAnnotation?: boolean): Promise<Task>;
}
