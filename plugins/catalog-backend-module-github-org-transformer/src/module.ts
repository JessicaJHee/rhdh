import { createBackendModule } from '@backstage/backend-plugin-api';
import { UserEntity } from '@backstage/catalog-model';
import {
  GithubUser,
  TeamTransformer,
  UserTransformer,
  defaultOrganizationTeamTransformer,
} from '@backstage/plugin-catalog-backend-module-github';
import { githubOrgEntityProviderTransformsExtensionPoint } from '@backstage/plugin-catalog-backend-module-github-org';

const customTeamTransformer: TeamTransformer = async (team, _ctx) => {
  // Build on top of the default team transformer
    const group = await defaultOrganizationTeamTransformer(team, _ctx);
    if (group) {
      group.metadata.annotations = {
        ['MY_CUSTOM_ANNOTATION']: team.combinedSlug,
      };
    }
    return group;
  };

const customUserTransformer: UserTransformer  = async (user: GithubUser, _ctx) => {
  // Create a new user entity from scratch
  const userEntity: UserEntity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'User',
    metadata: { 
      name: user.login,
      annotations: {
        ['MY_CUSTOM_ANNOTATION']: user.login,
      },
    },
    spec: {
      profile: {},
      memberOf: [],
    },
  };

  // Add optional bio to the user entity
  if (user.bio) userEntity.metadata.description = user.bio;
  return userEntity;
};

export const catalogModuleGithubOrgTransformer = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'github-org-transformer',
  register(env) {
    env.registerInit({
      deps: {
        githubOrg: githubOrgEntityProviderTransformsExtensionPoint,
      },
      async init({ githubOrg }) {
        githubOrg.setTeamTransformer(customTeamTransformer);
        githubOrg.setUserTransformer(customUserTransformer);
      },
    });
  },
});