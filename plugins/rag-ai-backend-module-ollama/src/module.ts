import { createBackendModule } from '@backstage/backend-plugin-api';
import { coreServices } from '@backstage/backend-plugin-api';
import { CatalogClient } from '@backstage/catalog-client';
import { loggerToWinstonLogger } from '@backstage/backend-common';
import { createRoadiePgVectorStore } from '@alithya-oss/backstage-plugin-rag-ai-storage-pgvector';
import { createDefaultRetrievalPipeline } from '@alithya-oss/backstage-plugin-rag-ai-backend-retrieval-augmenter';
import { initializeOllamaEmbeddings } from '@internal/plugin-rag-ai-backend-embeddings-ollama';

import { Ollama } from '@langchain/ollama';

import {
  augmentationIndexerExtensionPoint,
  retrievalPipelineExtensionPoint,
  modelExtensionPoint,
} from '@alithya-oss/backstage-plugin-rag-ai-node';

export const ragAiModuleOllama = createBackendModule({
  pluginId: 'rag-ai',
  moduleId: 'ollama',
  register(reg) {
    reg.registerInit({
      deps: {
        auth: coreServices.auth,
        logger: coreServices.logger,
        database: coreServices.database,
        discovery: coreServices.discovery,
        config: coreServices.rootConfig,
        indexer: augmentationIndexerExtensionPoint,
        pipeline: retrievalPipelineExtensionPoint,
        model: modelExtensionPoint,
      },
      async init({
        auth,
        logger,
        database,
        discovery,
        config,
        indexer,
        pipeline,
        model,
      }) {
        const catalogApi = new CatalogClient({ discoveryApi: discovery });

        const vectorStore = await createRoadiePgVectorStore({
          logger: loggerToWinstonLogger(logger),
          database,
          config,
        });

        indexer.setAugmentationIndexer(
          await initializeOllamaEmbeddings({
            logger: loggerToWinstonLogger(logger),
            auth,
            catalogApi,
            vectorStore,
            discovery,
            config,
          }),
        );


        pipeline.setRetrievalPipeline(
          createDefaultRetrievalPipeline({
            auth,
            logger: loggerToWinstonLogger(logger),
            discovery,
            vectorStore,
          }),
        );

        model.setBaseLLM(
          new Ollama({
            model: config.getOptionalString('ai.query.ollama.modelName') ?? 'mistral',
            baseUrl: config.getOptionalString('ai.query.ollama.baseURL') ?? 'http://localhost:11434',
          }),
        );
      },
    });
  },
});