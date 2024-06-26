import { createBackendModule } from '@backstage/backend-plugin-api';
import {
  defaultGroupTransformer,
  defaultUserTransformer,
} from '@backstage/plugin-catalog-backend-module-msgraph';
import { microsoftGraphOrgEntityProviderTransformExtensionPoint } from '@backstage/plugin-catalog-backend-module-msgraph/alpha';

import { GroupEntity, UserEntity } from '@backstage/catalog-model';
import * as MicrosoftGraph from '@microsoft/microsoft-graph-types';

export async function myGroupTransformer(
  group: MicrosoftGraph.Group,
  groupPhoto?: string,
): Promise<GroupEntity | undefined> {
  console.log('Transforming group:', group.displayName); // Add logging
  group.displayName = `${group.displayName}_foo`;
  return await defaultGroupTransformer(group, groupPhoto);
}

export async function myUserTransformer(
  user: MicrosoftGraph.User,
  userPhoto?: string,
): Promise<UserEntity | undefined> {
  console.log('Transforming user:', user.displayName); // Add logging
  user.displayName = `${user.displayName}_bar`;
  return await defaultUserTransformer(user, userPhoto);
}

export const catalogModuleMsGraphTransformer = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'ms-graph-transformer',
  register(env) {
    env.registerInit({
      deps: {
        microsoftGraphTransformers:
          microsoftGraphOrgEntityProviderTransformExtensionPoint,
      },
      async init({ microsoftGraphTransformers }) {
        microsoftGraphTransformers.setUserTransformer(myUserTransformer);
        microsoftGraphTransformers.setGroupTransformer(myGroupTransformer);
      },
    });
  },
});
