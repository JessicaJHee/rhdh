/***/
/**
 * The ollama backend module for the rag-ai plugin.
 *
 * @packageDocumentation
 */
import {
  LoggerService,
  AuthService,
  DiscoveryService,
} from '@backstage/backend-plugin-api';
import {
  AugmentationIndexer,
  RoadieVectorStore,
} from '@alithya-oss/backstage-plugin-rag-ai-node';
import { OllamaConfig, OllamaAugmenter } from './OllamaAugmenter';
import { CatalogApi } from '@backstage/catalog-client';
import { Config } from '@backstage/config';
import { AugmentationOptions } from '@alithya-oss/backstage-plugin-rag-ai-backend-retrieval-augmenter';

/**
 * OpenAI client configuration to generate embeddings
 * @public
 */
export interface OllamaEmbeddingsConfig {
  logger: LoggerService;
  auth: AuthService;
  vectorStore: RoadieVectorStore;
  catalogApi: CatalogApi;
  discovery: DiscoveryService;
  config: Config;
}

/** @public */
export async function initializeOllamaEmbeddings({
  logger,
  auth,
  vectorStore,
  catalogApi,
  discovery,
  config,
}: OllamaEmbeddingsConfig): Promise<AugmentationIndexer> {
  logger.info('Initializing Roadie OpenAI Embeddings');
  const ollamaConfig = config.get<OllamaConfig>('ai.embeddings.ollama');

  const embeddingsOptions = config.getOptionalConfig('ai.embeddings');
  const augmentationOptions: AugmentationOptions = {};
  if (embeddingsOptions) {
    augmentationOptions.chunkSize =
      embeddingsOptions.getOptionalNumber('chunkSize');
    augmentationOptions.chunkOverlap =
      embeddingsOptions.getOptionalNumber('chunkOverlap');
    augmentationOptions.concurrencyLimit =
      embeddingsOptions.getOptionalNumber('concurrencyLimit');
  }
  return new OllamaAugmenter({
    vectorStore,
    catalogApi,
    discovery,
    augmentationOptions,
    logger: logger.child({ label: 'ollama-embeddings' }),
    auth,
    config: ollamaConfig,
  });
}
