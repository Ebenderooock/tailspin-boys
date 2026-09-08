/*
 * End-to-end tests for catalog listing, navigation, details, and filtering.
 *
 * These tests verify user-visible behavior against the built static site.
 */
import { test, expect, type Response } from '@playwright/test';

test.describe('Game Listing and Navigation', () => {
  test('should display games with titles on index page', async ({ page }) => {
    await test.step('Navigate to homepage', async () => {
      await page.goto('/');
    });

    await test.step('Verify games grid is visible', async () => {
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Verify game cards are displayed', async () => {
      const gameCards = page.getByTestId('game-card');
      await expect(gameCards.first()).toBeVisible();
      expect(await gameCards.count()).toBeGreaterThan(0);
    });

    await test.step('Verify game cards have titles with content', async () => {
      const gameCards = page.getByTestId('game-card');
      await expect(gameCards.first().getByTestId('game-title')).toBeVisible();
      await expect(gameCards.first().getByTestId('game-title')).not.toBeEmpty();
    });
  });

  test('should navigate to correct game details page when clicking on a game', async ({ page }) => {
    let gameId: string | null;
    let gameTitle: string | null;

    await test.step('Navigate to homepage and wait for games to load', async () => {
      await page.goto('/');
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Get first game information and click it', async () => {
      const firstGameCard = page.getByTestId('game-card').first();
      gameId = await firstGameCard.getAttribute('data-game-id');
      gameTitle = await firstGameCard.getAttribute('data-game-title');
      await firstGameCard.click();
    });

    await test.step('Verify navigation to game details page', async () => {
      await expect(page).toHaveURL(`/game/${gameId}`);
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify game title matches clicked game', async () => {
      if (gameTitle) {
        await expect(page.getByTestId('game-details-title')).toHaveText(gameTitle);
      }
    });
  });

  test('should display game details with all required information', async ({ page }) => {
    await test.step('Navigate to specific game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify game title is displayed', async () => {
      const gameTitle = page.getByTestId('game-details-title');
      await expect(gameTitle).toBeVisible();
      await expect(gameTitle).not.toBeEmpty();
    });

    await test.step('Verify game description is displayed', async () => {
      const gameDescription = page.getByTestId('game-details-description');
      await expect(gameDescription).toBeVisible();
      await expect(gameDescription).not.toBeEmpty();
    });

    await test.step('Verify publisher or category information is present', async () => {
      const publisherExists = await page.getByTestId('game-details-publisher').isVisible();
      const categoryExists = await page.getByTestId('game-details-category').isVisible();
      expect(publisherExists || categoryExists).toBeTruthy();

      if (publisherExists) {
        await expect(page.getByTestId('game-details-publisher')).not.toBeEmpty();
      }

      if (categoryExists) {
        await expect(page.getByTestId('game-details-category')).not.toBeEmpty();
      }
    });
  });

  test('should display a button to back the game', async ({ page }) => {
    await test.step('Navigate to game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify back game button is visible and enabled', async () => {
      const backButton = page.getByTestId('back-game-button');
      await expect(backButton).toBeVisible();
      await expect(backButton).toContainText('Support This Game');
      await expect(backButton).toBeEnabled();
    });
  });

  test('should be able to navigate back to home from game details', async ({ page }) => {
    await test.step('Navigate to game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Click back to all games link', async () => {
      const backLink = page.getByRole('link', { name: /back to all games/i });
      await expect(backLink).toBeVisible();
      await backLink.click();
    });

    await test.step('Verify navigation back to homepage', async () => {
      await expect(page).toHaveURL('/');
      await expect(page.getByTestId('games-grid')).toBeVisible();
    });
  });

  test('should return a 404 page for a non-existent game', async ({ page }) => {
    let response: Response | null;

    await test.step('Navigate to non-existent game', async () => {
      response = await page.goto('/game/99999');
    });

    await test.step('Verify a branded 404 page is served', async () => {
      expect(response?.status()).toBe(404);
      await expect(page).toHaveTitle(/Page Not Found - Tailspin Toys/);
      await expect(page.getByTestId('not-found')).toBeVisible();
      await expect(page.getByTestId('not-found-heading')).not.toBeEmpty();
      await expect(page.getByTestId('not-found-home-link')).toBeVisible();
    });
  });
});

