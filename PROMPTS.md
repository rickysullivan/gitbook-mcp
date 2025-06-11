# GitBook MCP Server - AI Documentation Prompts

This document provides comprehensive details about all 18 AI documentation prompts available in the GitBook MCP server. These prompts are designed to facilitate complex documentation workflows through conversational AI interfaces.

## Content Analysis & Planning Prompts

### 1. fetch_documentation

**Purpose**: Fetch and analyze GitBook documentation content for specific topics

**Parameters**:

- `spaceId` (required): The GitBook space ID to search in
- `topic` (required): The topic or keyword to search for
- `includeStructure` (optional): Set to "true" to include space structure

**Example Usage**:

```
Use the fetch_documentation prompt with:
- spaceId: "abc123"
- topic: "authentication"
- includeStructure: "true"
```

**What it does**: Searches for content related to your topic, retrieves relevant pages, analyzes completeness, and identifies related sections. Optionally includes the overall space structure for context.

### 2. update_documentation_plan

**Purpose**: Create comprehensive plans for updating documentation

**Parameters**:

- `spaceId` (required): The GitBook space ID to analyze
- `updateGoals` (required): Description of what you want to update
- `targetAudience` (optional): Target audience for updates (default: "general users")

**Example Usage**:

```
Use the update_documentation_plan prompt with:
- spaceId: "abc123"
- updateGoals: "Modernize API documentation and add more examples"
- targetAudience: "developers"
```

**What it does**: Analyzes current content, identifies pages needing updates, creates prioritized plans, suggests improvements, and recommends best practices for your target audience.

### 3. analyze_content_gaps

**Purpose**: Identify gaps and missing content in documentation

**Parameters**:

- `spaceId` (required): The GitBook space ID to analyze
- `comparisonSource` (optional): Source to compare against (default: "internal analysis")

**Example Usage**:

```
Use the analyze_content_gaps prompt with:
- spaceId: "abc123"
- comparisonSource: "OpenAPI specification"
```

**What it does**: Analyzes documentation for missing topics, incomplete sections, identifies coverage gaps, suggests new content, and prioritizes gaps by importance.

### 4. content_audit

**Purpose**: Perform quality audits of documentation content

**Parameters**:

- `spaceId` (required): The GitBook space ID to audit
- `auditCriteria` (optional): Specific criteria to audit (default: "general quality and consistency")

**Example Usage**:

```
Use the content_audit prompt with:
- spaceId: "abc123"
- auditCriteria: "style guide compliance and outdated content"
```

**What it does**: Reviews space structure, examines content quality and consistency, checks for outdated information, evaluates writing style, and provides improvement recommendations.

### 5. documentation_summary

**Purpose**: Generate summaries of GitBook spaces

**Parameters**:

- `spaceId` (required): The GitBook space ID to summarize
- `summaryType` (optional): Type of summary - "overview", "technical", "user-guide", or "custom" (default: "overview")

**Example Usage**:

```
Use the documentation_summary prompt with:
- spaceId: "abc123"
- summaryType: "technical"
```

**What it does**: Analyzes space structure and content, identifies main topics and themes, creates targeted summaries, highlights important sections, and identifies documentation scope.

### 6. migration_assessment

**Purpose**: Assess content for migration or restructuring

**Parameters**:

- `spaceId` (required): The GitBook space ID to assess
- `targetPlatform` (optional): Target platform for migration (default: "alternative documentation platform")

**Example Usage**:

```
Use the migration_assessment prompt with:
- spaceId: "abc123"
- targetPlatform: "Notion"
```

**What it does**: Analyzes current structure, evaluates complexity and format requirements, identifies migration challenges, suggests restructuring opportunities, and creates migration plans.

## Collaboration & Workflow Prompts

### 7. collaboration_workflow

**Purpose**: Set up collaboration workflows for reviews, updates, and team editing

**Parameters**:

- `spaceId` (required): The GitBook space ID for collaboration
- `workflowType` (required): Type of collaboration - "review", "update", "team-edit", or "approval"
- `assignees` (optional): Team members or reviewers to involve
- `deadline` (optional): Target completion date

**Example Usage**:

```
Use the collaboration_workflow prompt with:
- spaceId: "abc123"
- workflowType: "review"
- assignees: "john@example.com, jane@example.com"
- deadline: "2024-01-15"
```

**What it does**: Analyzes current content, sets up change requests, configures collaboration features, manages permissions, tracks progress, and ensures quality throughout the process.

### 8. change_request_management

**Purpose**: Create, review, merge, and analyze change requests

**Parameters**:

