import { createBackendModule } from '@backstage/backend-plugin-api';
import {
  GithubUser,
  TeamTransformer,
  UserTransformer,
  defaultUserTransformer,
  defaultOrganizationTeamTransformer,
} from '@backstage/plugin-catalog-backend-module-github';
import { githubOrgEntityProviderTransformsExtensionPoint } from '@backstage/plugin-catalog-backend-module-github-org';

const customTeamTransformer: TeamTransformer = async (team, _ctx) => {
  // Extend default team transformer with custom annotation
  const group = await defaultOrganizationTeamTransformer(team, _ctx);
  if (group) {
    group.metadata.annotations = {
      ...group.metadata.annotations,
      ['MY_CUSTOM_ANNOTATION']: team.combinedSlug,
    };
  }
  return group;
};

const customUserTransformer: UserTransformer  = async (user: GithubUser, _ctx) => {
  // Extend default user transformer with custom annotation
  const userEntity = await defaultUserTransformer(user, _ctx);
  if (userEntity) {
    userEntity.metadata.annotations = {
      ...userEntity.metadata.annotations,
      ['MY_CUSTOM_ANNOTATION']: user.login,
    };
  }
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