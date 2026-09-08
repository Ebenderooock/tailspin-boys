/*
 * Publisher lookups used by the static Astro pages.
 *
 * These helpers read the publisher table at build time and expose only the
 * fields required to render the storefront and detail views.
 */
import { asc } from 'drizzle-orm';
import type { Database } from './db';
import { publishers } from '../../db/schema';
import type { Publisher } from '../types/game';

/**
 * Retrieves all publishers from the catalog ordered alphabetically by name.
 *
 * @param db - the configured database connection used for the current build.
 * @returns a promise that resolves to each publisher's identifier and display name.
 */
export async function getAllPublishers(db: Database): Promise<Publisher[]> {
    return db
        .select({ id: publishers.id, name: publishers.name })
        .from(publishers)
        .orderBy(asc(publishers.name));
}
