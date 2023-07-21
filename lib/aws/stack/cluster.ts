import * as cdk from 'aws-cdk-lib'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import type { Environment } from '../config/env'
import type { INetworkStack } from '../ctx'
import type { INameGenerator } from '../util/gen'
import { setDefaultTags } from '../util/tag'
import type { StackProps } from './props'

interface IContext extends INameGenerator {
  readonly appName: string
  readonly environment: Environment
  readonly network: INetworkStack
}

export class Cluster extends cdk.Stack {
  readonly ecs: ecs.ICluster

  constructor(
    ctx: IContext,
    app: cdk.App,
    id: string,
    props?: StackProps,
  ) {
    super(app, id, {
      description: 'This stack includes cluster resources, such as: Cluster.',
      ...props,
    })
    setDefaultTags(ctx, this)

    if (ctx.network.vpc.vpcId === '') {
      throw new Error('network.vpc ID is empty.')
    }

    this.ecs = new ecs.Cluster(this, ctx.generateId('Cluster'), {
      clusterName: ctx.generateName('cluster'),
      vpc: ctx.network.vpc,
      containerInsights: true,
      /* HINT: Uncomment the following lines to enable lookup of existing VPCs. */
      // vpc: ec2.Vpc.fromLookup(network, network.vpc.vpcId, {
      //   // The region may be omitted if working with an environment
      //   // agnostic deployment.
      //   region: network.region,
      // }),
      /* HINT: Add custom ECS properties here. */
    })
  }
}
