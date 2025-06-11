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

interface GitBookUser {
  id: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  username?: string;
  kind: 'user';
  createdAt?: string;
  updatedAt?: string;
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

interface GitBookCollection {
  id: string;
  title: string;
  description?: string;
  organizationId?: string;
  kind: 'collection';
  createdAt?: string;
  updatedAt?: string;
  urls?: {
    app?: string;
  };
}

interface GitBookChangeRequest {
  id: string;
  title: string;
  description?: string;
  spaceId: string;
  author: GitBookUser;
  status: 'draft' | 'in_review' | 'approved' | 'merged' | 'closed';
  createdAt: string;
  updatedAt: string;
  mergedAt?: string;
  targetRevision?: string;
  sourceRevision?: string;
}

interface GitBookRevision {
  id: string;
  title?: string;
  spaceId: string;
  author?: GitBookUser;
  createdAt: string;
  type: 'initial' | 'update' | 'merge';
  parent?: string;
  git?: {
    oid: string;
    message?: string;
  };
}

interface GitBookComment {
  id: string;
  body: string;
  author: GitBookUser;
  createdAt: string;
  updatedAt: string;
  resolved?: boolean;
  replies?: GitBookCommentReply[];
}

interface GitBookCommentReply {
  id: string;
  body: string;
  author: GitBookUser;
  createdAt: string;
  updatedAt: string;
}

interface GitBookIntegration {
  name: string;
  title: string;
  description?: string;
  icon?: string;
  kind: 'integration';
  visibility: 'public' | 'private';
  urls?: {
    homepage?: string;
    support?: string;
  };
}

interface GitBookIntegrationInstallation {
  id: string;
  integrationName: string;
  target: string;
  targetType: 'space' | 'organization';
  configuration: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface GitBookLink {
  url: string;
  title?: string;
  type: 'internal' | 'external';
  target?: {
    spaceId?: string;
    pageId?: string;
  };
}

interface GitBookPermission {
  role: 'admin' | 'editor' | 'writer' | 'reader' | 'none';
  inherited?: boolean;
  source?: string;
}

interface GitBookTeam {
  id: string;
  title: string;
  description?: string;
  organizationId: string;
  kind: 'team';
  createdAt: string;
  updatedAt: string;
  members?: GitBookUser[];
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
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: any;
  }): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const { method = 'GET', body } = options || {};

    if (DEBUG) {
      console.error(`🔗 Debug: Making ${method} request to ${url}`);
    }

