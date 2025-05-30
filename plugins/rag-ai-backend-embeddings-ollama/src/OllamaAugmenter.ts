/*
 * Copyright 2024 Larder Software Limited
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { OllamaEmbeddings } from '@langchain/ollama';
import {
  DefaultVectorAugmentationIndexer,
  RoadieEmbeddingsConfig,
} from '@alithya-oss/backstage-plugin-rag-ai-backend-retrieval-augmenter';

/**
 * Ollama configuration to generate embeddings
 * @public
 */
export type OllamaConfig = {
  baseUrl?: string;
  apiKey?: string;
  openAiApiKey?: string;
  modelName?: string;
  batchSize?: number;
  embeddingsDimensions?: number;
};

export class OllamaAugmenter extends DefaultVectorAugmentationIndexer {
  constructor(
    config: RoadieEmbeddingsConfig & {
      config: OllamaConfig;
    },
  ) {
    const embeddings = new OllamaEmbeddings({
          model: config.config.modelName ?? 'nomic-embed-text',
          baseUrl: config.config.baseUrl ?? 'http://localhost:11434',
    });
    super({ ...config, embeddings });
  }
}
