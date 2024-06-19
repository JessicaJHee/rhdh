import { createExtensionPoint } from '@backstage/backend-plugin-api';

import { GroupTransformer, UserTransformer } from './lib/types';

/**
 * An extension point that exposes the ability to implement user and group transformer functions.
 *
 * @public
 */
export const keycloakTransformerExtensionPoint =
  createExtensionPoint<TransformerExtensionPoint>({
    id: 'keycloak.transformer',
  });

/**
 * The interface for {@link transformerExtensionPoint}.
 *
 * @public
 */
export type TransformerExtensionPoint = {
  setUserTransformer(userTransformer: UserTransformer): void;
  setGroupTransformer(groupTransformer: GroupTransformer): void;
};
