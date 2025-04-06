import Fuse from 'fuse.js';
import { TaskWarriorService } from './taskwarrior.js';
import { Task } from '../types/task.js';

export class CompletionService {
  private projectFuse: Fuse<string>;
  private tagFuse: Fuse<string>;
  private taskFuse: Fuse<Task>;
  private taskService: TaskWarriorService;
  private projectsLoaded: boolean = false;
  private tagsLoaded: boolean = false;
  private tasksLoaded: boolean = false;
  private projects: string[] = [];
  private tags: string[] = [];
  private tasks: Task[] = [];

  constructor(taskService: TaskWarriorService) {
    this.taskService = taskService;
    // Initialize empty Fuse instances - we'll populate them when needed
    this.projectFuse = new Fuse([], {
      threshold: 0.3,
      includeScore: true,
      useExtendedSearch: true
    });
    this.tagFuse = new Fuse([], {
      threshold: 0.3,
      includeScore: true,
      useExtendedSearch: true
    });
    this.taskFuse = new Fuse([], {
      keys: ['description'],
      threshold: 0.3,
      includeScore: true,
      useExtendedSearch: true
    });
  }

  private async ensureProjectsLoaded() {
    if (!this.projectsLoaded) {
      this.projects = await this.taskService.getAvailableProjects();
      this.projectFuse.setCollection(this.projects);
      this.projectsLoaded = true;
    }
  }

  private async ensureTagsLoaded() {
    if (!this.tagsLoaded) {
      this.tags = await this.taskService.getAvailableTags();
      this.tagFuse.setCollection(this.tags);
      this.tagsLoaded = true;
    }
  }

  private async ensureTasksLoaded() {
    if (!this.tasksLoaded) {
      this.tasks = await this.taskService.listTasks({ query: "status:pending" });
      this.taskFuse.setCollection(this.tasks);
      this.tasksLoaded = true;
    }
  }

  async completeProjects(input: string): Promise<{ values: string[], total: number, hasMore: boolean }> {
    await this.ensureProjectsLoaded();
    if (!input.trim()) {
      return {
        values: this.projects,
        total: this.projects.length,
        hasMore: false
      };
    }
    const results = this.projectFuse.search(input);
    return {
      values: results.map(r => r.item),
      total: results.length,
      hasMore: false
    };
  }

  async completeTags(input: string): Promise<{ values: string[], total: number, hasMore: boolean }> {
    await this.ensureTagsLoaded();
    if (!input.trim()) {
      return {
        values: this.tags,
        total: this.tags.length,
        hasMore: false
      };
    }
    const results = this.tagFuse.search(input);
    return {
      values: results.map(r => r.item),
      total: results.length,
      hasMore: false
    };
  }

  async completeTaskDescriptions(input: string): Promise<{ values: string[], total: number, hasMore: boolean }> {
    await this.ensureTasksLoaded();
    if (!input.trim()) {
      return {
        values: this.tasks.map(t => t.description),
        total: this.tasks.length,
        hasMore: false
      };
    }
    const results = this.taskFuse.search(input);
    return {
      values: results.map(r => r.item.description),
      total: results.length,
      hasMore: false
    };
  }
} 