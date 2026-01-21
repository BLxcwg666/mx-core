import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { AIProviderType, type AIProviderConfig } from './ai.types'

/**
 * 规范化 endpoint URL
 * - 移除末尾斜杠
 * - 确保有 /v1 后缀（对于 OpenAI 兼容服务）
 */
export function normalizeOpenAIEndpoint(endpoint: string): string {
  // 移除末尾斜杠
  let normalized = endpoint.replace(/\/+$/, '')
  // 如果没有 /v1 后缀，添加它
  if (!normalized.endsWith('/v1')) {
    normalized = `${normalized}/v1`
  }
  return normalized
}

export function createLanguageModel(
  config: AIProviderConfig,
  modelOverride?: string,
) {
  const modelName = modelOverride || config.defaultModel

  switch (config.type) {
    case AIProviderType.OpenAI:
      return createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.endpoint
          ? normalizeOpenAIEndpoint(config.endpoint)
          : undefined,
      })(modelName)

    case AIProviderType.OpenAICompatible: {
      if (!config.endpoint) {
        throw new Error(
          `Endpoint is required for OpenAI-compatible provider: ${config.id}`,
        )
      }
      // OpenAI-compatible providers: create a custom provider instance.
      // Many "OpenAI-compatible" gateways don't fully support the SDK's automatic
      // API selection (responses/chat/completions). Force chat models to avoid
      // mismatches on these providers.
      const openai = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.endpoint,
      })
      return openai.chat(modelName)
    }

    case AIProviderType.Anthropic:
      // Anthropic API 使用 /v1/messages 端点
      // 支持自定义 endpoint 以兼容 one-api/new-api 等聚合服务
      return createAnthropic({
        apiKey: config.apiKey,
        baseURL: config.endpoint
          ? normalizeOpenAIEndpoint(config.endpoint)
          : undefined,
      })(modelName)

    case AIProviderType.OpenRouter:
      return createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.endpoint
          ? normalizeOpenAIEndpoint(config.endpoint)
          : 'https://openrouter.ai/api/v1',
      })(modelName)

    default:
      throw new Error(`Unsupported provider type: ${config.type}`)
  }
}
