# GitBook MCP Server Reference

A Model Context Protocol (MCP) server that provides access to GitBook's API for AI assistants and LLM applications.

## Overview

The GitBook MCP server enables programmatic access to GitBook organizations, spaces, collections, and content through a standardized MCP interface. It provides 12 tools for content operations and 2 AI-powered prompts for documentation workflows.

## API Reference

### Tools

The GitBook MCP server provides 12 tools organized into functional categories:

#### Organization Discovery

##### `list_organizations`
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

##### `list_spaces`
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

##### `get_space`
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

##### `get_space_content`
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

##### `search_content`
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

##### `get_page_content`
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

##### `get_page_by_path`
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

##### `get_space_files`
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

##### `get_file`
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

##### `list_collections`
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

##### `get_collection`
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

##### `get_collection_spaces`
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

The GitBook MCP server provides 2 AI-powered prompts for documentation workflows:

#### `fetch_documentation`
Fetches and analyzes GitBook documentation content for specific topics.

**Parameters:**
- `topic` (required): The topic or subject to search for and analyze
- `spaceId` (optional): The ID of the space to search (uses default if configured)

**Returns:**
A comprehensive analysis of documentation related to the specified topic, including:
- Relevant pages and sections
- Content summaries
- Gaps or areas needing improvement

#### `analyze_content_structure`
Analyzes the content structure and organization of a GitBook space.

**Parameters:**
- `spaceId` (optional): The ID of the space to analyze (uses default if configured)

**Returns:**
A detailed analysis of the space's content structure, including:
- Navigation hierarchy
- Content organization patterns
- Recommendations for improvement
- Accessibility and user experience insights

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

### CLI Arguments

| Argument | Alias | Type | Description |
|----------|-------|------|-------------|
| `--organization-id` | `--org` | string | Organization ID to work with |
| `--space-id` | `--space` | string | Default space for operations |

**Example:**
```bash
node dist/index.js --organization-id your-org-id --space-id your-space-id
```

### Configuration Files

The server reads configuration from these files (in order of precedence):

1. `.github/copilot-instructions.md`
2. `.cursorrules`
3. `.cursor/rules/rules.md`
4. `.cursor/rules/instructions.md`

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

## Installation & Setup

### Prerequisites
- Node.js 20+ 
- npm or yarn
- GitBook API token (obtain from https://app.gitbook.com/account/developer)

### Installation
```bash
npm install
npm run build
```

### Basic Configuration
Create a `.env.local` file:
```bash
GITBOOK_API_TOKEN=gb_live_your_token_here
```

### Running the Server

#### Standalone
```bash
npm start
```

#### With Claude Desktop
Add to your Claude Desktop MCP settings:
```json
{
  "mcpServers": {
    "gitbook": {
      "command": "npx",
      "args": ["gitbook-mcp"],
      "env": {
        "GITBOOK_API_TOKEN": "gb_live_your_token_here"
      }
    }
  }
}
```

## Error Handling

### Common Error Codes

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

## Development

### Building
```bash
npm run build
```

### Testing
```bash
npm test
```

### Debugging
```bash
DEBUG=1 npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

### Development Setup
```bash
git clone https://github.com/rickysullivan/gitbook-mcp.git
cd gitbook-mcp
npm install
cp .env.example .env.local
# Add your GITBOOK_API_TOKEN to .env.local
npm run build
npm test
```

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Related Documentation

- [GitBook API Documentation](https://api.gitbook.com/openapi.json)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [Detailed Prompt Documentation](./PROMPTS.md)
