#!/usr/bin/env node

import { config } from 'dotenv';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
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
  // Additional fields from OpenAPI spec
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
  // Additional fields from OpenAPI spec
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

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    if (DEBUG) {
      console.error(`🔗 Debug: Making request to ${url}`);
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Accept': 'application/json',
        'User-Agent': 'MCP GitBook Server 1.0.0',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      let errorMessage = `GitBook API error: ${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.json() as GitBookErrorResponse;
        if (errorBody.error) {
          errorMessage = `GitBook API error: ${errorBody.error.code} - ${errorBody.error.message}`;
        }
      } catch {
        // If we can't parse the error body, stick with the default message
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async getOrganizations(): Promise<GitBookOrganization[]> {
    const result = await this.makeRequest<{ items: GitBookOrganization[] }>('/orgs');
    return result.items;
  }

  async getSpaces(organizationId?: string): Promise<GitBookSpace[]> {
    const endpoint = organizationId ? `/orgs/${organizationId}/spaces` : '/spaces';
    const result = await this.makeRequest<{ items: GitBookSpace[] }>(endpoint);
    return result.items;
  }

  async getSpace(spaceId: string): Promise<GitBookSpace> {
    return this.makeRequest<GitBookSpace>(`/spaces/${spaceId}`);
  }

  async getSpaceContent(spaceId: string): Promise<GitBookPage[]> {
    const result = await this.makeRequest<{
      object: string;
      pages: GitBookPage[];
      [key: string]: any;
    }>(`/spaces/${spaceId}/content`);
    return result.pages || [];
  }

  async getPageContent(
    spaceId: string,
    pageId: string,
    options?: {
      format?: 'document' | 'markdown';
      metadata?: boolean;
      computed?: boolean;
    }
  ): Promise<GitBookContent> {
    let endpoint = `/spaces/${spaceId}/content/page/${pageId}`;

    if (options) {
      const params = new URLSearchParams();
      if (options.format) params.set('format', options.format);
      if (options.metadata !== undefined) params.set('metadata', options.metadata.toString());
      if (options.computed !== undefined) params.set('computed', options.computed.toString());

      const queryString = params.toString();
      if (queryString) {
        endpoint += `?${queryString}`;
      }
    }

    return this.makeRequest<GitBookContent>(endpoint);
  }

  async searchContent(spaceId: string, query: string): Promise<any> {
    const encodedQuery = encodeURIComponent(query);
    return this.makeRequest(`/spaces/${spaceId}/search?query=${encodedQuery}`);
  }
}

// Get API token from environment variable
const GITBOOK_API_TOKEN = process.env.GITBOOK_API_TOKEN;

// Add debug info only if DEBUG env var is set
if (DEBUG) {
  console.error(`🔍 Debug: API token ${GITBOOK_API_TOKEN ? 'found' : 'not found'}`);
  console.error(`🔍 Debug: Token length: ${GITBOOK_API_TOKEN?.length || 0}`);
}

if (!GITBOOK_API_TOKEN) {
  console.error('❌ Error: GITBOOK_API_TOKEN environment variable is required');
  console.error('');
  console.error('📋 Setup instructions:');
  console.error('1. Create a .env.local file in the project root');
  console.error('2. Add your GitBook API token:');
  console.error('   GITBOOK_API_TOKEN=gb_live_your_token_here');
  console.error('');
  console.error('🔗 Get your API token from: https://app.gitbook.com/account/developer');
  console.error('');
  if (DEBUG) {
    console.error('🔍 Debug: Available env vars starting with GITBOOK:');
    Object.keys(process.env).filter(key => key.startsWith('GITBOOK')).forEach(key => {
      console.error(`   ${key}=${process.env[key]?.substring(0, 10)}...`);
    });
  }
  process.exit(1);
}

const gitbookClient = new GitBookAPIClient(GITBOOK_API_TOKEN);

// Zod schemas for tool parameters
const ListOrganizationsSchema = z.object({});

const ListSpacesSchema = z.object({
  organizationId: z.string().optional().describe('Organization ID to filter spaces by')
});

const GetSpaceSchema = z.object({
  spaceId: z.string().describe('The ID of the space to retrieve')
});

const GetSpaceContentSchema = z.object({
  spaceId: z.string().describe('The ID of the space to get content from')
});

const GetPageContentSchema = z.object({
  spaceId: z.string().describe('The ID of the space containing the page'),
  pageId: z.string().describe('The ID of the page to retrieve content from'),
  format: z.enum(['document', 'markdown']).optional().describe('The format of the document to retrieve'),
  metadata: z.boolean().optional().describe('Whether to include revision metadata'),
  computed: z.boolean().optional().describe('Whether to include computed revision data')
});

const SearchContentSchema = z.object({
  spaceId: z.string().describe('The ID of the space to search in'),
  query: z.string().describe('The search query')
});

// Create server instance
const server = new Server({
  name: "gitbook",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},
  },
});

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_organizations',
        description: 'List all GitBook organizations accessible with the current API token',
        inputSchema: {
          type: 'object',
          properties: {},
        }
      },
      {
        name: 'list_spaces',
        description: 'List GitBook spaces, optionally filtered by organization',
        inputSchema: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'string',
              description: 'Organization ID to filter spaces by'
            }
          }
        }
      },
      {
        name: 'get_space',
        description: 'Get detailed information about a specific GitBook space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: {
              type: 'string',
              description: 'The ID of the space to retrieve'
            }
          },
          required: ['spaceId']
        }
      },
      {
        name: 'get_space_content',
        description: 'Get the content structure (pages) of a GitBook space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: {
              type: 'string',
              description: 'The ID of the space to get content from'
            }
          },
          required: ['spaceId']
        }
      },
      {
        name: 'get_page_content',
        description: 'Get the content of a specific page in a GitBook space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: {
              type: 'string',
              description: 'The ID of the space containing the page'
            },
            pageId: {
              type: 'string',
              description: 'The ID of the page to retrieve content from'
            },
            format: {
              type: 'string',
              enum: ['document', 'markdown'],
              description: 'The format of the document to retrieve'
            },
            metadata: {
              type: 'boolean',
              description: 'Whether to include revision metadata'
            },
            computed: {
              type: 'boolean',
              description: 'Whether to include computed revision data'
            }
          },
          required: ['spaceId', 'pageId']
        }
      },
      {
        name: 'search_content',
        description: 'Search for content within a GitBook space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: {
              type: 'string',
              description: 'The ID of the space to search in'
            },
            query: {
              type: 'string',
              description: 'The search query'
            }
          },
          required: ['spaceId', 'query']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_organizations': {
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

      case 'list_spaces': {
        const { organizationId } = ListSpacesSchema.parse(args);
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

      case 'get_space': {
        const { spaceId } = GetSpaceSchema.parse(args);
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

      case 'get_space_content': {
        const { spaceId } = GetSpaceContentSchema.parse(args);
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

      case 'get_page_content': {
        const { spaceId, pageId, format, metadata, computed } = GetPageContentSchema.parse(args);
        const options: Record<string, any> = {};
        if (format !== undefined) options.format = format;
        if (metadata !== undefined) options.metadata = metadata;
        if (computed !== undefined) options.computed = computed;
        const pageContent = await gitbookClient.getPageContent(spaceId, pageId, Object.keys(options).length > 0 ? options : undefined);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(pageContent, null, 2)
            }
          ]
        };
      }

      case 'search_content': {
        const { spaceId, query } = SearchContentSchema.parse(args);
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

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

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
