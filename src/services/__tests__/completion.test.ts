import { CompletionService } from '../completion.js';
import { TaskWarriorService } from '../taskwarrior.js';

describe('CompletionService', () => {
  let completionService: CompletionService;
  let mockTaskService: jest.Mocked<TaskWarriorService>;

  beforeEach(() => {
    mockTaskService = {
      getAvailableProjects: jest.fn(),
      getAvailableTags: jest.fn(),
    } as unknown as jest.Mocked<TaskWarriorService>;

    completionService = new CompletionService(mockTaskService);
  });

  describe('completeProjects', () => {
    it('should return matching projects', async () => {
      const mockProjects = ['development', 'backend', 'frontend', 'devops'];
      mockTaskService.getAvailableProjects.mockResolvedValue(mockProjects);

      const result = await completionService.completeProjects('dev');
      
      expect(result.values).toEqual(['development', 'devops']);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('should handle empty input', async () => {
      const mockProjects = ['development', 'backend', 'frontend'];
      mockTaskService.getAvailableProjects.mockResolvedValue(mockProjects);

      const result = await completionService.completeProjects('');
      
      expect(result.values).toEqual(mockProjects);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(false);
    });

    it('should handle fuzzy matching', async () => {
      const mockProjects = ['development', 'backend', 'frontend'];
      mockTaskService.getAvailableProjects.mockResolvedValue(mockProjects);

      const result = await completionService.completeProjects('develpment');
      
      expect(result.values).toContain('development');
      expect(result.total).toBeGreaterThan(0);
    });
  });

  describe('completeTags', () => {
    it('should return matching tags', async () => {
      const mockTags = ['bug', 'feature', 'enhancement', 'backend'];
      mockTaskService.getAvailableTags.mockResolvedValue(mockTags);

      const result = await completionService.completeTags('back');
      
      expect(result.values).toEqual(['backend']);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should handle empty input', async () => {
      const mockTags = ['bug', 'feature', 'enhancement'];
      mockTaskService.getAvailableTags.mockResolvedValue(mockTags);

      const result = await completionService.completeTags('');
      
      expect(result.values).toEqual(mockTags);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(false);
    });

    it('should handle fuzzy matching', async () => {
      const mockTags = ['bug', 'feature', 'enhancement'];
      mockTaskService.getAvailableTags.mockResolvedValue(mockTags);

      const result = await completionService.completeTags('feat');
      
      expect(result.values).toContain('feature');
      expect(result.total).toBeGreaterThan(0);
    });
  });

  describe('caching', () => {
    it('should only load projects once', async () => {
      const mockProjects = ['development', 'backend'];
      mockTaskService.getAvailableProjects.mockResolvedValue(mockProjects);

      // First call
      await completionService.completeProjects('dev');
      // Second call
      await completionService.completeProjects('back');

      expect(mockTaskService.getAvailableProjects).toHaveBeenCalledTimes(1);
    });

    it('should only load tags once', async () => {
      const mockTags = ['bug', 'feature'];
      mockTaskService.getAvailableTags.mockResolvedValue(mockTags);

      // First call
      await completionService.completeTags('bug');
      // Second call
      await completionService.completeTags('feat');

      expect(mockTaskService.getAvailableTags).toHaveBeenCalledTimes(1);
    });
  });
}); 