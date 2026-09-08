/*
 * Category lookups used by the static Astro pages.
 *
 * These helpers read the category table at build time and expose only the
 * fields required to render catalog filter controls.
 */
import { asc } from 'drizzle-orm';
import type { Database } from './db';
import { categories } from '../../db/schema';
import type { Category } from '../types/game';

/**
 * Retrieves all categories from the catalog ordered alphabetically by name.
 *
 * @param db - the configured database connection used for the current build.
 * @returns a promise that resolves to each category's identifier and display name.
 */
export async function getAllCategories(db: Database): Promise<Category[]> {
    return db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .orderBy(asc(categories.name));
}
