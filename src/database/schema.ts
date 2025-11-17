import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

/**
 * Packs table - Top level container for decks
 */
export const packs = sqliteTable('packs', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Decks table - Container for cards, belongs to a pack
 */
export const decks = sqliteTable('decks', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  packId: text('pack_id')
    .notNull()
    .references(() => packs.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Cards table - Individual flashcards with question/answer
 */
export const cards = sqliteTable('cards', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  // Core fields
  name: text('name').notNull(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  prompt: text('prompt').notNull(),

  // Markdown fields for question
  qMdBody: text('q_md_body'),
  qMdClarifier: text('q_md_clarifier'),
  qMdFootnote: text('q_md_footnote'),
  qMdPrompt: text('q_md_prompt'),

  // Markdown fields for answer
  aMdBody: text('a_md_body'),
  aMdClarifier: text('a_md_clarifier'),
  aMdFootnote: text('a_md_footnote'),
  aMdPrompt: text('a_md_prompt'),

  // Foreign key
  deckId: text('deck_id')
    .notNull()
    .references(() => decks.id, { onDelete: 'cascade' }),

  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Define relationships
export const packsRelations = relations(packs, ({ many }) => ({
  decks: many(decks),
}));

export const decksRelations = relations(decks, ({ one, many }) => ({
  pack: one(packs, {
    fields: [decks.packId],
    references: [packs.id],
  }),
  cards: many(cards),
}));

export const cardsRelations = relations(cards, ({ one }) => ({
  deck: one(decks, {
    fields: [cards.deckId],
    references: [decks.id],
  }),
}));

// Export types for use in application
export type Pack = typeof packs.$inferSelect;
export type NewPack = typeof packs.$inferInsert;

export type Deck = typeof decks.$inferSelect;
export type NewDeck = typeof decks.$inferInsert;

export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
