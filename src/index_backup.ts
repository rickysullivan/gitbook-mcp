#!/usr/bin/env node

import { config } from 'dotenv';
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find the project root by looking for package.json
function findProjectRoot(startDir: string): string {
  let currentDir = startDir;
  while (currentDir !== dirname(currentDir)) {
    if (existsSync(join(currentDir, 'package.json'))) {
      return currentDir;
    }
    currentDir = dirname(currentDir);
  }
  // Fallback to parent of build directory
  return join(__dirname, '..');
}

const projectRoot = findProjectRoot(__dirname);

// Load environment variables from .env.local, .env files
// Priority: .env.local > .env > process.env
const envFiles = [
  join(projectRoot, '.env.local'),
  join(projectRoot, '.env'),
  '.env.local', // Also try current working directory
  '.env'
];

let envLoaded = false;
// Add debug info only if DEBUG env var is set
const DEBUG = process.env.DEBUG;
if (DEBUG) {
  console.error(`🔍 Debug: Working directory: ${process.cwd()}`);
  console.error(`🔍 Debug: Script directory: ${__dirname}`);
  console.error(`🔍 Debug: Project root: ${projectRoot}`);
}

for (const envFile of envFiles) {
  if (existsSync(envFile)) {
    const result = config({ path: envFile, override: true });
    if (result.error) {
      console.error(`⚠️  Warning: Error loading ${envFile}:`, result.error.message);
    } else {
      console.error(`✅ Loaded environment from: ${envFile}`);
      envLoaded = true;
      break;
    }
  } else if (DEBUG) {
    console.error(`❌ File not found: ${envFile}`);
  }
}

if (!envLoaded) {
  console.error(`📁 No environment files found. Checked: ${envFiles.join(', ')}`);
}

// Types based on GitBook API OpenAPI specification
interface GitBookSpace {
  id: string;
  title: string;
  description?: string;
  visibility: 'public' | 'unlisted' | 'visitor-authentication' | 'members-only' | 'inherited';
  organizationId?: string;
  urls?: {
    app?: string;
    published?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  kind?: 'space';
  parent?: string;
  gitSync?: {
    enabled: boolean;
    url?: string;
    branch?: string;
  };
}

interface GitBookOrganization {
  id: string;
  title: string;
  description?: string;
  urls?: {
    app?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  kind?: 'organization';
  avatar?: {
    light?: string;
    dark?: string;
  };
}

interface GitBookPage {
  id: string;
  title: string;
  description?: string;
  kind: 'sheet' | 'group';
  type: 'document' | 'link' | 'group';
  path: string;
  slug?: string;
  href?: string;
  documentId?: string;
  createdAt?: string;
  updatedAt?: string;
  git?: {
    oid: string;
    path: string;
  };
  urls?: {
    app?: string;
  };
  pages?: GitBookPage[];
  layout?: {
    cover?: boolean;
    coverSize?: string;
    title?: boolean;
    description?: boolean;
    tableOfContents?: boolean;
    outline?: boolean;
    pagination?: boolean;
  };
}

interface GitBookContent {
  kind: 'document';
  document: {
    type: string;
    content: any[];
  };
}

interface GitBookFile {
  id: string;
  name: string;
  path: string;
  type: string;
  size?: number;
  createdAt?: string;
  updatedAt?: string;
  downloadURL?: string;
}

// Error response interface from OpenAPI spec
interface GitBookErrorResponse {
  error: {
    code: number;
    message: string;
    details?: any;
  };
}

// GitBook API client
class GitBookAPIClient {
  private baseURL = 'https://api.gitbook.com/v1';
  private apiToken: string;
  private organizationId?: string;

  constructor(apiToken: string, options?: {
    organizationId?: string;
  }) {
    this.apiToken = apiToken;
    this.organizationId = options?.organizationId;
  }

  private async makeRequest<T>(endpoint: string, options?: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  }): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      ...options?.headers
    };

