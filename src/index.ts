#!/usr/bin/env node

import { config } from "dotenv";
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// JSON-RPC logging function
const sendLogMessage = (level: string, message: string) => {
  const notification = {
    jsonrpc: "2.0",
    method: "notifications/message",
    params: {
      level: level,
      logger: "gitbook-mcp",
      data: message,
    },
  };
  console.log(JSON.stringify(notification));
};

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find the project root by looking for package.json
function findProjectRoot(startDir: string): string {
  let currentDir = startDir;
  while (currentDir !== dirname(currentDir)) {
    if (existsSync(join(currentDir, "package.json"))) {
      return currentDir;
    }
    currentDir = dirname(currentDir);
  }
  // Fallback to parent of dist directory
  return join(__dirname, "..");
}

const projectRoot = findProjectRoot(__dirname);

// Parse CLI arguments
interface CLIArgs {
  organizationId?: string;
  spaceId?: string;
}

const argv = yargs(hideBin(process.argv))
  .option("organization-id", {
    type: "string",
    description: "Organization ID to work with",
    alias: "org",
  })
  .option("space-id", {
    type: "string",
    description: "The space to get content from",
    alias: "space",
  })
  .help()
  .parseSync() as CLIArgs;

// Apply configuration hierarchy: CLI args > Copilot instructions > Environment variables
function resolveConfiguration() {
  const envConfig = {
    organizationId: process.env.GITBOOK_ORGANIZATION_ID,
    spaceId: process.env.GITBOOK_SPACE_ID,
  };

  const cliConfig = {
    organizationId: argv.organizationId,
    spaceId: argv.spaceId,
  };

  // Apply hierarchy (later values override earlier ones)
  const resolvedConfig = {
    organizationId: cliConfig.organizationId || envConfig.organizationId,
    spaceId: cliConfig.spaceId || envConfig.spaceId,
  };

  if (DEBUG) {
    console.error("🔍 Debug: Configuration sources:");
    console.error("  Environment:", envConfig);
    console.error("  CLI arguments:", cliConfig);
    console.error("  Final resolved:", resolvedConfig);
  }

  return resolvedConfig;
}

// Load environment variables from .env.local, .env files
// Priority: .env.local > .env > process.env
const envFiles = [
  join(projectRoot, ".env.local"),
  join(projectRoot, ".env"),
  ".env.local", // Also try current working directory
  ".env",
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
      sendLogMessage(
        "warn",
        `⚠️  Warning: Error loading ${envFile}: ${result.error.message}`
      );
    } else {
      sendLogMessage("info", `✅ Loaded environment from: "${envFile}"`);
      envLoaded = true;
      break;
    }
  } else if (DEBUG) {
    console.error(`❌ File not found: ${envFile}`);
  }
}

if (!envLoaded) {
  sendLogMessage(
    "warn",
    `📁 No environment files found. Checked: ${envFiles.join(", ")}`
  );
}

// Types based on GitBook API OpenAPI specification
interface GitBookSpace {
  object: "space";
  id: string;
  title: string;
  emoji?: string;
  visibility:
    | "public"
    | "unlisted"
    | "visitor-authentication"
    | "members-only"
    | "inherited";
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
  object: "organization";
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
  kind: "sheet" | "group";
  type: "document" | "link" | "group";
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
  object: "revision";
  id: string;
  title?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  type: "initial" | "update" | "merge";
  parent?: string;
  git?: {
    oid: string;
    message?: string;
  };
  pages: GitBookPage[];
}

interface GitBookContent {
  kind: "document";
  document: {
    type: string;
    content: any[];
  };
}

interface GitBookFile {
  object: "file";
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
  object: "collection";
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
  private baseURL = "https://api.gitbook.com/v1";
  private apiToken: string;
  private organizationId?: string;
  private defaultSpaceId?: string;

