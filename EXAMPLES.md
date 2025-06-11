# Example Usage

Here's how to use the GitBook MCP server with the new prompts:

## Using with Claude Desktop

Add this to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "gitbook": {
      "command": "node",
      "args": ["/path/to/gitbook-mcp/build/index.js"],
      "env": {
        "GITBOOK_API_TOKEN": "gb_live_your_token_here"
      }
    }
  }
}
```

## Example Prompt Usage

### 1. Analyze Documentation Gaps

```
Use the analyze_content_gaps prompt with these arguments:
- spaceId: "your-space-id"
- comparisonSource: "REST API endpoints"

This will help identify what API documentation is missing from your GitBook space.
```

### 2. Create Update Plan

```
Use the update_documentation_plan prompt with:
- spaceId: "your-space-id" 
- updateGoals: "Improve onboarding documentation with more examples and clearer setup instructions"
- targetAudience: "new developers"

This will analyze your current content and create a structured plan for improvements.
```

### 3. Content Audit

```
Use the content_audit prompt with:
- spaceId: "your-space-id"
- auditCriteria: "outdated screenshots, broken links, and unclear instructions"

This will systematically review your documentation for quality issues.
```

## Discovery Workflow

1. **Find your space**: Use `list_organizations` then `list_spaces` tools
2. **Choose a prompt**: Select based on your documentation goal
3. **Provide arguments**: Include space ID and specific criteria
4. **Review results**: Get structured analysis and recommendations

## Pro Tips

- Start with `documentation_summary` to understand your content landscape
- Use `analyze_content_gaps` before planning new content
- Run `content_audit` regularly to maintain quality
- Combine multiple prompts for comprehensive documentation management
