import { TASK_PROMPTS, getPromptMessage } from "../prompts.js";

describe("Task Prompts", () => {
  describe("TASK_PROMPTS", () => {
    it("should have all required prompt definitions", () => {
      expect(TASK_PROMPTS).toHaveProperty("today-project");
      expect(TASK_PROMPTS).toHaveProperty("start-work");
      expect(TASK_PROMPTS).toHaveProperty("complete-with-review");
      expect(TASK_PROMPTS).toHaveProperty("search-notes");
    });

    it("should have correct schema for today-project prompt", () => {
      const prompt = TASK_PROMPTS["today-project"];
      expect(prompt.name).toBe("today-project");
      expect(prompt.description).toBeDefined();
      expect(prompt.argsSchema.shape).toHaveProperty("project");
    });

    it("should have correct schema for start-work prompt", () => {
      const prompt = TASK_PROMPTS["start-work"];
      expect(prompt.name).toBe("start-work");
      expect(prompt.description).toBeDefined();
      expect(prompt.argsSchema.shape).toHaveProperty("description");
      expect(prompt.argsSchema.shape).toHaveProperty("focus");
    });

    it("should have correct schema for complete-with-review prompt", () => {
      const prompt = TASK_PROMPTS["complete-with-review"];
      expect(prompt.name).toBe("complete-with-review");
      expect(prompt.description).toBeDefined();
      expect(prompt.argsSchema.shape).toHaveProperty("description");
      expect(prompt.argsSchema.shape).toHaveProperty("accomplished");
    });

    it("should have correct schema for search-notes prompt", () => {
      const prompt = TASK_PROMPTS["search-notes"];
      expect(prompt.name).toBe("search-notes");
      expect(prompt.description).toBeDefined();
      expect(prompt.argsSchema.shape).toHaveProperty("description");
    });
  });

  describe("getPromptMessage", () => {
    it("should generate correct message for today-project", () => {
      const message = getPromptMessage("today-project", { project: "test-project" });
      expect(message).toBe('List all tasks in project "test-project" that are scheduled for today');
    });

    it("should generate correct message for start-work with focus", () => {
      const message = getPromptMessage("start-work", { 
        description: "Implement new feature", 
        focus: "implementing feature" 
      });
      expect(message).toBe('Start working on task "Implement new feature" and add a note that I\'m focusing on: implementing feature');
    });

    it("should generate correct message for start-work without focus", () => {
      const message = getPromptMessage("start-work", { 
        description: "Implement new feature"
      });
      expect(message).toBe('Start working on task "Implement new feature"');
    });

    it("should generate correct message for complete-with-review with accomplished", () => {
      const message = getPromptMessage("complete-with-review", { 
        description: "Implement new feature",
        accomplished: "implemented new feature" 
      });
      expect(message).toBe('Mark task "Implement new feature" as complete and add a note about what was accomplished: implemented new feature');
    });

    it("should generate correct message for complete-with-review without accomplished", () => {
      const message = getPromptMessage("complete-with-review", { 
        description: "Implement new feature"
      });
      expect(message).toBe('Mark task "Implement new feature" as complete');
    });

    it("should generate correct message for search-notes", () => {
      const message = getPromptMessage("search-notes", { 
        description: "Implement new feature" 
      });
      expect(message).toBe('Find all tasks with description containing "Implement new feature" and show their notes and annotations');
    });

    it("should throw error for unknown prompt", () => {
      expect(() => {
        getPromptMessage("unknown-prompt" as any, {});
      }).toThrow("Unknown prompt: unknown-prompt");
    });
  });
}); 