  constructor(
    apiToken: string,
    options?: {
      organizationId?: string;
      defaultSpaceId?: string;
    }
  ) {
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
      throw new Error(
        "No space ID provided and no default space configured. Please provide spaceId, use --space-id CLI argument, or add space-id to your configuration file."
      );
    }
    return effectiveSpaceId;
  }

  resolveOrganizationId(explicitOrgId?: string): string {
    const effectiveOrgId = explicitOrgId || this.getDefaultOrganizationId();
    if (!effectiveOrgId) {
      throw new Error(
        "No organization ID provided and no default organization configured. Please provide organizationId, use --organization-id CLI argument, or add organization-id to your configuration file."
      );
    }
    return effectiveOrgId;
  }

  private async makeRequest<T>(
    endpoint: string,
    options?: {
      method?: string;
      body?: any;
      headers?: Record<string, string>;
    }
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${this.apiToken}`,
      "Content-Type": "application/json",
      ...options?.headers,
    };

    const response = await fetch(url, {
      method: options?.method || "GET",
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = (await response.json()) as GitBookErrorResponse;
        errorMessage = errorData.error?.message || errorMessage;
      } catch (e) {
        // If we can't parse the error response, use the basic error message
      }
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }

  // Organization operations
  async getOrganizations(): Promise<GitBookOrganization[]> {
    const response = await this.makeRequest<{ items: GitBookOrganization[] }>(
      "/orgs"
    );
    return response.items;
  }

  // Space operations
  async getSpaces(organizationId?: string): Promise<GitBookSpace[]> {
    const orgId = organizationId || this.organizationId;
    if (!orgId) {
      throw new Error(
        "Organization ID is required to list spaces. Provide it via parameter or environment variable."
      );
    }
    const response = await this.makeRequest<{ items: GitBookSpace[] }>(
      `/orgs/${orgId}/spaces`
    );
    return response.items;
  }

  async getSpace(spaceId: string): Promise<GitBookSpace> {
    return this.makeRequest<GitBookSpace>(`/spaces/${spaceId}`);
  }

  async getSpaceContent(spaceId: string): Promise<GitBookRevision> {
    return this.makeRequest<GitBookRevision>(`/spaces/${spaceId}/content`);
  }

  // Page operations
  async getPageContent(
    spaceId: string,
    pageId: string,
    options?: {
      format?: "document" | "markdown";
      metadata?: boolean;
      computed?: boolean;
    }
  ): Promise<any> {
    let endpoint = `/spaces/${spaceId}/content/page/${pageId}`;
    const params = new URLSearchParams();

    if (options?.format) params.append("format", options.format);
    if (options?.metadata !== undefined)
      params.append("metadata", options.metadata.toString());
    if (options?.computed !== undefined)
      params.append("computed", options.computed.toString());

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    return this.makeRequest<any>(endpoint);
  }

  async getPageByPath(spaceId: string, pagePath: string): Promise<any> {
    const encodedPath = encodeURIComponent(pagePath);
    return this.makeRequest<any>(
      `/spaces/${spaceId}/content/path/${encodedPath}`
    );
  }

  // Search operations
  async searchContent(spaceId: string, query: string): Promise<any> {
    const params = new URLSearchParams({ query });
    return this.makeRequest<any>(
      `/spaces/${spaceId}/search?${params.toString()}`
    );
  }

  // File operations
  async getSpaceFiles(spaceId: string): Promise<GitBookFile[]> {
    const response = await this.makeRequest<{ items: GitBookFile[] }>(
      `/spaces/${spaceId}/files`
    );
    return response.items;
  }

  async getFile(spaceId: string, fileId: string): Promise<GitBookFile> {
    return this.makeRequest<GitBookFile>(`/spaces/${spaceId}/files/${fileId}`);
  }

  // Collection operations
  async getCollections(organizationId?: string): Promise<GitBookCollection[]> {
    const orgId = organizationId || this.organizationId;
    if (!orgId) {
      throw new Error(
        "Organization ID is required to list collections. Provide it via parameter or environment variable."
      );
    }
    const response = await this.makeRequest<{ items: GitBookCollection[] }>(
      `/orgs/${orgId}/collections`
    );
    return response.items;
  }

  async getCollection(collectionId: string): Promise<GitBookCollection> {
    return this.makeRequest<GitBookCollection>(`/collections/${collectionId}`);
  }

  async getCollectionSpaces(collectionId: string): Promise<GitBookSpace[]> {
    const response = await this.makeRequest<{ items: GitBookSpace[] }>(
      `/collections/${collectionId}/spaces`
    );
    return response.items;
  }
}

// Initialize the GitBook client
const apiToken = process.env.GITBOOK_API_TOKEN;
const resolvedConfig = resolveConfiguration();
const organizationId = resolvedConfig.organizationId;
const defaultSpaceId = resolvedConfig.spaceId;

if (!apiToken) {
  sendLogMessage(
    "error",
    "❌ GITBOOK_API_TOKEN environment variable is required"
  );
  sendLogMessage(
    "error",
    "💡 Please set your GitBook API token in your .env file"
  );
  sendLogMessage("error", "💡 Example: GITBOOK_API_TOKEN=your_token_here");
  sendLogMessage(
    "error",
    "💡 Get your token from: https://app.gitbook.com/account/developer"
  );

  sendLogMessage("info", "\n📋 Configuration Summary:");
  if (organizationId) {
    const source = argv.organizationId
      ? "CLI argument"
      : "environment variable";
    sendLogMessage(
      "info",
      `💡 Organization ID: ${organizationId} (from ${source})`
    );
  } else {
    sendLogMessage("info", "💡 No Organization ID configured");
    sendLogMessage("info", "   • Use --organization-id CLI argument");
    sendLogMessage(
      "info",
      '   • Add "organization-id: your-org-id" to .github/copilot-instructions.md'
    );
    sendLogMessage(
      "info",
      "   • Set GITBOOK_ORGANIZATION_ID environment variable"
    );
    sendLogMessage(
      "info",
      "   • Use list_organizations tool to find your org ID"
    );
  }

  if (defaultSpaceId) {
    const source = argv.spaceId ? "CLI argument" : "environment variable";
    sendLogMessage(
      "info",
      `💡 Default Space ID: ${defaultSpaceId} (from ${source})`
    );
  } else {
    sendLogMessage("info", "💡 No default Space ID configured");
    sendLogMessage("info", "   • Use --space-id CLI argument");
    sendLogMessage(
      "info",
      '   • Add "space-id: your-space-id" to .github/copilot-instructions.md'
    );
    sendLogMessage("info", "   • Set GITBOOK_SPACE_ID environment variable");
  }

  process.exit(1);
}

const gitbookClient = new GitBookAPIClient(apiToken, {
  organizationId: organizationId,
  defaultSpaceId: defaultSpaceId,
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
      prompts: {},
    },
  }
);

// Core Content Reading Tools
server.tool(
  "list_organizations",
  "List all GitBook organizations accessible with the current API token",
  {},
  {
    title: "List Organizations",
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  async () => {
    const organizations = await gitbookClient.getOrganizations();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(organizations, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "list_spaces",
  "List all spaces in a GitBook organization, optionally filtered by organization ID",
  {
    organizationId: z
      .string()
      .optional()
      .describe("Organization ID to filter spaces by"),
  },
  {
    title: "List Spaces",
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  async ({ organizationId }) => {
    const spaces = await gitbookClient.getSpaces(organizationId);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(spaces, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get_space",
  "Get detailed information about a specific GitBook space",
  {
    spaceId: z.string().describe("The ID of the space to retrieve"),
  },
  {
    title: "Get Space Details",
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  async ({ spaceId }) => {
    const space = await gitbookClient.getSpace(spaceId);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(space, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get_space_content",
  "Get the complete content structure and page hierarchy of a GitBook space",
  {
    spaceId: z
      .string()
      .optional()
      .describe(
        "The ID of the space to get content from (uses default space if not provided)"
      ),
  },
  {
    title: "Get Space Content",
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  async ({ spaceId }) => {
    const effectiveSpaceId = gitbookClient.resolveSpaceId(spaceId);
    const content = await gitbookClient.getSpaceContent(effectiveSpaceId);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(content, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get_page_content",
  "Retrieve the content of a specific page from a GitBook space, with options for format and metadata",
  {
    spaceId: z
      .string()
      .optional()
      .describe(
        "The ID of the space containing the page (uses default space if not provided)"
      ),
    pageId: z.string().describe("The ID of the page to retrieve content from"),
    format: z
      .enum(["document", "markdown"])
      .optional()
      .describe("The format of the document to retrieve"),
    metadata: z
      .boolean()
      .optional()
      .describe("Whether to include revision metadata"),
    computed: z
      .boolean()
      .optional()
      .describe("Whether to include computed revision data"),
  },
  {
    title: "Get Page Content",
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
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
          type: "text",
          text: JSON.stringify(pageContent, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get_page_by_path",
  "Retrieve a page from a GitBook space using its path instead of page ID",
  {
    spaceId: z
      .string()
      .optional()
      .describe(
        "The ID of the space containing the page (uses default space if not provided)"
      ),
    pagePath: z.string().describe("The path of the page to retrieve"),
  },
  {
    title: "Get Page by Path",
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  async ({ spaceId, pagePath }) => {
    const effectiveSpaceId = gitbookClient.resolveSpaceId(spaceId);
    const pageContent = await gitbookClient.getPageByPath(
      effectiveSpaceId,
      pagePath
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(pageContent, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "search_content",
  "Search for content within a GitBook space using a text query",
  {
    spaceId: z
      .string()
      .optional()
      .describe(
        "The ID of the space to search in (uses default space if not provided)"
      ),
    query: z.string().describe("The search query"),
  },
  {
    title: "Search Content",
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  async ({ spaceId, query }) => {
    const effectiveSpaceId = gitbookClient.resolveSpaceId(spaceId);
    const searchResults = await gitbookClient.searchContent(
      effectiveSpaceId,
      query
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(searchResults, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get_space_files",
  "List all files (images, documents, etc.) uploaded to a GitBook space",
  {
    spaceId: z
      .string()
      .optional()
      .describe(
        "The ID of the space to get files from (uses default space if not provided)"
      ),
  },
  {
    title: "Get Space Files",
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  async ({ spaceId }) => {
    const effectiveSpaceId = gitbookClient.resolveSpaceId(spaceId);
    const files = await gitbookClient.getSpaceFiles(effectiveSpaceId);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(files, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get_file",
  "Get detailed information about a specific file uploaded to a GitBook space",
  {
    spaceId: z
      .string()
      .optional()
      .describe(
        "The ID of the space containing the file (uses default space if not provided)"
      ),
    fileId: z.string().describe("The ID of the file to retrieve"),
  },
  {
    title: "Get File Details",
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  async ({ spaceId, fileId }) => {
    const effectiveSpaceId = gitbookClient.resolveSpaceId(spaceId);
    const file = await gitbookClient.getFile(effectiveSpaceId, fileId);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(file, null, 2),
        },
      ],
    };
  }
);

// Collection Tools
server.tool(
  "list_collections",
  "List all collections in a GitBook organization, optionally filtered by organization ID",
  {
    organizationId: z
      .string()
      .optional()
      .describe(
        "Organization ID to filter collections by (uses default organization if not provided)"
      ),
  },
  {
    title: "List Collections",
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  async ({ organizationId }) => {
    const effectiveOrgId = gitbookClient.resolveOrganizationId(organizationId);
    const collections = await gitbookClient.getCollections(effectiveOrgId);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(collections, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get_collection",
  "Get detailed information about a specific GitBook collection",
  {
    collectionId: z.string().describe("The ID of the collection to retrieve"),
  },
  {
    title: "Get Collection Details",
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  async ({ collectionId }) => {
    const collection = await gitbookClient.getCollection(collectionId);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(collection, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get_collection_spaces",
  "List all spaces that belong to a specific GitBook collection",
  {
    collectionId: z
      .string()
      .describe("The ID of the collection to get spaces from"),
  },
  {
    title: "Get Collection Spaces",
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  async ({ collectionId }) => {
    const spaces = await gitbookClient.getCollectionSpaces(collectionId);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(spaces, null, 2),
        },
      ],
    };
  }
);

// Add a resource for the default space if configured
if (defaultSpaceId) {
  server.resource("default-space", "gitbook://default-space", async () => {
    const content = await gitbookClient.getSpaceContent(defaultSpaceId);
    return {
      contents: [
        {
          uri: "gitbook://default-space",
          text: JSON.stringify(content, null, 2),
          mimeType: "application/json",
        },
      ],
    };
  });
}

// Add resources for easy access to common data
server.resource("organizations", "gitbook://organizations", async () => {
  const organizations = await gitbookClient.getOrganizations();
  return {
    contents: [
      {
        uri: "gitbook://organizations",
        text: JSON.stringify(organizations, null, 2),
        mimeType: "application/json",
      },
    ],
  };
});

server.resource(
  "collections",
  new ResourceTemplate("gitbook://collections/{organizationId?}", {
    list: async () => {
      const organizations = await gitbookClient.getOrganizations();
      return {
        resources: organizations.map((org) => ({
          name: `Collections for ${org.title}`,
          uri: `gitbook://collections/${org.id}`,
          mimeType: "application/json",
          description: `All collections for organization: ${org.title}`,
        })),
      };
    },
  }),
  async (uri, { organizationId }) => {
    // ResourceTemplate parameters come as string arrays, get the first value
    const orgId = Array.isArray(organizationId)
      ? organizationId[0]
      : organizationId;
    const collections = await gitbookClient.getCollections(orgId);
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(collections, null, 2),
          mimeType: "application/json",
        },
      ],
    };
  }
);

