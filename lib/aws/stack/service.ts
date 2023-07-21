import * as cdk from 'aws-cdk-lib'
import * as cert_manager from 'aws-cdk-lib/aws-certificatemanager'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import type * as ecr from 'aws-cdk-lib/aws-ecr'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns'
import * as logs from 'aws-cdk-lib/aws-logs'
import { HostedZone } from 'aws-cdk-lib/aws-route53'
import { Secret } from 'aws-cdk-lib/aws-ecs'
import { Topic } from 'aws-cdk-lib/aws-sns'
import { Queue } from 'aws-cdk-lib/aws-sqs'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import { PropagatedTagSource } from 'aws-cdk-lib/aws-ecs'
import type { IContainerImage, IServiceConfig } from '../config/app'
import type { Environment } from '../config/env'
import { ServiceEnvironment, ServiceEnvironmentKey } from '../config/env'
import { resolveServiceSecrets, ServiceSecrets } from '../config/secret'
import type { IClusterStack, IDatabaseStack, IECRStack, IMessageStack } from '../ctx'
import type { INameGenerator } from '../util/gen'
import { setDefaultTags } from '../util/tag'
import { MessageQueueKey, MessageTopicKey } from './message'
import type { StackProps } from './props'

interface IContext extends INameGenerator {
  readonly appName: string
  readonly environment: Environment
  readonly cluster: IClusterStack
  readonly message: IMessageStack
  readonly database: IDatabaseStack
  readonly ecr: IECRStack
}

interface ServiceStackProps extends StackProps {
  config: {
    readonly api: IServiceConfig
  }
}

export class Service extends cdk.Stack {
  readonly api: ecs_patterns.ApplicationLoadBalancedFargateService

  constructor(
    ctx: IContext,
    app: cdk.App,
    id: string,
    props: ServiceStackProps,
  ) {
    super(app, id, {
      description: 'This stack includes service resources, such as: Fargate services and ECR resources.',
      ...props,
    })
    setDefaultTags(ctx, this)

    const apiTaskImageOptions = this.createTaskImageOptions(
      ctx,
      'api',
      props.config.api,
      {
        ...new ServiceEnvironment()
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          .set(ServiceEnvironmentKey.APPLICATION_TOPIC_ARN, ctx.message.getTopic(MessageTopicKey.APPLICATION).topicArn)
          .apply(props.config.api.env),
        /* HINT: Add your environment variables here. */
      },
      {
        ...new ServiceSecrets()
          .set(ServiceEnvironmentKey.DATABASE_USERNAME, Secret.fromSecretsManager(ctx.database.api.secret!, 'username'))
          .set(ServiceEnvironmentKey.DATABASE_PASSWORD, Secret.fromSecretsManager(ctx.database.api.secret!, 'password'))
          .set(ServiceEnvironmentKey.DATABASE_HOST, Secret.fromSecretsManager(ctx.database.api.secret!, 'host'))
          .set(ServiceEnvironmentKey.DATABASE_PORT, Secret.fromSecretsManager(ctx.database.api.secret!, 'port'))
          .set(ServiceEnvironmentKey.DATABASE_DB_NAME, Secret.fromSecretsManager(ctx.database.api.secret!, 'dbname'))
          .apply(resolveServiceSecrets(ctx, this, props.config.api.secrets)),
      },
    )
    this.api = this.createService(ctx, 'api', props.config.api, apiTaskImageOptions)

    /* Store parameters. */

    new ssm.StringParameter(this, ctx.generateId('parameter-api'), {
      parameterName: `/TaskDef/${this.api.service.serviceName}`,
      description: 'The task definition ARN of service.',
      stringValue: this.api.service.taskDefinition.taskDefinitionArn,
      simpleName: false,
      allowedPattern: 'arn:aws:ecs:.+',
    })

    /* Grant permissions. */

    // Topics
    Topic.fromTopicArn(this, ctx.generateId('topic-application'), ctx.message.getTopic(MessageTopicKey.APPLICATION).topicArn)
      .grantPublish(this.api.taskDefinition.taskRole)
    // Queues
    Queue.fromQueueArn(this, ctx.generateId('queue-notifications'), ctx.message.getQueue(MessageQueueKey.NOTIFICATIONS).queueArn)
      .grantSendMessages(this.api.taskDefinition.taskRole)
  }

  // eslint-disable-next-line max-params
  private createTaskImageOptions(
    ctx: IContext,
    serviceName: string,
    serviceConfig: IServiceConfig,
    environment?: { [key: string]: string },
    secrets?: { [key: string]: ecs.Secret },
  ): ecs_patterns.ApplicationLoadBalancedTaskImageOptions {
    const logDriver = new ecs.AwsLogDriver({
      /* HINT: Customize the logging driver. */
      logRetention: logs.RetentionDays.ONE_MONTH,
      streamPrefix: ctx.generateName(serviceName),
    })

    const ecsImage = this.createContainerImage(ctx.ecr.api, serviceConfig.image)

    return {
      image: ecsImage,
      environment,
      secrets,
      logDriver,
      /* HINT: Customize container name. */
      containerName: 'main',
      /* HINT: Customize additional Fargate service options. */
    }
  }

  private createService(
    ctx: IContext,
    serviceName: string,
    serviceConfig: IServiceConfig,
    taskImageOptions: ecs_patterns.ApplicationLoadBalancedTaskImageOptions,
  ): ecs_patterns.ApplicationLoadBalancedFargateService {
    const hostedZone = HostedZone.fromHostedZoneAttributes(this, ctx.generateId(`hosted-zone-${serviceName}`), {
      zoneName: serviceConfig.hostedZone.name,
      hostedZoneId: serviceConfig.hostedZone.id,
    })

    const svc = new ecs_patterns.ApplicationLoadBalancedFargateService(this, ctx.generateId(`service-${serviceName}`), {
      serviceName: ctx.generateName(serviceName),
      cluster: ctx.cluster.ecs,
      taskImageOptions,
      taskSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      certificate: new cert_manager.Certificate(this, ctx.generateId(`certificate-${serviceName}`), {
        domainName: serviceConfig.domain,
        validation: cert_manager.CertificateValidation.fromDns(hostedZone),
      }),
      domainName: serviceConfig.domain,
      domainZone: hostedZone,
      circuitBreaker: { rollback: true },
      /* HINT: Set this to true to enable the default public load balancer. */
      publicLoadBalancer: serviceConfig.publicLoadBalancer,
      propagateTags: PropagatedTagSource.SERVICE,
      enableECSManagedTags: true,
    })
    svc.targetGroup.configureHealthCheck({
      path: '/healthz',
      healthyHttpCodes: '200-204',
    })

    return svc
  }

  private createContainerImage(repo: ecr.IRepository, image: IContainerImage): ecs.ContainerImage {
    const imageTag = image.tag

    switch (image.registry.type) {
      case 'ECR':
        // NOTE: The ECR repository must be in the current region.
        return ecs.ContainerImage.fromEcrRepository(repo, imageTag)
      default:
        throw new Error(`Unsupported container registry type: ${String(image.registry.type)}`)
    }
  }
}
