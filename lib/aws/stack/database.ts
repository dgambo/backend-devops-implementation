import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as rds from 'aws-cdk-lib/aws-rds'
import type { Environment } from '../config/env'
import type { INetworkStack } from '../ctx'
import type { INameGenerator } from '../util/gen'
import { setDefaultTags } from '../util/tag'
import type { StackProps } from './props'

interface DatabaseClusterProps {
  readonly credentials?: rds.Credentials
  readonly defaultDatabaseName?: string
}

interface IContext extends INameGenerator {
  readonly appName: string
  readonly environment: Environment
  readonly network: INetworkStack
}

export class Database extends cdk.Stack {
  readonly api: AuroraRDS

  constructor(
    ctx: IContext,
    app: cdk.App,
    id: string,
    props?: StackProps,
  ) {
    super(app, id, {
      description: 'This stack includes database resources, such as: AuroraRDS.',
      ...props,
    })
    setDefaultTags(ctx, this)

    const crdAPI = new rds.DatabaseSecret(this, ctx.generateId('rds-secret-api'), {
      username: 'admin',
      secretName: ctx.generatePath('rds-credentials-api'),
    })

    this.api = new AuroraRDS(ctx, this, ctx.generateId('rds-api'), {
      credentials: rds.Credentials.fromSecret(crdAPI),
      defaultDatabaseName: 'api',
    })
  }
}

export class AuroraRDS extends rds.DatabaseCluster {
  constructor(
    ctx: IContext,
    scope: Database,
    id: string,
    props?: DatabaseClusterProps,
  ) {
    const engine = rds.DatabaseClusterEngine.auroraPostgres({
      /* HINT: Customize the database version. */
      version: rds.AuroraPostgresEngineVersion.VER_13_7,
    })

    super(scope, id, {
      engine,
      clusterIdentifier: id,
      iamAuthentication: true,
      instances: 1,
      instanceProps: {
        /**
         * See the pricing of [Amazon RDS for PostgreSQL](https://aws.amazon.com/rds/postgresql/pricing/?pg=pr&loc=3)
         * and available AuroraDB instance types
         * [here] (https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.DBInstanceClass.html).
         */
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.T4G,
          ec2.InstanceSize.MEDIUM,
        ),
        vpc: ctx.network.vpc,
        vpcSubnets: {
          // HINT: Customize the subnet type.
          // The default subnet type is "Isolated", meaning that no public
          // subnet is created.
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      },
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
      /* HINT: Set the protection to true once setup is complete. */
      deletionProtection: false,
      /* HINT: Customize the database properties. */
      ...props,
    })

    this.connections.allowFromAnyIpv4(ec2.Port.allTraffic())
  }
}
