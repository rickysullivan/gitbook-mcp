# GitBook MCP Server Reference

A Model Context Protocol (MCP) server that provides access to GitBook's API for AI assistants and LLM applications.

## Overview

The GitBook MCP server enables programmatic access to GitBook Organizations, Spaces, Collections, and Content through a standardized MCP interface. It provides 12 tools for content operations and 6 AI-powered prompts for documentation workflows.

## Quick Setup

### Prerequisites
- GitBook API token (obtain from https://app.gitbook.com/account/developer)
- Your GitBook Organization ID (optional but recommended)

### IDE and AI Assistant Integration

#### VS Code (with GitHub Copilot)
Add to your VS Code MCP settings:

```json
{
  "servers": {
    "gitbook-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["gitbook-mcp", "--organization-id=your_organization_id_here"],
      "env": {
        "GITBOOK_API_TOKEN": "gb_api_your_token_here"
      }
    }
  }
}
```

#### Claude Desktop
Add to your Claude Desktop configuration (`%APPDATA%\Claude\claude_desktop_config.json` on Windows or `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "gitbook-mcp": {
      "command": "npx",
      "args": ["gitbook-mcp", "--organization-id=your_organization_id"],
      "env": {
        "GITBOOK_API_TOKEN": "gb_api_your_token_here"
      }
    }
  }
}
```

See https://modelcontextprotocol.io/quickstart/user for details.

#### GitHub Copilot plugin for JetBrains IDEs (IntelliJ IDEA, WebStorm, etc.):
Add to your GitHub Copilot MCP settings for JetBrains IDEs (the path may vary by product and OS, e.g., `~/.config/github-copilot/intellij/mcp.json` for IntelliJ on Linux/macOS, or the equivalent directory for your JetBrains IDE and platform):

```json
{
  "servers": {
    "gitbook-mcp": {
      "command": "npx",
      "args": [
        "gitbook-mcp",
        "--organization-id=your_organization_id_here"
      ],
      "env": {
        "GITBOOK_API_TOKEN": "gb_api_your_token_here"
      }
    }
  }
}
```

#### JetBrains AI Assistant

Add to your JetBrains AI Assistant MCP configuration (see [official docs](https://www.jetbrains.com/help/ai-assistant/configure-an-mcp-server.html) for the exact path):

### Getting Your GitBook Credentials

1. **API Token**: Visit https://app.gitbook.com/account/developer to generate your API token
2. **Organization ID**: Use the `list_organizations` tool after setup to find your organization ID  
3. **Space ID** (optional): Use the `list_spaces` tool (requires a valid organization ID and API token) to find specific space IDs
3. **Space ID** (optional): Use the `list_spaces` tool to find specific space IDs

### Configuration Options

You can configure the server using:
- **CLI arguments** (as shown above): `--organization-id`, `--space-id`
- **Environment variables**: `GITBOOK_API_TOKEN`, `GITBOOK_ORGANIZATION_ID`, `GITBOOK_SPACE_ID`
- **Configuration files**: `.env.local` or `.env`.

## API Reference

### Tools

The GitBook MCP server provides 12 tools organized into functional categories. Each tool includes behavioral hints:

- 📖 **Read-only**: Tool only reads data and doesn't modify anything
- 🔄 **Idempotent**: Repeated calls with same args have no additional effect with the same result  
- 🌐 **Open-world**: Tool interacts with external entities

#### Organization Discovery

##### List Organizations (`list_organizations`) 📖 🔄 🌐
Lists all accessible GitBook organizations.

**Parameters:** None

**Returns:**
```json
{
  "organizations": [
    {
      "id": "string",
      "title": "string",
      "urls": {
        "app": "string",
        "public": "string"
      }
    }
  ]
}
```

#### Space Management

##### List Spaces (`list_spaces`) 📖 🔄 🌐
Lists spaces, optionally filtered by organization.

**Parameters:**
- `organizationId` (optional): Organization ID to filter spaces

**Returns:**
```json
{
  "spaces": [
    {
      "id": "string",
      "title": "string",
      "visibility": "string",
      "urls": {
        "app": "string",
        "public": "string"
      }
    }
  ]
}
```

##### Get Space Details (`get_space`) 📖 🔄 🌐
Retrieves detailed information about a specific space.

**Parameters:**
- `spaceId` (required): The ID of the space to retrieve

**Returns:**
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "visibility": "string",
  "urls": {
    "app": "string",
    "public": "string"
  }
}
```

##### Get Space Content (`get_space_content`) 📖 🔄 🌐
Retrieves the content structure and pages of a space.

**Parameters:**
- `spaceId` (optional): The ID of the space (uses default if configured)

**Returns:**
```json
{
  "pages": [
    {
      "id": "string",
      "title": "string",
      "slug": "string",
      "path": "string"
    }
  ]
}
```

##### Search Content (`search_content`) 📖 🔄 🌐
Searches for content within a space using full-text search.

**Parameters:**
- `query` (required): Search query string
- `spaceId` (optional): The ID of the space to search (uses default if configured)

**Returns:**
```json
{
  "results": [
    {
      "id": "string",
      "title": "string",
      "excerpt": "string",
      "url": "string"
    }
  ]
}
```

#### Content Retrieval

##### Get Page Content (`get_page_content`) 📖 🔄 🌐
Retrieves the content of a specific page.

**Parameters:**
- `pageId` (required): The ID of the page to retrieve
- `spaceId` (optional): The ID of the space containing the page
- `format` (optional): Output format (`"document"` or `"markdown"`, defaults to `"document"`)
- `metadata` (optional): Include revision metadata (boolean, defaults to `false`)
- `computed` (optional): Include computed revision data (boolean, defaults to `false`)

**Returns:**
```json
{
  "id": "string",
  "title": "string",
  "content": "string",
  "format": "string"
}
```

##### Get Page by Path (`get_page_by_path`) 📖 🔄 🌐
Retrieves page content using the page path.

**Parameters:**
- `pagePath` (required): The path of the page to retrieve
- `spaceId` (optional): The ID of the space containing the page

**Returns:**
```json
{
  "id": "string",
  "title": "string",
  "content": "string",
  "path": "string"
}
```

#### File Management

##### Get Space Files (`get_space_files`) 📖 🔄 🌐
Lists all files in a space.

**Parameters:**
- `spaceId` (optional): The ID of the space (uses default if configured)

**Returns:**
```json
{
  "files": [
    {
      "id": "string",
      "name": "string",
      "downloadURL": "string",
      "size": "number"
    }
  ]
}
```

##### Get File Details (`get_file`) 📖 🔄 🌐
Retrieves details of a specific file.

**Parameters:**
- `fileId` (required): The ID of the file to retrieve
- `spaceId` (optional): The ID of the space containing the file

**Returns:**
```json
{
  "id": "string",
  "name": "string",
  "downloadURL": "string",
  "size": "number",
  "uploadedAt": "string"
}
```

#### Collection Management

##### List Collections (`list_collections`) 📖 🔄 🌐
Lists all accessible collections.

**Parameters:**
- `organizationId` (optional): Organization ID to filter collections

**Returns:**
```json
{
  "collections": [
    {
      "id": "string",
      "title": "string",
      "description": "string"
    }
  ]
}
```

##### Get Collection Details (`get_collection`) 📖 🔄 🌐
Retrieves details of a specific collection.

**Parameters:**
- `collectionId` (required): The ID of the collection to retrieve

**Returns:**
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "spaces": "number"
}
```

##### Get Collection Spaces (`get_collection_spaces`) 📖 🔄 🌐
Lists all spaces within a collection.

**Parameters:**
- `collectionId` (required): The ID of the collection

**Returns:**
```json
{
  "spaces": [
    {
      "id": "string",
      "title": "string",
      "visibility": "string"
    }
  ]
}
```

### Prompts

The GitBook MCP server provides 6 AI-powered prompts for documentation workflows:

#### Fetch Documentation (`fetch_documentation`)
Fetches and analyzes GitBook documentation content for specific topics.

**Parameters:**
- `topic` (required): The topic or subject to search for and analyze
- `spaceId` (optional): The ID of the space to search (uses default if configured)
- `includeStructure` (optional): Set to "true" to include space structure

**Returns:**
A comprehensive analysis of documentation related to the specified topic, including:
- Relevant pages and sections
- Content summaries
- Gaps or areas needing improvement

#### Analyze Content Gaps (`analyze_content_gaps`)
Identifies gaps and missing content in documentation.

**Parameters:**
- `spaceId` (optional): The ID of the space to analyze (uses default if configured)
- `comparisonSource` (optional): Source to compare against (default: "internal analysis")

**Returns:**
A detailed gap analysis including:
- Missing topics and incomplete sections
- Coverage gaps prioritized by importance
- Suggestions for new content areas

#### Content Audit (`content_audit`)
Performs quality audits of documentation content.

**Parameters:**
- `spaceId` (optional): The ID of the space to audit (uses default if configured)
- `auditCriteria` (optional): Specific criteria to audit (default: "general quality and consistency")

**Returns:**
A comprehensive quality assessment including:
- Content quality and consistency review
- Outdated information identification
- Writing style and formatting recommendations

#### Documentation Summary (`documentation_summary`)
Generates comprehensive summaries of GitBook spaces.

**Parameters:**
- `spaceId` (optional): The ID of the space to summarize (uses default if configured)
- `summaryType` (optional): Type of summary - "overview", "technical", "user-guide", or "custom" (default: "overview")

**Returns:**
A structured summary including:
- Space structure and content organization
- Main topics and themes
- Target audience and use cases

#### Content Optimization (`content_optimization`)
Optimizes content for SEO, readability, structure, or performance.

**Parameters:**
- `spaceId` (optional): The ID of the space to optimize (uses default if configured)
- `optimizationType` (required): Type of optimization - "SEO", "readability", "structure", or "performance"
- `targetMetrics` (optional): Specific metrics or goals to optimize for

**Returns:**
Optimization recommendations including:
- Specific improvement strategies
- Priority-ranked optimization opportunities
- Implementation guidance

#### Troubleshooting Assistant (`troubleshooting_assistant`)
Diagnoses and resolves access, sync, content, and integration issues.

**Parameters:**
- `spaceId` (optional): The ID of the space experiencing issues (uses default if configured)
- `issueType` (required): Type of issue - "access", "sync", "content", "integration", or "performance"
- `description` (optional): Description of the specific problem

**Returns:**
Troubleshooting guidance including:
- Issue diagnosis and root cause analysis
- Step-by-step resolution procedures
- Preventive measures and best practices

## Configuration Reference

The GitBook MCP server supports multiple configuration methods with the following precedence (highest to lowest):

1. **CLI Arguments** - Passed when starting the MCP server
2. **Configuration Files** - Embedded in project configuration files
3. **Environment Variables** - Set in `.env.local` or system environment

### Environment Variables

| Variable | Required | Type | Description |
|----------|----------|------|-------------|
| `GITBOOK_API_TOKEN` | Yes | string | GitBook API token (obtain from https://app.gitbook.com/account/developer) |
| `GITBOOK_ORGANIZATION_ID` | No | string | Default organization ID for operations |
| `GITBOOK_SPACE_ID` | No | string | Default space ID for single-space projects |

> **Note:** Environment variables can be set in `.env.local`, `.env`, or your system environment.

### CLI Arguments

| Argument | Alias | Type | Description |
|----------|-------|------|-------------|
| `--organization-id` | `--org` | string | Organization ID to work with |
| `--space-id` | `--space` | string | Default space for operations |

**Example:**
```bash
node dist/index.js --organization-id your-org-id --space-id your-space-id
```

### Additional Configuration Files

Typically these files are provided as context to the AI assistant, which means you can store project-based configuration.

1. `.github/copilot-instructions.md`
2. `.cursorrules`
3. `.cursor/rules/rules.md`
4. `.cursor/rules/instructions.md`

e.g. 

**Format:**
```markdown
## GitBook Configuration

For GitBook MCP operations, use the following configuration:
- organization-id: your-org-id-here
- space-id: your-space-id-here
```

### Default Parameter Behavior

When `GITBOOK_ORGANIZATION_ID` or `GITBOOK_SPACE_ID` are configured:
- Tools marked as "optional" can omit the corresponding ID parameters
- The configured default values will be used automatically
- Explicit parameters in tool calls override defaults

## Development

### Prerequisites
- Node.js 20+ 
- npm
- GitBook API token (obtain from https://app.gitbook.com/account/developer)

### Installation & Setup

```bash
git clone https://github.com/rickysullivan/gitbook-mcp.git
cd gitbook-mcp
npm install
npm run setup
# Add your GITBOOK_API_TOKEN to .env.local
```

### Development
```bash
npm run dev
```

### Debugging
```bash
DEBUG=1 npm run dev
```

### Add the MCP to VS Code for development
You will need to use `node` as the command when running locally.
The first arg should be the path to the compiled JavaScript output (e.g., `dist/index.js`).

```json
{
    "servers": {
        "gitbook-mcp-dev": {
            "type": "stdio",
            "command": "node",
            "args": [ "/my/path/to/gitbook-mcp/dist/index.js", "--organization-id=Luj2l6y6cIUPXJwbC574"],
            "env": {
                "GITBOOK_API_TOKEN": "gb_api_UHEGTNsMg0ONPTnm0LpsJNBCCikQyOMkBTtZNDAB"
            }
        }
    }
}
```

### Testing
There are currently no unit or integration tests; running `npm run test` only checks that the TypeScript code compiles successfully (type-check/build verification), and does not execute any actual tests.
```bash
npm run test
```

### Error Handling

#### Common Error Codes

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `401` | Unauthorized - Invalid API token | Verify `GITBOOK_API_TOKEN` is correct |
| `403` | Forbidden - Insufficient permissions | Check space/organization access permissions |
| `404` | Not Found - Resource doesn't exist | Verify space/page/collection IDs are correct |
| `429` | Rate Limited - Too many requests | Implement request throttling |
| `500` | Internal Server Error | Check server logs for detailed error information |

### Troubleshooting

**Token Issues:**
- Ensure token starts with `gb_live_`
- Verify token has not expired
- Check token permissions in GitBook settings

**ID Resolution:**
- Use `list_organizations` to find valid organization IDs
- Use `list_spaces` to find valid space IDs
- Use `get_space_content` to find valid page IDs

**Configuration Issues:**
- Verify environment variables are properly set
- Check file permissions on configuration files
- Ensure CLI arguments are properly formatted

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Related Documentation

- [GitBook API Documentation](https://api.gitbook.com/openapi.json)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [Detailed Prompt Documentation](./PROMPTS.md)
