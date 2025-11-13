import { createBackendModule } from '@backstage/backend-plugin-api';
import { UserEntity } from '@backstage/catalog-model';
import {
  GithubUser,
  TeamTransformer,
  UserTransformer,
  defaultOrganizationTeamTransformer,
} from '@backstage/plugin-catalog-backend-module-github';
import { githubOrgEntityProviderTransformsExtensionPoint } from '@backstage/plugin-catalog-backend-module-github-org';

const ANNOTATION_GITHUB_USER_LOGIN = 'github.com/user-login';

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
  const entity: UserEntity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'User',
    metadata: {
      name: user.login,
      annotations: {
        ['MY_CUSTOM_ANNOTATION']: user.login,
        [ANNOTATION_GITHUB_USER_LOGIN]: user.login
      },
    },
    spec: {
      profile: {},
      memberOf: [],
    },
  };

  if (user.bio) entity.metadata.description = user.bio;
  if (user.name) entity.spec.profile!.displayName = user.name;
  if (user.email) entity.spec.profile!.email = user.email;
  if (user.avatarUrl) entity.spec.profile!.picture = user.avatarUrl;
  return entity;
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