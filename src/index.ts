#!/usr/bin/env node

import { config } from 'dotenv';
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

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
  // Fallback to parent of dist directory
  return join(__dirname, '..');
}

const projectRoot = findProjectRoot(__dirname);

// Parse CLI arguments
interface CLIArgs {
  organizationId?: string;
  spaceId?: string;
}

const argv = yargs(hideBin(process.argv))
  .option('organization-id', {
    type: 'string',
    description: 'Organization ID to work with',
    alias: 'org'
  })
  .option('space-id', {
    type: 'string', 
    description: 'The space to get content from',
    alias: 'space'
  })
  .help()
  .parseSync() as CLIArgs;

// Configuration hierarchy functions
function readConfigFromCopilotInstructions(): { organizationId?: string; spaceId?: string } {
  const possiblePaths = [
    join(projectRoot, '.github', 'copilot-instructions.md'),
    join(projectRoot, '.cursorrules'),
    join(projectRoot, '.cursor', 'rules', 'rules.md'),
    join(projectRoot, '.cursor', 'rules', 'instructions.md')
  ];
  
  for (const configPath of possiblePaths) {
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, 'utf-8');
        const config: { organizationId?: string; spaceId?: string } = {};
        
        // Look for standardized patterns
        const patterns = {
          organizationId: [
            /organization-id:\s*([a-zA-Z0-9-]+)/i,
            /org-id:\s*([a-zA-Z0-9-]+)/i,
            /gitbook[_-]?org[_-]?id:\s*([a-zA-Z0-9-]+)/i,
            /default[_-]?organization:\s*([a-zA-Z0-9-]+)/i
          ],
          spaceId: [
            /space-id:\s*([a-zA-Z0-9-]+)/i,
            /gitbook[_-]?space[_-]?id:\s*([a-zA-Z0-9-]+)/i,
            /default[_-]?space:\s*([a-zA-Z0-9-]+)/i
          ]
        };
        
        // Check organization ID patterns
        for (const pattern of patterns.organizationId) {
          const match = content.match(pattern);
          if (match && match[1]) {
            config.organizationId = match[1];
            break;
          }
        }
        
        // Check space ID patterns
        for (const pattern of patterns.spaceId) {
          const match = content.match(pattern);
          if (match && match[1]) {
            config.spaceId = match[1];
            break;
          }
        }
        
        // Also look for GitBook URLs and extract IDs
        const urlPattern = /gitbook\.com\/([^\/]+)\/([a-zA-Z0-9-]+)/g;
        const urlMatch = urlPattern.exec(content);
        if (urlMatch) {
          if (!config.organizationId && urlMatch[1]) {
            config.organizationId = urlMatch[1];
          }
          if (!config.spaceId && urlMatch[2]) {
            config.spaceId = urlMatch[2];
          }
        }
        
        if (config.organizationId || config.spaceId) {
          if (DEBUG) {
            console.error(`🔍 Debug: Found config in ${configPath}:`, config);
          }
          return config;
        }
      } catch (error) {
        if (DEBUG) {
          console.error(`🔍 Debug: Error reading ${configPath}:`, error);
        }
      }
    }
  }
  
  return {};
}

// Apply configuration hierarchy: CLI args > Copilot instructions > Environment variables
function resolveConfiguration() {
  const envConfig = {
    organizationId: process.env.GITBOOK_ORGANIZATION_ID,
    spaceId: process.env.GITBOOK_SPACE_ID
  };
  
  const copilotConfig = readConfigFromCopilotInstructions();
  
  const cliConfig = {
    organizationId: argv.organizationId,
    spaceId: argv.spaceId
  };
  
  // Apply hierarchy (later values override earlier ones)
  const resolvedConfig = {
    organizationId: cliConfig.organizationId || copilotConfig.organizationId || envConfig.organizationId,
    spaceId: cliConfig.spaceId || copilotConfig.spaceId || envConfig.spaceId
  };
  
  if (DEBUG) {
    console.error('🔍 Debug: Configuration sources:');
    console.error('  Environment:', envConfig);
    console.error('  Copilot files:', copilotConfig);
    console.error('  CLI arguments:', cliConfig);
    console.error('  Final resolved:', resolvedConfig);
  }
  
  return resolvedConfig;
}

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
  object: 'space';
  id: string;
  title: string;
  emoji?: string;
  visibility: 'public' | 'unlisted' | 'visitor-authentication' | 'members-only' | 'inherited';
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  editMode?: string;
  urls: {
    location: string;
    app: string;
    published?: string;
    public?: string;
    icon?: string;
  };
  organization: string;
  parent?: string;
  gitSync?: {
    enabled: boolean;
    url?: string;
    branch?: string;
  };
}

