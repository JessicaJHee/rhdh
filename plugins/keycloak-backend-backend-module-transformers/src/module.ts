import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import {
  keycloakTransformerExtensionPoint,
  UserTransformer,
  GroupTransformer,
} from '@internal/backstage-plugin-keycloak-backend';

const groupTransformer: GroupTransformer = async (entity, _realm, _groups) => {
  entity.metadata.name = `${entity.metadata.name}_foo`;
  return entity;
};
const userTransformer: UserTransformer = async (
  entity,
  _user,
  _realm,
  _groups,
) => {
  entity.metadata.name = `${entity.metadata.name}_bar`;
  return entity;
};

export const keycloakBackendModuleTransformer = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'transformer',
  register(reg) {
    reg.registerInit({
      deps: {
        logger: coreServices.logger,
        keycloak: keycloakTransformerExtensionPoint,
      },
      async init({ logger, keycloak }) {
        keycloak.setUserTransformer(userTransformer);
        keycloak.setGroupTransformer(groupTransformer);
        logger.info('Adding the User and Group Transformers');
      },
    });
  },
});
