/*
 * Game catalog data-access helpers used by static Astro pages and tests.
 *
 * These helpers keep game lookup, filtering, ordering, and row mapping in one
 * injectable database layer so pages do not depend on Drizzle row shapes.
 */
import { eq, asc, and, inArray, type SQL } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

/** Filter criteria for catalog game lookups. */
export interface GameFilters {
    /** Category identifiers to include; empty or omitted means all categories. */
    categoryIds?: readonly number[];
    /** Publisher identifiers to include; empty or omitted means all publishers. */
    publisherIds?: readonly number[];
}

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

function filterConditions(filters: GameFilters): SQL[] {
    const conditions: SQL[] = [];

    if (filters.categoryIds && filters.categoryIds.length > 0) {
        conditions.push(inArray(games.categoryId, [...filters.categoryIds]));
    }

    if (filters.publisherIds && filters.publisherIds.length > 0) {
        conditions.push(inArray(games.publisherId, [...filters.publisherIds]));
    }

    return conditions;
}

function combineConditions(conditions: SQL[]): SQL | undefined {
    if (conditions.length === 0) {
        return undefined;
    }

    if (conditions.length === 1) {
        return conditions[0];
    }

    return and(...conditions);
}

/**
 * Retrieves games ordered by title, optionally filtered by category and publisher.
 *
 * @param db - the configured database connection used for the current build or test.
 * @param filters - category and publisher identifiers used to narrow the catalog.
 * @returns a promise that resolves to matching games with category and publisher summaries.
 */
export async function getGames(db: Database, filters: GameFilters = {}): Promise<Game[]> {
    const condition = combineConditions(filterConditions(filters));
    const rows = condition
        ? await baseGamesQuery(db).where(condition).orderBy(asc(games.title))
        : await baseGamesQuery(db).orderBy(asc(games.title));

    return rows.map(mapGame);
}

/**
 * Retrieves every game ordered by title.
 *
 * @param db - the configured database connection used for the current build or test.
 * @returns a promise that resolves to all games with category and publisher summaries.
 */
export async function getAllGames(db: Database): Promise<Game[]> {
    return getGames(db);
}

/**
 * Retrieves every game id ordered by title.
 *
 * @param db - the configured database connection used for the current build or test.
 * @returns a promise that resolves to game identifiers in deterministic title order.
 */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/**
 * Retrieves a single game by id.
 *
 * @param db - the configured database connection used for the current build or test.
 * @param id - the game identifier to look up.
 * @returns a promise that resolves to the game, or null when it does not exist.
 */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}
