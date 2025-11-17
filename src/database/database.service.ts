import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private sqlite: Database.Database;
  public db: BetterSQLite3Database<typeof schema>;

  constructor() {
    // Fix: Use 'new Database()' instead of 'new Database.default()'
    this.sqlite = new Database('flashcards.db');
    this.db = drizzle(this.sqlite, { schema });
  }

  async onModuleInit() {
    console.log('Database connected successfully');
  }

  onModuleDestroy() {
    this.sqlite.close();
  }

  getDb() {
    return this.db;
  }
}
