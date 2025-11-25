# Cloud Agents API

The Cloud Agents API lets you programmatically launch and manage cloud agents that work on your repositories.

- The Cloud Agents API uses [Basic Authentication](/docs/api#basic-authentication). You can obtain an API key from your [Cursor Dashboard](https://cursor.com/settings).
- For details on authentication methods, rate limits, and best practices, see the [API Overview](/docs/api).
- View the full [OpenAPI specification](/docs-static/cloud-agents-openapi.yaml) for detailed schemas and examples.
- MCP (Model Context Protocol) is not yet supported by the Cloud Agents API.

## Endpoints

### List Agents

GET`/v0/agents`List all cloud agents for the authenticated user.

#### Query Parameters

`limit` number (optional)

Number of cloud agents to return. Default: 20, Max: 100`cursor` string (optional)

Pagination cursor from the previous response```
curl --request GET \
  --url https://api.cursor.com/v0/agents \
  -u YOUR_API_KEY:
```

**Response:**

```
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
    },
    {
      "id": "bc_def456",
      "name": "Fix authentication bug",
      "status": "RUNNING",
      "source": {
        "repository": "https://github.com/your-org/your-repo",
        "ref": "main"
      },
      "target": {
        "branchName": "cursor/fix-auth-5678",
        "url": "https://cursor.com/agents?id=bc_def456",
        "autoCreatePr": true,
        "openAsCursorGithubApp": true,
        "skipReviewerRequest": false
      },
      "createdAt": "2024-01-15T11:45:00Z"
    }
  ],
  "nextCursor": "bc_ghi789"
}
```

### Agent Status

GET`/v0/agents/{id}`Retrieve the current status and results of a cloud agent.

#### Path Parameters

`id` string

Unique identifier for the cloud agent (e.g., bc_abc123)```
curl --request GET \
  --url https://api.cursor.com/v0/agents/bc_abc123 \
  -u YOUR_API_KEY:
```

**Response:**

```
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

### Agent Conversation

GET`/v0/agents/{id}/conversation`Retrieve the conversation history of a cloud agent, including all user prompts and assistant responses.

If the cloud agent has been deleted, you cannot access the conversation.

#### Path Parameters

`id` string

Unique identifier for the cloud agent (e.g., `bc_abc123`)```
curl --request GET \
  --url https://api.cursor.com/v0/agents/bc_abc123/conversation \
  -u YOUR_API_KEY:
```

**Response:**

```
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
      "text": "I'll help you create a comprehensive README.md file with installation instructions. Let me start by analyzing your project structure..."
    },
    {
      "id": "msg_003",
      "type": "assistant_message",
      "text": "I've created a README.md file with the following sections:\n- Project overview\n- Installation instructions\n- Usage examples\n- Configuration options"
    },
    {
      "id": "msg_004",
      "type": "user_message",
      "text": "Also add a section about troubleshooting"
    },
    {
      "id": "msg_005",
      "type": "assistant_message",
      "text": "I've added a troubleshooting section to the README with common issues and solutions."
    }
  ]
}
```

### Launch an Agent

POST`/v0/agents`Start a new cloud agent to work on your repository.

#### Request Body

`prompt` object (required)

The task prompt for the agent, including optional images`prompt.text` string (required)

The instruction text for the agent`prompt.images` array (optional)

Array of image objects with base64 data and dimensions (max 5)`model` string (optional)

The LLM to use (e.g., claude-4-sonnet). If not provided, we'll pick the most appropriate model.`source` object (required)

Repository source information`source.repository` string (required)

GitHub repository URL (e.g., [https://github.com/your-org/your-repo](https://github.com/your-org/your-repo))`source.ref` string (optional)

Git ref (branch name, tag, or commit hash) to use as the base branch`target` object (optional)

Target configuration for the agent`target.autoCreatePr` boolean (optional)

Whether to automatically create a pull request when the agent completes. Default: false`target.openAsCursorGithubApp` boolean (optional)

Whether to open the pull request as the Cursor GitHub App instead of as the user. Only applies if autoCreatePr is true. Default: false`target.skipReviewerRequest` boolean (optional)

Whether to skip adding the user as a reviewer to the pull request. Only applies if autoCreatePr is true and the PR is opened as the Cursor GitHub App. Default: false`target.branchName` string (optional)

Custom branch name for the agent to create`webhook` object (optional)

[Webhook](/docs/cloud-agent/api/webhooks) configuration for status change notifications`webhook.url` string (required if webhook provided)

URL to receive [webhook](/docs/cloud-agent/api/webhooks) notifications about agent status changes`webhook.secret` string (optional)

Secret key for [webhook](/docs/cloud-agent/api/webhooks) payload verification (minimum 32 characters)```
curl --request POST \
  --url https://api.cursor.com/v0/agents \
  -u YOUR_API_KEY: \
  --header 'Content-Type: application/json' \
  --data '{
  "prompt": {
    "text": "Add a README.md file with installation instructions",
    "images": [
      {
        "data": "iVBORw0KGgoAAAANSUhEUgAA...",
        "dimension": {
          "width": 1024,
          "height": 768
        }
      }
    ]
  },
  "source": {
    "repository": "https://github.com/your-org/your-repo",
    "ref": "main"
  },
  "target": {
    "autoCreatePr": true,
    "branchName": "feature/add-readme"
  }
}'
```

**Response:**

```
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

