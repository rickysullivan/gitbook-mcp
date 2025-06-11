# GitBook MCP Server API Corrections

## Summary of Changes Made Based on OpenAPI Specification

### 1. **Fixed Endpoint URLs**

#### **Spaces Endpoint**
- **BEFORE**: `/spaces?organizationId={id}` (incorrect - this endpoint doesn't exist)
- **AFTER**: `/orgs/{organizationId}/spaces` (correct according to OpenAPI spec)
- **Impact**: `getSpaces()` method now requires organization ID

#### **Collections Endpoint**  
- **BEFORE**: `/collections` (incorrect - this endpoint doesn't exist globally)
- **AFTER**: `/orgs/{organizationId}/collections` (correct according to OpenAPI spec)
- **Impact**: `getCollections()` method now requires organization ID

### 2. **Updated Type Definitions to Match OpenAPI Schema**

#### **GitBookSpace Interface**
- **Added**: `object: 'space'` property (required by API)
- **Fixed**: `urls` is required with `location` and `app` properties
- **Fixed**: `organization` property (was `organizationId`)
- **Added**: Missing properties like `emoji`, `deletedAt`, `editMode`
- **Removed**: Non-existent properties

#### **GitBookOrganization Interface**
- **Added**: `object: 'organization'` property (required by API)
- **Fixed**: `urls` is required with `location` and `app` properties
- **Added**: Missing properties like `emailDomains`, `hostname`, `type`, etc.
- **Removed**: Non-existent properties like `avatar`

#### **GitBookCollection Interface**
- **Added**: `object: 'collection'` property (required by API)
- **Fixed**: `organization` property (was `organizationId`)
- **Fixed**: `urls` is required with `location` and `app` properties
- **Added**: Missing properties like `defaultLevel`, `permissions`
- **Removed**: Non-existent properties

#### **GitBookFile Interface**
- **Added**: `object: 'file'` property (required by API)

#### **New Interface: GitBookRevision**
- **Added**: Complete `GitBookRevision` interface that was missing
- **Fixed**: `getSpaceContent()` returns `GitBookRevision`, not `{ pages: GitBookPage[] }`

### 3. **Updated API Client Methods**

#### **getSpaces() Method**
```typescript
// BEFORE
async getSpaces(organizationId?: string): Promise<GitBookSpace[]> {
  let endpoint = '/spaces';
  if (orgId) {
    endpoint += `?organizationId=${orgId}`;
  }
  // ...
}

// AFTER  
async getSpaces(organizationId?: string): Promise<GitBookSpace[]> {
  const orgId = organizationId || this.organizationId;
  if (!orgId) {
    throw new Error('Organization ID is required to list spaces...');
  }
  const response = await this.makeRequest<{ items: GitBookSpace[] }>(`/orgs/${orgId}/spaces`);
  return response.items;
}
```

#### **getCollections() Method**
```typescript
// BEFORE
async getCollections(): Promise<GitBookCollection[]> {
  const response = await this.makeRequest<{ items: GitBookCollection[] }>('/collections');
  return response.items;
}

// AFTER
async getCollections(organizationId?: string): Promise<GitBookCollection[]> {
  const orgId = organizationId || this.organizationId;
  if (!orgId) {
    throw new Error('Organization ID is required to list collections...');
  }
  const response = await this.makeRequest<{ items: GitBookCollection[] }>(`/orgs/${orgId}/collections`);
  return response.items;
}
```

#### **getSpaceContent() Method**
```typescript
// BEFORE
async getSpaceContent(spaceId: string): Promise<{ pages: GitBookPage[] }> {
  return this.makeRequest<{ pages: GitBookPage[] }>(`/spaces/${spaceId}/content`);
}

// AFTER
async getSpaceContent(spaceId: string): Promise<GitBookRevision> {
  return this.makeRequest<GitBookRevision>(`/spaces/${spaceId}/content`);
}
```

### 4. **Updated Tools and Resources**

#### **list_collections Tool**
- **Added**: `organizationId` parameter (optional)
- **Updated**: Error handling for missing organization ID

#### **Collections Resource**
- **Changed**: From static URI to template URI with organization parameter
- **Updated**: List functionality to show collections per organization

### 5. **Verified Correct Endpoints**

✅ **Organization endpoints**: `/orgs` - ✓ Correct  
✅ **Space detail**: `/spaces/{spaceId}` - ✓ Correct  
✅ **Space content**: `/spaces/{spaceId}/content` - ✓ Correct  
✅ **Page content**: `/spaces/{spaceId}/content/page/{pageId}` - ✓ Correct  
✅ **Page by path**: `/spaces/{spaceId}/content/path/{pagePath}` - ✓ Correct  
✅ **Search**: `/spaces/{spaceId}/search` - ✓ Correct  
✅ **Space files**: `/spaces/{spaceId}/content/files` - ✓ Correct  
✅ **File detail**: `/spaces/{spaceId}/content/files/{fileId}` - ✓ Correct  
✅ **Collection detail**: `/collections/{collectionId}` - ✓ Correct  
✅ **Collection spaces**: `/collections/{collectionId}/spaces` - ✓ Correct  

### 6. **Impact on Usage**

#### **Breaking Changes**
1. **Spaces listing now requires organization ID**:
   ```typescript
   // Before: Could list all spaces globally
   const spaces = await gitbookClient.getSpaces();
   
   // After: Must specify organization
   const spaces = await gitbookClient.getSpaces(organizationId);
   ```

2. **Collections listing now requires organization ID**:
   ```typescript
   // Before: Could list all collections globally  
   const collections = await gitbookClient.getCollections();
   
   // After: Must specify organization
   const collections = await gitbookClient.getCollections(organizationId);
   ```

3. **Space content returns different structure**:
   ```typescript
   // Before: Returns { pages: GitBookPage[] }
   const content = await gitbookClient.getSpaceContent(spaceId);
   const pages = content.pages;
   
   // After: Returns GitBookRevision object
   const revision = await gitbookClient.getSpaceContent(spaceId);  
   const pages = revision.pages;
   ```

#### **Benefits**
- **100% API Compliance**: All endpoints and payloads now match the official GitBook API
- **Accurate Type Safety**: TypeScript definitions exactly match the API responses
- **Better Error Handling**: Clear error messages when required parameters are missing
- **Future-Proof**: Changes align with official API, reducing likelihood of breaking changes

### 7. **Current Tool Count**: 12 Essential Tools

All tools remain functional with the corrected endpoints and types:

1. `list_organizations` - ✓ Correct
2. `list_spaces` - ✓ Fixed (requires org ID)  
3. `get_space` - ✓ Correct
4. `get_space_content` - ✓ Fixed (returns Revision)
5. `get_page_content` - ✓ Correct
6. `get_page_by_path` - ✓ Correct
7. `search_content` - ✓ Correct
8. `get_space_files` - ✓ Correct
9. `get_file` - ✓ Correct
10. `list_collections` - ✓ Fixed (requires org ID)
11. `get_collection` - ✓ Correct
12. `get_collection_spaces` - ✓ Correct