// Add comprehensive prompts for GitBook documentation workflows
server.prompt(
  "fetch_documentation",
  "Fetch and analyze GitBook documentation content for specific topics",
  {
    spaceId: z
      .string()
      .optional()
      .describe(
        "The GitBook space ID to search in (uses default space if not provided)"
      ),
    topic: z
      .string()
      .describe("The topic or keyword to search for in the documentation"),
    includeStructure: z
      .string()
      .optional()
      .describe(
        'Set to "true" to include the overall space structure in the analysis'
      ),
  },
  (args) => {
    const { spaceId, topic, includeStructure } = args;
    const effectiveSpaceId = gitbookClient.resolveSpaceId(spaceId);

    let promptText = `I need to fetch and analyze GitBook documentation content.

**Space ID**: ${effectiveSpaceId}
**Topic**: ${topic}
**Include Structure**: ${includeStructure === "true"}

Please help me:
1. Search for content related to "${topic}" in the GitBook space
2. Retrieve the most relevant pages
3. Analyze the content for completeness and accuracy
4. Identify any related pages or sections I should also review`;

    if (includeStructure === "true") {
      promptText += `
5. Show me the overall space structure to understand context`;
    }

    promptText += `

Start by using the search_content tool to find relevant pages, then use get_page_content to retrieve the actual content for analysis.`;

    return {
      description: `Fetch and analyze GitBook documentation for topic: ${topic}`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: promptText,
          },
        },
      ],
    };
  }
);

