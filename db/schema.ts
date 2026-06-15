import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core'

export const sourceFragments = pgTable('source_fragments', {
  id: uuid('id').primaryKey().defaultRandom(),
  rawText: text('raw_text').notNull(),
  sourceType: text('source_type').notNull(), // book | article | personal | web | other
  title: text('title'),
  author: text('author'),
  citation: text('citation'),
  url: text('url'),
  personalContext: text('personal_context'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const thoughtObjects = pgTable('thought_objects', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceFragmentId: uuid('source_fragment_id')
    .notNull()
    .references(() => sourceFragments.id),
  rawText: text('raw_text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const worldviewAxes = pgTable('worldview_axes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  minLabel: text('min_label').notNull(),
  maxLabel: text('max_label').notNull(),
  description: text('description'),
  displayOrder: integer('display_order').notNull().default(0),
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // soft delete only
})
