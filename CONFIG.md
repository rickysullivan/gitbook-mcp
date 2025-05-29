# GitBook MCP Server Configuration Examples

## Environment Variables

Create a `.env.local` file (don't commit this to version control):

```bash
# Your GitBook API Token
GITBOOK_API_TOKEN=gb_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## MCP Client Configurations

### Claude Desktop

For **macOS**:  
Add to `~/Library/Application Support/Claude/claude_desktop_config.json`

For **Windows**:  
Add to `%APPDATA%\Claude\claude_desktop_config.json`

For **Linux**:  
Add to `~/.config/Claude/claude_desktop_config.json`


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

### VS Code

Add the following to your VS Code `settings.json` (open Command Palette → "Preferences: Open Settings (JSON)"):

```json
"mcp.servers": {
  "gitbook": {
    "command": "npx",
    "args": [
      "gitbook-mcp",
      "start"
    ],
    "env": {
      "GITBOOK_API_TOKEN": "gb_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    },
    "transport": "stdio"
  }
}
```

Make sure to replace the API token with your actual value. Restart VS Code after saving the settings.

### JetBrains Products

1. Navigate to your MCP settings:

[Settings | Tools | AI Assistant | Model Context Protocol (MCP)](jetbrains://WebStorm/settings?name=Tools--AI+Assistant--Model+Context+Protocol+%28MCP%29)

2. Click the Add button (⌘+N)
3. Select **As JSON**
4. Paste this:

```json
{
  "mcpServers": {
    "gitlab": {
      "command": "npx",
      "args": [
        "-y",
        "gitbook-mcp"
      ],
      "env": {
        "GITBOOK_API_TOKEN": "gb_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      }
    }
  }
}
```

Make sure to replace the API token with your actual value.

### GitHub Copilot in JetBrains Products

Add the following to `~/.config/github-copilot/intellij/mcp.json`

```json
{
  "gitbook": {
    "command": "npx",
    "args": [
      "gitbook-mcp",
      "start"
    ],
    "env": {
      "GITBOOK_API_TOKEN": "gb_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    },
    "transport": "stdio"
  }
}
```

After saving, restart your JetBrains IDE for the changes to take effect.


### Other MCP Clients

For other MCP clients, use these connection details:

- **Transport**: stdio
- **Command**: `/path/to/gitbook-mcp/index.js`
- **Environment**: `GITBOOK_API_TOKEN=your_token_here`

## Testing the Server

You can test the server manually using a simple stdio test:

```bash
# Set your API token
export GITBOOK_API_TOKEN="your_token_here"

# Run the server
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | ./build/index.js
```

## GitBook API Token Permissions

Your API token should have these permissions:

- **Read access to organizations**: To list organizations you have access to
- **Read access to spaces**: To list and read space content
- **Read access to content**: To retrieve page content and search

## Common Workspace Patterns

### 1. Exploring Available Content

```bash
# First, list organizations
list_organizations()

# Then list spaces in an organization
list_spaces({"organizationId": "org_abc123"})

# Get space details
get_space({"spaceId": "space_def456"})

# View space content structure
get_space_content({"spaceId": "space_def456"})
```

### 2. Reading Specific Content

```bash
# Get content of a specific page
get_page_content({
  "spaceId": "space_def456",
  "pageId": "page_ghi789"
})
```

### 3. Searching Content

```bash
# Search within a space
search_content({
  "spaceId": "space_def456",
  "query": "authentication setup"
})
```

## Troubleshooting

### Common Issues

1. **"GITBOOK_API_TOKEN environment variable is required"**
   - Make sure you've set the environment variable
   - Check that there are no typos in the variable name

2. **"GitBook API error: 401 Unauthorized"**
   - Verify your API token is correct
   - Check that the token hasn't expired
   - Ensure the token has the required permissions

3. **"GitBook API error: 404 Not Found"**
   - Check that the space/organization ID is correct
   - Verify you have access to the requested resource

4. **Server not connecting**
   - Make sure the build completed successfully (`npm run build`)
   - Check that the file has execute permissions (`chmod +x build/index.js`)
   - Verify the path in your MCP client configuration

### Debug Mode

To enable debug logging, you can modify the server to log requests:

```bash
# Add this before running the server
export DEBUG=1
```