### Add Follow-up

POST`/v0/agents/{id}/followup`Add a follow-up instruction to an existing cloud agent.

#### Path Parameters

`id` string

Unique identifier for the cloud agent (e.g., bc_abc123)#### Request Body

`prompt` object (required)

The follow-up prompt for the agent, including optional images`prompt.text` string (required)

The follow-up instruction text for the agent`prompt.images` array (optional)

Array of image objects with base64 data and dimensions (max 5)```
curl --request POST \
  --url https://api.cursor.com/v0/agents/bc_abc123/followup \
  -u YOUR_API_KEY: \
  --header 'Content-Type: application/json' \
  --data '{
  "prompt": {
    "text": "Also add a section about troubleshooting",
    "images": [
      {
        "data": "iVBORw0KGgoAAAANSUhEUgAA...",
        "dimension": {
          "width": 1024,
          "height": 768
        }
      }
    ]
  }
}'
```

**Response:**

```
{
  "id": "bc_abc123"
}
```

### Delete an Agent

DELETE`/v0/agents/{id}`Delete a cloud agent. This action is permanent and cannot be undone.

#### Path Parameters

`id` string

Unique identifier for the cloud agent (e.g., `bc_abc123`)```
curl --request DELETE \
  --url https://api.cursor.com/v0/agents/bc_abc123 \
  -u YOUR_API_KEY:
```

**Response:**

```
{
  "id": "bc_abc123"
}
```

### API Key Info

GET`/v0/me`Retrieve information about the API key being used for authentication.

```
curl --request GET \
  --url https://api.cursor.com/v0/me \
  -u YOUR_API_KEY:
```

**Response:**

```
{
  "apiKeyName": "Production API Key",
  "createdAt": "2024-01-15T10:30:00Z",
  "userEmail": "developer@example.com"
}
```

### List Models

GET`/v0/models`Retrieve a list of recommended models for cloud agents.

We recommend having an "Auto" option where you don't provide a model name to the creation endpoint, and we will pick the most appropriate model.

```
curl --request GET \
  --url https://api.cursor.com/v0/models \
  -u YOUR_API_KEY:
```

**Response:**

```
{
  "models": [
    "claude-4-sonnet-thinking",
    "o3",
    "claude-4-opus-thinking"
  ]
}
```

### List GitHub Repositories

GET`/v0/repositories`Retrieve a list of GitHub repositories accessible to the authenticated user.

**This endpoint has very strict rate limits.**

Limit requests to **1 / user / minute**, and **30 / user / hour.**

This request can take tens of seconds to respond for users with access to many repositories.

Make sure to handle this information not being available gracefully.

```
curl --request GET \
  --url https://api.cursor.com/v0/repositories \
  -u YOUR_API_KEY:
```

**Response:**

```
{
  "repositories": [
    {
      "owner": "your-org",
      "name": "your-repo",
      "repository": "https://github.com/your-org/your-repo"
    },
    {
      "owner": "your-org",
      "name": "another-repo",
      "repository": "https://github.com/your-org/another-repo"
    },
    {
      "owner": "your-username",
      "name": "personal-project",
      "repository": "https://github.com/your-username/personal-project"
    }
  ]
}
```
