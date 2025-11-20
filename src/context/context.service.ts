import { Injectable } from '@nestjs/common';

@Injectable()
export class ContextService {
  private context: Record<string, any> = {};

  set(key: string, value: any) {
    this.context[key] = value;
  }

  get<T>(key: string): T | undefined {
    return this.context[key];
  }

  clear() {
    this.context = {};
  }
}
