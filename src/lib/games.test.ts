/*
 * Unit tests for game catalog data-access helpers.
 *
 * The tests exercise ordering, lookups, and filter combinations against a
 * migrated in-memory SQLite database.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getGames,
} from './games';

interface FixtureGameInput {
    title: string;
    category: string;
    publisher: string;
}

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

async function seedFilterFixtures(db: Database): Promise<Record<string, number>> {
    const [strategy, puzzle, simulation] = await Promise.all([
        db.insert(categories).values({ name: 'Strategy', description: 'cat' }).returning({ id: categories.id }),
        db.insert(categories).values({ name: 'Puzzle', description: 'cat' }).returning({ id: categories.id }),
        db.insert(categories).values({ name: 'Simulation', description: 'cat' }).returning({ id: categories.id }),
    ]);
    const [codeForge, gitHubGames, opsInteractive] = await Promise.all([
        db.insert(publishers).values({ name: 'CodeForge', description: 'pub' }).returning({ id: publishers.id }),
        db.insert(publishers).values({ name: 'GitHub Games', description: 'pub' }).returning({ id: publishers.id }),
        db.insert(publishers).values({ name: 'Ops Interactive', description: 'pub' }).returning({ id: publishers.id }),
    ]);

    const ids = {
        strategy: strategy[0].id,
        puzzle: puzzle[0].id,
        simulation: simulation[0].id,
        codeForge: codeForge[0].id,
        gitHubGames: gitHubGames[0].id,
        opsInteractive: opsInteractive[0].id,
    };

    const fixtures: FixtureGameInput[] = [
        { title: 'Alpha Strategy', category: 'Strategy', publisher: 'CodeForge' },
        { title: 'Beta Puzzle', category: 'Puzzle', publisher: 'CodeForge' },
        { title: 'Delta Simulation', category: 'Simulation', publisher: 'GitHub Games' },
        { title: 'Gamma Strategy', category: 'Strategy', publisher: 'Ops Interactive' },
    ];

    const categoryIds = new Map<string, number>([
        ['Strategy', ids.strategy],
        ['Puzzle', ids.puzzle],
        ['Simulation', ids.simulation],
    ]);
    const publisherIds = new Map<string, number>([
        ['CodeForge', ids.codeForge],
        ['GitHub Games', ids.gitHubGames],
        ['Ops Interactive', ids.opsInteractive],
    ]);

    for (const fixture of fixtures) {
        await db.insert(games).values({
            title: fixture.title,
            description: `${fixture.title} description`,
            starRating: 4.2,
            categoryId: categoryIds.get(fixture.category)!,
            publisherId: publisherIds.get(fixture.publisher)!,
        });
    }

    return ids;
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('returns all games when filters are empty', async () => {
        await seedFilterFixtures(db);
        const filtered = await getGames(db, { categoryIds: [], publisherIds: [] });
        expect(filtered.map((game) => game.title)).toEqual([
            'Alpha Strategy',
            'Beta Puzzle',
            'Delta Simulation',
            'Gamma Strategy',
        ]);
    });

    it('filters games by one category', async () => {
        const ids = await seedFilterFixtures(db);
        const filtered = await getGames(db, { categoryIds: [ids.strategy] });
        expect(filtered.map((game) => game.title)).toEqual(['Alpha Strategy', 'Gamma Strategy']);
    });

    it('filters games by multiple categories using OR semantics', async () => {
        const ids = await seedFilterFixtures(db);
        const filtered = await getGames(db, { categoryIds: [ids.strategy, ids.puzzle] });
        expect(filtered.map((game) => game.title)).toEqual([
            'Alpha Strategy',
            'Beta Puzzle',
            'Gamma Strategy',
        ]);
    });

    it('filters games by one publisher', async () => {
        const ids = await seedFilterFixtures(db);
        const filtered = await getGames(db, { publisherIds: [ids.codeForge] });
        expect(filtered.map((game) => game.title)).toEqual(['Alpha Strategy', 'Beta Puzzle']);
    });

    it('filters games by multiple publishers using OR semantics', async () => {
        const ids = await seedFilterFixtures(db);
        const filtered = await getGames(db, { publisherIds: [ids.gitHubGames, ids.opsInteractive] });
        expect(filtered.map((game) => game.title)).toEqual(['Delta Simulation', 'Gamma Strategy']);
    });

    it('combines category and publisher filters using AND semantics', async () => {
        const ids = await seedFilterFixtures(db);
        const filtered = await getGames(db, {
            categoryIds: [ids.strategy, ids.puzzle],
            publisherIds: [ids.opsInteractive],
        });
        expect(filtered.map((game) => game.title)).toEqual(['Gamma Strategy']);
    });

    it('returns an empty collection when no games match the filters', async () => {
        const ids = await seedFilterFixtures(db);
        const filtered = await getGames(db, {
            categoryIds: [ids.puzzle],
            publisherIds: [ids.opsInteractive],
        });
        expect(filtered).toEqual([]);
    });
});
