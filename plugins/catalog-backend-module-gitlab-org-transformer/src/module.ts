import { createBackendModule } from '@backstage/backend-plugin-api';

import { gitlabOrgEntityProviderTransformsExtensionPoint } from '@backstage/plugin-catalog-backend-module-gitlab-org';
import type { GroupEntity, UserEntity } from '@backstage/catalog-model';
import type {
  GroupTransformer,
  UserTransformer,
  GroupTransformerOptions,
  UserTransformerOptions,
} from '@backstage/plugin-catalog-backend-module-gitlab';

const customGroupTransformer: GroupTransformer = (options: GroupTransformerOptions) => {
  // Build group entities from scratch
  // Note: GitLab does not support extending default transformers
  const groupEntities: GroupEntity[] = [];
  
  for (const group of options.groups) {
    const groupName = options.groupNameTransformer({
      group,
      providerConfig: options.providerConfig,
    });
    
    const entity: GroupEntity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Group',
      metadata: {
        name: groupName,
        annotations: {
          ['MY_CUSTOM_ANNOTATION']: group.full_path,
        },
      },
      spec: {
        type: 'team',
        children: [],
        profile: {
          displayName: group.name,
        },
      },
    };
    
    if (group.description) {
      entity.metadata.description = group.description;
    }
    
    groupEntities.push(entity);
  }
  
  return groupEntities;
};

const customUserTransformer: UserTransformer = (options: UserTransformerOptions) => {
  // Create a new user entity from scratch
  const userEntity: UserEntity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'User',
    metadata: { 
      name: options.user.username,
      annotations: {
        ['MY_CUSTOM_ANNOTATION']: options.user.username,
      },
    },
    spec: {
      profile: {},
      memberOf: [],
    },
  };

  if (options.user.email) {
    userEntity.spec.profile!.email = options.user.email;
  }
  return userEntity;
};

export const catalogModuleGitlabOrgTransformer = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'gitlab-org-transformer',
  register(env) {
    env.registerInit({
      deps: {
        gitlabOrgTransformer: gitlabOrgEntityProviderTransformsExtensionPoint,
      },
      async init({ gitlabOrgTransformer }) {
        gitlabOrgTransformer.setGroupTransformer(customGroupTransformer);
        gitlabOrgTransformer.setUserTransformer(customUserTransformer);
      },
    });
  },
});