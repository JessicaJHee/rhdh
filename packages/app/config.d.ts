export interface Config {
  /** Configurations for the backstage(janus) instance */
  developerHub?: {
    /**
     * The url of json data for customization.
     * @visibility frontend
     */
    proxyPath?: string;
    /**
     * Name of the Backstage flavor (e.g. backstage, rhdh, rhtap)
     * @visibility frontend
     */
    flavor?: string;
  };
  app: {
    branding?: {
      /**
       * Base64 URI for the full logo. If the value is a string, it is used as the logo for both themes.
       * @visibility frontend
       */
      // this config is copied to rhdh-plugins/global-header config.d.ts and should be kept in sync
      fullLogo?:
        | string
        | {
            /**
             * Base64 URI for the logo in light theme
             * @visibility frontend
             */
            light: string;
            /**
             * Base64 URI for the logo in dark theme
             * @visibility frontend
             */
            dark: string;
          };
      /**
       * size Configuration for the full logo
       * The following units are supported: <number>, px, em, rem, <percentage>
       * @visibility frontend
       */
      fullLogoWidth?: string | number;
      /**
       * Base64 URI for the icon logo. If the value is a string, it is used as the logo for both themes.
       * @visibility frontend
       */
      iconLogo?:
        | string
        | {
            /**
             * Base64 URI for the icon logo in light theme
             * @visibility frontend
             */
            light: string;
            /**
             * Base64 URI for the icon logo in dark theme
             * @visibility frontend
             */
            dark: string;
          };
      /**
       * @deepVisibility frontend
       */
      theme?: {
        [key: string]: unknown;
      };
    };
    sidebar?: {
      /**
       * Show the logo in the sidebar
       * @visibility frontend
       */
      logo?: boolean;
      /**
       * Show the search in the sidebar
       * @visibility frontend
       */
      search?: boolean;
      /**
       * Show the settings in the sidebar
       * @visibility frontend
       */
      settings?: boolean;
      /**
       * Show the administration in the sidebar
       * @visibility frontend
       */
      administration?: boolean;
    };
    quickstart?: Array</**
     * @visibility frontend
     */
    {
      /**
       * The title of quickstart.
       * @visibility frontend
       */
      title: string;
      /**
       * Optional icon for quickstart.
       * @visibility frontend
       */
      icon?: string;
      /**
       * The description of quickstart.
       * @visibility frontend
       */
      description: string;
      /**
       * Optional action item for quickstart.
       * @visibility frontend
       */
      cta?: {
        /**
         * Action item text.
         * @visibility frontend
         */
        text: string;
        /**
         * Action item link.
         * @visibility frontend
         */
        link: string;
      };
    }>;
  };
  /** @deepVisibility frontend */
  dynamicPlugins: {
    /** @deepVisibility frontend */
    frontend?: {
      [key: string]: {
        dynamicRoutes?: {
          path: string;
          module?: string;
          importName?: string;
          menuItem?: {
            icon: string;
            text: string;
            enabled?: boolean;
          };
          config: {
            props?: {
              [key: string]: string;
            };
          };
        }[];
        routeBindings?: {
          targets?: {
            module?: string;
            importName: string;
            name?: string;
          }[];
          bindings?: {
            bindTarget: string;
            bindMap: {
              [key: string]: string;
            };
          }[];
        };
        entityTabs?: {
          path: string;
          title: string;
          mountPoint: string;
          priority?: number;
        }[];
        mountPoints?: {
          mountPoint: string;
          module?: string;
          importName?: string;
          config: {
            layout?: {
              [key: string]:
                | string
                | {
                    [key: string]: string;
                  };
            };
            props?: {
              [key: string]: string;
            };
            if?: {
              allOf?: (
                | {
                    [key: string]: string | string[];
                  }
                | string
              )[];
              anyOf?: (
                | {
                    [key: string]: string | string[];
                  }
                | string
              )[];
              oneOf?: (
                | {
                    [key: string]: string | string[];
                  }
                | string
              )[];
            };
          };
        }[];
        appIcons?: {
          module?: string;
          importName?: string;
          name: string;
        }[];
        apiFactories?: {
          module?: string;
          importName?: string;
        }[];
        providerSettings?: {
          title: string;
          description: string;
          provider: string;
        }[];
        scaffolderFieldExtensions?: {
          module?: string;
          importName?: string;
        }[];
        signInPage?: {
          module?: string;
          importName: string;
        };
        techdocsAddons?: {
          module?: string;
          importName?: string;
          config?: {
            props?: {
              [key: string]: string;
            };
          };
        }[];
        themes?: {
          module?: string;
          id: string;
          title: string;
          variant: 'light' | 'dark';
          icon: string;
          importName?: string;
        }[];
      };
    };
  };
  /**
   * The signInPage provider
   * @visibility frontend
   */
  signInPage?: string;
  /**
   * The option to includes transient parent groups when determining user group membership
   * @visibility frontend
   */
  includeTransitiveGroupOwnership?: boolean;

  /**
   * Allows you to customize RHDH Metadata card
   * @deepVisibility frontend
   */
  buildInfo?: {
    title: string;
    card: { [key: string]: string };
    full?: boolean;
  };
}
