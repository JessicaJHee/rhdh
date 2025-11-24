import { createBackendModule } from '@backstage/backend-plugin-api';
import {
  defaultGroupTransformer,
  microsoftGraphOrgEntityProviderTransformExtensionPoint
} from '@backstage/plugin-catalog-backend-module-msgraph';

import type { GroupEntity, UserEntity } from '@backstage/catalog-model';
import type { Group, User } from '@microsoft/microsoft-graph-types';

export async function myGroupTransformer(
  group: Group,
  groupPhoto?: string,
): Promise<GroupEntity | undefined> {
  // Build on top of the default group transformer
  const groupEntity = await defaultGroupTransformer(group, groupPhoto);

  if (groupEntity) {
    groupEntity.metadata.annotations = {
      ...groupEntity.metadata.annotations,
      ['MY_CUSTOM_ANNOTATION']: group.mail || group.id || '',
    };
  }

  return groupEntity;
}

export async function myUserTransformer(
  user: User,
  userPhoto?: string,
): Promise<UserEntity | undefined> {
  // Create a new user entity from scratch
  const userEntity: UserEntity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'User',
    metadata: {
      name: user.userPrincipalName?.split('@')[0] || user.id || 'unknown',
      annotations: {
        ['MY_CUSTOM_ANNOTATION']: user.userPrincipalName || user.id || '',
      },
    },
    spec: {
      profile: {
        displayName: user.displayName || undefined,
        email: user.mail || user.userPrincipalName || undefined,
      },
      memberOf: [],
    },
  };

  // Add optional fields to the user entity using metadata description
  if (user.jobTitle) {
    userEntity.metadata.description = user.jobTitle;
  }
  
  if (userPhoto) {
    userEntity.spec.profile!.picture = userPhoto;
  }

  return userEntity;
}

export const catalogModuleMsgraphTransformer = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'msgraph-transformer',
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