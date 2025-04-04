# Taskwarrior MCP

An MCP for Taskwarrior.

## Features

- Task creation, modification, and deletion
- Task querying and filtering
- Task dependency management
- Task annotations and notes
- Task recurrence handling
- Real-time task updates

## Installation

```bash
npm install @tfr/taskwarrior-mcp
```

## Usage

### With npx

```bash
npx @tfr/taskwarrior-mcp
```

### Config

Add this to your config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "taskwarrior": {
      "command": "npx",
      "args": [
        "-y",
        "@tfr/taskwarrior-mcp"
      ]
    }
  }
}
```

## Testing

To test the server using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## API

### Task Operations
- `task.create`: Create a new task with description, project, tags, priority, and dates
- `task.update`: Update an existing task's properties
- `task.delete`: Delete a task by ID
- `task.get`: Get detailed information about a specific task
- `task.list`: List tasks with optional filtering

### Task Management
- `task.start`: Start working on a task (starts timer and optionally adds a note)
- `task.stop`: Stop working on a task (stops timer and optionally adds a note)
- `task.complete`: Mark a task as complete (optionally with a completion note)
- `task.annotate`: Add a note or annotation to a task (annotations are timestamped)

### Query Operations
- `task.query`: Execute custom Taskwarrior filter queries
- `task.filter`: Filter tasks by specific criteria
- `task.search`: Search tasks by text content

## Example Messages

```json
// Create Task
{
  "type": "task.create",
  "payload": {
    "description": "Implement MCP server",
    "project": "development",
    "tags": ["backend", "mcp"],
    "priority": "H"
  }
}

// Start Task with Note
{
  "type": "task.start",
  "payload": {
    "id": "123",
    "note": "Starting implementation of the MCP server"
  }
}

// Add Annotation
{
  "type": "task.annotate",
  "payload": {
    "id": "123",
    "note": "Found a bug in the task creation logic",
    "isAnnotation": true
  }
}

// Query Tasks
{
  "type": "task.query",
  "payload": {
    "filter": "project:development +PENDING"
  }
}
```

## License

MIT License - See [LICENSE](LICENSE) file for details 