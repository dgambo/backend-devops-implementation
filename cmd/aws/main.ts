/* eslint-disable node/no-process-env */
import { exit } from 'process'
import * as aws from '../../lib/aws'
import { Environment, EnvironmentName } from '../../lib/aws/config/env'
import { Context } from '../../lib/aws/ctx'
import { createApplicationConfig } from './config'

const envName = process.env.AWS_ENVIRONMENT

const isKnownEnvironmentName = (value?: string): value is EnvironmentName =>
  !value ? false : Object.values<string>(EnvironmentName).includes(value)

if (!isKnownEnvironmentName(envName)) {
  throw new Error('AWS environment is required, expected one of: [test, dev, stg, production].')
}
if (envName === EnvironmentName.__BOOTSTRAP) {
  exit(0)
}

const env = new Environment(envName)
const cfg = createApplicationConfig(env)
const ctx = new Context(cfg.appName, env)

new aws.App(ctx, cfg)