interface GitBookOrganization {
  object: 'organization';
  id: string;
  title: string;
  createdAt: string;
  emailDomains?: string[];
  hostname?: string;
  type?: string;
  useCase?: string;
  communityType?: string;
  defaultRole?: string;
  defaultContent?: string;
  sso?: boolean;
  ai?: boolean;
  inviteLinks?: boolean;
  plan?: any;
  billing?: any;
  urls: {
    location: string;
    app: string;
    published?: string;
    icon?: string;
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

interface GitBookRevision {
  object: 'revision';
  id: string;
  title?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  type: 'initial' | 'update' | 'merge';
  parent?: string;
  git?: {
    oid: string;
    message?: string;
  };
  pages: GitBookPage[];
}

interface GitBookContent {
  kind: 'document';
  document: {
    type: string;
    content: any[];
  };
}

interface GitBookFile {
  object: 'file';
  id: string;
  name: string;
  path: string;
  type: string;
  size?: number;
  createdAt?: string;
  updatedAt?: string;
  downloadURL?: string;
}

interface GitBookCollection {
  object: 'collection';
  id: string;
  title: string;
  description?: string;
  organization: string;
  parent?: string;
  defaultLevel?: string;
  urls: {
    location: string;
    app: string;
  };
  permissions?: {
    view?: boolean;
    admin?: boolean;
    viewInviteLinks?: boolean;
    create?: boolean;
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
  private organizationId?: string;
  private defaultSpaceId?: string;

  constructor(apiToken: string, options?: {
    organizationId?: string;
    defaultSpaceId?: string;
  }) {
    this.apiToken = apiToken;
    this.organizationId = options?.organizationId;
    this.defaultSpaceId = options?.defaultSpaceId;
  }

  // Get the default space ID (with fallback priority)
  getDefaultSpaceId(): string | undefined {
    return this.defaultSpaceId;
  }

  // Get the default organization ID
  getDefaultOrganizationId(): string | undefined {
    return this.organizationId;
  }

  // Resolve configuration with hierarchy: explicit param > default config > error
  resolveSpaceId(explicitSpaceId?: string): string {
    const effectiveSpaceId = explicitSpaceId || this.getDefaultSpaceId();
    if (!effectiveSpaceId) {
      throw new Error('No space ID provided and no default space configured. Please provide spaceId, use --space-id CLI argument, or add space-id to your configuration file.');
    }
    return effectiveSpaceId;
  }

  resolveOrganizationId(explicitOrgId?: string): string {
    const effectiveOrgId = explicitOrgId || this.getDefaultOrganizationId();
    if (!effectiveOrgId) {
      throw new Error('No organization ID provided and no default organization configured. Please provide organizationId, use --organization-id CLI argument, or add organization-id to your configuration file.');
    }
    return effectiveOrgId;
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
    if (!orgId) {
      throw new Error('Organization ID is required to list spaces. Provide it via parameter or environment variable.');
    }
    const response = await this.makeRequest<{ items: GitBookSpace[] }>(`/orgs/${orgId}/spaces`);
    return response.items;
  }

  async getSpace(spaceId: string): Promise<GitBookSpace> {
    return this.makeRequest<GitBookSpace>(`/spaces/${spaceId}`);
  }

  async getSpaceContent(spaceId: string): Promise<GitBookRevision> {
    return this.makeRequest<GitBookRevision>(`/spaces/${spaceId}/content`);
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

  // Collection operations
  async getCollections(organizationId?: string): Promise<GitBookCollection[]> {
    const orgId = organizationId || this.organizationId;
    if (!orgId) {
      throw new Error('Organization ID is required to list collections. Provide it via parameter or environment variable.');
    }
    const response = await this.makeRequest<{ items: GitBookCollection[] }>(`/orgs/${orgId}/collections`);
    return response.items;
  }

  async getCollection(collectionId: string): Promise<GitBookCollection> {
    return this.makeRequest<GitBookCollection>(`/collections/${collectionId}`);
  }

  async getCollectionSpaces(collectionId: string): Promise<GitBookSpace[]> {
    const response = await this.makeRequest<{ items: GitBookSpace[] }>(`/collections/${collectionId}/spaces`);
    return response.items;
  }
}

// Initialize the GitBook client
const apiToken = process.env.GITBOOK_API_TOKEN;
const resolvedConfig = resolveConfiguration();
const organizationId = resolvedConfig.organizationId;
const defaultSpaceId = resolvedConfig.spaceId;

if (!apiToken) {
  console.error('❌ GITBOOK_API_TOKEN environment variable is required');
  console.error('💡 Please set your GitBook API token in your .env file');
  console.error('💡 Example: GITBOOK_API_TOKEN=your_token_here');
  console.error('💡 Get your token from: https://app.gitbook.com/account/developer');
  
  console.error('\n📋 Configuration Summary:');
  if (organizationId) {
    const source = argv.organizationId ? 'CLI argument' : 
                  readConfigFromCopilotInstructions().organizationId ? 'copilot instructions' : 'environment variable';
    console.error(`💡 Organization ID: ${organizationId} (from ${source})`);
  } else {
    console.error('💡 No Organization ID configured');
    console.error('   • Use --organization-id CLI argument');
    console.error('   • Add "organization-id: your-org-id" to .github/copilot-instructions.md');
    console.error('   • Set GITBOOK_ORGANIZATION_ID environment variable');
    console.error('   • Use list_organizations tool to find your org ID');
  }
  
  if (defaultSpaceId) {
    const source = argv.spaceId ? 'CLI argument' : 
                  readConfigFromCopilotInstructions().spaceId ? 'copilot instructions' : 'environment variable';
    console.error(`💡 Default Space ID: ${defaultSpaceId} (from ${source})`);
  } else {
    console.error('💡 No default Space ID configured');
    console.error('   • Use --space-id CLI argument');
    console.error('   • Add "space-id: your-space-id" to .github/copilot-instructions.md');  
    console.error('   • Set GITBOOK_SPACE_ID environment variable');
  }
  
  process.exit(1);
}

const gitbookClient = new GitBookAPIClient(apiToken, {
  organizationId: organizationId,
  defaultSpaceId: defaultSpaceId
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
  { spaceId: z.string().optional().describe('The ID of the space to get content from (uses default space if not provided)') },
  async ({ spaceId }) => {
    const effectiveSpaceId = gitbookClient.resolveSpaceId(spaceId);
    const content = await gitbookClient.getSpaceContent(effectiveSpaceId);
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
    spaceId: z.string().optional().describe('The ID of the space containing the page (uses default space if not provided)'),
    pageId: z.string().describe('The ID of the page to retrieve content from'),
    format: z.enum(['document', 'markdown']).optional().describe('The format of the document to retrieve'),
    metadata: z.boolean().optional().describe('Whether to include revision metadata'),
    computed: z.boolean().optional().describe('Whether to include computed revision data')
  },
  async ({ spaceId, pageId, format, metadata, computed }) => {
    const effectiveSpaceId = gitbookClient.resolveSpaceId(spaceId);
    
    const options: Record<string, any> = {};
    if (format !== undefined) options.format = format;
    if (metadata !== undefined) options.metadata = metadata;
    if (computed !== undefined) options.computed = computed;
    
    const pageContent = await gitbookClient.getPageContent(
      effectiveSpaceId, 
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
    spaceId: z.string().optional().describe('The ID of the space containing the page (uses default space if not provided)'),
    pagePath: z.string().describe('The path of the page to retrieve')
  },
  async ({ spaceId, pagePath }) => {
    const effectiveSpaceId = gitbookClient.resolveSpaceId(spaceId);
    const pageContent = await gitbookClient.getPageByPath(effectiveSpaceId, pagePath);
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
    spaceId: z.string().optional().describe('The ID of the space to search in (uses default space if not provided)'),
    query: z.string().describe('The search query')
  },
  async ({ spaceId, query }) => {
    const effectiveSpaceId = gitbookClient.resolveSpaceId(spaceId);
    const searchResults = await gitbookClient.searchContent(effectiveSpaceId, query);
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
  { spaceId: z.string().optional().describe('The ID of the space to get files from (uses default space if not provided)') },
  async ({ spaceId }) => {
    const effectiveSpaceId = gitbookClient.resolveSpaceId(spaceId);
    const files = await gitbookClient.getSpaceFiles(effectiveSpaceId);
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
    spaceId: z.string().optional().describe('The ID of the space containing the file (uses default space if not provided)'),
    fileId: z.string().describe('The ID of the file to retrieve')
  },
  async ({ spaceId, fileId }) => {
    const effectiveSpaceId = gitbookClient.resolveSpaceId(spaceId);
    const file = await gitbookClient.getFile(effectiveSpaceId, fileId);
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

// Collection Tools
server.tool(
  "list_collections",
  { organizationId: z.string().optional().describe('Organization ID to filter collections by (uses default organization if not provided)') },
  async ({ organizationId }) => {
    const effectiveOrgId = gitbookClient.resolveOrganizationId(organizationId);
    const collections = await gitbookClient.getCollections(effectiveOrgId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(collections, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "get_collection",
  { collectionId: z.string().describe('The ID of the collection to retrieve') },
  async ({ collectionId }) => {
    const collection = await gitbookClient.getCollection(collectionId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(collection, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "get_collection_spaces",
  { collectionId: z.string().describe('The ID of the collection to get spaces from') },
  async ({ collectionId }) => {
    const spaces = await gitbookClient.getCollectionSpaces(collectionId);
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

// Add a resource for the default space if configured
if (defaultSpaceId) {
  server.resource(
    "default-space",
    "gitbook://default-space",
    async () => {
      const content = await gitbookClient.getSpaceContent(defaultSpaceId);
      return {
        contents: [{
          uri: "gitbook://default-space",
          text: JSON.stringify(content, null, 2),
          mimeType: "application/json"
        }]
      };
    }
  );
}

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
  "collections",
  new ResourceTemplate("gitbook://collections/{organizationId?}", { 
    list: async () => {
      const organizations = await gitbookClient.getOrganizations();
      return {
        resources: organizations.map(org => ({
          name: `Collections for ${org.title}`,
          uri: `gitbook://collections/${org.id}`,
          mimeType: "application/json",
          description: `All collections for organization: ${org.title}`
        }))
      };
    }
  }),
  async (uri, { organizationId }) => {
    // ResourceTemplate parameters come as string arrays, get the first value
    const orgId = Array.isArray(organizationId) ? organizationId[0] : organizationId;
    const collections = await gitbookClient.getCollections(orgId);
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(collections, null, 2),
        mimeType: "application/json"
      }]
    };
  }
);

// Add helpful prompts for common use cases
server.prompt(
  "fetch_documentation",
  {
    spaceId: z.string().optional().describe('The GitBook space ID to search in (uses default space if not provided)'),
    topic: z.string().describe('The topic or keyword to search for in the documentation'),
    includeStructure: z.string().optional().describe('Set to "true" to include the overall space structure in the analysis')
  },
  (args) => {
    const { spaceId, topic, includeStructure } = args;
    const effectiveSpaceId = gitbookClient.resolveSpaceId(spaceId);
    
    let promptText = `I need to fetch and analyze GitBook documentation content.

**Space ID**: ${effectiveSpaceId}
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
    spaceId: z.string().optional().describe('The GitBook space ID to analyze (uses default space if not provided)'),
    analysisType: z.string().optional().describe('Type of analysis: overview, gaps, organization, or completeness')
  },
  (args) => {
    const { spaceId, analysisType = 'overview' } = args;
    const effectiveSpaceId = gitbookClient.resolveSpaceId(spaceId);
    
    const promptText = `I need to analyze the content structure of a GitBook space.

**Space ID**: ${effectiveSpaceId}
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