test.describe('Game Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('games-grid')).toBeVisible();
  });

  test('should filter games by one category', async ({ page }) => {
    await test.step('Select a category filter', async () => {
      await page.getByLabel('Strategy').check();
    });

    await test.step('Verify only that category remains visible', async () => {
      const visibleCards = page.getByTestId('game-card').filter({ visible: true });
      await expect(visibleCards).toHaveCount(4);
      await expect(visibleCards.filter({ hasText: 'DevOps Dominion' })).toHaveCount(1);
      await expect(visibleCards.filter({ hasText: 'Pipeline Conquest' })).toHaveCount(1);
      await expect(visibleCards.filter({ hasText: 'Server Siege' })).toHaveCount(1);
      await expect(visibleCards.filter({ hasText: 'Repo Rulers' })).toHaveCount(1);
      await expect(page.getByTestId('filter-results-status')).toHaveText('Showing 4 games');
      await expect(page).toHaveURL(/category=\d+/);
    });
  });

  test('should filter games by multiple categories', async ({ page }) => {
    await test.step('Select category filters', async () => {
      await page.getByLabel('Strategy').check();
      await page.getByLabel('Puzzle').check();
    });

    await test.step('Verify either selected category remains visible', async () => {
      await expect(page.getByTestId('game-card').filter({ visible: true })).toHaveCount(8);
      await expect(page.getByTestId('filter-results-status')).toHaveText('Showing 8 games');
    });
  });

  test('should filter games by multiple publishers', async ({ page }) => {
    await test.step('Select publisher filters', async () => {
      await page.getByLabel('GitHub Games').check();
      await page.getByLabel('Ops Interactive').check();
    });

    await test.step('Verify either selected publisher remains visible', async () => {
      const visibleCards = page.getByTestId('game-card').filter({ visible: true });
      await expect(visibleCards).toHaveCount(10);
      await expect(visibleCards.filter({ hasText: 'Server Siege' })).toHaveCount(1);
      await expect(visibleCards.filter({ hasText: 'Repo Rulers' })).toHaveCount(1);
      await expect(page.getByTestId('filter-results-status')).toHaveText('Showing 10 games');
      await expect(page).toHaveURL(/publisher=\d+/);
    });
  });

  test('should combine category and publisher filters', async ({ page }) => {
    await test.step('Select category and publisher filters', async () => {
      await page.getByLabel('Simulation').check();
      await page.getByLabel('CodeForge Studios').check();
      await page.getByLabel('Ops Interactive').check();
    });

    await test.step('Verify the publisher selection narrows the category results', async () => {
      const visibleCards = page.getByTestId('game-card').filter({ visible: true });
      await expect(visibleCards).toHaveCount(2);
      await expect(visibleCards.filter({ hasText: 'Virtual Server Simulator' })).toHaveCount(1);
      await expect(visibleCards.filter({ hasText: 'Deployment Dynasty' })).toHaveCount(1);
      await expect(page.getByTestId('filter-results-status')).toHaveText('Showing 2 games');
    });
  });

  test('should restore filter state from the URL and clear filters', async ({ page }) => {
    let categoryValue: string | null;
    let publisherValue: string | null;

    await test.step('Read filter identifiers from accessible controls', async () => {
      categoryValue = await page.getByLabel('Action').getAttribute('value');
      publisherValue = await page.getByLabel('CodeForge Studios').getAttribute('value');
      if (categoryValue === null || publisherValue === null) {
        throw new Error('Expected filter controls to expose category and publisher values.');
      }
    });

    await test.step('Navigate directly to a filtered URL', async () => {
      await page.goto(`/?category=${categoryValue}&publisher=${publisherValue}`);
    });

    await test.step('Verify filters and results are restored', async () => {
      await expect(page.getByLabel('Action')).toBeChecked();
      await expect(page.getByLabel('CodeForge Studios')).toBeChecked();
      await expect(page.getByTestId('game-card').filter({ visible: true })).toHaveCount(2);
      await expect(page.getByTestId('filter-results-status')).toHaveText('Showing 2 games');
    });

    await test.step('Clear filters and verify all games return', async () => {
      await page.getByRole('button', { name: 'Clear filters' }).click();
      await expect(page.getByLabel('Action')).not.toBeChecked();
      await expect(page.getByLabel('CodeForge Studios')).not.toBeChecked();
      await expect(page.getByTestId('game-card').filter({ visible: true })).toHaveCount(21);
      await expect(page.getByTestId('filter-results-status')).toHaveText('Showing 21 games');
      await expect(page).toHaveURL('/');
    });
  });

  test('should show an empty state when no games match restored filters', async ({ page }) => {
    await test.step('Navigate to a URL with a non-existent category filter', async () => {
      await page.goto('/?category=99999');
    });

    await test.step('Verify no-results feedback is shown', async () => {
      await expect(page.getByTestId('games-grid')).toBeHidden();
      await expect(page.getByTestId('filtered-empty-state')).toBeVisible();
      await expect(page.getByTestId('filtered-empty-state')).toContainText('No games match the selected filters.');
      await expect(page.getByTestId('filter-results-status')).toHaveText('Showing 0 games');
    });
  });
});
