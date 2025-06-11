# GitBook MCP Server - AI Documentation Prompts

This document provides comprehensive details about the 6 core AI documentation prompts implemented in the GitBook MCP server. These prompts are designed to facilitate essential documentation workflows through conversational AI interfaces and work seamlessly with the 12 available MCP tools.

## Implemented Prompts

### 1. fetch_documentation

**Purpose**: Fetch and analyze GitBook documentation content for specific topics

**Parameters**:
- `spaceId` (optional): The GitBook space ID to search in (uses default space if not provided)
- `topic` (required): The topic or keyword to search for in the documentation  
- `includeStructure` (optional): Set to "true" to include the overall space structure in the analysis

**Related MCP Tools**: `search_content`, `get_page_content`, `get_space_content`, `get_page_by_path`

**Example Usage**:
```
Use the fetch_documentation prompt with:
- spaceId: "abc123" 
- topic: "authentication"
- includeStructure: "true"
```

**What it does**: Searches for content related to your topic, retrieves relevant pages, analyzes completeness, and identifies related sections. Optionally includes the overall space structure for context.

### 2. analyze_content_gaps

**Purpose**: Identify gaps and missing content in documentation

**Parameters**:
- `spaceId` (optional): The GitBook space ID to analyze (uses default space if not provided)
- `comparisonSource` (optional): Source to compare against (default: "internal analysis")

**Related MCP Tools**: `get_space_content`, `get_page_content`, `search_content`, `list_spaces`

**Example Usage**:
```
Use the analyze_content_gaps prompt with:
- spaceId: "abc123"
- comparisonSource: "OpenAPI specification"
```

**What it does**: Analyzes documentation for missing topics, incomplete sections, identifies coverage gaps, suggests new content, and prioritizes gaps by importance.

### 3. content_audit

**Purpose**: Perform quality audits of documentation content

**Parameters**:
- `spaceId` (optional): The GitBook space ID to audit (uses default space if not provided)
- `auditCriteria` (optional): Specific criteria to audit (default: "general quality and consistency")

**Related MCP Tools**: `get_space_content`, `get_page_content`, `get_space_files`, `get_space`, `get_collection`

**Example Usage**:
```
Use the content_audit prompt with:
- spaceId: "abc123"
- auditCriteria: "style guide compliance and outdated content"
```

**What it does**: Reviews space structure, examines content quality and consistency, checks for outdated information, evaluates writing style, and provides improvement recommendations.

### 4. documentation_summary

**Purpose**: Generate comprehensive summaries of GitBook spaces

**Parameters**:
- `spaceId` (optional): The GitBook space ID to summarize (uses default space if not provided)
- `summaryType` (optional): Type of summary - "overview", "technical", "user-guide", or "custom" (default: "overview")

**Related MCP Tools**: `get_space_content`, `get_page_content`, `get_space`, `list_collections`, `list_organizations`

**Example Usage**:
```
Use the documentation_summary prompt with:
- spaceId: "abc123"
- summaryType: "technical"
```

**What it does**: Analyzes space structure and content, identifies main topics and themes, creates targeted summaries, highlights important sections, and identifies documentation scope.

### 5. content_optimization  

**Purpose**: Optimize content for SEO, readability, structure, or performance

**Parameters**:
- `spaceId` (optional): The GitBook space ID to optimize (uses default space if not provided)
- `optimizationType` (required): Type of optimization - "SEO", "readability", "structure", or "performance"
- `targetMetrics` (optional): Specific metrics or goals to optimize for

**Related MCP Tools**: `get_page_content`, `search_content`, `get_space_content`, `get_space_files`

**Example Usage**:
```
Use the content_optimization prompt with:
- spaceId: "abc123"
- optimizationType: "SEO"
- targetMetrics: "search visibility and organic traffic"
```

**What it does**: Analyzes content for optimization opportunities, identifies pages needing work, suggests specific improvements, prioritizes changes, and tracks improvement results.

### 6. troubleshooting_assistant

**Purpose**: Diagnose and resolve access, sync, content, and integration issues

**Parameters**:
- `spaceId` (optional): The GitBook space ID experiencing issues (uses default space if not provided)
- `issueType` (required): Type of issue - "access", "sync", "content", "integration", or "performance"
- `description` (optional): Description of the specific problem

