import { Secret } from 'aws-cdk-lib/aws-ecs'
import { StringParameter } from 'aws-cdk-lib/aws-ssm'
import type { Construct } from 'constructs'
import type { INameGenerator } from '../util/gen'

type ParameterStoreRef = string

export class ServiceSecrets extends Map<string, Secret> {
  static readonly DEFAULT_APP_PREFIX: string = ''
  private readonly _delimiter = '_'
  private readonly appPrefix = ServiceSecrets.DEFAULT_APP_PREFIX

  constructor(appPrefix = '') {
    super()
    if (appPrefix !== ServiceSecrets.DEFAULT_APP_PREFIX) {
      this.appPrefix = `${appPrefix}${this._delimiter}`
    }
  }

  set(key: string, value: Secret): this {
    return super.set(`${this.appPrefix}${key}`, value)
  }

  get(key: string): Secret | undefined {
    return super.get(`${this.appPrefix}${key}`)
  }

  apply(env?: Record<string, Secret>): Record<string, Secret> {
    const obj: Record<string, Secret> = {}

    for (const [key, value] of this.entries()) {
      obj[key] = value
    }
    if (!env) { return obj }

    for (const [key, value] of Object.entries(env)) {
      obj[`${this.appPrefix}${key}`] = value
    }

    return obj
  }
}

export function resolveServiceSecrets(
  ctx: INameGenerator,
  scope: Construct,
  secrets?: Record<string, ParameterStoreRef>,
): Record<string, Secret> {
  const obj: Record<string, Secret> = {}

  if (!secrets) { return obj }

  for (const [key, ref] of Object.entries(secrets)) {
    const ssmParam = StringParameter.fromSecureStringParameterAttributes(
      scope,
      ctx.generateId(`secret-${key}`),
      { parameterName: ref },
    )
    obj[key] = Secret.fromSsmParameter(ssmParam)
  }

  return obj
}
