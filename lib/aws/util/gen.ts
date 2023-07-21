import { paramCase, pascalCase } from 'change-case'
import type { Context } from '../ctx'
import type { EnvironmentName } from '../config/env'

export interface INameGenerator {
  generateId(name: string): string
  generateName(name: string): string
  generatePath(name: string): string
}

export class NameGenerator implements INameGenerator {
  private readonly appName: string
  private readonly envName: EnvironmentName
  private _delimiter = '-'

  constructor(appName: string, envName: EnvironmentName, delimiter?: string) {
    if (delimiter) { this._delimiter = delimiter }
    this.appName = appName
    this.envName = envName
  }

  static fromContext(ctx: Context): NameGenerator {
    return new NameGenerator(ctx.appName, ctx.environment.name)
  }

  get delimiter(): string {
    return this._delimiter
  }

  set delimiter(value: string) {
    this._delimiter = value
  }

  generateId(key: string): string {
    return [this.envName, this.appName, key].map(x => pascalCase(x)).join(this.delimiter)
  }

  generateName(key: string): string {
    return [this.envName, this.appName, key].map(x => paramCase(x)).join(this.delimiter)
  }

  generatePath(key: string): string {
    return [this.envName, this.appName, key].map(x => paramCase(x)).join('/')
  }
}
