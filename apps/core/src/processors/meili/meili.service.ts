import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { MEILISEARCH } from '~/app.config'
import { Index, MeiliSearch, SearchResponse } from 'meilisearch'

export interface SearchableDocument {
  id: string
  objectID: string
  title: string
  text: string
  type: 'post' | 'note' | 'page'
  slug?: string
  nid?: string
  categoryId?: string
  category?: {
    name: string
    slug: string
  }
  created?: Date
  modified?: Date | null
}

@Injectable()
export class MeiliSearchService implements OnModuleInit {
  private readonly logger = new Logger(MeiliSearchService.name)
  private client: MeiliSearch | null = null

  async onModuleInit() {
    await this.connect()
  }

  private async connect() {
    if (!MEILISEARCH.masterKey) {
      this.logger.warn(
        'MeiliSearch master key not configured, search service disabled',
      )
      return
    }

    try {
      this.client = new MeiliSearch({
        host: MEILISEARCH.url,
        apiKey: MEILISEARCH.masterKey,
      })

      // 测试连接
      const health = await this.client.health()
      this.logger.log(`MeiliSearch connected, status: ${health.status}`)
    } catch (error) {
      this.logger.error('Failed to connect to MeiliSearch', error)
      this.client = null
    }
  }

  isAvailable(): boolean {
    return this.client !== null
  }

  getClient(): MeiliSearch | null {
    return this.client
  }

  async getOrCreateIndex(indexName: string): Promise<Index | null> {
    if (!this.client) return null

    try {
      // 尝试获取索引，如果不存在则创建
      const index = this.client.index(indexName)

      // 配置索引设置
      await index.updateSettings({
        searchableAttributes: ['title', 'text'],
        filterableAttributes: ['type'],
        sortableAttributes: ['created', 'modified'],
        // 中文分词优化
        typoTolerance: {
          enabled: true,
          minWordSizeForTypos: {
            oneTypo: 4,
            twoTypos: 8,
          },
        },
      })

      return index
    } catch (error) {
      this.logger.error(`Failed to get/create index: ${indexName}`, error)
      return null
    }
  }

  async search(
    indexName: string,
    query: string,
    options?: {
      limit?: number
      offset?: number
      filter?: string
    },
  ): Promise<SearchResponse<SearchableDocument> | null> {
    if (!this.client) return null

    try {
      const index = this.client.index(indexName)
      return await index.search<SearchableDocument>(query, {
        limit: options?.limit ?? 20,
        offset: options?.offset ?? 0,
        filter: options?.filter,
        attributesToHighlight: ['title', 'text'],
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
      })
    } catch (error) {
      this.logger.error('MeiliSearch search failed', error)
      return null
    }
  }

  async addDocuments(
    indexName: string,
    documents: SearchableDocument[],
  ): Promise<boolean> {
    if (!this.client) return false

    try {
      const index = await this.getOrCreateIndex(indexName)
      if (!index) return false

      await index.addDocuments(documents, { primaryKey: 'objectID' })
      this.logger.debug(
        `Added ${documents.length} documents to index: ${indexName}`,
      )
      return true
    } catch (error) {
      this.logger.error('Failed to add documents to MeiliSearch', error)
      return false
    }
  }

  async updateDocument(
    indexName: string,
    document: SearchableDocument,
  ): Promise<boolean> {
    if (!this.client) return false

    try {
      const index = this.client.index(indexName)
      await index.updateDocuments([document], { primaryKey: 'objectID' })
      this.logger.debug(`Updated document ${document.objectID} in ${indexName}`)
      return true
    } catch (error) {
      this.logger.error('Failed to update document in MeiliSearch', error)
      return false
    }
  }

  async deleteDocument(
    indexName: string,
    documentId: string,
  ): Promise<boolean> {
    if (!this.client) return false

    try {
      const index = this.client.index(indexName)
      await index.deleteDocument(documentId)
      this.logger.debug(`Deleted document ${documentId} from ${indexName}`)
      return true
    } catch (error) {
      this.logger.error('Failed to delete document from MeiliSearch', error)
      return false
    }
  }

  async replaceAllDocuments(
    indexName: string,
    documents: SearchableDocument[],
  ): Promise<boolean> {
    if (!this.client) return false

    try {
      const index = await this.getOrCreateIndex(indexName)
      if (!index) return false

      // 先删除所有文档，再添加新文档
      await index.deleteAllDocuments()
      await index.addDocuments(documents, { primaryKey: 'objectID' })

      this.logger.log(
        `Replaced all documents in ${indexName}, total: ${documents.length}`,
      )
      return true
    } catch (error) {
      this.logger.error('Failed to replace documents in MeiliSearch', error)
      return false
    }
  }

  async getStats(indexName: string) {
    if (!this.client) return null

    try {
      const index = this.client.index(indexName)
      return await index.getStats()
    } catch (error) {
      this.logger.error('Failed to get MeiliSearch stats', error)
      return null
    }
  }
}
