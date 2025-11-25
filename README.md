# Cloud Agent MCP Server

MCP server for the [Cursor Cloud Agents API](https://cursor.com/docs/cloud-agent/api). Lets AI assistants create and manage cloud agents that work on GitHub repositories.

## Quick Start

```bash
# Install
npm install

# Configure
cp .env.example .env
# Add your CURSOR_API_KEY from https://cursor.com/settings

# Run
npm start
```

Server runs at `http://localhost:3000/mcp`

## Tools

### Discovery (start here)

| Tool | Description |
|------|-------------|
| `get_repos` | Detects current git repo (repository URL, branch, uncommitted changes). Optionally lists all accessible repos. **Call this first.** |
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

## Typical Workflow

```
1. get_repos          → Get current repo URL and branch
2. create_agent       → Launch agent with task
3. get_agent          → Check status (CREATING → RUNNING → FINISHED)
4. add_followup       → (optional) Send more instructions while running
5. get_conversation   → Review what the agent did
```

## Prompt: Plan Parallel Tasks

Use `/plan-parallel-tasks` to break down a project for multiple parallel agents:

```
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

## Resources (Read-only)

- `agents://{agentId}/status` - Agent status
- `agents://{agentId}/conversation` - Conversation history  
- `cursor://models` - Available models
- `cursor://me` - User info

## License

MIT
