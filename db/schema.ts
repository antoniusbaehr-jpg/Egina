import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('records', {
 id: text('id').primaryKey(), kind: text('kind').notNull(), body: text('body').notNull(), version: integer('version').notNull().default(1), created: integer('created').notNull()
});
