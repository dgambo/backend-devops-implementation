import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Construct } from 'constructs'
import type { IVPNConfig } from '../config/app'
import type { Environment } from '../config/env'
import type { INameGenerator } from '../util/gen'
import { setDefaultTags } from '../util/tag'
import type { StackProps } from './props'

interface IContext extends INameGenerator {
  readonly appName: string
  readonly environment: Environment
}

interface NetworkStackProps extends StackProps {
  readonly vpn?: IVPNConfig
}

export class Network extends cdk.Stack {
  readonly vpc: ec2.IVpc

  constructor(
    ctx: IContext,
    app: cdk.App,
    id: string,
    props?: NetworkStackProps,
  ) {
    super(app, id, {
      description: 'This stack includes network resources, such as: VPC and VPN.',
      ...props,
    })
    setDefaultTags(ctx, this)

    this.vpc = new ec2.Vpc(this, ctx.generateId('default-vpc'), {
      vpcName: ctx.generateName('vpc'),
      maxAzs: 2,
      // HINT: Change the CIDR range to fit your needs.
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/22'),
      subnetConfiguration: [
        // NOTE: Both public and private subnets are required for Fargate.
        {
          name: 'Public',
          cidrMask: 26,
          subnetType: ec2.SubnetType.PUBLIC,
        },
        // NOTE: Public subnet requires EIP and EGRESS Gateway and consumes quota.
        {
          name: 'PrivateWithEgress',
          cidrMask: 26,
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        // NOTE: At least 2 subnets are required by Aurora RDS cluster.
        {
          name: 'PrivateIsolated',
          cidrMask: 26,
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      /* HINT: Customize your VPC properties here. */
    })

    if (props?.vpn) {
      new VPN(ctx, this, ctx.generateId('vpn'), {
        vpc: this.vpc,
        vpcSubnets: { subnets: this.vpc.privateSubnets },
        certificate: props.vpn.certificate,
      })
    }
  }
}

export class VPN extends Construct {
  constructor(
    ctx: INameGenerator,
    scope: Construct,
    id: string,
    props: {
      vpc: ec2.IVpc
      vpcSubnets?: ec2.SubnetSelection
      certificate: {
        readonly serverArn: string
        readonly clientArn: string
      }
    },
  ) {
    super(scope, id)

    const securityGroup = new ec2.SecurityGroup(this, ctx.generateId('security-group-vpn'), {
      vpc: props.vpc,
      description: 'Developer VPN security group',
    })
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.udp(443))

    const logGroup = new LogGroup(this, ctx.generateId('log-group-vpn'), {
      /* HINT: Configure retention of your VPN logs. */
      retention: RetentionDays.ONE_MONTH,
    })

    const endpoint = new ec2.ClientVpnEndpoint(this, ctx.generateId('endpoint-vpn'), {
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      description: 'VPN Endpoint for developers to access private services.',
      cidr: '192.168.128.0/22',
      securityGroups: [securityGroup],
      splitTunnel: true,
      logging: true,
      logGroup,
      logStream: logGroup.addStream(ctx.generateId('log-stream-vpn')),
      serverCertificateArn: props.certificate.serverArn,
      clientCertificateArn: props.certificate.clientArn,
      // NOTE: The DNS server is allocated by AWS at the bottom of the CIDR range + 2.
      dnsServers: ['10.0.0.2'],
    })

    // Optional: Add authorization rule.
    // endpoint.addAuthorizationRule('AuthorizationRule::VPN', {
    //   cidr: props.vpc.vpcCidrBlock,
    //   groupId: 'VPN',
    //   description: 'Allow VPN clients to access private services.',
    // })

    new cdk.CfnOutput(this, ctx.generateId('vpn-endpoint'), {
      value: endpoint.endpointId,
    })
  }
}
