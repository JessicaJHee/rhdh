import { OAuth2 } from '@backstage/core-app-api';
import {
  AnyApiFactory,
  configApiRef,
  createApiFactory,
  discoveryApiRef,
  googleAuthApiRef,
  microsoftAuthApiRef,
  oauthRequestApiRef,
} from '@backstage/core-plugin-api';
import {
  ScmAuth,
  ScmIntegrationsApi,
  scmIntegrationsApiRef,
} from '@backstage/integration-react';
import {
  auth0AuthApiRef,
  oidcAuthApiRef,
  samlAuthApiRef,
} from './api/AuthApiRefs';
import {
  CustomDataApiClient,
  customDataApiRef,
} from './api/CustomDataApiClient';
import { kubernetesAuthProvidersApiRef, KubernetesAuthProviders } from '@backstage/plugin-kubernetes';

export const apis: AnyApiFactory[] = [
  createApiFactory({
    api: scmIntegrationsApiRef,
    deps: { configApi: configApiRef },
    factory: ({ configApi }) => ScmIntegrationsApi.fromConfig(configApi),
  }),
  ScmAuth.createDefaultApiFactory(),
  createApiFactory({
    api: customDataApiRef,
    deps: {
      discoveryApi: discoveryApiRef,
      configApi: configApiRef,
    },
    factory: ({ discoveryApi, configApi }) =>
      new CustomDataApiClient({ discoveryApi, configApi }),
  }),
  // OIDC
  createApiFactory({
    api: oidcAuthApiRef,
    deps: {
      discoveryApi: discoveryApiRef,
      oauthRequestApi: oauthRequestApiRef,
      configApi: configApiRef,
    },
    factory: ({ discoveryApi, oauthRequestApi, configApi }) =>
      OAuth2.create({
        configApi,
        discoveryApi,
        oauthRequestApi,
        provider: {
          id: 'oidc',
          title: 'OIDC',
          icon: () => null,
        },
        environment: configApi.getOptionalString('auth.environment'),
      }),
  }),
  // Auth0
  createApiFactory({
    api: auth0AuthApiRef,
    deps: {
      discoveryApi: discoveryApiRef,
      oauthRequestApi: oauthRequestApiRef,
      configApi: configApiRef,
    },
    factory: ({ discoveryApi, oauthRequestApi, configApi }) =>
      OAuth2.create({
        discoveryApi,
        oauthRequestApi,
        provider: {
          id: 'auth0',
          title: 'Auth0',
          icon: () => null,
        },
        defaultScopes: ['openid', 'email', 'profile'],
        environment: configApi.getOptionalString('auth.environment'),
      }),
  }),
  // SAML
  createApiFactory({
    api: samlAuthApiRef,
    deps: {
      discoveryApi: discoveryApiRef,
      oauthRequestApi: oauthRequestApiRef,
      configApi: configApiRef,
    },
    factory: ({ discoveryApi, oauthRequestApi, configApi }) =>
      OAuth2.create({
        discoveryApi,
        oauthRequestApi,
        provider: {
          id: 'saml',
          title: 'SAML',
          icon: () => null,
        },
        environment: configApi.getOptionalString('auth.environment'),
      }),
  }),
  // Kube oidc
  // Define the custom Kubernetes auth providers API factory
  createApiFactory({
    api: kubernetesAuthProvidersApiRef,
    deps: {
      oidcAuthApi: oidcAuthApiRef,
      googleAuthApi: googleAuthApiRef,
      microsoftAuthApi: microsoftAuthApiRef,
    },
    factory: ({
      oidcAuthApi,
      googleAuthApi,
      microsoftAuthApi,
    }) => {
      return new KubernetesAuthProviders({
        microsoftAuthApi,
        googleAuthApi,
        oidcProviders: {
          oidc: oidcAuthApi,
        },
      });
    },
  })
];