server.prompt(
  "analyze_content_gaps",
  "Identify gaps and missing content in documentation",
  {
    spaceId: z
      .string()
      .optional()
      .describe(
        "The GitBook space ID to analyze (uses default space if not provided)"
      ),
    comparisonSource: z
      .string()
      .optional()
      .describe("Source to compare against (default: internal analysis)"),
  },
  (args) => {
    const { spaceId, comparisonSource = "internal analysis" } = args;
    const effectiveSpaceId = gitbookClient.resolveSpaceId(spaceId);

    const promptText = `I need to identify gaps and missing content in GitBook documentation.

**Space ID**: ${effectiveSpaceId}
**Comparison Source**: ${comparisonSource}

Please help me:
1. Get the complete space structure and content overview
2. Analyze documentation for missing topics and incomplete sections
3. Identify coverage gaps and prioritize them by importance
4. Suggest new content areas that should be added
5. Compare against ${comparisonSource} if relevant
6. Create a prioritized list of content gaps to address

Start by using get_space_content to understand the current structure, then analyze individual pages with get_page_content to identify gaps.`;

    return {
      description: `Analyze content gaps in GitBook space`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: promptText,
          },
        },
      ],
    };
  }
);

server.prompt(
  "content_audit",
  "Perform quality audits of documentation content",
  {
    spaceId: z
      .string()
      .optional()
      .describe(
        "The GitBook space ID to audit (uses default space if not provided)"
      ),
    auditCriteria: z
      .string()
      .optional()
      .describe("Specific criteria to audit (default: general quality and consistency)"),
  },
  (args) => {
    const { spaceId, auditCriteria = "general quality and consistency" } = args;
    const effectiveSpaceId = gitbookClient.resolveSpaceId(spaceId);

    const promptText = `I need to perform a comprehensive quality audit of GitBook documentation.

**Space ID**: ${effectiveSpaceId}
**Audit Criteria**: ${auditCriteria}

Please help me:
1. Review the space structure and organization
2. Examine content quality and consistency across pages
3. Check for outdated information and broken references
4. Evaluate writing style and tone consistency
5. Identify formatting and structural issues
6. Assess completeness and accuracy of information
7. Provide detailed improvement recommendations

Start by using get_space_content to understand the structure, then systematically review pages with get_page_content. Use get_space_files to check for unused or missing assets.`;

    return {
      description: `Perform quality audit of GitBook documentation`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: promptText,
          },
        },
      ],
    };
  }
);