- `spaceId` (required): The GitBook space ID containing change requests
- `action` (required): Action to perform - "create", "review", "merge", or "analyze"
- `changeRequestId` (optional): Specific change request ID to work with
- `description` (optional): Description for new change requests

**Example Usage**:

```
Use the change_request_management prompt with:
- spaceId: "abc123"
- action: "create"
- description: "Update API authentication documentation"
```

**What it does**: Manages the complete change request lifecycle, from creation through review to merging, while maintaining content quality and handling conflicts.

### 9. permission_management

**Purpose**: Audit, update, and troubleshoot space and user permissions

**Parameters**:

- `spaceId` (required): The GitBook space ID for permission management
- `action` (required): Permission action - "audit", "update", "setup", or "troubleshoot"
- `userType` (optional): Type of users to manage - "team", "external", or "specific-role" (default: "all users")

**Example Usage**:

```
Use the permission_management prompt with:
- spaceId: "abc123"
- action: "audit"
- userType: "external"
```

**What it does**: Reviews permission structures, audits access levels, identifies security concerns, recommends optimal structures, sets up role-based access, and monitors permission health.

## Content Development Prompts

### 10. api_documentation_generator

**Purpose**: Generate comprehensive API documentation (REST, GraphQL, etc.)

**Parameters**:

- `spaceId` (required): The GitBook space ID for API documentation
- `apiType` (required): Type of API - "REST", "GraphQL", "gRPC", or "WebSocket"
- `sourceFormat` (optional): Source format - "OpenAPI", "schema files", or "manual" (default: "manual analysis")
- `endpointFocus` (optional): Specific endpoints or areas to focus on

**Example Usage**:

```
Use the api_documentation_generator prompt with:
- spaceId: "abc123"
- apiType: "REST"
- sourceFormat: "OpenAPI"
- endpointFocus: "authentication endpoints"
```

**What it does**: Creates comprehensive API documentation with examples, authentication details, error handling, best practices, interactive examples, and proper code samples.

### 11. content_optimization

**Purpose**: Optimize content for SEO, readability, structure, or performance

**Parameters**:

- `spaceId` (required): The GitBook space ID to optimize
- `optimizationType` (required): Type of optimization - "SEO", "readability", "structure", or "performance"
- `targetMetrics` (optional): Specific metrics or goals to optimize for

**Example Usage**:

```
Use the content_optimization prompt with:
- spaceId: "abc123"
- optimizationType: "SEO"
- targetMetrics: "search visibility and organic traffic"
```

**What it does**: Analyzes content for optimization opportunities, identifies pages needing work, suggests specific improvements, prioritizes changes, and tracks improvement results.

### 12. quality_assurance_check

**Purpose**: Perform systematic QA checks on content, links, and formatting

**Parameters**:

- `spaceId` (required): The GitBook space ID to check
- `checkType` (required): Type of QA check - "content", "links", "formatting", "consistency", or "comprehensive"
- `severity` (optional): Focus level - "critical", "important", or "all issues" (default: "important")

**Example Usage**:

```
Use the quality_assurance_check prompt with:
- spaceId: "abc123"
- checkType: "comprehensive"
- severity: "critical"
```

**What it does**: Systematically reviews content for issues, categorizes problems by severity, checks for broken links and formatting errors, validates accuracy, and generates detailed QA reports.

## Analytics & Strategy Prompts

### 13. content_analytics

**Purpose**: Analyze content for usage, performance, and engagement insights

**Parameters**:

- `spaceId` (required): The GitBook space ID to analyze
- `analysisType` (required): Type of analysis - "usage", "performance", "engagement", or "content-metrics"
- `timeframe` (optional): Time period for analysis (default: "recent activity")

**Example Usage**:

```
Use the content_analytics prompt with:
- spaceId: "abc123"
- analysisType: "engagement"
- timeframe: "last 30 days"
```

**What it does**: Gathers relevant data, analyzes content structure and activity patterns, identifies high and low-performing content, reviews collaboration patterns, and generates actionable insights.

### 14. content_strategy_planning

**Purpose**: Develop comprehensive content strategies aligned with business goals

**Parameters**:

- `spaceId` (required): The GitBook space ID for strategy planning
- `strategyFocus` (required): Strategy focus - "growth", "maintenance", "restructure", or "user-experience"
- `businessGoals` (optional): Business objectives to align with

**Example Usage**:

```
Use the content_strategy_planning prompt with:
- spaceId: "abc123"
- strategyFocus: "growth"
- businessGoals: "increase user adoption and reduce support tickets"
```

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
