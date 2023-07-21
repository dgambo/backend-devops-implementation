import * as cdk from 'aws-cdk-lib'
import * as iam from 'aws-cdk-lib/aws-iam'
import type { Environment } from '../config/env'
import type { INameGenerator } from '../util/gen'
import type { StackProps } from './props'

interface IContext extends INameGenerator {
  readonly appName: string
  readonly environment: Environment
}

export enum RoleName {
  CICD = 'CICD',
}

export class IAM extends cdk.Stack {
  private _roles: Map<string, iam.Role>

  constructor(
    ctx: IContext,
    app: cdk.App,
    id: string,
    props?: StackProps,
  ) {
    super(app, id, {
      description: 'This stack includes IAM resources, such as: Roles, Policies, Groups and Users.',
      ...props,
    })
    this.tags.setTag('Project', ctx.appName)

    /* Groups */

    const devGrp = new iam.Group(this, 'Group::Developer', {
      groupName: 'Developer',
    })

    devGrp.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonRoute53ReadOnlyAccess'))

    const logReaderGrp = new iam.Group(this, 'Group::LogReader', {
      groupName: 'LogReader',
    })

    /* Users */

    const ciUsr = new iam.User(this, 'User::CICD', {
      userName: 'ci@strv.com',
    })

    /* Roles */

    const ciRol = new iam.Role(this, 'Role::CICD', {
      roleName: RoleName.CICD,
      assumedBy: new iam.CompositePrincipal(
        new iam.WebIdentityPrincipal(`arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`, {
          StringLike: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
            /* HINT: Modify this value to match your GitHub repository of needed. */
            'token.actions.githubusercontent.com:sub': 'repo:strvcom/*',
          },
        }),
        new iam.ArnPrincipal(ciUsr.userArn),
      ),
      description: 'A role assumed by CI/CD pipelines.',
    })

    /* Policies */

    new iam.Policy(this, 'Policy::CI', {
      policyName: 'CI',
      statements: [
        new iam.PolicyStatement({
          actions: [
            /* HINT: Add your CD permissions here. */
            'secretsmanager:*',
          ],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.DENY,
          actions: [
            /* HINT: Add your CD permissions here. */
            'secretsmanager:Delete*',
            'secretsmanager:Update*',
          ],
          resources: ['*'],
        }),
      ],
      users: [ciUsr],
      roles: [ciRol],
    })

    new iam.Policy(this, 'Policy::CD', {
      policyName: 'CD',
      statements: [
        new iam.PolicyStatement({
          actions: [
            /* HINT: Add your CD permissions here. */
            'iam:*',
            'cloudformation:*',
            'cloudwatch:*',
            'secretsmanager:*',
            'ssm:*',
            'ecr:*',
            'ecs:*',
            'lambda:*',
            'rds:*',
            's3:*',
            's3-object-lambda:*',
            'sns:*',
            'sqs:*',
            'tag:*',
          ],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.DENY,
          actions: [
            // This will require human intervention to approve the deletion.
            'cloudformation:DeleteStack',
          ],
          resources: ['*'],
        }),
      ],
      users: [ciUsr],
      roles: [ciRol],
    })

    new iam.Policy(this, 'Policy::Developer', {
      policyName: 'Developer',
      statements: [
        new iam.PolicyStatement({
          actions: [
            'iam:GetRole',
            'iam:PassRole',
            'iam:ListRoles',
            'iam:GetAccountPasswordPolicy',
          ],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          actions: [
            'execute-api:Invoke',
            'execute-api:ManageConnections',
          ],
          resources: [
            'arn:aws:execute-api:*:*:*',
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.DENY,
          actions: [
            'cloudformation:DeleteStack',
            'cloudformation:UpdateStack',
          ],
          resources: [
            'arn:aws:cloudformation:*:*:stack/IAM/*',
          ],
        }),
        new iam.PolicyStatement({
          actions: [
            /* HINT: Add your Developer permissions here. */
            'application-autoscaling:*',
            'cloudformation:*',
            'cloudwatch:*',
            'elasticloadbalancing:*',
            'secretsmanager:*',
            'ssm:*',
            'ecr:*',
            'ecs:*',
            'lambda:*',
            'logs:*',
            'mediaconvert:*',
            'rds:*',
            'sns:*',
            'sqs:*',
            'tag:GetResources',
            's3:*',
            's3-object-lambda:*',
          ],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          actions: [
            /* HINT: Add your Developer permissions here. */
            'acm:Get*',
            'acm:Read*',
            'acm:List*',
            'acm:Describe*',
          ],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          actions: [
            /* HINT: Add your Developer permissions here. */
            'ec2:Get*',
            'ec2:Read*',
            'ec2:List*',
            'ec2:Describe*',
          ],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          actions: [
            /* HINT: Add your Developer permissions here. */
            '*',
          ],
          resources: [
            'arn:aws:ec2:*:*:client-vpn-endpoint/*',
          ],
        }),
        new iam.PolicyStatement({
          actions: [
            /* HINT: Add your Developer permissions here. */
            /* Access Keys https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html */
            'iam:CreateAccessKey',
            'iam:DeleteAccessKey',
            'iam:GetAccessKeyLastUsed',
            'iam:GetUser',
            'iam:ListAccessKeys',
            'iam:UpdateAccessKey',
            'iam:TagUser',
            'iam:ListUserTags', // access key description
            /* MFA https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_iam_mfa-selfmanage.html */
            'iam:DeactivateMFADevice',
            'iam:EnableMFADevice',
            'iam:ListMFADevices',
            'iam:ResyncMFADevice',
            /* Console Password https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_passwords_enable-user-change.html */
            'iam:GetLoginProfile',
            'iam:ChangePassword',
          ],
          resources: [
            'arn:aws:iam::*:user/${aws:username}'
          ],
        }),
      ],
      groups: [devGrp],
    })

    new iam.Policy(this, 'Policy::LogReader', {
      policyName: 'LogReader',
      statements: [
        new iam.PolicyStatement({
          actions: [
            // https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/iam-identity-based-access-control-cwl.html
            'logs:describeLogGroups', // Lists the specified log groups.
            'logs:describeLogStreams', // Lists the log streams for the specified log group.
            'logs:filterLogEvents', // Lists log events from the specified log group. You can list all the log events or filter the results using a filter pattern, a time range, and the name of the log stream.
            'logs:getLogEvents', // Lists log events from the specified log stream. You can list all of the log events or filter using a time range.
            'logs:getLogGroupFields', // Returns a list of the fields that are included in log events in the specified log group.
            'logs:getLogRecord', // Retrieves all of the fields and values of a single log event.
          ],
          resources: [
            'arn:aws:logs:*:*:*',
          ],
        }),
      ],
      groups: [logReaderGrp],
    })

    /* Mappings */

    this._roles = new Map([
      [RoleName.CICD, ciRol],
    ])
  }

  getRole(roleName: string): iam.Role {
    const role = this._roles.get(roleName)
    if (!role) { throw new Error(`Role ${String(roleName)} is not defined.`) }

    return role
  }
}