    const response = await fetch(url, {
      method: options?.method || 'GET',
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData: GitBookErrorResponse = await response.json();
        errorMessage = errorData.error?.message || errorMessage;
      } catch (e) {
        // If we can't parse the error response, use the basic error message
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Organization operations
  async getOrganizations(): Promise<GitBookOrganization[]> {
    const response = await this.makeRequest<{ items: GitBookOrganization[] }>('/orgs');
    return response.items;
  }

  // Space operations
  async getSpaces(organizationId?: string): Promise<GitBookSpace[]> {
    const orgId = organizationId || this.organizationId;
    let endpoint = '/spaces';
    if (orgId) {
      endpoint += `?organizationId=${orgId}`;
    }
    const response = await this.makeRequest<{ items: GitBookSpace[] }>(endpoint);
    return response.items;
  }

  async getSpace(spaceId: string): Promise<GitBookSpace> {
    return this.makeRequest<GitBookSpace>(`/spaces/${spaceId}`);
  }

  async getSpaceContent(spaceId: string): Promise<{ pages: GitBookPage[] }> {
    return this.makeRequest<{ pages: GitBookPage[] }>(`/spaces/${spaceId}/content`);
  }

  // Page operations
  async getPageContent(spaceId: string, pageId: string, options?: {
    format?: 'document' | 'markdown';
    metadata?: boolean;
    computed?: boolean;
  }): Promise<any> {
    let endpoint = `/spaces/${spaceId}/content/page/${pageId}`;
    const params = new URLSearchParams();
    
    if (options?.format) params.append('format', options.format);
    if (options?.metadata !== undefined) params.append('metadata', options.metadata.toString());
    if (options?.computed !== undefined) params.append('computed', options.computed.toString());
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    return this.makeRequest<any>(endpoint);
  }

  async getPageByPath(spaceId: string, pagePath: string): Promise<any> {
    const encodedPath = encodeURIComponent(pagePath);
    return this.makeRequest<any>(`/spaces/${spaceId}/content/path/${encodedPath}`);
  }

  // Search operations
  async searchContent(spaceId: string, query: string): Promise<any> {
    const params = new URLSearchParams({ query });
    return this.makeRequest<any>(`/spaces/${spaceId}/search?${params.toString()}`);
  }

  // File operations
  async getSpaceFiles(spaceId: string): Promise<GitBookFile[]> {
    const response = await this.makeRequest<{ items: GitBookFile[] }>(`/spaces/${spaceId}/files`);
    return response.items;
  }

  async getFile(spaceId: string, fileId: string): Promise<GitBookFile> {
    return this.makeRequest<GitBookFile>(`/spaces/${spaceId}/files/${fileId}`);
  }
}

// Initialize the GitBook client
const apiToken = process.env.GITBOOK_API_TOKEN;
const organizationId = process.env.GITBOOK_ORGANIZATION_ID;

if (!apiToken) {
  console.error('❌ GITBOOK_API_TOKEN environment variable is required');
  console.error('💡 Please set your GitBook API token in your .env file');
  console.error('💡 Example: GITBOOK_API_TOKEN=your_token_here');
  console.error('💡 Get your token from: https://app.gitbook.com/account/developer');
  if (organizationId) {
    console.error(`💡 Organization ID found: ${organizationId}`);
  } else {
    console.error('💡 Tip: Use list_organizations tool to find your organization ID');
  }
  process.exit(1);
}

const gitbookClient = new GitBookAPIClient(apiToken, {
  organizationId: organizationId
});

// Create the MCP server
const server = new McpServer(
  {
    name: "gitbook-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {}
    },
  }
);

// Core Content Reading Tools
server.tool(
  "list_organizations",
  {},
  async () => {
    const organizations = await gitbookClient.getOrganizations();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(organizations, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "list_spaces", 
  { organizationId: z.string().optional().describe('Organization ID to filter spaces by') },
  async ({ organizationId }) => {
    const spaces = await gitbookClient.getSpaces(organizationId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(spaces, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "get_space",
  { spaceId: z.string().describe('The ID of the space to retrieve') },
  async ({ spaceId }) => {
    const space = await gitbookClient.getSpace(spaceId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(space, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "get_space_content",
  { spaceId: z.string().describe('The ID of the space to get content from') },
  async ({ spaceId }) => {
    const content = await gitbookClient.getSpaceContent(spaceId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(content, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "get_page_content",
  {
    spaceId: z.string().describe('The ID of the space containing the page'),
    pageId: z.string().describe('The ID of the page to retrieve content from'),
    format: z.enum(['document', 'markdown']).optional().describe('The format of the document to retrieve'),
    metadata: z.boolean().optional().describe('Whether to include revision metadata'),
    computed: z.boolean().optional().describe('Whether to include computed revision data')
  },
  async ({ spaceId, pageId, format, metadata, computed }) => {
    const options: Record<string, any> = {};
    if (format !== undefined) options.format = format;
    if (metadata !== undefined) options.metadata = metadata;
    if (computed !== undefined) options.computed = computed;
    
    const pageContent = await gitbookClient.getPageContent(
      spaceId, 
      pageId, 
      Object.keys(options).length > 0 ? options : undefined
    );
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(pageContent, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "get_page_by_path",
  {
    spaceId: z.string().describe('The ID of the space containing the page'),
    pagePath: z.string().describe('The path of the page to retrieve')
  },
  async ({ spaceId, pagePath }) => {
    const pageContent = await gitbookClient.getPageByPath(spaceId, pagePath);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(pageContent, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "search_content",
  {
    spaceId: z.string().describe('The ID of the space to search in'),
    query: z.string().describe('The search query')
  },
  async ({ spaceId, query }) => {
    const searchResults = await gitbookClient.searchContent(spaceId, query);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(searchResults, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "get_space_files",
  { spaceId: z.string().describe('The ID of the space to get files from') },
  async ({ spaceId }) => {
    const files = await gitbookClient.getSpaceFiles(spaceId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(files, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "get_file",
  {
    spaceId: z.string().describe('The ID of the space containing the file'),
    fileId: z.string().describe('The ID of the file to retrieve')
  },
  async ({ spaceId, fileId }) => {
    const file = await gitbookClient.getFile(spaceId, fileId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(file, null, 2)
        }
      ]
    };
  }
);

// Add resources for easy access to common data
server.resource(
  "organizations",
  "gitbook://organizations",
  async () => {
    const organizations = await gitbookClient.getOrganizations();
    return {
      contents: [{
        uri: "gitbook://organizations",
        text: JSON.stringify(organizations, null, 2),
        mimeType: "application/json"
      }]
    };
  }
);

server.resource(
  "spaces",
  new ResourceTemplate("gitbook://spaces/{organizationId?}", { 
    list: async () => {
      const organizations = await gitbookClient.getOrganizations();
      return {
        resources: organizations.map(org => ({
          name: `Spaces for ${org.title}`,
          uri: `gitbook://spaces/${org.id}`,
          mimeType: "application/json",
          description: `All spaces for organization: ${org.title}`
        }))
      };
    }
  }),
  async (uri, { organizationId }) => {
    // ResourceTemplate parameters come as string arrays, get the first value
    const orgId = Array.isArray(organizationId) ? organizationId[0] : organizationId;
    const spaces = await gitbookClient.getSpaces(orgId);
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(spaces, null, 2),
        mimeType: "application/json"
      }]
    };
  }
);

server.resource(
  "space",
  new ResourceTemplate("gitbook://space/{spaceId}", { list: undefined }),
  async (uri, { spaceId }) => {
    // ResourceTemplate parameters come as string arrays, get the first value
    const id = Array.isArray(spaceId) ? spaceId[0] : spaceId;
    const space = await gitbookClient.getSpace(id);
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(space, null, 2),
        mimeType: "application/json"
      }]
    };
  }
);

server.resource(
  "space-content",
  new ResourceTemplate("gitbook://space/{spaceId}/content", { list: undefined }),
  async (uri, { spaceId }) => {
    // ResourceTemplate parameters come as string arrays, get the first value
    const id = Array.isArray(spaceId) ? spaceId[0] : spaceId;
    const content = await gitbookClient.getSpaceContent(id);
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(content, null, 2),
        mimeType: "application/json"
      }]
    };
  }
);

// Add helpful prompts for common use cases
server.prompt(
  "fetch_documentation",
  {
    spaceId: z.string().describe('The GitBook space ID to search in'),
    topic: z.string().describe('The topic or keyword to search for in the documentation'),
    includeStructure: z.string().optional().describe('Set to "true" to include the overall space structure in the analysis')
  },
  (args) => {
    const { spaceId, topic, includeStructure } = args;
    let promptText = `I need to fetch and analyze GitBook documentation content.

**Space ID**: ${spaceId}
**Topic**: ${topic}
**Include Structure**: ${includeStructure === 'true'}

Please help me:
1. Search for content related to "${topic}" in the GitBook space
2. Retrieve the most relevant pages
3. Analyze the content for completeness and accuracy
4. Identify any related pages or sections I should also review`;

    if (includeStructure === 'true') {
      promptText += `
5. Show me the overall space structure to understand context`;
    }

    promptText += `

Start by using the search_content tool to find relevant pages, then use get_page_content to retrieve the actual content for analysis.`;

    return {
      description: `Fetch and analyze GitBook documentation for topic: ${topic}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: promptText
          }
        }
      ]
    };
  }
);

server.prompt(
  "analyze_content_structure",
  {
    spaceId: z.string().describe('The GitBook space ID to analyze'),
    analysisType: z.string().optional().describe('Type of analysis: overview, gaps, organization, or completeness')
  },
  (args) => {
    const { spaceId, analysisType = 'overview' } = args;
    const promptText = `I need to analyze the content structure of a GitBook space.

**Space ID**: ${spaceId}
**Analysis Type**: ${analysisType}

Please help me:
1. Get the complete space structure and content overview
2. Analyze the documentation organization and hierarchy
3. Identify the main topics and sections covered
4. Assess the logical flow and navigation structure
5. Highlight any organizational issues or improvements needed

Start by retrieving the space content structure to understand the overall organization.`;

    return {
      description: `Analyze content structure for GitBook space`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: promptText
          }
        }
      ]
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GitBook MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
