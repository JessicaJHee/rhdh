import { createBackendModule } from '@backstage/backend-plugin-api';
import {
  GroupTransformer,
  keycloakTransformerExtensionPoint,
  sanitizeGroupNameTransformer,
  UserTransformer,
} from '@backstage-community/plugin-catalog-backend-module-keycloak';

const customGroupTransformer: GroupTransformer = async (
  entity, // entity output from default parser
  _realm, // Keycloak realm name
  _groups, // Keycloak group representation
) => {
  // Build on top of the default group transformer
  const group = await sanitizeGroupNameTransformer(entity, _realm, _groups);

  if (group) {
    group.metadata.annotations = {
      MY_CUSTOM_ANNOTATION: `${entity.metadata.name}-${_realm}`,
    };
  }

  return group;
};
const customUserTransformer: UserTransformer = async (
  entity, // entity output from default parser
  _user, // Keycloak user representation
  _realm, // Keycloak realm name
  _groups, // Keycloak group representation
) => {
  // Apply transformations directly from parser output
  entity.metadata.name = entity.metadata.name.replace(/[^a-zA-Z0-9]/g, '-');
  return entity;
};

export const catalogModuleKeycloakOrgTransformer = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'keycloak-org-transformer',
  register(reg) {
    reg.registerInit({
      deps: {
        keycloak: keycloakTransformerExtensionPoint,
      },
      async init({ keycloak }) {
        keycloak.setUserTransformer(customUserTransformer);
        keycloak.setGroupTransformer(customGroupTransformer);
      },
    });
  },
});