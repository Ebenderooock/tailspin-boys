/*
 * Unit tests for category data-access helpers.
 *
 * The tests verify that category options are returned in deterministic order
 * from a migrated in-memory SQLite database.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories } from '../../db/schema';
import type { Database } from './db';
import { getAllCategories } from './categories';

describe('category data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns categories ordered by name', async () => {
        await db.insert(categories).values([
            { name: 'Strategy', description: 'Strategy games' },
            { name: 'Action', description: 'Action games' },
            { name: 'Puzzle', description: 'Puzzle games' },
        ]);

        const all = await getAllCategories(db);

        expect(all).toEqual([
            { id: expect.any(Number), name: 'Action' },
            { id: expect.any(Number), name: 'Puzzle' },
            { id: expect.any(Number), name: 'Strategy' },
        ]);
    });
});
