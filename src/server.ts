import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import * as z from "zod/v3";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const API_BASE_URL = "https://api.cursor.com";
const REQUEST_TIMEOUT_MS = 30000;

// ============================================================================
// CONFIGURATION
// ============================================================================

const apiKey = process.env.CURSOR_API_KEY;
if (!apiKey) {
  console.error("Error: CURSOR_API_KEY environment variable is required");
  console.error("Get your API key from https://cursor.com/settings");
  process.exit(1);
}

// ============================================================================
// API CLIENT
// ============================================================================

async function apiRequest<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const options: RequestInit = {
      method,
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorText: string;
      try {
        errorText = await response.text();
      } catch {
        errorText = "Unable to read error response";
      }
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  }
}

// ============================================================================
// MCP SERVER SETUP
// ============================================================================

const server = new McpServer({
  name: "cloud-agent-mcp",
  version: "1.0.0",
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Helper function to check if text matches a regex pattern
function matchesRegex(text: string, pattern: string): boolean {
  try {
    const regex = new RegExp(pattern, "i"); // case-insensitive
    return regex.test(text);
  } catch (error) {
    // Invalid regex pattern - log error but don't throw
    console.error(`Invalid regex pattern: ${pattern}`, error);
    return false;
  }
}

// ============================================================================
// TOOLS: CONTEXT & DISCOVERY (Start here to find repositories)
// ============================================================================

// Helper function to detect git context
async function detectGitContext(cwd: string): Promise<{
  is_git_repo: boolean;
  repository?: string;
  branch?: string;
  has_uncommitted_changes?: boolean;
}> {
  try {
    await execAsync("git rev-parse --is-inside-work-tree", { cwd });
  } catch {
    return { is_git_repo: false };
  }

  let repository: string | undefined;
  try {
    const { stdout: remoteUrl } = await execAsync("git remote get-url origin", {
      cwd,
    });
    repository = remoteUrl.trim();
    // Convert SSH to HTTPS
    if (repository.startsWith("git@github.com:")) {
      repository = repository
        .replace("git@github.com:", "https://github.com/")
        .replace(/\.git$/, "");
    } else if (repository.endsWith(".git")) {
      repository = repository.replace(/\.git$/, "");
    }
  } catch {
    // Try any remote
    try {
      const { stdout: remotes } = await execAsync("git remote", { cwd });
      const firstRemote = remotes.trim().split("\n")[0];
      if (firstRemote) {
        const { stdout: remoteUrl } = await execAsync(
          `git remote get-url ${firstRemote}`,
          { cwd }
        );
        repository = remoteUrl.trim();
      }
    } catch {
      // No remotes
    }
  }

  let branch: string | undefined;
  try {
    const { stdout } = await execAsync("git branch --show-current", { cwd });
    branch = stdout.trim() || undefined;
    if (!branch) {
      const { stdout: commit } = await execAsync("git rev-parse --short HEAD", {
        cwd,
      });
      branch = `detached@${commit.trim()}`;
    }
  } catch {
    // Ignore
  }

  let has_uncommitted_changes = false;
  try {
    const { stdout } = await execAsync("git status --porcelain", { cwd });
    has_uncommitted_changes = stdout.trim().length > 0;
  } catch {
    // Ignore
  }

  return { is_git_repo: true, repository, branch, has_uncommitted_changes };
}

server.registerTool(
  "get_repos",
  {
    title: "Get Repositories",
    description: `Get available repositories. First checks if you are in a git directory and returns that repo as "current". Then optionally lists other accessible repos from the API. Call this FIRST before creating agents to get the repository URL.

**Usage Examples:**
- Basic: Get current repo only: \`get_repos()\`
- Fetch all repos: \`get_repos({ include_all: true })\`
- Filter with single regex: \`get_repos({ include_all: true, regex_patterns: ["^my-.*"] })\`
- Filter with multiple patterns (OR): \`get_repos({ include_all: true, regex_patterns: [".*api.*", ".*backend.*"] })\`

**Workflow:** Use this tool first to discover repositories, then use the repository URL with \`create_agent\` to start working on a repo.`,
    inputSchema: {
      include_all: z
        .boolean()
        .optional()
        .describe(
          "Also fetch all accessible repos from API (rate limited: 1/min, 30/hour). Default: false, only returns current git repo if available."
        ),
      working_directory: z
        .string()
        .optional()
        .describe(
          "Directory to check for git repo (defaults to current working directory)"
        ),
      regex_patterns: z
        .array(z.string())
        .optional()
        .describe(
          'Array of regex patterns to filter repositories. Matches repository name, owner, or full URL. Patterns are OR conditions (match if any pattern matches). Example: ["^my-.*", ".*api.*"]'
        ),
    },
    outputSchema: {
      current: z
        .object({
          repository: z.string(),
          branch: z.string().optional(),
          has_uncommitted_changes: z.boolean().optional(),
        })
        .optional(),
      available: z
        .array(
          z.object({
            owner: z.string(),
            name: z.string(),
            repository: z.string(),
          })
        )
        .optional(),
      message: z.string().optional(),
      filtered_count: z.number().optional(),
      total_count: z.number().optional(),
    },
  },
  async (args) => {
    try {
      const cwd = args.working_directory || process.cwd();
      const gitContext = await detectGitContext(cwd);

      const result: {
        current?: {
          repository: string;
          branch?: string;
          has_uncommitted_changes?: boolean;
        };
        available?: Array<{ owner: string; name: string; repository: string }>;
        message?: string;
        filtered_count?: number;
        total_count?: number;
      } = {};

      // Add current repo if in git directory
      let currentRepo:
        | {
            repository: string;
            branch?: string;
            has_uncommitted_changes?: boolean;
          }
        | undefined;
      if (gitContext.is_git_repo && gitContext.repository) {
        currentRepo = {
          repository: gitContext.repository,
          branch: gitContext.branch,
          has_uncommitted_changes: gitContext.has_uncommitted_changes,
        };
      }

      // Fetch all repos if requested
      let allRepos:
        | Array<{ owner: string; name: string; repository: string }>
        | undefined;
      if (args.include_all) {
        try {
          const data = await apiRequest<{
            repositories: Array<{
              owner: string;
              name: string;
              repository: string;
            }>;
          }>("GET", "/v0/repositories");
          allRepos = data.repositories;
          result.total_count = allRepos.length;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          result.message = `Could not fetch repo list: ${errorMessage}`;
        }
      }

      // Apply regex filtering if patterns provided
      if (args.regex_patterns && args.regex_patterns.length > 0) {
        // Filter current repo
        if (currentRepo) {
          const repoString = `${currentRepo.repository} ${
            currentRepo.branch || ""
          }`.toLowerCase();
          const matches = args.regex_patterns.some((pattern) =>
            matchesRegex(repoString, pattern)
          );
          if (matches) {
            result.current = currentRepo;
          }
        }

        // Filter available repos
        if (allRepos) {
          const filtered = allRepos.filter((repo) => {
            const repoString =
              `${repo.repository} ${repo.owner} ${repo.name}`.toLowerCase();
            return args.regex_patterns!.some((pattern) =>
              matchesRegex(repoString, pattern)
            );
          });
          result.available = filtered;
          result.filtered_count = filtered.length;
        }
      } else {
        // No filtering - return all
        if (currentRepo) {
          result.current = currentRepo;
        }
        if (allRepos) {
          result.available = allRepos;
        }
      }

      // Add helpful message if no current repo
      if (!result.current && !result.available) {
        result.message =
          "Not in a git repository. Call again with include_all: true to list accessible repos (rate limited).";
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "get_me",
  {
    title: "Get Current User",
    description: `Get API key information including name, creation date, and user email. Use this to verify authentication is working correctly.

**Usage Example:** \`get_me()\`

**Workflow:** Call this first to verify your API key is valid before using other tools.`,
    inputSchema: {},
    outputSchema: {
      apiKeyName: z.string(),
      createdAt: z.string(),
      userEmail: z.string(),
    },
  },
  async () => {
    try {
      const data = await apiRequest<{
        apiKeyName: string;
        createdAt: string;
        userEmail: string;
      }>("GET", "/v0/me");
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: data,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "get_models",
  {
    title: "Get Available Models",
    description: `List all available LLM models for cloud agents. If you omit the model parameter in \`create_agent\`, the system will auto-select the most appropriate model.

**Usage Example:** \`get_models()\`

**Workflow:** Use this to see available models, then optionally specify one in \`create_agent\`. For most cases, omitting the model parameter (auto-selection) is recommended.`,
    inputSchema: {},
    outputSchema: { models: z.array(z.string()) },
  },
  async () => {
    try {
      const data = await apiRequest<{ models: string[] }>("GET", "/v0/models");
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: data,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// ============================================================================
// TOOLS: AGENT LIFECYCLE (Create, monitor, and manage agents)
// ============================================================================

server.registerTool(
  "create_agent",
  {
    title: "Create Cloud Agent",
    description: `Launch a new cloud agent to work on a repository. Requires a repository URL and task prompt. Returns an agent ID that you can use to monitor progress with \`get_agent\` or \`list_agents\`.

**Usage Examples:**
- Basic: \`create_agent({ prompt: "Add README.md", repository: "https://github.com/owner/repo" })\`
- With branch: \`create_agent({ prompt: "Fix bug", repository: "https://github.com/owner/repo", ref: "main" })\`
- Auto-create PR: \`create_agent({ prompt: "Add feature", repository: "https://github.com/owner/repo", auto_pr: true })\`
- Custom branch: \`create_agent({ prompt: "Add feature", repository: "https://github.com/owner/repo", branch_name: "feature/new-feature" })\`

**Workflow:** 
1. Use \`get_repos\` to discover repository URLs
2. Call \`create_agent\` with your task prompt
3. Use \`list_agents\` or \`get_agent\` to monitor progress
4. Use \`add_followup\` to send additional instructions to running agents`,
    inputSchema: {
      prompt: z.string().min(1).describe("Task instructions for the agent"),
      repository: z
        .string()
        .url()
        .describe(
          "GitHub repository URL (e.g., https://github.com/owner/repo)"
        ),
      ref: z
        .string()
        .optional()
        .describe("Git branch, tag, or commit to work from"),
      auto_pr: z
        .boolean()
        .optional()
        .describe("Auto-create a PR when done (default: false)"),
      branch_name: z
        .string()
        .optional()
        .describe("Custom branch name for the agent to create"),
      model: z
        .string()
        .optional()
        .describe("LLM model to use (omit for auto-selection)"),
    },
    outputSchema: {
      id: z.string(),
      name: z.string(),
      status: z.string(),
      source: z.object({ repository: z.string(), ref: z.string().optional() }),
      target: z.object({
        branchName: z.string().optional(),
        url: z.string().optional(),
        autoCreatePr: z.boolean().optional(),
      }),
      createdAt: z.string(),
    },
  },
  async (args) => {
    try {
      const requestBody: Record<string, unknown> = {
        prompt: { text: args.prompt },
        source: { repository: args.repository },
      };

      if (args.ref) {
        (requestBody.source as Record<string, unknown>).ref = args.ref;
      }

      if (args.auto_pr !== undefined || args.branch_name) {
        requestBody.target = {
          autoCreatePr: args.auto_pr,
          branchName: args.branch_name,
        };
      }

      if (args.model) {
        requestBody.model = args.model;
      }

      const data = await apiRequest<{
        id: string;
        name: string;
        status: string;
        source: { repository: string; ref?: string };
        target: { branchName?: string; url?: string; autoCreatePr?: boolean };
        createdAt: string;
      }>("POST", "/v0/agents", requestBody);

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: data,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "list_agents",
  {
    title: "List Cloud Agents",
    description: `List all cloud agents for the authenticated user. Returns comprehensive information including IDs, status, repository, branch, summary, PR URLs, and creation time. Use this to find agent IDs for monitoring or follow-up.

**Usage Examples:**
- Basic listing: \`list_agents()\`
- Filter by status: \`list_agents({ filter: "FINISHED|RUNNING" })\`
- Filter by repository: \`list_agents({ filter: ".*my-repo.*" })\`
- Filter by branch name: \`list_agents({ filter: "feature/.*" })\`
- Filter by summary: \`list_agents({ filter: ".*README.*" })\`
- Combine filters: \`list_agents({ filter: "FINISHED.*my-repo" })\`

**Workflow:** After creating agents with \`create_agent\`, use this tool to monitor their status. Then use \`get_agent\` for detailed status or \`add_followup\` to send instructions to running agents.`,
    inputSchema: {
      limit: z.number().int().min(1).max(100).optional(),
      cursor: z.string().optional(),
      filter: z
        .string()
        .optional()
        .describe(
          'Regex pattern to filter agents. Searches across all fields (id, name, status, repository, ref, branchName, summary, etc.) concatenated together. Example: "FINISHED|RUNNING" or ".*my-repo.*"'
        ),
    },
    outputSchema: {
      agents: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          status: z.string(),
          source: z.object({
            repository: z.string(),
            ref: z.string().optional(),
          }),
          target: z.object({
            branchName: z.string().optional(),
            url: z.string().optional(),
            prUrl: z.string().optional(),
            autoCreatePr: z.boolean().optional(),
            openAsCursorGithubApp: z.boolean().optional(),
            skipReviewerRequest: z.boolean().optional(),
          }),
          summary: z.string().optional(),
          createdAt: z.string(),
        })
      ),
      nextCursor: z.string().optional(),
      filtered_count: z.number().optional(),
      total_count: z.number().optional(),
    },
  },
  async (args) => {
    try {
      const params = new URLSearchParams();
      if (args.limit) params.append("limit", args.limit.toString());
      if (args.cursor) params.append("cursor", args.cursor);

      const path = `/v0/agents${params.toString() ? `?${params}` : ""}`;
      const data = await apiRequest<{
        agents: Array<{
          id: string;
          name: string;
          status: string;
          source: { repository: string; ref?: string };
          target: {
            branchName?: string;
            url?: string;
            prUrl?: string;
            autoCreatePr?: boolean;
            openAsCursorGithubApp?: boolean;
            skipReviewerRequest?: boolean;
          };
          summary?: string;
          createdAt: string;
        }>;
        nextCursor?: string;
      }>("GET", path);

      let filteredAgents = data.agents;
      const totalCount = data.agents.length;

      // Apply regex filter if provided
      if (args.filter) {
        filteredAgents = data.agents.filter((agent) => {
          // Concatenate all agent fields into a single string
          const searchString = [
            agent.id,
            agent.name,
            agent.status,
            agent.source.repository,
            agent.source.ref || "",
            agent.target.branchName || "",
            agent.target.url || "",
            agent.target.prUrl || "",
            agent.summary || "",
            agent.createdAt,
            agent.target.autoCreatePr?.toString() || "",
            agent.target.openAsCursorGithubApp?.toString() || "",
            agent.target.skipReviewerRequest?.toString() || "",
          ]
            .join(" ")
            .toLowerCase();

          return matchesRegex(searchString, args.filter!);
        });
      }

      const result = {
        agents: filteredAgents,
        nextCursor: data.nextCursor,
        ...(args.filter
          ? {
              filtered_count: filteredAgents.length,
              total_count: totalCount,
            }
          : {}),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "get_agent",
  {
    title: "Get Agent Status",
    description: `Get the current status and full details of a specific cloud agent. Returns comprehensive information including status (CREATING, RUNNING, FINISHED, FAILED, CANCELLED), summary of work done, repository, branch, PR URL if created, and all configuration options.

**Usage Example:** \`get_agent({ id: "bc_abc123" })\`

**Status Values:**
- CREATING: Agent is being initialized
- RUNNING: Agent is actively working
- FINISHED: Agent completed successfully
- FAILED: Agent encountered an error
- CANCELLED: Agent was cancelled

**Workflow:** After creating an agent with \`create_agent\` or finding one with \`list_agents\`, use this tool to get detailed status. Check the status field to determine if you need to wait, send follow-ups with \`add_followup\`, or review results.`,
    inputSchema: {
      id: z.string().min(1).describe("Agent ID (e.g., bc_abc123)"),
    },
    outputSchema: {
      id: z.string(),
      name: z.string(),
      status: z.string(),
      source: z.object({ repository: z.string(), ref: z.string().optional() }),
      target: z.object({
        branchName: z.string().optional(),
        url: z.string().optional(),
        prUrl: z.string().optional(),
        autoCreatePr: z.boolean().optional(),
        openAsCursorGithubApp: z.boolean().optional(),
        skipReviewerRequest: z.boolean().optional(),
      }),
      summary: z.string().optional(),
      createdAt: z.string(),
    },
  },
  async (args) => {
    try {
      const data = await apiRequest<{
        id: string;
        name: string;
        status: string;
        source: { repository: string; ref?: string };
        target: {
          branchName?: string;
          url?: string;
          prUrl?: string;
          autoCreatePr?: boolean;
          openAsCursorGithubApp?: boolean;
          skipReviewerRequest?: boolean;
        };
        summary?: string;
        createdAt: string;
      }>("GET", `/v0/agents/${args.id}`);

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: data,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "add_followup",
  {
    title: "Add Follow-up Instruction",
    description: `Send additional instructions to a RUNNING agent. Use this to guide the agent, request changes, provide clarification, or redirect its work while it is actively running.

**Usage Example:** \`add_followup({ id: "bc_abc123", prompt: "Also add a troubleshooting section" })\`

**Important:** The agent must be in RUNNING status. Use \`get_agent\` to check status first. If the agent is FINISHED, FAILED, or CANCELLED, you cannot send follow-ups.

**Workflow:** 
1. Create an agent with \`create_agent\`
2. Monitor with \`get_agent\` until status is RUNNING
3. Send follow-up instructions as needed
4. Continue monitoring until FINISHED`,
    inputSchema: {
      id: z.string().min(1).describe("Agent ID (must be in RUNNING status)"),
      prompt: z.string().min(1).describe("Follow-up instructions"),
    },
    outputSchema: {
      id: z.string(),
    },
  },
  async (args) => {
    try {
      const data = await apiRequest<{ id: string }>(
        "POST",
        `/v0/agents/${args.id}/followup`,
        { prompt: { text: args.prompt } }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: data,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "get_conversation",
  {
    title: "Get Agent Conversation",
    description: `Get the complete conversation history of an agent including the original prompt, all follow-ups, and every agent response. Useful for reviewing what an agent did, understanding its reasoning, and debugging issues.

**Usage Example:** \`get_conversation({ id: "bc_abc123" })\`

**Workflow:** After an agent finishes (or fails), use this tool to review the full conversation. This helps you understand what the agent did, why it made certain decisions, and what went wrong if it failed. Use \`list_agents\` to find agent IDs, then \`get_conversation\` to review their work.`,
    inputSchema: {
      id: z.string().min(1).describe("Agent ID"),
    },
    outputSchema: {
      id: z.string(),
      messages: z.array(
        z.object({
          id: z.string(),
          type: z.string(),
          text: z.string(),
        })
      ),
    },
  },
  async (args) => {
    try {
      const data = await apiRequest<{
        id: string;
        messages: Array<{ id: string; type: string; text: string }>;
      }>("GET", `/v0/agents/${args.id}/conversation`);

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: data,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "delete_agent",
  {
    title: "Delete Agent",
    description: `Permanently delete a cloud agent. This action cannot be undone and all conversation history will be lost. Use this to clean up agents you no longer need.

**Usage Example:** \`delete_agent({ id: "bc_abc123" })\`

**Warning:** This permanently deletes the agent and all its data. If you want to review the conversation first, use \`get_conversation\` before deleting.

**Workflow:** Use \`list_agents\` to find agents, optionally filter them, then delete unwanted ones. Consider reviewing conversations with \`get_conversation\` before deletion if you might need the information later.`,
    inputSchema: {
      id: z.string().min(1).describe("Agent ID to delete"),
    },
    outputSchema: {
      id: z.string(),
    },
  },
  async (args) => {
    try {
      const data = await apiRequest<{ id: string }>(
        "DELETE",
        `/v0/agents/${args.id}`
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: data,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// ============================================================================
// PROMPTS (Workflow templates)
// ============================================================================

server.registerPrompt(
  "plan-parallel-tasks",
  {
    title: "Plan Parallel Tasks",
    description:
      "Break down a project into parallelizable tasks for multiple cloud agents. Auto-detects repository context and creates a phased execution plan.",
    argsSchema: {
      project_description: z
        .string()
        .describe("What you want to build or change"),
      repository: z
        .string()
        .optional()
        .describe("Repository URL (auto-detected if omitted)"),
      branch: z
        .string()
        .optional()
        .describe("Base branch (auto-detected if omitted)"),
    },
  },
  ({ project_description, repository, branch }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Plan parallel cloud agent tasks for this project:

${project_description}

${
  repository
    ? `Repository: ${repository}`
    : "**Step 1**: Call get_repos to detect the current repository"
}
${branch ? `Branch: ${branch}` : ""}

## Instructions

1. **Detect Context**: Use get_repos to find the repository URL and current branch
2. **Analyze**: Break the project into independent tasks
3. **Plan Phases**: Group tasks by dependencies

## Parallelization Rules

**CAN be parallel**: Tasks that modify completely different files
**CANNOT be parallel**: Tasks that modify the same file or depend on each other's output

## Output Format

For each task provide:
- **Task Name**: Short name
- **Files**: List of files to create/modify  
- **Dependencies**: Tasks that must complete first (or "None")
- **Prompt**: Exact text for create_agent

Group into phases:
- **Phase 1**: No dependencies (run all in parallel)
- **Phase 2**: Depends on Phase 1 (run in parallel after Phase 1)
- **Phase 3**: Integration (sequential, touches shared files)

After approval, use create_agent for each Phase 1 task, then monitor with list_agents.`,
        },
      },
    ],
  })
);

// ============================================================================
// HTTP SERVER
// ============================================================================

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "cloud-agent-mcp", version: "1.0.0" });
});

app.post("/mcp", async (req, res) => {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => transport.close());

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

const port = parseInt(process.env.PORT || "3000", 10);
app.listen(port, () => {
  console.log(`Cloud Agent MCP Server: http://localhost:${port}/mcp`);
});
