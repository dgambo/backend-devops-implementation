import type * as cdk from 'aws-cdk-lib'
import type { Environment } from '../config/env'

interface IContext {
  readonly appName: string
  readonly environment: Environment
}

export function setDefaultTags(ctx: IContext, obj: cdk.ITaggable): void {
  obj.tags.setTag('Project', ctx.appName)
  obj.tags.setTag('Environment', ctx.environment.name)
}