server.prompt(
  "documentation_summary",
  "Generate comprehensive summaries of GitBook spaces",
  {
    spaceId: z
      .string()
      .optional()
      .describe(
        "The GitBook space ID to summarize (uses default space if not provided)"
      ),
    summaryType: z
      .string()
      .optional()
      .describe("Type of summary: overview, technical, user-guide, or custom (default: overview)"),
  },
  (args) => {
    const { spaceId, summaryType = "overview" } = args;
    const effectiveSpaceId = gitbookClient.resolveSpaceId(spaceId);

    const promptText = `I need to generate a comprehensive summary of GitBook documentation.

**Space ID**: ${effectiveSpaceId}
**Summary Type**: ${summaryType}

Please help me:
1. Analyze the space structure and content organization
2. Identify main topics, themes, and coverage areas
3. Create a ${summaryType} summary highlighting key sections
4. Summarize the scope and purpose of the documentation
5. Highlight important sections and entry points
6. Identify the target audience and use cases
7. Note any special features or unique aspects

Start by using get_space_content to understand the overall structure, then selectively review key pages with get_page_content to create an accurate summary.`;

    return {
      description: `Generate ${summaryType} summary of GitBook space`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: promptText,
          },
        },
      ],
    };
  }
);

server.prompt(
  "content_optimization",
  "Optimize content for SEO, readability, structure, or performance",
  {
    spaceId: z
      .string()
      .optional()
      .describe(
        "The GitBook space ID to optimize (uses default space if not provided)"
      ),
    optimizationType: z
      .string()
      .describe("Type of optimization: SEO, readability, structure, or performance"),
    targetMetrics: z
      .string()
      .optional()
      .describe("Specific metrics or goals to optimize for"),
  },
  (args) => {
    const { spaceId, optimizationType, targetMetrics } = args;
    const effectiveSpaceId = gitbookClient.resolveSpaceId(spaceId);

    const promptText = `I need to optimize GitBook documentation content.

**Space ID**: ${effectiveSpaceId}
**Optimization Type**: ${optimizationType}
**Target Metrics**: ${targetMetrics || "general improvement"}

Please help me:
1. Analyze current content for optimization opportunities
2. Identify pages that need ${optimizationType} improvements
3. Suggest specific optimization strategies and changes
4. Prioritize optimizations by impact and effort
5. Provide actionable recommendations for improvement
6. Consider target metrics: ${targetMetrics || "overall quality"}

Start by using get_space_content to understand the structure, then analyze individual pages with get_page_content. Use search_content to identify common patterns that need optimization.`;

    return {
      description: `Optimize GitBook content for ${optimizationType}`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: promptText,
          },
        },
      ],
    };
  }
);

