# Cloud Agent MCP Server

MCP server for the [Cursor Cloud Agents API](https://cursor.com/docs/cloud-agent/api). Lets AI assistants create and manage cloud agents that work on GitHub repositories.

## Quick Start

```bash
# Install
npm install

# Configure
# Create a .env file with your CURSOR_API_KEY from https://cursor.com/settings
echo "CURSOR_API_KEY=your_api_key_here" > .env

# Run
npm start
```

Server runs at `http://localhost:3000/mcp`

## Tools

### Discovery (start here)

| Tool | Description |
|------|-------------|
| `get_repos` | Detects current git repo (repository URL, branch, uncommitted changes). Optionally lists all accessible repos. **Call this first.** Note: Fetching all repos has strict rate limits (1/min, 30/hour). |
| `get_me` | Get API key info (verify authentication) |
| `get_models` | List available LLM models |

### Agent Lifecycle

| Tool | Description |
|------|-------------|
| `create_agent` | Launch a cloud agent with a task prompt |
| `list_agents` | List all your cloud agents |
| `get_agent` | Get status of a specific agent |
| `add_followup` | Send additional instructions to a running agent |
| `get_conversation` | Get full conversation history |
| `delete_agent` | Permanently delete an agent |

## Usage Examples

### Discovery Tools

#### `get_repos` - Get Repositories

**Basic usage (current repo only):**

```json
{
  "tool": "get_repos"
}
```

**Fetch all accessible repositories:**

```json
{
  "tool": "get_repos",
  "arguments": {
    "include_all": true
  }
}
```

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

### Agent Lifecycle Tools

#### `create_agent` - Launch a Cloud Agent

**Basic usage:**

```json
{
  "tool": "create_agent",
  "arguments": {
    "prompt": "Add a README.md file with installation instructions",
    "repository": "https://github.com/your-org/your-repo"
  }
}
```

**With branch specification:**

```json
{
  "tool": "create_agent",
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
  "tool": "create_agent",
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
  "tool": "create_agent",
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
  "tool": "create_agent",
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
  "tool": "create_agent",
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
  "tool": "create_agent",
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

#### `list_agents` - List All Agents

**Basic listing:**

```json
{
  "tool": "list_agents"
}
```

**Limit results:**

```json
{
  "tool": "list_agents",
  "arguments": {
    "limit": 10
  }
}
```

**Pagination with cursor:**

```json
{
  "tool": "list_agents",
  "arguments": {
    "limit": 20,
    "cursor": "bc_ghi789"
  }
}
```

**Filter by status:**

```json
{
  "tool": "list_agents",
  "arguments": {
    "filter": "FINISHED|RUNNING"
  }
}
```

**Filter by repository:**

```json
{
  "tool": "list_agents",
  "arguments": {
    "filter": ".*my-repo.*"
  }
}
```

**Filter by branch name:**

```json
{
  "tool": "list_agents",
  "arguments": {
    "filter": "feature/.*"
  }
}
```

**Filter by summary content:**

```json
{
  "tool": "list_agents",
  "arguments": {
    "filter": ".*README.*"
  }
}
```

**Combine filters:**

```json
{
  "tool": "list_agents",
  "arguments": {
    "filter": "FINISHED.*my-repo"
  }
}
```

**Filter Examples:**

- `"FINISHED"` - Only finished agents
- `"RUNNING|CREATING"` - Active agents
- `".*api.*"` - Agents working on API repos
- `"feature/.*"` - Agents on feature branches
- `"FINISHED.*README"` - Finished agents with README in summary
- `"FAILED|CANCELLED"` - Failed or cancelled agents

#### `get_agent` - Get Agent Status

```json
{
  "tool": "get_agent",
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

#### `delete_agent` - Delete an Agent

```json
{
  "tool": "delete_agent",
  "arguments": {
    "id": "bc_abc123"
  }
}
```

## Response Shapes

All tools return structured JSON responses matching the [Cloud Agents API](https://cursor.com/docs/cloud-agent/api) specification. See `docs.md` for complete API documentation.

### `get_me` Response

```json
{
  "apiKeyName": "Production API Key",
  "createdAt": "2024-01-15T10:30:00Z",
  "userEmail": "developer@example.com"
}
```

### `get_models` Response

```json
{
  "models": [
    "claude-4-sonnet-thinking",
    "o3",
    "claude-4-opus-thinking"
  ]
}
```

### `get_repos` Response

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

### `create_agent` Response

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

### `list_agents` Response

```json
{
  "agents": [
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

### `get_agent` Response

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

### `get_conversation` Response

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

### `add_followup` Response

```json
{
  "id": "bc_abc123"
}
```

### `delete_agent` Response

```json
{
  "id": "bc_abc123"
}
```

## Typical Workflow

```text
1. get_repos          → Get current repo URL and branch
2. create_agent       → Launch agent with task
3. get_agent          → Check status (CREATING → RUNNING → FINISHED)
4. add_followup       → (optional) Send more instructions while running
5. get_conversation   → Review what the agent did
```

## Prompt: Plan Parallel Tasks

Use `/plan-parallel-tasks` to break down a project for multiple parallel agents:

```text
/plan-parallel-tasks
project_description: "Add user authentication with login, signup, and password reset"
```

This will:

1. Call `get_repos` to detect your repository
2. Break the project into independent tasks
3. Group tasks into phases (parallel → sequential)
4. Provide exact prompts for each `create_agent` call

### Parallelization Rules

**CAN run in parallel:**

- Tasks that modify completely different files
- Tasks that create new files without touching shared files

**CANNOT run in parallel:**

- Tasks that modify the same file
- Tasks where one depends on another's output
- Tasks that both modify package.json, tsconfig.json, etc.

## Connecting Clients

### Claude Desktop

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

### Cursor / VS Code

Add to MCP settings:

```json
{
  "mcp.servers": {
    "cloud-agent": {
      "type": "http", 
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### MCP Inspector

```bash
npx @modelcontextprotocol/inspector
# Connect to http://localhost:3000/mcp
```

### Smithery

Install via Smithery for easy setup and management:

```bash
# Install Smithery CLI (if not already installed)
npm install -g @smithery/cli

# Install this MCP server
smithery install cursor-cloud-agent-mcp --client cursor
# or for Claude Desktop
smithery install cursor-cloud-agent-mcp --client claude
```

After installation, configure your `CURSOR_API_KEY` environment variable. Smithery will handle the rest.

To publish your own version to Smithery:

```bash
# Login to Smithery
smithery login

# Publish from your repository
smithery publish --repo=YOUR_GITHUB_REPO_URL
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CURSOR_API_KEY` | Yes | API key from [cursor.com/settings](https://cursor.com/settings) |
| `PORT` | No | Server port (default: 3000) |

## Health Check

The server exposes a health check endpoint:

```bash
curl http://localhost:3000/health
```

Returns: `{"status":"ok","service":"cursor-cloud-agent-mcp","version":"1.0.0"}`

## License

MIT
