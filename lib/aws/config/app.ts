export interface IConfig {
  readonly appName: string
  readonly service: {
    api: IServiceConfig
  }
  readonly vpn?: IVPNConfig
}

export interface IServiceConfig {
  readonly env?: IServiceEnvironment
  readonly secrets?: IServiceSecrets
  readonly image: IContainerImage
  readonly domain: string
  readonly hostedZone: IHostedZone
  readonly publicLoadBalancer?: boolean
}

export interface IServiceEnvironment {
  [key: string]: number | string | boolean
}

export interface IServiceSecrets {
  [key: string]: string
}

export interface IContainerImage {
  registry: IContainerRegistry
  tag: string
}

export interface IContainerRegistry {
  type: string
  name: string
  lifecyclePolicies: {
    keepUntaggedImagesCount: number
  }
}

export interface IHostedZone {
  readonly id: string
  readonly name: string
}

export interface IVPNConfig {
  certificate: {
    readonly clientArn: string
    readonly serverArn: string
  }
}
