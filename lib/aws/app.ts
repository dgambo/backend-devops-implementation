import * as cdk from 'aws-cdk-lib'
import type { IConfig } from './config/app'
import type { Context } from './ctx'
import { Cluster } from './stack/cluster'
import { Database } from './stack/database'
import { IAM } from './stack/iam'
import { Message } from './stack/message'
import { Network } from './stack/network'
import { Service } from './stack/service'
import { ECR } from './stack/ecr'

export class App extends cdk.App {
  readonly config: IConfig

  constructor(ctx: Context, config: IConfig, props?: cdk.AppProps) {
    super(props)
    this.config = config

    const env = ctx.environment

    // The IAM stack is shared across environments.
    ctx.iam = new IAM(ctx, this, `${ctx.appName}IAM`, { env, terminationProtection: true })

    /* Network and Clusters */

    ctx.network = new Network(ctx, this, ctx.generateId('network'), { env })

    ctx.cluster = new Cluster(ctx, this, ctx.generateId('cluster'), { env })

    /* Storage and Database */

    ctx.ecr = new ECR(ctx, this, `${ctx.appName}ECR`, { env, config: this.config.service })

    ctx.database = new Database(ctx, this, ctx.generateId('database'), { env })

    /* Services */

    ctx.message = new Message(ctx, this, ctx.generateId('message'), { env })

    ctx.service = new Service(ctx, this, ctx.generateId('service'), { env, config: this.config.service })
  }
}