**Related MCP Tools**: `get_space`, `get_page_by_path`, `get_file`, `list_organizations`, `list_spaces`

**Example Usage**:
```
Use the troubleshooting_assistant prompt with:
- spaceId: "abc123"
- issueType: "sync"
- description: "Git sync failing with authentication errors"
```

**What it does**: Diagnoses issues by examining relevant data, identifies potential causes, checks system status and configuration, provides step-by-step troubleshooting, suggests preventive measures, and documents resolution processes.

## MCP Tool to Prompt Mapping

This section shows which prompts work best with each MCP tool:

### Core Content Reading Tools
- **list_organizations** → `documentation_summary`, `troubleshooting_assistant`
- **list_spaces** → `documentation_summary`, `analyze_content_gaps`
- **get_space** → `content_audit`, `documentation_summary`, `troubleshooting_assistant`
- **get_space_content** → `fetch_documentation`, `analyze_content_gaps`, `content_audit`, `documentation_summary`

### Page Content Tools  
- **get_page_content** → `fetch_documentation`, `content_optimization`, `content_audit`
- **get_page_by_path** → `fetch_documentation`, `troubleshooting_assistant`
- **search_content** → `fetch_documentation`, `analyze_content_gaps`, `content_optimization`

### File Management Tools
- **get_space_files** → `content_audit`, `content_optimization`
- **get_file** → `troubleshooting_assistant`, `content_audit`

### Collection Tools
- **list_collections** → `documentation_summary`
- **get_collection** → `content_audit`, `documentation_summary`
- **get_collection_spaces** → `analyze_content_gaps`, `documentation_summary`

## Best Practices for Using Prompts

### 1. Start with Discovery
Use `documentation_summary` to understand the scope and structure before diving into specific analysis.

### 2. Use Progressive Analysis
Follow this workflow:
1. `documentation_summary` - Understand what you're working with
2. `analyze_content_gaps` - Identify what's missing
3. `content_audit` - Assess quality of existing content
4. `content_optimization` - Improve specific areas
5. `troubleshooting_assistant` - Resolve any issues

### 3. Combine Prompts for Complex Workflows
Many prompts work well together:
- Use `content_audit` to identify issues
- Use `analyze_content_gaps` to find missing content  
- Use `content_optimization` to improve specific pages
- Use `troubleshooting_assistant` for technical problems

### 4. Leverage Tool Synergy
The prompts are designed to work with multiple MCP tools:
- Start with overview tools (`get_space_content`, `list_spaces`)
- Drill down with specific tools (`get_page_content`, `search_content`)
- Use supporting tools as needed (`get_space_files`, `get_file`)

### 5. Customize Parameters
Take advantage of optional parameters to tailor prompts to your specific needs and contexts.

## Integration with Claude Desktop

When using these prompts with Claude Desktop and the GitBook MCP server:

1. **Be Specific**: Provide clear, specific parameters to get the best results
2. **Use Context**: Reference previous conversations and results when chaining prompts
3. **Iterate**: Use the analysis results to refine your approach and parameters
4. **Document**: Keep track of successful prompt combinations for your specific use cases

## Common Workflow Examples

### Complete Documentation Review
1. `documentation_summary` with `summaryType: "overview"`
2. `analyze_content_gaps` to identify missing content
3. `content_audit` to assess quality issues
4. `content_optimization` for specific improvements

### Troubleshooting Content Issues
1. `troubleshooting_assistant` with specific issue description
2. `fetch_documentation` to understand related content
3. `content_audit` to identify broader issues
4. `content_optimization` to implement fixes

### Topic-Focused Analysis
1. `fetch_documentation` with your specific topic
2. `analyze_content_gaps` for that topic area  
3. `content_optimization` to improve found content
4. `documentation_summary` to see the broader context

## Support and Troubleshooting

If you encounter issues with prompts:

1. Use the `troubleshooting_assistant` prompt for technical issues
2. Check that your GitBook API token has appropriate permissions
3. Verify that space IDs are correct and accessible
4. Review the prompt parameters and adjust as needed
5. Ensure you have the required MCP tools available

For complex workflows, consider breaking them down into smaller steps using multiple prompts in sequence.

**What it does**: Analyzes current performance, assesses gaps and opportunities, develops strategic recommendations, creates improvement roadmaps, defines success metrics, and establishes governance procedures.

