import type { IConfig, IServiceEnvironment } from '../../lib/aws/config/app'
import type { Environment, EnvironmentName } from '../../lib/aws/config/env'

const defaultServiceEnvironment: IServiceEnvironment = {
  PORT: 80,
  // CORS
  CORS_ALLOWED_ORIGINS: '*',
  CORS_ALLOWED_METHODS: 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD',
  CORS_ALLOWED_HEADERS: 'Accept,Authorization,Content-Type,X-CSRF-Token,Origin',
  CORS_ALLOWED_CREDENTIALS: true,
  CORS_MAX_AGE: 300,
  // Verification
  VERIFICATION_USER_PASSWORD_RESET_EXPIRATION: '3d',
  VERIFICATION_USER_REGISTRATION_EXPIRATION: '7d',
  // Session
  SESSION_ACCESS_TOKEN_EXPIRATION: '1h',
  SESSION_REFRESH_TOKEN_EXPIRATION: '30d',
  // Metrics
  METRICS_PORT: 9178,
  METRICS_NAMESPACE: 'strv',
  METRICS_SUBSYSTEM: 'api',
  // Logging
  LOG_LEVEL: 'debug',
}

export function createApplicationConfig(environment: Environment): IConfig {
  const env: EnvironmentName = environment.name

  return {
    appName: 'STRVBackend',
    service: {
      api: {
        env: {
          ...defaultServiceEnvironment,
        },
        secrets: {
          AUTH_SECRET: `/example.io/${env}/svc/api/AUTH_SECRET@v1`,
          HASH_PEPPER: `/example.io/${env}/svc/api/HASH_PEPPER@v1`,
        },
        image: {
          registry: {
            type: 'ECR',
            name: 'strv-backend/api',
            lifecyclePolicies: {
              keepUntaggedImagesCount: 5,
            },
          },
          tag: 'latest',
        },
        hostedZone: {
          id: '',
          name: `${env}.svc.example.io`,
        },
        domain: `api.${env}.svc.example.io`,
      },
    },
    /* HINT: Add the VPN config to enable VPN. */
    // vpn: { ... }
  }
}
