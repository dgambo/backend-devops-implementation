import type { Environment as AWSEnvironment } from 'aws-cdk-lib'

export enum EnvironmentName {
  /**
   * Bootstrap environment is used for bootstrapping.
   *
   * @see https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html
   */
  __BOOTSTRAP = 'bootstrap',
  /**
   * Test environment is for testing purposes and it's used only by the CI/CD pipelines.
   *
   * It shouldn't be used for deployments.
   */
  __TEST = 'test',
  DEV = 'dev',
  STG = 'stg',
  PRODUCTION = 'production',
}

export class Environment implements AWSEnvironment {
  readonly name: EnvironmentName
  readonly account: string
  readonly region?: string

  constructor(name: EnvironmentName) {
    this.name = name

    this.region = process.env.AWS_REGION ? process.env.AWS_REGION : process.env.CDK_DEFAULT_REGION
    if (!this.region) {
      throw new Error('The AWS region must be defined either via the AWS_REGION or CDK_DEFAULT_REGION environment variables.')
    }

    const account = process.env.AWS_ACCOUNT_ID
      ?? process.env.CDK_DEFAULT_ACCOUNT

    if (account) {
      // Prevent overriding the account ID by an empty string. By default, it is undefined.
      this.account = account
    }
  }
}

export enum ServiceEnvironmentKey {
  /**
   * Application prefix used to namespace environment variables.
   */
  APP_PREFIX = 'APP_PREFIX',
  // Database config used to access RDS.
  DATABASE_USERNAME = 'DATABASE_USERNAME',
  DATABASE_PASSWORD = 'DATABASE_PASSWORD',
  DATABASE_HOST = 'DATABASE_HOST',
  DATABASE_PORT = 'DATABASE_PORT',
  DATABASE_DB_NAME = 'DATABASE_DB_NAME',

  /* HINT: Add your custom environment keys here. */
  /**
   * Application topic ARN.
   */
  APPLICATION_TOPIC_ARN = 'SNS_APPLICATION_TOPIC_ARN',
}

export class ServiceEnvironment extends Map<string, string> {
  static readonly DEFAULT_APP_PREFIX: string = ''
  private readonly _delimiter = '_'
  private readonly appPrefix = ServiceEnvironment.DEFAULT_APP_PREFIX

  constructor(appPrefix = '') {
    super()
    if (appPrefix !== ServiceEnvironment.DEFAULT_APP_PREFIX) {
      this.appPrefix = `${appPrefix}${this._delimiter}`
    }

    this.set(`${ServiceEnvironmentKey.APP_PREFIX}`, appPrefix)
  }

  set(key: string, value: string): this {
    return super.set(`${this.appPrefix}${key}`, value)
  }

  get(key: string): string | undefined {
    return super.get(`${this.appPrefix}${key}`)
  }

  apply(env?: Record<string, string | number | boolean>): Record<string, string> {
    const obj: Record<string, string> = {}

    for (const [key, value] of this.entries()) {
      obj[key] = String(value)
    }
    if (!env) { return obj }

    for (const [key, value] of Object.entries(env)) {
      obj[`${this.appPrefix}${key}`] = String(value)
    }

    return obj
  }
}
