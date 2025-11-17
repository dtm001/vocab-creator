/**
 * Simple script to create a test pack and deck
 * Run with: npx ts-node src/scripts/create-test-deck.ts
 */

const Database = require('better-sqlite3');
const { drizzle } = require('drizzle-orm/better-sqlite3');
const { packs, decks } = require('../database/schema');

async function createTestDeck() {
  console.log('Creating test pack and deck...');

  const sqlite = new Database('flashcards.db');
  const db = drizzle(sqlite);

  try {
    // Create a pack
    const [pack] = await db
      .insert(packs)
      .values({ name: 'German A1' })
      .returning();
    console.log('✅ Created pack:', pack);

    // Create a deck
    const [deck] = await db
      .insert(decks)
      .values({
        name: 'Basic Verbs',
        description: 'Common German verbs for beginners',
        packId: pack.id,
      })
      .returning();
    console.log('✅ Created deck:', deck);

    console.log('\n🎯 Use this deckId for testing:');
    console.log(deck.id);
    console.log('\n📝 Example API call:');
    console.log(
      `curl "http://localhost:3000/api/process/%2Fpath%2Fto%2Ftest.csv?deckId=${deck.id}"`,
    );
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    sqlite.close();
  }
}

createTestDeck();
