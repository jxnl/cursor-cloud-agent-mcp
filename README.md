# Cloud Agent MCP Server

MCP server for the [Cursor Cloud Agents API](https://cursor.com/docs/cloud-agent/api). Lets AI assistants create and manage cloud agents that work on GitHub repositories.

## Quick Start

```bash
# Install
npm install -g cursor-cloud-agent-mcp

# Set your API key
export CURSOR_API_KEY=your_api_key_here

# Use with Cursor (create .cursor/mcp.json)
{
  "mcpServers": {
    "cursor-cloud-agent": {
      "command": "npx",
      "args": ["-y", "cursor-cloud-agent-mcp"],
      "env": {
        "CURSOR_API_KEY": "${env:CURSOR_API_KEY}"
      }
    }
  }
}
```

## Installation

### Install from npm

```bash
npm install -g cursor-cloud-agent-mcp
```

Or install locally in your project:

```bash
npm install cursor-cloud-agent-mcp
```

### Install from Source

If you're developing or want to run from source:

```bash
# Clone and install dependencies
git clone https://github.com/jxnl/cursor-cloud-agent-mcp
cd cloud-agent-mcp
npm install

# Set your API key
export CURSOR_API_KEY=your_api_key_here

# Run HTTP server
npm start
# Server runs at http://localhost:3000/mcp

# Or run stdio server
npm run start:stdio
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CURSOR_API_KEY` | Yes | API key from [cursor.com/settings](https://cursor.com/settings) |
| `PORT` | No | Server port for HTTP version only (default: 3000) |

### Connecting Clients

#### Cursor

**Option 1: Using npm package (Recommended)**

After installing via npm, create `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "cursor-cloud-agent": {
      "command": "npx",
      "args": ["-y", "cursor-cloud-agent-mcp"],
      "env": {
        "CURSOR_API_KEY": "${env:CURSOR_API_KEY}"
      }
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "cursor-cloud-agent": {
      "command": "cursor-cloud-agent-mcp",
      "env": {
        "CURSOR_API_KEY": "${env:CURSOR_API_KEY}"
      }
    }
  }
}
```

**Option 2: From source (Development)**

If running from source, create `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "cursor-cloud-agent": {
      "command": "npm",
      "args": ["run", "start:stdio"],
      "env": {
        "CURSOR_API_KEY": "${env:CURSOR_API_KEY}"
      }
    }
  }
}
```

**Option 3: HTTP Server (Alternative)**

If you prefer the HTTP version, configure it as:

```json
{
  "mcpServers": {
    "cursor-cloud-agent": {
      "url": "http://localhost:3000/mcp",
      "headers": {}
    }
  }
}
```

Then run `npm start` in a separate terminal to start the HTTP server.

#### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cloud-agent": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

#### MCP Inspector

```bash
npx @modelcontextprotocol/inspector
# Connect to http://localhost:3000/mcp
```

## Usage

### Typical Workflow

```text
1. get_repos          → Get current repo URL and branch
2. create_task       → Launch task with prompt
3. get_task          → Check status (CREATING → RUNNING → FINISHED)
4. add_followup       → (optional) Send more instructions while running
5. get_conversation   → Review what the task did
```

### Available Tools

#### Discovery Tools

| Tool | Description |
|------|-------------|
| `get_repos` | Detects current git repo (repository URL, branch, uncommitted changes). Optionally lists all accessible repos. **Call this first.** Note: When using `include_all: true`, filters (`regex_patterns`) are REQUIRED. Fetching all repos has strict rate limits (1/min, 30/hour). |
| `get_me` | Get API key info (verify authentication) |
| `get_models` | List available LLM models |

#### Task Lifecycle Tools

| Tool | Description |
|------|-------------|
| `create_task` | Launch a cloud task with a task prompt |
| `list_tasks` | List all your cloud tasks |
| `get_task` | Get status of a specific task |
| `add_followup` | Send additional instructions to a running task |
| `get_conversation` | Get full conversation history |
| `delete_task` | Permanently delete a task |

### Common Examples

#### Create a Task

```json
{
  "tool": "create_task",
  "arguments": {
    "prompt": "Add a README.md file with installation instructions",
    "repository": "https://github.com/your-org/your-repo",
    "auto_pr": true
  }
}
```

#### List Tasks

```json
{
  "tool": "list_tasks",
  "arguments": {
    "filter": "FINISHED|RUNNING",
    "limit": 10
  }
}
```

#### Get Repository Info

```json
{
  "tool": "get_repos"
}
```

## Reference

### Tool Documentation

#### `get_repos` - Get Repositories

**Basic usage (current repo only):**

```json
{
  "tool": "get_repos"
}
```

**Fetch all accessible repositories (filters REQUIRED):**

**Important:** When using `include_all: true`, you MUST provide `regex_patterns` to filter the results. This prevents returning too many repositories.

**Filter repositories with regex patterns:**

```json
{
  "tool": "get_repos",
  "arguments": {
    "include_all": true,
    "regex_patterns": ["^my-.*"]
  }
}
```

**Multiple filter patterns (OR logic):**

```json
{
  "tool": "get_repos",
  "arguments": {
    "include_all": true,
    "regex_patterns": [".*api.*", ".*backend.*", ".*frontend.*"]
  }
}
```

**Specify working directory:**

```json
{
  "tool": "get_repos",
  "arguments": {
    "working_directory": "/path/to/project"
  }
}
```

**Filter Examples:**

- `["^my-.*"]` - Repos starting with "my-"
- `[".*api.*"]` - Repos containing "api"
- `["github.com/myorg"]` - Repos from specific org
- `[".*backend.*", ".*server.*"]` - Repos matching either pattern

#### `get_me` - Verify Authentication

```json
{
  "tool": "get_me"
}
```

#### `get_models` - List Available Models

```json
{
  "tool": "get_models"
}
```

#### `create_task` - Launch a Cloud Task

**Basic usage:**

```json
{
  "tool": "create_task",
  "arguments": {
    "prompt": "Add a README.md file with installation instructions",
    "repository": "https://github.com/your-org/your-repo"
  }
}
```

**With branch specification:**

```json
{
  "tool": "create_task",
  "arguments": {
    "prompt": "Fix authentication bug",
    "repository": "https://github.com/your-org/your-repo",
    "ref": "main"
  }
}
```

**Auto-create PR:**

```json
{
  "tool": "create_task",
  "arguments": {
    "prompt": "Add user authentication",
    "repository": "https://github.com/your-org/your-repo",
    "auto_pr": true
  }
}
```

**Custom branch name:**

```json
{
  "tool": "create_task",
  "arguments": {
    "prompt": "Implement new feature",
    "repository": "https://github.com/your-org/your-repo",
    "branch_name": "feature/new-feature"
  }
}
```

**Specify model:**

```json
{
  "tool": "create_task",
  "arguments": {
    "prompt": "Refactor codebase",
    "repository": "https://github.com/your-org/your-repo",
    "model": "claude-4-sonnet-thinking"
  }
}
```

**With plan file:**

```json
{
  "tool": "create_task",
  "arguments": {
    "prompt": "Implement the features described in the plan",
    "repository": "https://github.com/your-org/your-repo",
    "plan_file": "./plan.md"
  }
}
```

**Complete example with all options:**

```json
{
  "tool": "create_task",
  "arguments": {
    "prompt": "Add comprehensive test coverage",
    "repository": "https://github.com/your-org/your-repo",
    "ref": "develop",
    "branch_name": "feature/add-tests",
    "auto_pr": true,
    "model": "o3",
    "plan_file": "./test-plan.md"
  }
}
```

#### `list_tasks` - List All Tasks

**Basic listing:**

```json
{
  "tool": "list_tasks"
}
```

**Limit results:**

```json
{
  "tool": "list_tasks",
  "arguments": {
    "limit": 10
  }
}
```

**Pagination with cursor:**

```json
{
  "tool": "list_tasks",
  "arguments": {
    "limit": 20,
    "cursor": "bc_ghi789"
  }
}
```

**Filter by status:**

```json
{
  "tool": "list_tasks",
  "arguments": {
    "filter": "FINISHED|RUNNING"
  }
}
```

**Filter by repository:**

```json
{
  "tool": "list_tasks",
  "arguments": {
    "filter": ".*my-repo.*"
  }
}
```

**Filter by branch name:**

```json
{
  "tool": "list_tasks",
  "arguments": {
    "filter": "feature/.*"
  }
}
```

**Filter by summary content:**

```json
{
  "tool": "list_tasks",
  "arguments": {
    "filter": ".*README.*"
  }
}
```

**Combine filters:**

```json
{
  "tool": "list_tasks",
  "arguments": {
    "filter": "FINISHED.*my-repo"
  }
}
```

**Filter Examples:**

- `"FINISHED"` - Only finished tasks
- `"RUNNING|CREATING"` - Active tasks
- `".*api.*"` - Tasks working on API repos
- `"feature/.*"` - Tasks on feature branches
- `"FINISHED.*README"` - Finished tasks with README in summary
- `"FAILED|CANCELLED"` - Failed or cancelled tasks

#### `get_task` - Get Task Status

```json
{
  "tool": "get_task",
  "arguments": {
    "id": "bc_abc123"
  }
}
```

#### `add_followup` - Send Follow-up Instructions

```json
{
  "tool": "add_followup",
  "arguments": {
    "id": "bc_abc123",
    "prompt": "Also add a troubleshooting section"
  }
}
```

#### `get_conversation` - Get Conversation History

```json
{
  "tool": "get_conversation",
  "arguments": {
    "id": "bc_abc123"
  }
}
```

#### `delete_task` - Delete a Task

```json
{
  "tool": "delete_task",
  "arguments": {
    "id": "bc_abc123"
  }
}
```

### Response Shapes

All tools return structured JSON responses matching the [Cloud Agents API](https://cursor.com/docs/cloud-agent/api) specification. See `docs.md` for complete API documentation.

#### `get_me` Response

```json
{
  "apiKeyName": "Production API Key",
  "createdAt": "2024-01-15T10:30:00Z",
  "userEmail": "developer@example.com"
}
```

#### `get_models` Response

```json
{
  "models": [
    "claude-4-sonnet-thinking",
    "o3",
    "claude-4-opus-thinking"
  ]
}
```

#### `get_repos` Response

```json
{
  "current": {
    "repository": "https://github.com/your-org/your-repo",
    "branch": "main",
    "has_uncommitted_changes": false
  },
  "available": [
    {
      "owner": "your-org",
      "name": "your-repo",
      "repository": "https://github.com/your-org/your-repo"
    }
  ],
  "total_count": 1
}
```

#### `create_task` Response

```json
{
  "id": "bc_abc123",
  "name": "Add README Documentation",
  "status": "CREATING",
  "source": {
    "repository": "https://github.com/your-org/your-repo",
    "ref": "main"
  },
  "target": {
    "branchName": "feature/add-readme",
    "url": "https://cursor.com/agents?id=bc_abc123",
    "autoCreatePr": true,
    "openAsCursorGithubApp": false,
    "skipReviewerRequest": false
  },
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### `list_tasks` Response

```json
{
  "tasks": [
    {
      "id": "bc_abc123",
      "name": "Add README Documentation",
      "status": "FINISHED",
      "source": {
        "repository": "https://github.com/your-org/your-repo",
        "ref": "main"
      },
      "target": {
        "branchName": "cursor/add-readme-1234",
        "url": "https://cursor.com/agents?id=bc_abc123",
        "prUrl": "https://github.com/your-org/your-repo/pull/1234",
        "autoCreatePr": false,
        "openAsCursorGithubApp": false,
        "skipReviewerRequest": false
      },
      "summary": "Added README.md with installation instructions and usage examples",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "nextCursor": "bc_ghi789"
}
```

#### `get_task` Response

```json
{
  "id": "bc_abc123",
  "name": "Add README Documentation",
  "status": "FINISHED",
  "source": {
    "repository": "https://github.com/your-org/your-repo",
    "ref": "main"
  },
  "target": {
    "branchName": "cursor/add-readme-1234",
    "url": "https://cursor.com/agents?id=bc_abc123",
    "prUrl": "https://github.com/your-org/your-repo/pull/1234",
    "autoCreatePr": false,
    "openAsCursorGithubApp": false,
    "skipReviewerRequest": false
  },
  "summary": "Added README.md with installation instructions and usage examples",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Status Values:** `CREATING`, `RUNNING`, `FINISHED`, `FAILED`, `CANCELLED`

#### `get_conversation` Response

```json
{
  "id": "bc_abc123",
  "messages": [
    {
      "id": "msg_001",
      "type": "user_message",
      "text": "Add a README.md file with installation instructions"
    },
    {
      "id": "msg_002",
      "type": "assistant_message",
      "text": "I'll help you create a comprehensive README.md file..."
    }
  ]
}
```

#### `add_followup` Response

```json
{
  "id": "bc_abc123"
}
```

#### `delete_task` Response

```json
{
  "id": "bc_abc123"
}
```

## Advanced

### Plan Parallel Tasks

Use `/plan-parallel-tasks` to break down a project for multiple parallel tasks:

```text
/plan-parallel-tasks
project_description: "Add user authentication with login, signup, and password reset"
```

This will:

1. Call `get_repos` to detect your repository
2. Break the project into independent tasks
3. Group tasks into phases (parallel → sequential)
4. Provide exact prompts for each `create_task` call

#### Parallelization Rules

**CAN run in parallel:**

- Tasks that modify completely different files
- Tasks that create new files without touching shared files

**CANNOT run in parallel:**

- Tasks that modify the same file
- Tasks where one depends on another's output
- Tasks that both modify package.json, tsconfig.json, etc.

### Server Versions

This package includes two server versions:

- **HTTP Server** (`src/server.ts`): Runs an Express HTTP server on port 3000. Use for remote connections or when you need HTTP endpoints.
- **Stdio Server** (`src/server-stdio.ts`): Uses standard input/output. Recommended for local integrations. Better for process-based spawning.

Run with:
- HTTP: `npm start` (default)
- Stdio: `npm run start:stdio`

## Development

### Health Check

The server exposes a health check endpoint:

```bash
curl http://localhost:3000/health
```

Returns: `{"status":"ok","service":"cursor-cloud-agent-mcp","version":"1.0.2"}`

### Publishing to npm

To publish this package to npm:

```bash
# Make sure you're logged in
npm login

# Publish
npm publish
```

The package will be available as `cursor-cloud-agent-mcp` on npm.

## License

MIT
