import { TaskToolsHandler } from '../task-tools-handler.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TaskWarriorService } from '../../services/taskwarrior.js';
import { Task, TaskStatus } from '../../types/task.js';

describe('TaskTools', () => {
  let tools: TaskToolsHandler;
  let mockServer: jest.Mocked<McpServer>;
  let mockTool: jest.Mock;
  let mockTaskService: jest.Mocked<TaskWarriorService>;

  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: '1',
    description: 'Test task',
    status: 'pending' as TaskStatus,
    entry: '2024-01-01T00:00:00Z',
    modified: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    mockTool = jest.fn();
    mockServer = {
      tool: mockTool,
    } as unknown as jest.Mocked<McpServer>;

    mockTaskService = {
      createTask: jest.fn(),
      startTask: jest.fn(),
      stopTask: jest.fn(),
      completeTask: jest.fn(),
      addAnnotation: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      getTask: jest.fn(),
      listTasks: jest.fn(),
    } as unknown as jest.Mocked<TaskWarriorService>;

    tools = new TaskToolsHandler(mockTaskService);
  });

  describe('registerTools', () => {
    it('should register all tools with the server', () => {
      tools.registerTools(mockServer);

      expect(mockTool).toHaveBeenCalledTimes(9);
      const toolNames = mockTool.mock.calls.map(call => call[0]);
      expect(toolNames).toEqual([
        'create_task',
        'start_task',
        'stop_task',
        'complete_task',
        'add_note',
        'update_task',
        'delete_task',
        'get_task',
        'list_tasks',
      ]);
    });

    describe('create_task', () => {
      it('should handle successful task creation', async () => {
        tools.registerTools(mockServer);
        const createTaskHandler = mockTool.mock.calls[0][3];

        const mockTask = createMockTask();
        mockTaskService.createTask.mockResolvedValue(mockTask);

        const result = await createTaskHandler({
          description: 'Test task',
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockTask),
            },
          ],
        });
        expect(mockTaskService.createTask).toHaveBeenCalledWith({
          description: 'Test task',
        });
      });

      it('should handle task creation errors', async () => {
        tools.registerTools(mockServer);
        const createTaskHandler = mockTool.mock.calls[0][3];

        const error = new Error('Failed to create task');
        mockTaskService.createTask.mockRejectedValue(error);

        const result = await createTaskHandler({
          description: 'Test task',
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: `Error creating task: ${error}`,
            },
          ],
          isError: true,
        });
      });
    });

    describe('start_task', () => {
      it('should handle successful task start', async () => {
        tools.registerTools(mockServer);
        const startTaskHandler = mockTool.mock.calls[1][3];

        const mockTask = createMockTask();
        mockTaskService.startTask.mockResolvedValue(mockTask);

        const result = await startTaskHandler({
          id: '1',
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockTask),
            },
          ],
        });
        expect(mockTaskService.startTask).toHaveBeenCalledWith('1');
      });

      it('should add note when provided', async () => {
        tools.registerTools(mockServer);
        const startTaskHandler = mockTool.mock.calls[1][3];

        const mockTask = createMockTask();
        mockTaskService.startTask.mockResolvedValue(mockTask);
        mockTaskService.addAnnotation.mockResolvedValue(mockTask);

        const result = await startTaskHandler({
          id: '1',
          note: 'Starting work',
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockTask),
            },
          ],
        });
        expect(mockTaskService.addAnnotation).toHaveBeenCalledWith('1', 'Starting work');
      });
    });

    describe('stop_task', () => {
      it('should handle successful task stop', async () => {
        tools.registerTools(mockServer);
        const stopTaskHandler = mockTool.mock.calls[2][3];

        const mockTask = createMockTask();
        mockTaskService.stopTask.mockResolvedValue(mockTask);

        const result = await stopTaskHandler({
          id: '1',
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockTask),
            },
          ],
        });
        expect(mockTaskService.stopTask).toHaveBeenCalledWith('1');
      });

      it('should add note when provided', async () => {
        tools.registerTools(mockServer);
        const stopTaskHandler = mockTool.mock.calls[2][3];

        const mockTask = createMockTask();
        mockTaskService.stopTask.mockResolvedValue(mockTask);
        mockTaskService.addAnnotation.mockResolvedValue(mockTask);

        const result = await stopTaskHandler({
          id: '1',
          note: 'Stopping work',
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockTask),
            },
          ],
        });
        expect(mockTaskService.addAnnotation).toHaveBeenCalledWith('1', 'Stopping work');
      });
    });

    describe('complete_task', () => {
      it('should handle successful task completion', async () => {
        tools.registerTools(mockServer);
        const completeTaskHandler = mockTool.mock.calls[3][3];

        const mockTask = createMockTask({ status: 'completed' as TaskStatus });
        mockTaskService.completeTask.mockResolvedValue(mockTask);

        const result = await completeTaskHandler({
          id: '1',
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockTask),
            },
          ],
        });
        expect(mockTaskService.completeTask).toHaveBeenCalledWith('1');
      });

      it('should add note when provided', async () => {
        tools.registerTools(mockServer);
        const completeTaskHandler = mockTool.mock.calls[3][3];

        const mockTask = createMockTask({ status: 'completed' as TaskStatus });
        mockTaskService.completeTask.mockResolvedValue(mockTask);
        mockTaskService.addAnnotation.mockResolvedValue(mockTask);

        const result = await completeTaskHandler({
          id: '1',
          note: 'Task completed',
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockTask),
            },
          ],
        });
        expect(mockTaskService.addAnnotation).toHaveBeenCalledWith('1', 'Task completed');
      });
    });

    describe('add_note', () => {
      it('should handle successful note addition', async () => {
        tools.registerTools(mockServer);
        const addNoteHandler = mockTool.mock.calls[4][3];

        const mockTask = createMockTask();
        mockTaskService.addAnnotation.mockResolvedValue(mockTask);

        const result = await addNoteHandler({
          id: '1',
          note: 'Test note',
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockTask),
            },
          ],
        });
        expect(mockTaskService.addAnnotation).toHaveBeenCalledWith('1', 'Test note');
      });
    });

    describe('update_task', () => {
      it('should handle successful task update', async () => {
        tools.registerTools(mockServer);
        const updateTaskHandler = mockTool.mock.calls[5][3];

        const mockTask = createMockTask({ description: 'Updated task' });
        mockTaskService.updateTask.mockResolvedValue(mockTask);

        const result = await updateTaskHandler({
          id: '1',
          description: 'Updated task',
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockTask),
            },
          ],
        });
        expect(mockTaskService.updateTask).toHaveBeenCalledWith('1', {
          description: 'Updated task',
        });
      });
    });

    describe('delete_task', () => {
      it('should handle successful task deletion', async () => {
        tools.registerTools(mockServer);
        const deleteTaskHandler = mockTool.mock.calls[6][3];

        mockTaskService.deleteTask.mockResolvedValue(true);

        const result = await deleteTaskHandler({
          id: '1',
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: 'Task deleted successfully',
            },
          ],
        });
        expect(mockTaskService.deleteTask).toHaveBeenCalledWith('1');
      });
    });

    describe('get_task', () => {
      it('should handle successful task retrieval', async () => {
        tools.registerTools(mockServer);
        const getTaskHandler = mockTool.mock.calls[7][3];

        const mockTask = createMockTask();
        mockTaskService.getTask.mockResolvedValue(mockTask);

        const result = await getTaskHandler({
          id: '1',
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockTask),
            },
          ],
        });
        expect(mockTaskService.getTask).toHaveBeenCalledWith('1');
      });

      it('should handle task not found', async () => {
        tools.registerTools(mockServer);
        const getTaskHandler = mockTool.mock.calls[7][3];

        mockTaskService.getTask.mockResolvedValue(null);

        const result = await getTaskHandler({
          id: '1',
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: 'Task not found',
            },
          ],
          isError: true,
        });
      });
    });

    describe('list_tasks', () => {
      it('should handle successful task listing', async () => {
        tools.registerTools(mockServer);
        const listTasksHandler = mockTool.mock.calls[8][3];

        const mockTasks = [
          createMockTask({ id: '1', description: 'Task 1' }),
          createMockTask({ id: '2', description: 'Task 2' }),
        ];
        mockTaskService.listTasks.mockResolvedValue(mockTasks);

        const result = await listTasksHandler({
          query: 'project:test',
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockTasks),
            },
          ],
        });
        expect(mockTaskService.listTasks).toHaveBeenCalledWith({
          query: 'project:test',
        });
      });
    });
  });
});
