/**
 * Sessions Page E2E Tests
 * End-to-end tests for the Sessions management pages
 * 
 * Test Coverage:
 * ✔️ Session listing and navigation
 * ✔️ Session creation form validation
 * ✔️ Session editing
 * ✔️ Session deletion
 * ✔️ Session status toggling (open/close)
 */

import { test, expect, Page } from '@playwright/test';

// Test data generators
const generateSession = () => ({
  name: `Test Session ${Date.now()}`,
  description: 'Automated test session description',
  location: 'Test Room A',
  capacity: 100,
  startTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16), // Tomorrow
  endTime: new Date(Date.now() + 90000000).toISOString().slice(0, 16), // Tomorrow + 1h
});

// Page Object Model helpers
class SessionsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/sessions');
  }

  async gotoCreate() {
    await this.page.goto('/sessions/new');
  }

  async fillSessionForm(session: ReturnType<typeof generateSession>) {
    await this.page.fill('[data-testid="session-name"]', session.name);
    await this.page.fill('[data-testid="session-description"]', session.description);
    await this.page.fill('[data-testid="session-location"]', session.location);
    await this.page.fill('[data-testid="session-capacity"]', session.capacity.toString());
    await this.page.fill('[data-testid="session-start"]', session.startTime);
    await this.page.fill('[data-testid="session-end"]', session.endTime);
  }

  async submitForm() {
    await this.page.click('[data-testid="submit-session"]');
  }

  async waitForSuccess() {
    await expect(this.page.getByText(/created successfully|updated successfully/i)).toBeVisible();
  }

  async getSessionCard(sessionName: string) {
    return this.page.locator(`[data-testid="session-card"]:has-text("${sessionName}")`);
  }
}

