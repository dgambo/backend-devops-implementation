import * as cdk from 'aws-cdk-lib'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as sqs from 'aws-cdk-lib/aws-sqs'
import type { Environment } from '../config/env'
import type { INameGenerator } from '../util/gen'
import { setDefaultTags } from '../util/tag'
import type { StackProps } from './props'

export enum MessageTopicKey {
  // HINT: Add custom message topics here.
  APPLICATION = 'application',
}

export enum MessageQueueKey {
  // HINT: Add custom message topics here.
  NOTIFICATIONS = 'notifications',
}

interface IContext extends INameGenerator {
  readonly appName: string
  readonly environment: Environment
}

export class Message extends cdk.Stack {
  protected _topics: Map<MessageTopicKey, sns.ITopic>
  protected _queues: Map<MessageQueueKey, sqs.IQueue>

  constructor(
    ctx: IContext,
    app: cdk.App,
    id: string,
    props?: StackProps,
  ) {
    super(app, id, {
      description: 'This stack includes message resources, such as: SQS Queues, SNS Topics, and their subscriptions.',
      ...props,
    })
    setDefaultTags(ctx, this)

    /* Topics */

    const applicationTopic = new sns.Topic(
      this,
      ctx.generateId('topic-application'),
      { topicName: ctx.generateName(MessageTopicKey.APPLICATION.toString()) },
    )

    this._topics = new Map<MessageTopicKey, sns.ITopic>([
      [MessageTopicKey.APPLICATION, applicationTopic],
    ])

    /* Queues */

    const queueNS = new sqs.Queue(
      this,
      ctx.generateId('queue-notifications'),
      {
        queueName: ctx.generateName('queue-ns'),
      },
    )

    this._queues = new Map<MessageQueueKey, sqs.IQueue>([
      // HINT: Add custom message queues here.
      [MessageQueueKey.NOTIFICATIONS, queueNS],
    ])
    for (const [, queue] of this._queues) {
      queue.grantSendMessages(new iam.ServicePrincipal('sns.amazonaws.com'))
    }

    /* Subscriptions */

    new sns.Subscription(this, ctx.generateId('subscription-application-api'), {
      topic: applicationTopic,
      protocol: sns.SubscriptionProtocol.SQS,
      endpoint: queueNS.queueArn,
      filterPolicy: {
        op_code: sns.SubscriptionFilter.stringFilter({
          allowlist: [
            'USER_CREATED',
            'USER_PASSWORD_RESET',
          ],
        }),
      },
    })
  }

  getTopic(key: MessageTopicKey): sns.ITopic {
    const topic = this._topics.get(key)
    if (!topic) { throw new Error(`Topic ${String(key)} is not defined.`) }

    return topic
  }

  getQueue(key: MessageQueueKey): sqs.IQueue {
    const queue = this._queues.get(key)
    if (!queue) { throw new Error(`Queue ${String(key)} is not defined.`) }

    return queue
  }
}