### 15. version_control_workflow

**Purpose**: Manage branching, releases, rollbacks, and sync workflows

**Parameters**:

- `spaceId` (required): The GitBook space ID for version control
- `workflowType` (required): Workflow type - "branching", "release", "rollback", or "sync"
- `targetVersion` (optional): Specific version or revision to work with

**Example Usage**:

```
Use the version_control_workflow prompt with:
- spaceId: "abc123"
- workflowType: "release"
- targetVersion: "v2.1.0"
```

**What it does**: Analyzes revision history, implements version control workflows, tracks changes, manages conflicts and merges, documents procedures, and ensures team coordination.

## Technical Operations Prompts

### 16. integration_setup

**Purpose**: Configure Git, CI/CD, and external tool integrations

**Parameters**:

- `spaceId` (required): The GitBook space ID for integration setup
- `integrationType` (required): Type of integration - "Git", "CI/CD", "external-tools", or "custom"
- `platform` (optional): Target platform or service for integration

**Example Usage**:

```
Use the integration_setup prompt with:
- spaceId: "abc123"
- integrationType: "Git"
- platform: "GitHub"
```

**What it does**: Analyzes current integrations, configures new integrations, sets up synchronization and automation, tests functionality, establishes best practices, and monitors integration health.

### 17. export_and_backup

**Purpose**: Export content as PDF, markdown, or create comprehensive backups

**Parameters**:

- `spaceId` (required): The GitBook space ID to export/backup
- `exportType` (required): Export type - "PDF", "markdown", "full-backup", or "selective"
- `includeAssets` (optional): Whether to include images and assets - "true" or "false" (default: "true")

**Example Usage**:

```
Use the export_and_backup prompt with:
- spaceId: "abc123"
- exportType: "PDF"
- includeAssets: "true"
```

**What it does**: Analyzes content for export, configures export settings, ensures completeness and integrity, organizes exported content, creates backup procedures, and validates export quality.

### 18. troubleshooting_assistant

**Purpose**: Diagnose and resolve access, sync, content, and integration issues

**Parameters**:

- `spaceId` (required): The GitBook space ID experiencing issues
- `issueType` (required): Type of issue - "access", "sync", "content", "integration", or "performance"
- `description` (optional): Description of the specific problem

**Example Usage**:

```
Use the troubleshooting_assistant prompt with:
- spaceId: "abc123"
- issueType: "sync"
- description: "Git sync failing with authentication errors"
```

**What it does**: Diagnoses issues by examining relevant data, identifies potential causes, checks system status and configuration, provides step-by-step troubleshooting, suggests preventive measures, and documents resolution processes.

## Best Practices for Using Prompts

### 1. Start with Analysis

Before making changes, use analysis prompts (`content_audit`, `analyze_content_gaps`, `content_analytics`) to understand the current state.

### 2. Plan Before Acting

Use planning prompts (`update_documentation_plan`, `content_strategy_planning`) to create structured approaches to improvements.

### 3. Use Progressive Enhancement

Start with basic workflows and gradually implement more advanced features as your team becomes comfortable with the tools.

### 4. Monitor and Iterate

Use analytics and troubleshooting prompts to continuously monitor and improve your documentation processes.

### 5. Combine Prompts for Complex Workflows

Many prompts work well together. For example:

1. Use `content_audit` to identify issues
2. Use `update_documentation_plan` to create improvement plans
3. Use `collaboration_workflow` to coordinate team efforts
4. Use `quality_assurance_check` to validate results

### 6. Customize Parameters

Take advantage of optional parameters to tailor prompts to your specific needs and contexts.

## Integration with Claude Desktop

When using these prompts with Claude Desktop and the GitBook MCP server:

1. **Be Specific**: Provide clear, specific parameters to get the best results
2. **Use Context**: Reference previous conversations and results when chaining prompts
3. **Iterate**: Use the analysis results to refine your approach and parameters
4. **Document**: Keep track of successful prompt combinations for your specific use cases

## Support and Troubleshooting

If you encounter issues with prompts:

1. Use the `troubleshooting_assistant` prompt for technical issues
2. Check that your GitBook API token has appropriate permissions
3. Verify that space IDs are correct and accessible
4. Review the prompt parameters and adjust as needed

For complex workflows, consider breaking them down into smaller steps using multiple prompts in sequence.