    const requestOptions: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Accept': 'application/json',
        'User-Agent': 'MCP GitBook Server 1.0.0',
        'Content-Type': 'application/json'
      }
    };

    if (body && method !== 'GET') {
      requestOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, requestOptions);

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

  // User Management
  async getCurrentUser(): Promise<GitBookUser> {
    return this.makeRequest<GitBookUser>('/user');
  }

  async getUser(userId: string): Promise<GitBookUser> {
    return this.makeRequest<GitBookUser>(`/users/${userId}`);
  }

  // Organizations (existing + extended)
  async getOrganizations(): Promise<GitBookOrganization[]> {
    const result = await this.makeRequest<{ items: GitBookOrganization[] }>('/orgs');
    return result.items;
  }

  // Spaces (existing + extended)
  async getSpaces(organizationId?: string): Promise<GitBookSpace[]> {
    const endpoint = organizationId ? `/orgs/${organizationId}/spaces` : '/spaces';
    const result = await this.makeRequest<{ items: GitBookSpace[] }>(endpoint);
    return result.items;
  }

  async getSpace(spaceId: string): Promise<GitBookSpace> {
    return this.makeRequest<GitBookSpace>(`/spaces/${spaceId}`);
  }

  async updateSpace(spaceId: string, updates: Partial<GitBookSpace>): Promise<GitBookSpace> {
    return this.makeRequest<GitBookSpace>(`/spaces/${spaceId}`, {
      method: 'PATCH',
      body: updates
    });
  }

  async deleteSpace(spaceId: string): Promise<void> {
    await this.makeRequest(`/spaces/${spaceId}`, { method: 'DELETE' });
  }

  async duplicateSpace(spaceId: string, options: { title?: string; organizationId?: string }): Promise<GitBookSpace> {
    return this.makeRequest<GitBookSpace>(`/spaces/${spaceId}/duplicate`, {
      method: 'POST',
      body: options
    });
  }

  async restoreSpace(spaceId: string): Promise<GitBookSpace> {
    return this.makeRequest<GitBookSpace>(`/spaces/${spaceId}/restore`, {
      method: 'POST'
    });
  }

  async moveSpace(spaceId: string, options: { parent?: string; organizationId?: string }): Promise<GitBookSpace> {
    return this.makeRequest<GitBookSpace>(`/spaces/${spaceId}/move`, {
      method: 'POST',
      body: options
    });
  }

  async transferSpace(spaceId: string, options: { organizationId: string }): Promise<GitBookSpace> {
    return this.makeRequest<GitBookSpace>(`/spaces/${spaceId}/transfer`, {
      method: 'POST',
      body: options
    });
  }

  // Content Management
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

  async getPageByPath(spaceId: string, pagePath: string): Promise<GitBookContent> {
    return this.makeRequest<GitBookContent>(`/spaces/${spaceId}/content/path/${encodeURIComponent(pagePath)}`);
  }

  async getPageLinks(spaceId: string, pageId: string): Promise<GitBookLink[]> {
    const result = await this.makeRequest<{ items: GitBookLink[] }>(`/spaces/${spaceId}/content/page/${pageId}/links`);
    return result.items;
  }

  async getPageBacklinks(spaceId: string, pageId: string): Promise<GitBookLink[]> {
    const result = await this.makeRequest<{ items: GitBookLink[] }>(`/spaces/${spaceId}/content/page/${pageId}/backlinks`);
    return result.items;
  }

  async createPage(spaceId: string, pageData: {
    title: string;
    content?: any;
    parent?: string;
    type?: 'document' | 'link';
  }): Promise<GitBookPage> {
    return this.makeRequest<GitBookPage>(`/spaces/${spaceId}/content/pages`, {
      method: 'POST',
      body: pageData
    });
  }

  async updatePageContent(spaceId: string, pageId: string, content: any): Promise<GitBookContent> {
    return this.makeRequest<GitBookContent>(`/spaces/${spaceId}/content/page/${pageId}`, {
      method: 'PUT',
      body: content
    });
  }

  // File Management
  async getSpaceFiles(spaceId: string): Promise<GitBookFile[]> {
    const result = await this.makeRequest<{ items: GitBookFile[] }>(`/spaces/${spaceId}/content/files`);
    return result.items;
  }

  async getFile(spaceId: string, fileId: string): Promise<GitBookFile> {
    return this.makeRequest<GitBookFile>(`/spaces/${spaceId}/content/files/${fileId}`);
  }

  async getFileBacklinks(spaceId: string, fileId: string): Promise<GitBookLink[]> {
    const result = await this.makeRequest<{ items: GitBookLink[] }>(`/spaces/${spaceId}/content/files/${fileId}/backlinks`);
    return result.items;
  }

  async uploadFile(spaceId: string, fileData: FormData): Promise<GitBookFile> {
    // Note: This would need special handling for file uploads
    return this.makeRequest<GitBookFile>(`/spaces/${spaceId}/content/files`, {
      method: 'POST',
      body: fileData as any
    });
  }

  // Search
  async searchContent(spaceId: string, query: string): Promise<any> {
    const encodedQuery = encodeURIComponent(query);
    return this.makeRequest(`/spaces/${spaceId}/search?query=${encodedQuery}`);
  }

  // Collections
  async getCollections(): Promise<GitBookCollection[]> {
    const result = await this.makeRequest<{ items: GitBookCollection[] }>('/collections');
    return result.items;
  }

  async getCollection(collectionId: string): Promise<GitBookCollection> {
    return this.makeRequest<GitBookCollection>(`/collections/${collectionId}`);
  }

  async getCollectionSpaces(collectionId: string): Promise<GitBookSpace[]> {
    const result = await this.makeRequest<{ items: GitBookSpace[] }>(`/collections/${collectionId}/spaces`);
    return result.items;
  }

  async updateCollection(collectionId: string, updates: Partial<GitBookCollection>): Promise<GitBookCollection> {
    return this.makeRequest<GitBookCollection>(`/collections/${collectionId}`, {
      method: 'PATCH',
      body: updates
    });
  }

  async deleteCollection(collectionId: string): Promise<void> {
    await this.makeRequest(`/collections/${collectionId}`, { method: 'DELETE' });
  }

  // Change Requests
  async getChangeRequests(spaceId: string): Promise<GitBookChangeRequest[]> {
    const result = await this.makeRequest<{ items: GitBookChangeRequest[] }>(`/spaces/${spaceId}/change-requests`);
    return result.items;
  }

  async getChangeRequest(spaceId: string, changeRequestId: string): Promise<GitBookChangeRequest> {
    return this.makeRequest<GitBookChangeRequest>(`/spaces/${spaceId}/change-requests/${changeRequestId}`);
  }

  async createChangeRequest(spaceId: string, data: {
    title: string;
    description?: string;
  }): Promise<GitBookChangeRequest> {
    return this.makeRequest<GitBookChangeRequest>(`/spaces/${spaceId}/change-requests`, {
      method: 'POST',
      body: data
    });
  }

  async updateChangeRequest(spaceId: string, changeRequestId: string, updates: {
    title?: string;
    description?: string;
    status?: string;
  }): Promise<GitBookChangeRequest> {
    return this.makeRequest<GitBookChangeRequest>(`/spaces/${spaceId}/change-requests/${changeRequestId}`, {
      method: 'PATCH',
      body: updates
    });
  }

  async mergeChangeRequest(spaceId: string, changeRequestId: string): Promise<GitBookChangeRequest> {
    return this.makeRequest<GitBookChangeRequest>(`/spaces/${spaceId}/change-requests/${changeRequestId}/merge`, {
      method: 'POST'
    });
  }

  async getChangeRequestContent(spaceId: string, changeRequestId: string): Promise<GitBookPage[]> {
    const result = await this.makeRequest<{ pages: GitBookPage[] }>(`/spaces/${spaceId}/change-requests/${changeRequestId}/content`);
    return result.pages;
  }

  // Comments
  async getComments(spaceId: string): Promise<GitBookComment[]> {
    const result = await this.makeRequest<{ items: GitBookComment[] }>(`/spaces/${spaceId}/comments`);
    return result.items;
  }

  async getComment(spaceId: string, commentId: string): Promise<GitBookComment> {
    return this.makeRequest<GitBookComment>(`/spaces/${spaceId}/comments/${commentId}`);
  }

  async createComment(spaceId: string, data: {
    body: string;
    pageId?: string;
    selection?: any;
  }): Promise<GitBookComment> {
    return this.makeRequest<GitBookComment>(`/spaces/${spaceId}/comments`, {
      method: 'POST',
      body: data
    });
  }

  async updateComment(spaceId: string, commentId: string, data: {
    body?: string;
    resolved?: boolean;
  }): Promise<GitBookComment> {
    return this.makeRequest<GitBookComment>(`/spaces/${spaceId}/comments/${commentId}`, {
      method: 'PATCH',
      body: data
    });
  }

  async deleteComment(spaceId: string, commentId: string): Promise<void> {
    await this.makeRequest(`/spaces/${spaceId}/comments/${commentId}`, { method: 'DELETE' });
  }

  // Revisions
  async getRevision(spaceId: string, revisionId: string): Promise<GitBookRevision> {
    return this.makeRequest<GitBookRevision>(`/spaces/${spaceId}/revisions/${revisionId}`);
  }

  async getRevisionChanges(spaceId: string, revisionId: string): Promise<any> {
    return this.makeRequest(`/spaces/${spaceId}/revisions/${revisionId}/changes`);
  }

  async getRevisionPages(spaceId: string, revisionId: string): Promise<GitBookPage[]> {
    const result = await this.makeRequest<{ items: GitBookPage[] }>(`/spaces/${spaceId}/revisions/${revisionId}/pages`);
    return result.items;
  }

  async getRevisionFiles(spaceId: string, revisionId: string): Promise<GitBookFile[]> {
    const result = await this.makeRequest<{ items: GitBookFile[] }>(`/spaces/${spaceId}/revisions/${revisionId}/files`);
    return result.items;
  }

  // Integrations
  async getIntegrations(): Promise<GitBookIntegration[]> {
    const result = await this.makeRequest<{ items: GitBookIntegration[] }>('/integrations');
    return result.items;
  }

  async getIntegration(integrationName: string): Promise<GitBookIntegration> {
    return this.makeRequest<GitBookIntegration>(`/integrations/${integrationName}`);
  }

  async getIntegrationInstallations(integrationName: string): Promise<GitBookIntegrationInstallation[]> {
    const result = await this.makeRequest<{ items: GitBookIntegrationInstallation[] }>(`/integrations/${integrationName}/installations`);
    return result.items;
  }

  async getIntegrationInstallation(integrationName: string, installationId: string): Promise<GitBookIntegrationInstallation> {
    return this.makeRequest<GitBookIntegrationInstallation>(`/integrations/${integrationName}/installations/${installationId}`);
  }

  // Permissions
  async getSpacePermissions(spaceId: string): Promise<any> {
    return this.makeRequest(`/spaces/${spaceId}/permissions`);
  }

  async updateSpacePermissions(spaceId: string, permissions: any): Promise<any> {
    return this.makeRequest(`/spaces/${spaceId}/permissions`, {
      method: 'PUT',
      body: permissions
    });
  }

  async getCollectionPermissions(collectionId: string): Promise<any> {
    return this.makeRequest(`/collections/${collectionId}/permissions`);
  }

  // Git Integration
  async getGitInfo(spaceId: string): Promise<any> {
    return this.makeRequest(`/spaces/${spaceId}/git/info`);
  }

  async importFromGit(spaceId: string, options: {
    url: string;
    branch?: string;
    path?: string;
  }): Promise<any> {
    return this.makeRequest(`/spaces/${spaceId}/git/import`, {
      method: 'POST',
      body: options
    });
  }

  async exportToGit(spaceId: string, options: {
    url: string;
    branch?: string;
    message?: string;
  }): Promise<any> {
    return this.makeRequest(`/spaces/${spaceId}/git/export`, {
      method: 'POST',
      body: options
    });
  }

  // PDF Export
  async exportSpaceToPDF(spaceId: string): Promise<any> {
    return this.makeRequest(`/spaces/${spaceId}/pdf`, { method: 'POST' });
  }

  async exportChangeRequestToPDF(spaceId: string, changeRequestId: string): Promise<any> {
    return this.makeRequest(`/spaces/${spaceId}/change-requests/${changeRequestId}/pdf`, { method: 'POST' });
  }
}

