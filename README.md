# GitBook MCP Server

A Model Context Protocol (MCP) server that provides read-only access to GitBook API content. This server allows you to integrate GitBook data into MCP-compatible applications.

## Features

- **Read-only access** to GitBook content
- **Organization management**: List and access GitBook organizations
- **Space operations**: List, retrieve, and explore GitBook spaces
- **Content retrieval**: Get page content and space structure
- **Search functionality**: Search within GitBook spaces
- **Secure authentication** using GitBook API tokens

## Prerequisites

- Node.js 18+ 
- A GitBook API token with appropriate permissions

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Configuration

### Getting a GitBook API Token

1. Go to your [GitBook Developer Settings](https://app.gitbook.com/account/developer)
2. Click "Create new token"
3. Give it a name and select appropriate permissions (read permissions for organizations and spaces)
4. Copy the generated token

### Setting up the Environment

Create a `.env.local` file in the project root:

```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local and add your actual GitBook API token:
# GITBOOK_API_TOKEN=gb_live_your_token_here
```

The server will automatically load your API token from `.env.local` when it starts.

## Usage

### Running the Server

The server runs on stdio transport for MCP compatibility:

```bash
./build/index.js
```

### Available Tools

The server provides the following tools:

#### 1. `list_organizations`
Lists all GitBook organizations accessible with your API token.

**Parameters:** None

**Example response:**
```json
[
  {
    "id": "org_123",
    "title": "My Organization",
    "description": "Organization description",
    "urls": {
      "app": "https://app.gitbook.com/o/org_123"
    }
  }
]
```

#### 2. `list_spaces`
Lists GitBook spaces, optionally filtered by organization.

**Parameters:**
- `organizationId` (optional): Filter spaces by organization ID

**Example:**
```json
{
  "organizationId": "org_123"
}
```

#### 3. `get_space`
Gets detailed information about a specific GitBook space.

**Parameters:**
- `spaceId` (required): The ID of the space to retrieve

**Example:**
```json
{
  "spaceId": "space_456"
}
```

#### 4. `get_space_content`
Gets the content structure (pages) of a GitBook space.

**Parameters:**
- `spaceId` (required): The ID of the space to get content from

**Example:**
```json
{
  "spaceId": "space_456"
}
```

#### 5. `get_page_content`
Gets the content of a specific page in a GitBook space.

**Parameters:**
- `spaceId` (required): The ID of the space containing the page
- `pageId` (required): The ID of the page to retrieve content from

**Example:**
```json
{
  "spaceId": "space_456",
  "pageId": "page_789"
}
```

#### 6. `search_content`
Searches for content within a GitBook space.

**Parameters:**
- `spaceId` (required): The ID of the space to search in
- `query` (required): The search query

**Example:**
```json
{
  "spaceId": "space_456",
  "query": "API documentation"
}
```

## MCP Client Integration

To use this server with an MCP client, add it to your MCP configuration:

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gitbook": {
      "command": "npx",
      "args": [
        "gitbook-mcp",
        "start"
      ],
      "env": {
        "GITBOOK_API_TOKEN": "gb_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

### Other MCP Clients

Follow your MCP client's documentation for adding servers. The server uses stdio transport and requires the `GITBOOK_API_TOKEN` environment variable.

## API Rate Limits

This server respects GitBook's API rate limits. If you encounter rate limiting errors, the server will return appropriate error messages. Consider implementing caching or request throttling in your client application if needed.

## Error Handling

The server includes comprehensive error handling for:
- Missing or invalid API tokens
- GitBook API errors (authentication, not found, etc.)
- Invalid parameters
- Network issues

All errors are returned with descriptive messages to help with debugging.

## Security Considerations

- Keep your GitBook API token secure and never commit it to version control
- Use environment variables or secure credential management
- The server only provides read-only access as designed
- Validate that your API token has minimal required permissions

## Development

### Project Structure

```
src/
  index.ts          # Main server implementation
package.json        # Dependencies and scripts
tsconfig.json       # TypeScript configuration
build/             # Compiled output (generated)
```

### Building

```bash
npm run build
```

### Dependencies

- `@modelcontextprotocol/sdk`: MCP SDK for server implementation
- `zod`: Schema validation for tool parameters
- `typescript`: TypeScript compiler
- `@types/node`: Node.js type definitions

## License

ISC License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues related to:
- This MCP server: Open an issue in this repository
- GitBook API: Check [GitBook's API documentation](https://developer.gitbook.com/)
- MCP protocol: See [Model Context Protocol documentation](https://modelcontextprotocol.io/)
