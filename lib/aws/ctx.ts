import type * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns'
import type * as ec2 from 'aws-cdk-lib/aws-ec2'
import type * as ecs from 'aws-cdk-lib/aws-ecs'
import type * as iam from 'aws-cdk-lib/aws-iam'
import type * as rds from 'aws-cdk-lib/aws-rds'
import type * as sns from 'aws-cdk-lib/aws-sns'
import type * as sqs from 'aws-cdk-lib/aws-sqs'
import type * as ecr from 'aws-cdk-lib/aws-ecr'
import type { Environment } from './config/env'
import { NameGenerator } from './util/gen'


export interface IIAMStack {
  getRole(role: string): iam.IRole
}

export interface IECRStack {
  readonly api: ecr.Repository
}

export interface IDatabaseStack {
  api: rds.DatabaseCluster
}

export interface INetworkStack {
  readonly vpc: ec2.IVpc
}

export interface IClusterStack {
  readonly ecs: ecs.ICluster
}

export interface IMessageStack {
  getTopic(key: string): sns.ITopic
  getQueue(key: string): sqs.IQueue
}

export interface IServiceStack {
  readonly api: ecs_patterns.ApplicationLoadBalancedFargateService
}

export class Context {
  readonly appName: string
  readonly environment: Environment

  protected _iam?: IIAMStack
  protected _ecr?: IECRStack
  protected _cluster?: IClusterStack
  protected _network?: INetworkStack
  protected _database?: IDatabaseStack
  protected _message?: IMessageStack
  protected _service?: IServiceStack

  private _namegn: NameGenerator

  constructor(appName: string, environment: Environment) {
    this._namegn = new NameGenerator(appName, environment.name)

    this.appName = appName
    this.environment = environment
  }

  get iam(): IIAMStack {
    if (!this._iam) { throw new Error('iam stack is undefined.') }
    return this._iam
  }

  set iam(stack: IIAMStack) {
    if (this._iam) { throw new Error('iam stack is already defined.') }
    this._iam = stack
  }

  get ecr(): IECRStack {
    if (!this._ecr) { throw new Error('ecr stack is undefined.') }
    return this._ecr
  }

  set ecr(stack: IECRStack) {
    if (this._ecr) { throw new Error('ecr stack is already defined.') }
    this._ecr = stack
  }

  get cluster(): IClusterStack {
    if (!this._cluster) { throw new Error('cluster stack is undefined.') }
    return this._cluster
  }

  set cluster(stack: IClusterStack) {
    if (this._cluster) { throw new Error('cluster stack is already defined.') }
    this._cluster = stack
  }

  get network(): INetworkStack {
    if (!this._network) { throw new Error('network stack is undefined.') }
    return this._network
  }

  set network(stack: INetworkStack) {
    if (this._network) { throw new Error('network stack is already defined.') }
    this._network = stack
  }

  get database(): IDatabaseStack {
    if (!this._database) { throw new Error('database stack is undefined.') }
    return this._database
  }

  set database(stack: IDatabaseStack) {
    if (this._database) { throw new Error('database stack is already defined.') }
    this._database = stack
  }

  get message(): IMessageStack {
    if (!this._message) { throw new Error('message stack is undefined.') }
    return this._message
  }

  set message(stack: IMessageStack) {
    if (this._message) { throw new Error('message stack is already defined.') }
    this._message = stack
  }

  get service(): IServiceStack {
    if (!this._service) { throw new Error('service stack is undefined.') }
    return this._service
  }

  set service(stack: IServiceStack) {
    if (this._service) { throw new Error('service stack is already defined.') }
    this._service = stack
  }

  generateId(key: string): string {
    return this._namegn.generateId(key)
  }

  generateName(key: string): string {
    return this._namegn.generateName(key)
  }

  generatePath(key: string): string {
    return this._namegn.generatePath(key)
  }
}