// Get API token and organization ID from environment variables
const GITBOOK_API_TOKEN = process.env.GITBOOK_API_TOKEN;
const GITBOOK_ORG_ID = process.env.GITBOOK_ORG_ID;

// Add debug info only if DEBUG env var is set
if (DEBUG) {
  console.error(`🔍 Debug: API token ${GITBOOK_API_TOKEN ? 'found' : 'not found'}`);
  console.error(`🔍 Debug: Token length: ${GITBOOK_API_TOKEN?.length || 0}`);
  console.error(`🔍 Debug: Organization ID ${GITBOOK_ORG_ID ? 'found' : 'not found'}`);
  if (GITBOOK_ORG_ID) {
    console.error(`🔍 Debug: Organization ID: ${GITBOOK_ORG_ID}`);
  }
}

if (!GITBOOK_API_TOKEN) {
  console.error('❌ Error: GITBOOK_API_TOKEN environment variable is required');
  console.error('');
  console.error('📋 Setup instructions:');
  console.error('1. Create a .env.local file in the project root');
  console.error('2. Add your GitBook API token:');
  console.error('   GITBOOK_API_TOKEN=gb_live_your_token_here');
  console.error('3. (Optional) Add your organization ID to filter spaces:');
  console.error('   GITBOOK_ORG_ID=your_org_id_here');
  console.error('');
  console.error('🔗 Get your API token from: https://app.gitbook.com/account/developer');
  console.error('💡 Tip: Use list_organizations tool to find your organization ID');
  console.error('');
  if (DEBUG) {
    console.error('🔍 Debug: Available env vars starting with GITBOOK:');
    Object.keys(process.env).filter(key => key.startsWith('GITBOOK')).forEach(key => {
      console.error(`   ${key}=${process.env[key]?.substring(0, 10)}...`);
    });
  }
  process.exit(1);
}

const gitbookClient = new GitBookAPIClient(GITBOOK_API_TOKEN, {
  organizationId: GITBOOK_ORG_ID
});

// Create server instance using modern McpServer
const server = new McpServer({
  name: "gitbook",
  version: "1.0.0",
});

// Add tools using modern syntax
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

// User Management Tools
server.tool(
  "get_current_user",
  {},
  async () => {
    const user = await gitbookClient.getCurrentUser();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(user, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "get_user",
  { userId: z.string().describe('The ID of the user to retrieve') },
  async ({ userId }) => {
    const user = await gitbookClient.getUser(userId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(user, null, 2)
        }
      ]
    };
  }
);