server.prompt(
  "troubleshooting_assistant",
  "Diagnose and resolve access, sync, content, and integration issues",
  {
    spaceId: z
      .string()
      .optional()
      .describe(
        "The GitBook space ID experiencing issues (uses default space if not provided)"
      ),
    issueType: z
      .string()
      .describe("Type of issue: access, sync, content, integration, or performance"),
    description: z
      .string()
      .optional()
      .describe("Description of the specific problem"),
  },
  (args) => {
    const { spaceId, issueType, description } = args;
    const effectiveSpaceId = gitbookClient.resolveSpaceId(spaceId);

    const promptText = `I need help troubleshooting a GitBook issue.

**Space ID**: ${effectiveSpaceId}
**Issue Type**: ${issueType}
**Description**: ${description || "Not specified"}

Please help me:
1. Diagnose the issue by examining relevant data and configuration
2. Identify potential causes and contributing factors
3. Check system status, permissions, and configuration
4. Provide step-by-step troubleshooting procedures
5. Suggest preventive measures to avoid similar issues
6. Document the resolution process for future reference

Start by using appropriate tools to gather information about the ${issueType} issue. Use get_space, get_space_content, and other relevant tools to understand the current state and identify problems.`;

    return {
      description: `Troubleshoot ${issueType} issue in GitBook space`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: promptText,
          },
        },
      ],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  sendLogMessage("info", "👟 GitBook MCP server running on stdio");
}

main().catch((error) => {
  sendLogMessage("error", `Fatal error: ${error}`);
  process.exit(1);
});
