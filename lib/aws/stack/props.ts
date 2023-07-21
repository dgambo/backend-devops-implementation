import type * as cdk from 'aws-cdk-lib'
import type { Environment } from '../config/env'

export interface StackProps extends cdk.StackProps {
  readonly env: Environment
}
