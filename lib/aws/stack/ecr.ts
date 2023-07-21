import * as cdk from 'aws-cdk-lib'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import type { Environment } from '../config/env'
import type { INameGenerator } from '../util/gen'
import { setDefaultTags } from '../util/tag'
import type { IContainerRegistry, IServiceConfig } from '../config/app'
import type { StackProps } from './props'

interface IContext extends INameGenerator {
  readonly appName: string
  readonly environment: Environment
}

interface ECRProps extends StackProps {
  config: {
    readonly api: IServiceConfig
  }
}

export class ECR extends cdk.Stack {
  readonly api: ecr.Repository

  constructor(
    ctx: IContext,
    app: cdk.App,
    id: string,
    props: ECRProps,
  ) {
    super(app, id, {
      description: 'This stack includes ECR repository definitions',
      ...props,
    })
    setDefaultTags(ctx, this)

    this.api = this.createECR('api', props.config.api.image.registry)
  }

  private createECR(id: string, containerRegistryConfig: IContainerRegistry): ecr.Repository {
    return new ecr.Repository(this, id, {
      repositoryName: containerRegistryConfig.name,
      lifecycleRules: [
        {
          maxImageCount: containerRegistryConfig.lifecyclePolicies.keepUntaggedImagesCount,
          description: `Keep only last ${containerRegistryConfig.lifecyclePolicies.keepUntaggedImagesCount} untagged images`,
          tagStatus: ecr.TagStatus.UNTAGGED,
        },
      ],
    })
  }
}
