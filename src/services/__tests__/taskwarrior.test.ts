import { TaskWarriorService } from '../taskwarrior';
import { taskTestConfig } from './taskwarrior-setup';

describe('TaskWarriorService', () => {
  let service: TaskWarriorService;
  let testTaskUuid: string;

  beforeAll(() => {
    service = new TaskWarriorService({
      taskData: taskTestConfig.taskData,
      taskRc: taskTestConfig.taskRc,
    });
  }, 30_000); // 30 second timeout

  describe('Task CRUD Operations', () => {
    it('should create a task', async () => {
      const task = await service.createTask({
        description: 'Test task for API testing',
        tags: ['api-test'],
        project: 'test',
        priority: 'M',
      });

      expect(task).toBeDefined();
      expect(task.description).toBe('Test task for API testing');
      expect(task.tags).toContain('api-test');
      expect(task.project).toBe('test');
      expect(task.priority).toBe('M');
      expect(task.status).toBe('pending');
      expect(task.entry).toBeDefined();
      expect(task.modified).toBeDefined();

      testTaskUuid = task.id;
    });

    it('should create a task with all optional fields', async () => {
      const task = await service.createTask({
        description: 'Test task with all fields',
        tags: ['api-test'],
        project: 'test',
        priority: 'H',
        due: '2024-04-01T10:00Z',
        wait: '2024-03-25T10:00Z',
        scheduled: '2024-03-26T10:00Z',
        recurrence: {
          frequency: 'weekly',
          interval: 1,
          until: '2024-12-31T10:00Z',
        },
      });

      expect(task).toBeDefined();
      expect(task.description).toBe('Test task with all fields');
      expect(task.priority).toBe('H');
      expect(task.due).toBe('2024-04-01T10:00:00Z');
      expect(task.wait).toBe('2024-03-25T10:00:00Z');
      expect(task.scheduled).toBe('2024-03-26T10:00:00Z');
      expect(task.recurrence).toBeDefined();
      expect(task.recurrence?.frequency).toBe('weekly');
      expect(task.recurrence?.interval).toBe(1);
      expect(task.recurrence?.until).toBe('2024-12-31T10:00:00Z');
    });

    it('should get a task by UUID', async () => {
      const task = await service.getTask(testTaskUuid);
      expect(task).toBeDefined();
      expect(task?.id).toBe(testTaskUuid);
    });

    it('should update a task', async () => {
      const updatedTask = await service.updateTask(testTaskUuid, {
        description: 'Updated test task',
        priority: 'H',
        wait: '2024-03-28T10:00Z',
        scheduled: '2024-03-29T10:00Z',
      });

      expect(updatedTask.description).toBe('Updated test task');
      expect(updatedTask.priority).toBe('H');
      expect(updatedTask.wait).toBe('2024-03-28T10:00:00Z');
      expect(updatedTask.scheduled).toBe('2024-03-29T10:00:00Z');
    });

    it('should get available projects', async () => {
      const projects = await service.getAvailableProjects();
      expect(projects).toContain('test');
    });

    it('should get available tags', async () => {
      const tags = await service.getAvailableTags();
      expect(tags).toContain('api-test');
    });
  });

  describe('Task Queries', () => {
    it('should list tasks with filters', async () => {
      const tasks = await service.listTasks({ query: 'tag:api-test' });
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks[0].tags).toContain('api-test');
    });

    it('should support complex queries', async () => {
      testTaskUuid = (
        await service.createTask({
          description: 'Test task for API testing',
          tags: ['api-test'],
          project: 'test',
          priority: 'M',
        })
      ).id;

      const tasks = await service.listTasks({
        query: 'tag:api-test -COMPLETED',
      });

      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.every(t => t.project === 'test')).toBe(true);
      expect(tasks.every(t => t.status !== 'completed')).toBe(true);
    });
  });

  describe('Task State Operations', () => {
    it('should start and stop a task', async () => {
      const startedTask = await service.startTask(testTaskUuid);
      expect(startedTask.start).toBeDefined();

      const stoppedTask = await service.stopTask(testTaskUuid);
      expect(stoppedTask.start).toBeUndefined();
    });

    it('should complete a task', async () => {
      const completedTask = await service.completeTask(testTaskUuid);
      expect(completedTask.status).toBe('completed');
      expect(completedTask.end).toBeDefined();
    });
  });

  describe('Task Annotations', () => {
    let annotationTaskUuid: string;

    beforeEach(async () => {
      const task = await service.createTask({
        description: 'Test task for annotations',
        tags: ['api-test'],
        project: 'test',
        priority: 'M',
      });
      annotationTaskUuid = task.id;
    }, 10000);

    afterEach(async () => {
      try {
        await service.deleteTask(annotationTaskUuid);
      } catch (error) {
        console.error('Failed to clean up test task:', error);
      }
    }, 10000);

    it('should add annotations', async () => {
      const taskWithAnnotation = await service.addAnnotation(annotationTaskUuid, 'Test annotation');

      expect(taskWithAnnotation.annotations).toHaveLength(1);
      expect(taskWithAnnotation.annotations![0].description).toBe('Test annotation');
      expect(taskWithAnnotation.annotations![0].date).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent task UUID', async () => {
      const task = await service.getTask('non-existent-uuid');
      expect(task).toBeNull();
    });

    it('should handle invalid task operations', async () => {
      await expect(service.updateTask('non-existent-uuid', { description: 'test' })).rejects.toThrow();
    });

    it('should not throw when a non-existant task is deleted', async () => {
      const result = await service.deleteTask('non-existant-uuid');
      expect(result).toBe(false);
    });
  });
});