// Extended Space Management Tools
server.tool(
  "update_space",
  {
    spaceId: z.string().describe('The ID of the space to update'),
    title: z.string().optional().describe('New title for the space'),
    description: z.string().optional().describe('New description for the space'),
    visibility: z.enum(['public', 'unlisted', 'visitor-authentication', 'members-only', 'inherited']).optional().describe('New visibility for the space')
  },
  async ({ spaceId, title, description, visibility }) => {
    const updates: Partial<GitBookSpace> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (visibility !== undefined) updates.visibility = visibility;

    const space = await gitbookClient.updateSpace(spaceId, updates);
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
  "delete_space",
  { spaceId: z.string().describe('The ID of the space to delete') },
  async ({ spaceId }) => {
    await gitbookClient.deleteSpace(spaceId);
    return {
      content: [
        {
          type: 'text',
          text: `Space ${spaceId} has been deleted successfully.`
        }
      ]
    };
  }
);

server.tool(
  "duplicate_space",
  {
    spaceId: z.string().describe('The ID of the space to duplicate'),
    title: z.string().optional().describe('Title for the duplicated space'),
    organizationId: z.string().optional().describe('Organization ID where the duplicate should be created')
  },
  async ({ spaceId, title, organizationId }) => {
    const options: any = {};
    if (title !== undefined) options.title = title;
    if (organizationId !== undefined) options.organizationId = organizationId;

    const duplicatedSpace = await gitbookClient.duplicateSpace(spaceId, options);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(duplicatedSpace, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "restore_space",
  { spaceId: z.string().describe('The ID of the space to restore') },
  async ({ spaceId }) => {
    const space = await gitbookClient.restoreSpace(spaceId);
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
  "move_space",
  {
    spaceId: z.string().describe('The ID of the space to move'),
    parent: z.string().optional().describe('The ID of the new parent space'),
    organizationId: z.string().optional().describe('The ID of the organization to move to')
  },
  async ({ spaceId, parent, organizationId }) => {
    const options: any = {};
    if (parent !== undefined) options.parent = parent;
    if (organizationId !== undefined) options.organizationId = organizationId;

    const space = await gitbookClient.moveSpace(spaceId, options);
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
  "transfer_space",
  {
    spaceId: z.string().describe('The ID of the space to transfer'),
    organizationId: z.string().describe('The ID of the organization to transfer to')
  },
  async ({ spaceId, organizationId }) => {
    const space = await gitbookClient.transferSpace(spaceId, { organizationId });
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

// Page Management Tools
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
  "get_page_links",
  {
    spaceId: z.string().describe('The ID of the space containing the page'),
    pageId: z.string().describe('The ID of the page to get links from')
  },
  async ({ spaceId, pageId }) => {
    const links = await gitbookClient.getPageLinks(spaceId, pageId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(links, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "get_page_backlinks",
  {
    spaceId: z.string().describe('The ID of the space containing the page'),
    pageId: z.string().describe('The ID of the page to get backlinks for')
  },
  async ({ spaceId, pageId }) => {
    const backlinks = await gitbookClient.getPageBacklinks(spaceId, pageId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(backlinks, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "create_page",
  {
    spaceId: z.string().describe('The ID of the space to create the page in'),
    title: z.string().describe('The title of the new page'),
    content: z.any().optional().describe('The content of the new page'),
    parent: z.string().optional().describe('The ID of the parent page'),
    type: z.enum(['document', 'link']).optional().describe('The type of page to create')
  },
  async ({ spaceId, title, content, parent, type }) => {
    const pageData: any = { title };
    if (content !== undefined) pageData.content = content;
    if (parent !== undefined) pageData.parent = parent;
    if (type !== undefined) pageData.type = type;

    const page = await gitbookClient.createPage(spaceId, pageData);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(page, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "update_page_content",
  {
    spaceId: z.string().describe('The ID of the space containing the page'),
    pageId: z.string().describe('The ID of the page to update'),
    content: z.any().describe('The new content for the page')
  },
  async ({ spaceId, pageId, content }) => {
    const updatedContent = await gitbookClient.updatePageContent(spaceId, pageId, content);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(updatedContent, null, 2)
        }
      ]
    };
  }
);

// File Management Tools
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

server.tool(
  "get_file_backlinks",
  {
    spaceId: z.string().describe('The ID of the space containing the file'),
    fileId: z.string().describe('The ID of the file to get backlinks for')
  },
  async ({ spaceId, fileId }) => {
    const backlinks = await gitbookClient.getFileBacklinks(spaceId, fileId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(backlinks, null, 2)
        }
      ]
    };
  }
);

// Collection Management Tools
server.tool(
  "list_collections",
  {},
  async () => {
    const collections = await gitbookClient.getCollections();
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

server.tool(
  "update_collection",
  {
    collectionId: z.string().describe('The ID of the collection to update'),
    title: z.string().optional().describe('New title for the collection'),
    description: z.string().optional().describe('New description for the collection')
  },
  async ({ collectionId, title, description }) => {
    const updates: Partial<GitBookCollection> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;

    const collection = await gitbookClient.updateCollection(collectionId, updates);
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
  "delete_collection",
  { collectionId: z.string().describe('The ID of the collection to delete') },
  async ({ collectionId }) => {
    await gitbookClient.deleteCollection(collectionId);
    return {
      content: [
        {
          type: 'text',
          text: `Collection ${collectionId} has been deleted successfully.`
        }
      ]
    };
  }
);

// Change Request Management Tools
server.tool(
  "list_change_requests",
  { spaceId: z.string().describe('The ID of the space to get change requests from') },
  async ({ spaceId }) => {
    const changeRequests = await gitbookClient.getChangeRequests(spaceId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(changeRequests, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "get_change_request",
  {
    spaceId: z.string().describe('The ID of the space containing the change request'),
    changeRequestId: z.string().describe('The ID of the change request to retrieve')
  },
  async ({ spaceId, changeRequestId }) => {
    const changeRequest = await gitbookClient.getChangeRequest(spaceId, changeRequestId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(changeRequest, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "create_change_request",
  {
    spaceId: z.string().describe('The ID of the space to create the change request in'),
    title: z.string().describe('The title of the change request'),
    description: z.string().optional().describe('The description of the change request')
  },
  async ({ spaceId, title, description }) => {
    const data: any = { title };
    if (description !== undefined) data.description = description;

    const changeRequest = await gitbookClient.createChangeRequest(spaceId, data);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(changeRequest, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "update_change_request",
  {
    spaceId: z.string().describe('The ID of the space containing the change request'),
    changeRequestId: z.string().describe('The ID of the change request to update'),
    title: z.string().optional().describe('New title for the change request'),
    description: z.string().optional().describe('New description for the change request'),
    status: z.string().optional().describe('New status for the change request')
  },
  async ({ spaceId, changeRequestId, title, description, status }) => {
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;

    const changeRequest = await gitbookClient.updateChangeRequest(spaceId, changeRequestId, updates);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(changeRequest, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "merge_change_request",
  {
    spaceId: z.string().describe('The ID of the space containing the change request'),
    changeRequestId: z.string().describe('The ID of the change request to merge')
  },
  async ({ spaceId, changeRequestId }) => {
    const changeRequest = await gitbookClient.mergeChangeRequest(spaceId, changeRequestId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(changeRequest, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "get_change_request_content",
  {
    spaceId: z.string().describe('The ID of the space containing the change request'),
    changeRequestId: z.string().describe('The ID of the change request to get content from')
  },
  async ({ spaceId, changeRequestId }) => {
    const content = await gitbookClient.getChangeRequestContent(spaceId, changeRequestId);
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

// Comment Management Tools
server.tool(
  "list_comments",
  { spaceId: z.string().describe('The ID of the space to get comments from') },
  async ({ spaceId }) => {
    const comments = await gitbookClient.getComments(spaceId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(comments, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "get_comment",
  {
    spaceId: z.string().describe('The ID of the space containing the comment'),
    commentId: z.string().describe('The ID of the comment to retrieve')
  },
  async ({ spaceId, commentId }) => {
    const comment = await gitbookClient.getComment(spaceId, commentId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(comment, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "create_comment",
  {
    spaceId: z.string().describe('The ID of the space to create the comment in'),
    body: z.string().describe('The body text of the comment'),
    pageId: z.string().optional().describe('The ID of the page to comment on'),
    selection: z.any().optional().describe('The text selection for the comment')
  },
  async ({ spaceId, body, pageId, selection }) => {
    const data: any = { body };
    if (pageId !== undefined) data.pageId = pageId;
    if (selection !== undefined) data.selection = selection;

    const comment = await gitbookClient.createComment(spaceId, data);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(comment, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "update_comment",
  {
    spaceId: z.string().describe('The ID of the space containing the comment'),
    commentId: z.string().describe('The ID of the comment to update'),
    body: z.string().optional().describe('New body text for the comment'),
    resolved: z.boolean().optional().describe('Whether the comment is resolved')
  },
  async ({ spaceId, commentId, body, resolved }) => {
    const data: any = {};
    if (body !== undefined) data.body = body;
    if (resolved !== undefined) data.resolved = resolved;

    const comment = await gitbookClient.updateComment(spaceId, commentId, data);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(comment, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "delete_comment",
  {
    spaceId: z.string().describe('The ID of the space containing the comment'),
    commentId: z.string().describe('The ID of the comment to delete')
  },
  async ({ spaceId, commentId }) => {
    await gitbookClient.deleteComment(spaceId, commentId);
    return {
      content: [
        {
          type: 'text',
          text: `Comment ${commentId} has been deleted successfully.`
        }
      ]
    };
  }
);

// Revision Management Tools
server.tool(
  "get_revision",
  {
    spaceId: z.string().describe('The ID of the space containing the revision'),
    revisionId: z.string().describe('The ID of the revision to retrieve')
  },
  async ({ spaceId, revisionId }) => {
    const revision = await gitbookClient.getRevision(spaceId, revisionId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(revision, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "get_revision_changes",
  {
    spaceId: z.string().describe('The ID of the space containing the revision'),
    revisionId: z.string().describe('The ID of the revision to get changes from')
  },
  async ({ spaceId, revisionId }) => {
    const changes = await gitbookClient.getRevisionChanges(spaceId, revisionId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(changes, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "get_revision_pages",
  {
    spaceId: z.string().describe('The ID of the space containing the revision'),
    revisionId: z.string().describe('The ID of the revision to get pages from')
  },
  async ({ spaceId, revisionId }) => {
    const pages = await gitbookClient.getRevisionPages(spaceId, revisionId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(pages, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "get_revision_files",
  {
    spaceId: z.string().describe('The ID of the space containing the revision'),
    revisionId: z.string().describe('The ID of the revision to get files from')
  },
  async ({ spaceId, revisionId }) => {
    const files = await gitbookClient.getRevisionFiles(spaceId, revisionId);
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

// Integration Management Tools
server.tool(
  "list_integrations",
  {},
  async () => {
    const integrations = await gitbookClient.getIntegrations();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(integrations, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "get_integration",
  { integrationName: z.string().describe('The name of the integration to retrieve') },
  async ({ integrationName }) => {
    const integration = await gitbookClient.getIntegration(integrationName);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(integration, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "list_integration_installations",
  { integrationName: z.string().describe('The name of the integration to get installations for') },
  async ({ integrationName }) => {
    const installations = await gitbookClient.getIntegrationInstallations(integrationName);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(installations, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "get_integration_installation",
  {
    integrationName: z.string().describe('The name of the integration'),
    installationId: z.string().describe('The ID of the installation to retrieve')
  },
  async ({ integrationName, installationId }) => {
    const installation = await gitbookClient.getIntegrationInstallation(integrationName, installationId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(installation, null, 2)
        }
      ]
    };
  }
);

// Permission Management Tools
server.tool(
  "get_space_permissions",
  { spaceId: z.string().describe('The ID of the space to get permissions for') },
  async ({ spaceId }) => {
    const permissions = await gitbookClient.getSpacePermissions(spaceId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(permissions, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "update_space_permissions",
  {
    spaceId: z.string().describe('The ID of the space to update permissions for'),
    permissions: z.any().describe('The new permissions configuration')
  },
  async ({ spaceId, permissions }) => {
    const updatedPermissions = await gitbookClient.updateSpacePermissions(spaceId, permissions);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(updatedPermissions, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "get_collection_permissions",
  { collectionId: z.string().describe('The ID of the collection to get permissions for') },
  async ({ collectionId }) => {
    const permissions = await gitbookClient.getCollectionPermissions(collectionId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(permissions, null, 2)
        }
      ]
    };
  }
);

// Git Integration Tools
server.tool(
  "get_git_info",
  { spaceId: z.string().describe('The ID of the space to get Git information for') },
  async ({ spaceId }) => {
    const gitInfo = await gitbookClient.getGitInfo(spaceId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(gitInfo, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "import_from_git",
  {
    spaceId: z.string().describe('The ID of the space to import into'),
    url: z.string().describe('The Git repository URL to import from'),
    branch: z.string().optional().describe('The Git branch to import from'),
    path: z.string().optional().describe('The path within the repository to import')
  },
  async ({ spaceId, url, branch, path }) => {
    const options: any = { url };
    if (branch !== undefined) options.branch = branch;
    if (path !== undefined) options.path = path;

    const result = await gitbookClient.importFromGit(spaceId, options);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "export_to_git",
  {
    spaceId: z.string().describe('The ID of the space to export'),
    url: z.string().describe('The Git repository URL to export to'),
    branch: z.string().optional().describe('The Git branch to export to'),
    message: z.string().optional().describe('The commit message for the export')
  },
  async ({ spaceId, url, branch, message }) => {
    const options: any = { url };
    if (branch !== undefined) options.branch = branch;
    if (message !== undefined) options.message = message;

    const result = await gitbookClient.exportToGit(spaceId, options);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
);

// Export Tools
server.tool(
  "export_space_to_pdf",
  { spaceId: z.string().describe('The ID of the space to export as PDF') },
  async ({ spaceId }) => {
    const result = await gitbookClient.exportSpaceToPDF(spaceId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "export_change_request_to_pdf",
  {
    spaceId: z.string().describe('The ID of the space containing the change request'),
    changeRequestId: z.string().describe('The ID of the change request to export as PDF')
  },
  async ({ spaceId, changeRequestId }) => {
    const result = await gitbookClient.exportChangeRequestToPDF(spaceId, changeRequestId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
);

// Add resources using modern syntax
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

// Add prompts using modern syntax
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
  "update_documentation_plan",
  {
    spaceId: z.string().describe('The GitBook space ID to analyze'),
    updateGoals: z.string().describe('Description of what you want to update or improve'),
    targetAudience: z.string().optional().describe('The target audience for the documentation updates')
  },
  (args) => {
    const { spaceId, updateGoals, targetAudience = 'general users' } = args;
    const promptText = `I need to create a plan for updating GitBook documentation.

**Space ID**: ${spaceId}
**Update Goals**: ${updateGoals}
**Target Audience**: ${targetAudience}

Please help me:
1. Analyze the current space structure and content
2. Identify pages that need updates based on my goals
3. Create a prioritized update plan
4. Suggest content improvements and new sections needed
5. Recommend best practices for the target audience

Start by getting the space content structure, then analyze relevant pages to understand the current state.`;

    return {
      description: `Create update plan for GitBook documentation`,
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
  "analyze_content_gaps",
  {
    spaceId: z.string().describe('The GitBook space ID to analyze'),
    comparisonSource: z.string().optional().describe('Source to compare against (e.g., codebase, API spec, existing docs)')
  },
  (args) => {
    const { spaceId, comparisonSource = 'internal analysis' } = args;
    const promptText = `I need to analyze GitBook content for gaps and missing documentation.

**Space ID**: ${spaceId}
**Comparison Source**: ${comparisonSource}

Please help me:
1. Get the complete space structure and content overview
2. Analyze the documentation for missing topics or incomplete sections
3. Identify gaps in coverage for common user needs
4. Suggest new content that should be added
5. Prioritize gaps by importance and user impact

Start by retrieving the space content structure and then examining key pages to understand what's covered.`;

    return {
      description: `Analyze content gaps in GitBook space`,
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
  "content_audit",
  {
    spaceId: z.string().describe('The GitBook space ID to audit'),
    auditCriteria: z.string().optional().describe('Specific criteria to audit (e.g., style guide compliance, outdated content, broken links)')
  },
  (args) => {
    const { spaceId, auditCriteria = 'general quality and consistency' } = args;
    const promptText = `I need to perform a comprehensive audit of GitBook content.

**Space ID**: ${spaceId}
**Audit Criteria**: ${auditCriteria}

Please help me:
1. Review the space structure for logical organization
2. Examine content quality, accuracy, and consistency
3. Check for outdated information or broken references
4. Evaluate writing style and clarity
5. Identify content that needs updating or removal
6. Provide recommendations for improvement

Start by getting the space structure, then systematically review key pages for the specified criteria.`;

    return {
      description: `Audit GitBook content quality and consistency`,
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
  "documentation_summary",
  {
    spaceId: z.string().describe('The GitBook space ID to summarize'),
    summaryType: z.string().optional().describe('Type of summary: overview, technical, user-guide, or custom')
  },
  (args) => {
    const { spaceId, summaryType = 'overview' } = args;
    const promptText = `I need to generate a summary of GitBook space content.

**Space ID**: ${spaceId}
**Summary Type**: ${summaryType}

Please help me:
1. Get the complete space structure and key pages
2. Analyze the main topics and themes covered
3. Create a ${summaryType} summary of the content
4. Highlight the most important sections and information
5. Identify the scope and purpose of the documentation

Start by retrieving the space content structure and then examining key pages to understand the overall coverage.`;

    return {
      description: `Generate ${summaryType} summary of GitBook space`,
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
  "migration_assessment",
  {
    spaceId: z.string().describe('The GitBook space ID to assess'),
    targetPlatform: z.string().optional().describe('Target platform or structure for migration')
  },
  (args) => {
    const { spaceId, targetPlatform = 'alternative documentation platform' } = args;
    const promptText = `I need to assess GitBook content for migration or restructuring.

**Space ID**: ${spaceId}
**Target Platform**: ${targetPlatform}

Please help me:
1. Analyze the current space structure and content organization
2. Evaluate content complexity and format requirements
3. Identify migration challenges and considerations
4. Suggest restructuring opportunities
5. Create a migration plan with priorities and steps
6. Highlight content that may need reformatting or updates

Start by getting the complete space structure and examining representative pages to understand the content scope.`;

    return {
      description: `Assess GitBook content for migration to ${targetPlatform}`,
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
  "collaboration_workflow",
  {
    spaceId: z.string().describe('The GitBook space ID for collaboration'),
    workflowType: z.string().describe('Type of collaboration: review, update, team-edit, or approval'),
    assignees: z.string().optional().describe('Team members or reviewers to involve'),
    deadline: z.string().optional().describe('Target completion date')
  },
  (args) => {
    const { spaceId, workflowType, assignees, deadline } = args;
    const promptText = `I need to set up a collaboration workflow for GitBook content.

**Space ID**: ${spaceId}
**Workflow Type**: ${workflowType}
**Assignees**: ${assignees || 'to be determined'}
**Deadline**: ${deadline || 'flexible'}

Please help me:
1. Analyze the current space structure and content
2. Create or review change requests for the ${workflowType} workflow
3. Set up appropriate collaboration features (comments, reviews)
4. Manage permissions and access for team members
5. Track progress and coordinate updates
6. Ensure quality and consistency throughout the process

Start by getting the space structure and any existing change requests, then guide the ${workflowType} process.`;

    return {
      description: `Set up ${workflowType} collaboration workflow for GitBook space`,
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
  "change_request_management",
  {
    spaceId: z.string().describe('The GitBook space ID containing change requests'),
    action: z.string().describe('Action to perform: create, review, merge, or analyze'),
    changeRequestId: z.string().optional().describe('Specific change request ID to work with'),
    description: z.string().optional().describe('Description for new change requests')
  },
  (args) => {
    const { spaceId, action, changeRequestId, description } = args;
    const promptText = `I need to manage change requests in GitBook.

**Space ID**: ${spaceId}
**Action**: ${action}
**Change Request ID**: ${changeRequestId || 'new/to be selected'}
**Description**: ${description || 'to be determined'}

Please help me:
1. ${action === 'create' ? 'Create a new change request with the specified description' : 'List and analyze existing change requests'}
2. Review the changes and their impact on the documentation
3. ${action === 'review' ? 'Provide detailed review feedback and suggestions' : 'Coordinate the change management process'}
4. ${action === 'merge' ? 'Safely merge approved changes' : 'Track review status and progress'}
5. Ensure changes maintain content quality and consistency
6. Handle any conflicts or issues that arise

Start by ${action === 'create' ? 'creating the change request' : 'getting existing change requests'} and then guide the ${action} process.`;

    return {
      description: `${action} change requests in GitBook space`,
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
  "api_documentation_generator",
  {
    spaceId: z.string().describe('The GitBook space ID for API documentation'),
    apiType: z.string().describe('Type of API: REST, GraphQL, gRPC, or WebSocket'),
    sourceFormat: z.string().optional().describe('Source format: OpenAPI, schema files, or manual'),
    endpointFocus: z.string().optional().describe('Specific endpoints or areas to focus on')
  },
  (args) => {
    const { spaceId, apiType, sourceFormat = 'manual analysis', endpointFocus } = args;
    const promptText = `I need to generate or update API documentation in GitBook.

**Space ID**: ${spaceId}
**API Type**: ${apiType}
**Source Format**: ${sourceFormat}
**Endpoint Focus**: ${endpointFocus || 'comprehensive coverage'}

Please help me:
1. Analyze the current documentation structure for API content
2. Create or update ${apiType} API documentation sections
3. Generate comprehensive endpoint documentation with examples
4. Include authentication, error handling, and best practices
5. Create interactive examples and use cases
6. Ensure documentation follows API documentation best practices
7. Add proper code samples and response examples

Start by reviewing the space structure and existing API content, then systematically build comprehensive ${apiType} documentation.`;

    return {
      description: `Generate ${apiType} API documentation in GitBook`,
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
  "content_optimization",
  {
    spaceId: z.string().describe('The GitBook space ID to optimize'),
    optimizationType: z.string().describe('Type of optimization: SEO, readability, structure, or performance'),
    targetMetrics: z.string().optional().describe('Specific metrics or goals to optimize for')
  },
  (args) => {
    const { spaceId, optimizationType, targetMetrics } = args;
    const promptText = `I need to optimize GitBook content for better ${optimizationType}.

**Space ID**: ${spaceId}
**Optimization Type**: ${optimizationType}
**Target Metrics**: ${targetMetrics || 'general improvement'}

Please help me:
1. Analyze current content for ${optimizationType} opportunities
2. Identify pages that need optimization work
3. Suggest specific improvements for ${optimizationType}
4. Prioritize changes by impact and effort required
5. Create an optimization plan with measurable goals
6. Implement best practices for ${optimizationType}
7. Track and measure improvement results

Start by reviewing the space structure and content to assess current ${optimizationType} status.`;

    return {
      description: `Optimize GitBook content for ${optimizationType}`,
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
  "quality_assurance_check",
  {
    spaceId: z.string().describe('The GitBook space ID to check'),
    checkType: z.string().describe('Type of QA check: content, links, formatting, consistency, or comprehensive'),
    severity: z.string().optional().describe('Focus level: critical, important, or all issues')
  },
  (args) => {
    const { spaceId, checkType, severity = 'important' } = args;
    const promptText = `I need to perform quality assurance checks on GitBook content.

**Space ID**: ${spaceId}
**Check Type**: ${checkType}
**Severity Focus**: ${severity}

Please help me:
1. Systematically review content for ${checkType} issues
2. Identify and categorize problems by severity
3. Check for broken links, formatting errors, and inconsistencies
4. Validate content accuracy and completeness
5. Review style guide compliance and consistency
6. Generate a detailed QA report with actionable items
7. Prioritize fixes based on user impact

Start by analyzing the space structure and then perform comprehensive ${checkType} quality checks.`;

    return {
      description: `Perform ${checkType} quality assurance check on GitBook space`,
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
  "content_analytics",
  {
    spaceId: z.string().describe('The GitBook space ID to analyze'),
    analysisType: z.string().describe('Type of analysis: usage, performance, engagement, or content-metrics'),
    timeframe: z.string().optional().describe('Time period for analysis if applicable')
  },
  (args) => {
    const { spaceId, analysisType, timeframe = 'recent activity' } = args;
    const promptText = `I need to analyze GitBook content for ${analysisType} insights.

**Space ID**: ${spaceId}
**Analysis Type**: ${analysisType}
**Timeframe**: ${timeframe}

Please help me:
1. Gather relevant data for ${analysisType} analysis
2. Analyze content structure, revisions, and activity patterns
3. Identify high-performing and underperforming content
4. Review collaboration patterns and user engagement
5. Generate insights about content effectiveness
6. Suggest improvements based on data findings
7. Create actionable recommendations for optimization

Start by examining the space content, revisions, and activity to build a comprehensive ${analysisType} analysis.`;

    return {
      description: `Analyze GitBook content for ${analysisType} insights`,
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
  "integration_setup",
  {
    spaceId: z.string().describe('The GitBook space ID for integration setup'),
    integrationType: z.string().describe('Type of integration: Git, CI/CD, external-tools, or custom'),
    platform: z.string().optional().describe('Target platform or service for integration')
  },
  (args) => {
    const { spaceId, integrationType, platform } = args;
    const promptText = `I need to set up ${integrationType} integration for GitBook.

**Space ID**: ${spaceId}
**Integration Type**: ${integrationType}
**Platform**: ${platform || 'to be determined'}

Please help me:
1. Analyze current integration status and available options
2. Configure ${integrationType} integration with appropriate settings
3. Set up synchronization and workflow automation
4. Test integration functionality and troubleshoot issues
5. Establish best practices for ongoing integration management
6. Document integration setup and maintenance procedures
7. Monitor integration health and performance

Start by reviewing current integrations and then guide the ${integrationType} setup process.`;

    return {
      description: `Set up ${integrationType} integration for GitBook space`,
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
  "permission_management",
  {
    spaceId: z.string().describe('The GitBook space ID for permission management'),
    action: z.string().describe('Permission action: audit, update, setup, or troubleshoot'),
    userType: z.string().optional().describe('Type of users to manage: team, external, or specific-role')
  },
  (args) => {
    const { spaceId, action, userType = 'all users' } = args;
    const promptText = `I need to manage permissions for GitBook space.

**Space ID**: ${spaceId}
**Action**: ${action}
**User Type**: ${userType}

Please help me:
1. Review current permission structure and user access levels
2. ${action === 'audit' ? 'Audit existing permissions for compliance and security' : `${action} permissions for ${userType}`}
3. Identify permission conflicts or security concerns
4. Recommend optimal permission structures for team workflow
5. Set up role-based access control where appropriate
6. Document permission policies and procedures
7. Monitor and maintain permission health over time

Start by analyzing current space permissions and user access patterns for ${userType}.`;

    return {
      description: `${action} permissions for ${userType} in GitBook space`,
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
  "version_control_workflow",
  {
    spaceId: z.string().describe('The GitBook space ID for version control'),
    workflowType: z.string().describe('Workflow type: branching, release, rollback, or sync'),
    targetVersion: z.string().optional().describe('Specific version or revision to work with')
  },
  (args) => {
    const { spaceId, workflowType, targetVersion } = args;
    const promptText = `I need to manage version control workflow for GitBook content.

**Space ID**: ${spaceId}
**Workflow Type**: ${workflowType}
**Target Version**: ${targetVersion || 'current/latest'}

Please help me:
1. Analyze current revision history and version status
2. Implement ${workflowType} workflow for content management
3. Track changes and maintain version integrity
4. ${workflowType === 'rollback' ? 'Safely rollback to previous versions' : 'Coordinate version progression'}
5. Manage conflicts and merge processes
6. Document version control procedures and best practices
7. Ensure team coordination throughout the workflow

Start by reviewing the revision history and current version state for the ${workflowType} workflow.`;

    return {
      description: `Manage ${workflowType} version control workflow for GitBook space`,
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
  "export_and_backup",
  {
    spaceId: z.string().describe('The GitBook space ID to export/backup'),
    exportType: z.string().describe('Export type: PDF, markdown, full-backup, or selective'),
    includeAssets: z.string().optional().describe('Whether to include images and assets (true/false)')
  },
  (args) => {
    const { spaceId, exportType, includeAssets = 'true' } = args;
    const promptText = `I need to export or backup GitBook content.

**Space ID**: ${spaceId}
**Export Type**: ${exportType}
**Include Assets**: ${includeAssets}

Please help me:
1. Analyze the space content and structure for export
2. Configure ${exportType} export with appropriate settings
3. ${includeAssets === 'true' ? 'Include all images, files, and assets in the export' : 'Export text content only'}
4. Ensure export completeness and integrity
5. Organize exported content for easy access and use
6. Create backup procedures and documentation
7. Validate export quality and usability

Start by reviewing the space structure and then proceed with the ${exportType} export process.`;

    return {
      description: `Export GitBook space as ${exportType}`,
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
  "content_strategy_planning",
  {
    spaceId: z.string().describe('The GitBook space ID for strategy planning'),
    strategyFocus: z.string().describe('Strategy focus: growth, maintenance, restructure, or user-experience'),
    businessGoals: z.string().optional().describe('Business objectives to align with')
  },
  (args) => {
    const { spaceId, strategyFocus, businessGoals } = args;
    const promptText = `I need to develop a content strategy for GitBook documentation.

**Space ID**: ${spaceId}
**Strategy Focus**: ${strategyFocus}
**Business Goals**: ${businessGoals || 'to be defined'}

Please help me:
1. Analyze current content performance and user needs
2. Assess content gaps and opportunities for ${strategyFocus}
3. Develop strategic recommendations aligned with business goals
4. Create roadmap for content improvement and expansion
5. Define success metrics and measurement strategies
6. Plan resource allocation and timeline for implementation
7. Establish governance and maintenance procedures

Start by thoroughly analyzing the current space content and structure to inform the ${strategyFocus} strategy.`;

    return {
      description: `Develop ${strategyFocus} content strategy for GitBook space`,
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
  "troubleshooting_assistant",
  {
    spaceId: z.string().describe('The GitBook space ID experiencing issues'),
    issueType: z.string().describe('Type of issue: access, sync, content, integration, or performance'),
    description: z.string().optional().describe('Description of the specific problem')
  },
  (args) => {
    const { spaceId, issueType, description } = args;
    const promptText = `I need help troubleshooting GitBook issues.

**Space ID**: ${spaceId}
**Issue Type**: ${issueType}
**Problem Description**: ${description || 'to be investigated'}

Please help me:
1. Diagnose the ${issueType} issue by examining relevant space data
2. Identify potential causes and contributing factors
3. Check system status, permissions, and configuration
4. Test functionality and gather diagnostic information
5. Provide step-by-step troubleshooting procedures
6. Suggest preventive measures to avoid future issues
7. Document the resolution process for reference

Start by investigating the current state and gathering information about the ${issueType} issue.`;

    return {
      description: `Troubleshoot ${issueType} issues in GitBook space`,
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
