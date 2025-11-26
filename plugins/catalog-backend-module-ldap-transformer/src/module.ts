import { createBackendModule } from '@backstage/backend-plugin-api';
import {
  defaultGroupTransformer,
  ldapOrgEntityProviderTransformsExtensionPoint,
  GroupConfig,
  LdapVendor,
  UserConfig,
} from '@backstage/plugin-catalog-backend-module-ldap';

import type { GroupEntity, UserEntity } from '@backstage/catalog-model';
import type { SearchEntry } from 'ldapjs';

export async function myGroupTransformer(
  vendor: LdapVendor,
  config: GroupConfig,
  entry: SearchEntry,
): Promise<GroupEntity | undefined> {
  // Build on top of the default group transformer
  const groupEntity = await defaultGroupTransformer(vendor, config, entry);

  if (groupEntity) {
    // Add a custom annotation to demonstrate extensibility
    groupEntity.metadata.annotations = {
      ...groupEntity.metadata.annotations,
      'MY_CUSTOM_ANNOTATION': groupEntity.metadata.name,
    };
  }

  return groupEntity;
}

export async function myUserTransformer(
  vendor: LdapVendor,
  config: UserConfig,
  entry: SearchEntry,
): Promise<UserEntity | undefined> {
  const { map } = config;

  // Create entity from scratch
  const entity: UserEntity = {
    apiVersion: 'backstage.io/v1beta1',
    kind: 'User',
    metadata: {
      name: '',
      annotations: {},
    },
    spec: {
      profile: {},
      memberOf: [],
    },
  };

  // Extract name - required field
  const nameValues = vendor.decodeStringAttribute(entry, map.name);
  if (nameValues && nameValues.length > 0) {
    entity.metadata.name = nameValues[0];
  }

  if (!entity.metadata.name) {
    throw new Error(
      `User syncing failed: missing '${map.name}' attribute, consider applying a user filter to skip processing users with incomplete data.`,
    );
  }

  // Extract optional fields
  if (map.displayName) {
    const values = vendor.decodeStringAttribute(entry, map.displayName);
    if (values && values.length > 0) {
      entity.spec.profile!.displayName = values[0];
    }
  }

  if (map.email) {
    const values = vendor.decodeStringAttribute(entry, map.email);
    if (values && values.length > 0) {
      entity.spec.profile!.email = values[0];
    }
  }

  // Add custom annotation
  const dnValues = vendor.decodeStringAttribute(entry, vendor.dnAttributeName);
  if (dnValues && dnValues.length > 0) {
    entity.metadata.annotations!.MY_CUSTOM_ANNOTATION = dnValues[0];
  }

  return entity;
}

export const catalogModuleLdapTransformer = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'ldap-transformer',
  register(env) {
    env.registerInit({
      deps: {
        ldapTransformers: ldapOrgEntityProviderTransformsExtensionPoint,
      },
      async init({ ldapTransformers }) {
        ldapTransformers.setUserTransformer(myUserTransformer);
        ldapTransformers.setGroupTransformer(myGroupTransformer);
      },
    });
  },
});