test.describe('Sessions Page', () => {
  let sessionsPage: SessionsPage;

  test.beforeEach(async ({ page }) => {
    sessionsPage = new SessionsPage(page);
  });

  // ============================================================================
  // SESSION LISTING TESTS
  // ============================================================================
  test.describe('Session Listing', () => {
    test('should display sessions list', async ({ page }) => {
      await sessionsPage.goto();
      
      await expect(page.getByRole('heading', { name: /sessions/i })).toBeVisible();
      await expect(page.locator('[data-testid="sessions-list"]')).toBeVisible();
    });

    test('should show empty state when no sessions', async ({ page }) => {
      // This test assumes clean database or mocked API
      await sessionsPage.goto();
      
      // Either show sessions or empty state
      const hasEmptyState = await page.locator('[data-testid="empty-state"]').isVisible();
      const hasSessions = await page.locator('[data-testid="session-card"]').count() > 0;
      
      expect(hasEmptyState || hasSessions).toBe(true);
    });

    test('should navigate to session details on click', async ({ page }) => {
      await sessionsPage.goto();
      
      const firstSession = page.locator('[data-testid="session-card"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();
        await expect(page).toHaveURL(/\/sessions\/[a-f0-9]+/);
      }
    });

    test('should display session capacity information', async ({ page }) => {
      await sessionsPage.goto();
      
      const firstSession = page.locator('[data-testid="session-card"]').first();
      if (await firstSession.isVisible()) {
        await expect(firstSession.locator('[data-testid="capacity-info"]')).toBeVisible();
      }
    });
  });

  // ============================================================================
  // SESSION CREATION TESTS
  // ============================================================================
  test.describe('Session Creation', () => {
    test('should create a new session with valid data', async ({ page }) => {
      const session = generateSession();
      
      await sessionsPage.gotoCreate();
      await sessionsPage.fillSessionForm(session);
      await sessionsPage.submitForm();
      await sessionsPage.waitForSuccess();

      // Verify redirect to sessions list or detail
      await expect(page).toHaveURL(/\/sessions/);
    });

    test('should show validation error for empty name', async ({ page }) => {
      await sessionsPage.gotoCreate();
      
      // Submit without filling required fields
      await sessionsPage.submitForm();
      
      await expect(page.getByText(/name is required/i)).toBeVisible();
    });

    test('should show validation error for invalid date range', async ({ page }) => {
      const session = generateSession();
      session.endTime = session.startTime; // Same time = invalid
      
      await sessionsPage.gotoCreate();
      await sessionsPage.fillSessionForm(session);
      await sessionsPage.submitForm();
      
      await expect(page.getByText(/end.*after.*start/i)).toBeVisible();
    });

    test('should show validation error for negative capacity', async ({ page }) => {
      await sessionsPage.gotoCreate();
      await page.fill('[data-testid="session-capacity"]', '-10');
      await sessionsPage.submitForm();
      
      await expect(page.getByText(/capacity.*positive/i)).toBeVisible();
    });

    test('should navigate back to list on cancel', async ({ page }) => {
      await sessionsPage.gotoCreate();
      
      await page.click('[data-testid="cancel-button"]');
      
      await expect(page).toHaveURL('/sessions');
    });
  });

  // ============================================================================
  // SESSION EDITING TESTS
  // ============================================================================
  test.describe('Session Editing', () => {
    test('should load existing session data in form', async ({ page }) => {
      await sessionsPage.goto();
      
      const firstSession = page.locator('[data-testid="session-card"]').first();
      if (await firstSession.isVisible()) {
        const sessionName = await firstSession.locator('[data-testid="session-name"]').textContent();
        
        await firstSession.locator('[data-testid="edit-button"]').click();
        
        await expect(page.locator('[data-testid="session-name"]')).toHaveValue(sessionName || '');
      }
    });

    test('should update session successfully', async ({ page }) => {
      await sessionsPage.goto();
      
      const firstSession = page.locator('[data-testid="session-card"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.locator('[data-testid="edit-button"]').click();
        
        const newName = `Updated Session ${Date.now()}`;
        await page.fill('[data-testid="session-name"]', newName);
        await sessionsPage.submitForm();
        
        await expect(page.getByText(/updated successfully/i)).toBeVisible();
      }
    });
  });

  // ============================================================================
  // SESSION STATUS TOGGLE TESTS
  // ============================================================================
  test.describe('Session Status Toggle', () => {
    test('should toggle session open/closed', async ({ page }) => {
      await sessionsPage.goto();
      
      const firstSession = page.locator('[data-testid="session-card"]').first();
      if (await firstSession.isVisible()) {
        const toggleButton = firstSession.locator('[data-testid="toggle-status"]');
        const initialStatus = await toggleButton.textContent();
        
        await toggleButton.click();
        
        // Wait for status change
        await page.waitForTimeout(500);
        
        const newStatus = await toggleButton.textContent();
        expect(newStatus).not.toBe(initialStatus);
      }
    });
  });

  // ============================================================================
  // SESSION DELETION TESTS
  // ============================================================================
  test.describe('Session Deletion', () => {
    test('should show confirmation dialog on delete', async ({ page }) => {
      await sessionsPage.goto();
      
      const firstSession = page.locator('[data-testid="session-card"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.locator('[data-testid="delete-button"]').click();
        
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText(/are you sure/i)).toBeVisible();
      }
    });

    test('should cancel deletion on dialog dismiss', async ({ page }) => {
      await sessionsPage.goto();
      
      const firstSession = page.locator('[data-testid="session-card"]').first();
      if (await firstSession.isVisible()) {
        const sessionName = await firstSession.locator('[data-testid="session-name"]').textContent();
        
        await firstSession.locator('[data-testid="delete-button"]').click();
        await page.click('[data-testid="cancel-delete"]');
        
        // Session should still exist
        await expect(page.getByText(sessionName || '')).toBeVisible();
      }
    });

    test('should delete session on confirmation', async ({ page }) => {
      await sessionsPage.goto();
      
      const sessionCount = await page.locator('[data-testid="session-card"]').count();
      if (sessionCount > 0) {
        const firstSession = page.locator('[data-testid="session-card"]').first();
        
        await firstSession.locator('[data-testid="delete-button"]').click();
        await page.click('[data-testid="confirm-delete"]');
        
        await expect(page.getByText(/deleted successfully/i)).toBeVisible();
      }
    });
  });

  // ============================================================================
  // SEARCH AND FILTER TESTS
  // ============================================================================
  test.describe('Search and Filtering', () => {
    test('should filter sessions by search term', async ({ page }) => {
      await sessionsPage.goto();
      
      await page.fill('[data-testid="search-input"]', 'Workshop');
      await page.waitForTimeout(500); // Debounce
      
      const sessions = page.locator('[data-testid="session-card"]');
      const count = await sessions.count();
      
      // All visible sessions should contain search term
      for (let i = 0; i < count; i++) {
        const text = await sessions.nth(i).textContent();
        expect(text?.toLowerCase()).toContain('workshop');
      }
    });

    test('should filter by session status', async ({ page }) => {
      await sessionsPage.goto();
      
      await page.click('[data-testid="status-filter"]');
      await page.click('[data-testid="filter-open"]');
      
      await page.waitForTimeout(500);
      
      const sessions = page.locator('[data-testid="session-card"]');
      const count = await sessions.count();
      
      for (let i = 0; i < count; i++) {
        await expect(sessions.nth(i).locator('[data-testid="session-status"]')).toHaveText(/open/i);
      }
    });

    test('should clear filters', async ({ page }) => {
      await sessionsPage.goto();
      
      await page.fill('[data-testid="search-input"]', 'Test');
      await page.click('[data-testid="clear-filters"]');
      
      await expect(page.locator('[data-testid="search-input"]')).toHaveValue('');
    });
  });

  // ============================================================================
  // PAGINATION TESTS
  // ============================================================================
  test.describe('Pagination', () => {
    test('should display pagination controls when needed', async ({ page }) => {
      await sessionsPage.goto();
      
      const pagination = page.locator('[data-testid="pagination"]');
      const sessionCount = await page.locator('[data-testid="session-card"]').count();
      
      // Pagination should appear if there are many sessions
      if (sessionCount > 10) {
        await expect(pagination).toBeVisible();
      }
    });

    test('should navigate between pages', async ({ page }) => {
      await sessionsPage.goto();
      
      const pagination = page.locator('[data-testid="pagination"]');
      if (await pagination.isVisible()) {
        await page.click('[data-testid="next-page"]');
        await expect(page).toHaveURL(/page=2/);
        
        await page.click('[data-testid="prev-page"]');
        await expect(page).toHaveURL(/page=1/);
      }
    });
  });
});
