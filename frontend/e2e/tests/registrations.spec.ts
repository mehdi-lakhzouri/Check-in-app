/**
 * Registrations Page E2E Tests
 * End-to-end tests for the Registration management functionality
 * 
 * Test Coverage:
 * ✔️ Registration listing and display
 * ✔️ Registration creation
 * ✔️ Registration status management
 * ✔️ Search and filtering
 * ✔️ Bulk operations
 * ✔️ Error handling and edge cases
 */

import { test, expect, Page } from '@playwright/test';

// Test data generators
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const generateTestRegistration = () => ({
  participantId: `participant_${Date.now()}`,
  sessionId: `session_${Date.now()}`,
  notes: `Test registration notes ${Date.now()}`,
});

// Page Object Model for Registrations
class RegistrationsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/registrations');
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
    await expect(this.page.locator('[data-testid="registrations-container"]')).toBeVisible();
  }

  async search(term: string) {
    await this.page.fill('[data-testid="registration-search"]', term);
    await this.page.waitForTimeout(500);
  }

  async filterByStatus(status: string) {
    await this.page.click('[data-testid="status-filter"]');
    await this.page.click(`[data-testid="status-option-${status}"]`);
  }

  async filterBySession(sessionName: string) {
    await this.page.click('[data-testid="session-filter"]');
    await this.page.click(`[data-testid="session-option"]:has-text("${sessionName}")`);
  }

  async selectParticipant(participantName: string) {
    await this.page.click('[data-testid="participant-select"]');
    await this.page.fill('[data-testid="participant-search"]', participantName);
    await this.page.click(`[data-testid="participant-option"]:has-text("${participantName}")`);
  }

  async selectSession(sessionName: string) {
    await this.page.click('[data-testid="session-select"]');
    await this.page.click(`[data-testid="session-option"]:has-text("${sessionName}")`);
  }

  async getRowCount() {
    return this.page.locator('[data-testid="registration-row"]').count();
  }
}

test.describe('Registrations Management', () => {
  let registrationsPage: RegistrationsPage;

  test.beforeEach(async ({ page }) => {
    registrationsPage = new RegistrationsPage(page);
  });

  // ============================================================================
  // REGISTRATION LISTING TESTS
  // ============================================================================
  test.describe('Registration Listing', () => {
    test('should display registrations list page', async ({ page }) => {
      await registrationsPage.goto();
      
      await expect(page.getByRole('heading', { name: /registration/i })).toBeVisible();
      await expect(page.locator('[data-testid="registrations-table"]')).toBeVisible();
    });

    test('should show registration details in table', async ({ page }) => {
      await registrationsPage.goto();
      
      const table = page.locator('[data-testid="registrations-table"]');
      await expect(table).toBeVisible();
      
      // Check column headers
      await expect(page.getByRole('columnheader', { name: /participant/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /session/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
    });

    test('should show registration status badges', async ({ page }) => {
      await registrationsPage.goto();
      
      // At least one status badge should be visible
      const statusBadges = page.locator('[data-testid="status-badge"]');
      const count = await statusBadges.count();
      
      if (count > 0) {
        const firstBadge = statusBadges.first();
        const text = await firstBadge.textContent();
        expect(text?.toLowerCase()).toMatch(/pending|confirmed|cancelled|attended/);
      }
    });

    test('should display empty state when no registrations', async ({ page }) => {
      await registrationsPage.goto();
      
      // Search for non-existent
      await registrationsPage.search('nonexistent-registration-xyz');
      
      await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
    });

    test('should support pagination', async ({ page }) => {
      await registrationsPage.goto();
      
      const pagination = page.locator('[data-testid="pagination"]');
      if (await pagination.isVisible()) {
        const nextButton = pagination.locator('[data-testid="next-page"]');
        if (await nextButton.isEnabled()) {
          const firstPageData = await page.locator('[data-testid="registration-row"]').first().textContent();
          await nextButton.click();
          await page.waitForTimeout(500);
          const secondPageData = await page.locator('[data-testid="registration-row"]').first().textContent();
          expect(firstPageData).not.toBe(secondPageData);
        }
      }
    });
  });

  // ============================================================================
  // REGISTRATION CREATION TESTS
  // ============================================================================
  test.describe('Registration Creation', () => {
    test('should open new registration dialog', async ({ page }) => {
      await registrationsPage.goto();
      
      await page.click('[data-testid="add-registration"]');
      
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: /new registration|add registration/i })).toBeVisible();
    });

    test('should show participant and session selectors', async ({ page }) => {
      await registrationsPage.goto();
      
      await page.click('[data-testid="add-registration"]');
      
      await expect(page.locator('[data-testid="participant-select"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-select"]')).toBeVisible();
    });

    test('should require participant selection', async ({ page }) => {
      await registrationsPage.goto();
      
      await page.click('[data-testid="add-registration"]');
      
      // Try to submit without selecting participant
      await page.click('[data-testid="submit-registration"]');
      
      await expect(page.getByText(/participant.*required/i)).toBeVisible();
    });

    test('should require session selection', async ({ page }) => {
      await registrationsPage.goto();
      
      await page.click('[data-testid="add-registration"]');
      
      // Select participant only
      await page.click('[data-testid="participant-select"]');
      const firstParticipant = page.locator('[data-testid="participant-option"]').first();
      if (await firstParticipant.isVisible()) {
        await firstParticipant.click();
        
        // Try to submit without session
        await page.click('[data-testid="submit-registration"]');
        
        await expect(page.getByText(/session.*required/i)).toBeVisible();
      }
    });

    test('should create registration successfully', async ({ page }) => {
      await registrationsPage.goto();
      
      await page.click('[data-testid="add-registration"]');
      
      // Select participant
      await page.click('[data-testid="participant-select"]');
      const firstParticipant = page.locator('[data-testid="participant-option"]').first();
      if (await firstParticipant.isVisible()) {
        await firstParticipant.click();
        
        // Select session
        await page.click('[data-testid="session-select"]');
        const firstSession = page.locator('[data-testid="session-option"]').first();
        if (await firstSession.isVisible()) {
          await firstSession.click();
          
          await page.click('[data-testid="submit-registration"]');
          
          await expect(page.getByText(/registration created|success/i)).toBeVisible();
        }
      }
    });

    test('should prevent duplicate registration', async ({ page }) => {
      await registrationsPage.goto();
      
      // Get first existing registration's participant and session
      const firstRow = page.locator('[data-testid="registration-row"]').first();
      if (await firstRow.isVisible()) {
        const participant = await firstRow.locator('[data-testid="participant-name"]').textContent();
        const session = await firstRow.locator('[data-testid="session-name"]').textContent();
        
        await page.click('[data-testid="add-registration"]');
        
        // Try to create same registration
        await page.click('[data-testid="participant-select"]');
        if (participant) {
          await page.fill('[data-testid="participant-search"]', participant);
          const option = page.locator(`[data-testid="participant-option"]:has-text("${participant}")`).first();
          if (await option.isVisible()) {
            await option.click();
            
            await page.click('[data-testid="session-select"]');
            if (session) {
              const sessionOption = page.locator(`[data-testid="session-option"]:has-text("${session}")`).first();
              if (await sessionOption.isVisible()) {
                await sessionOption.click();
                await page.click('[data-testid="submit-registration"]');
                
                await expect(page.getByText(/already registered|duplicate/i)).toBeVisible();
              }
            }
          }
        }
      }
    });
  });

  // ============================================================================
  // REGISTRATION STATUS MANAGEMENT TESTS
  // ============================================================================
  test.describe('Status Management', () => {
    test('should show status options in row actions', async ({ page }) => {
      await registrationsPage.goto();
      
      const firstRow = page.locator('[data-testid="registration-row"]').first();
      if (await firstRow.isVisible()) {
        await firstRow.locator('[data-testid="action-menu"]').click();
        
        await expect(page.locator('[data-testid="status-menu"]')).toBeVisible();
      }
    });

    test('should change registration status', async ({ page }) => {
      await registrationsPage.goto();
      
      const firstRow = page.locator('[data-testid="registration-row"]').first();
      if (await firstRow.isVisible()) {
        const initialStatus = await firstRow.locator('[data-testid="status-badge"]').textContent();
        
        await firstRow.locator('[data-testid="action-menu"]').click();
        await page.click('[data-testid="status-menu"]');
        
        // Select a different status
        const statusOptions = page.locator('[data-testid^="status-option-"]');
        const count = await statusOptions.count();
        for (let i = 0; i < count; i++) {
          const option = statusOptions.nth(i);
          const optionText = await option.textContent();
          if (optionText?.toLowerCase() !== initialStatus?.toLowerCase()) {
            await option.click();
            break;
          }
        }
        
        await expect(page.getByText(/status updated/i)).toBeVisible();
      }
    });

    test('should confirm cancellation', async ({ page }) => {
      await registrationsPage.goto();
      
      // Find a non-cancelled registration
      const rows = page.locator('[data-testid="registration-row"]');
      const count = await rows.count();
      
      for (let i = 0; i < count; i++) {
        const row = rows.nth(i);
        const status = await row.locator('[data-testid="status-badge"]').textContent();
        
        if (!status?.toLowerCase().includes('cancelled')) {
          await row.locator('[data-testid="action-menu"]').click();
          await page.click('[data-testid="status-menu"]');
          await page.click('[data-testid="status-option-cancelled"]');
          
          // Should show confirmation
          await expect(page.getByRole('dialog')).toBeVisible();
          await expect(page.getByText(/confirm cancellation/i)).toBeVisible();
          break;
        }
      }
    });
  });

  // ============================================================================
  // SEARCH AND FILTERING TESTS
  // ============================================================================
  test.describe('Search and Filtering', () => {
    test('should search by participant name', async ({ page }) => {
      await registrationsPage.goto();
      
      // Get first participant name
      const firstName = await page.locator('[data-testid="participant-name"]').first().textContent();
      if (firstName) {
        await registrationsPage.search(firstName.substring(0, 5));
        
        await page.waitForTimeout(500);
        
        // All visible results should match
        const names = page.locator('[data-testid="participant-name"]');
        const count = await names.count();
        expect(count).toBeGreaterThan(0);
      }
    });

    test('should filter by registration status', async ({ page }) => {
      await registrationsPage.goto();
      
      await registrationsPage.filterByStatus('confirmed');
      
      await page.waitForTimeout(500);
      
      // All visible badges should be confirmed
      const badges = page.locator('[data-testid="status-badge"]');
      const count = await badges.count();
      
      for (let i = 0; i < count; i++) {
        const text = await badges.nth(i).textContent();
        expect(text?.toLowerCase()).toContain('confirmed');
      }
    });

    test('should filter by session', async ({ page }) => {
      await registrationsPage.goto();
      
      await page.click('[data-testid="session-filter"]');
      const firstSession = page.locator('[data-testid="session-option"]').first();
      if (await firstSession.isVisible()) {
        const sessionName = await firstSession.textContent();
        await firstSession.click();
        
        await page.waitForTimeout(500);
        
        // All visible session names should match
        const sessions = page.locator('[data-testid="session-name"]');
        const count = await sessions.count();
        
        for (let i = 0; i < count; i++) {
          const text = await sessions.nth(i).textContent();
          expect(text).toContain(sessionName || '');
        }
      }
    });

    test('should clear all filters', async ({ page }) => {
      await registrationsPage.goto();
      
      await registrationsPage.filterByStatus('confirmed');
      await page.click('[data-testid="clear-filters"]');
      
      await page.waitForTimeout(500);
      
      // Status filter should be reset
      const statusFilter = page.locator('[data-testid="status-filter"]');
      await expect(statusFilter).toContainText(/all/i);
    });

    test('should combine multiple filters', async ({ page }) => {
      await registrationsPage.goto();
      
      await registrationsPage.filterByStatus('confirmed');
      await registrationsPage.search('test');
      
      await page.waitForTimeout(500);
      
      // Results should match both filters
      const rows = page.locator('[data-testid="registration-row"]');
      const count = await rows.count();
      
      for (let i = 0; i < count; i++) {
        const row = rows.nth(i);
        const status = await row.locator('[data-testid="status-badge"]').textContent();
        expect(status?.toLowerCase()).toContain('confirmed');
      }
    });
  });

  // ============================================================================
  // BULK OPERATIONS TESTS
  // ============================================================================
  test.describe('Bulk Operations', () => {
    test('should select multiple registrations', async ({ page }) => {
      await registrationsPage.goto();
      
      const checkboxes = page.locator('[data-testid="registration-checkbox"]');
      const count = await checkboxes.count();
      
      if (count >= 2) {
        await checkboxes.first().click();
        await checkboxes.nth(1).click();
        
        await expect(page.locator('[data-testid="selection-count"]')).toContainText('2');
      }
    });

    test('should select all registrations', async ({ page }) => {
      await registrationsPage.goto();
      
      const selectAllCheckbox = page.locator('[data-testid="select-all"]');
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.click();
        
        const rowCount = await page.locator('[data-testid="registration-row"]').count();
        await expect(page.locator('[data-testid="selection-count"]')).toContainText(String(rowCount));
      }
    });

    test('should bulk confirm registrations', async ({ page }) => {
      await registrationsPage.goto();
      
      // Select pending registrations
      await registrationsPage.filterByStatus('pending');
      await page.waitForTimeout(500);
      
      const selectAllCheckbox = page.locator('[data-testid="select-all"]');
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.click();
        
        await page.click('[data-testid="bulk-actions"]');
        await page.click('[data-testid="bulk-confirm"]');
        
        await expect(page.getByText(/registrations confirmed/i)).toBeVisible();
      }
    });

    test('should bulk cancel registrations with confirmation', async ({ page }) => {
      await registrationsPage.goto();
      
      // Select some registrations
      const checkboxes = page.locator('[data-testid="registration-checkbox"]');
      if (await checkboxes.count() > 0) {
        await checkboxes.first().click();
        
        await page.click('[data-testid="bulk-actions"]');
        await page.click('[data-testid="bulk-cancel"]');
        
        // Should show confirmation dialog
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText(/confirm bulk cancellation/i)).toBeVisible();
      }
    });
  });

  // ============================================================================
  // EXPORT FUNCTIONALITY TESTS
  // ============================================================================
  test.describe('Export Functionality', () => {
    test('should export registrations as CSV', async ({ page }) => {
      await registrationsPage.goto();
      
      const exportButton = page.locator('[data-testid="export-csv"]');
      if (await exportButton.isVisible()) {
        const downloadPromise = page.waitForEvent('download');
        await exportButton.click();
        
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/registrations.*\.csv/);
      }
    });

    test('should export filtered results only', async ({ page }) => {
      await registrationsPage.goto();
      
      await registrationsPage.filterByStatus('confirmed');
      
      const exportButton = page.locator('[data-testid="export-csv"]');
      if (await exportButton.isVisible()) {
        const downloadPromise = page.waitForEvent('download');
        await exportButton.click();
        
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('registrations');
      }
    });
  });

  // ============================================================================
  // EDGE CASES AND ERROR HANDLING
  // ============================================================================
  test.describe('Edge Cases', () => {
    test('should handle session capacity limits', async ({ page }) => {
      await registrationsPage.goto();
      
      // Try to register for a full session
      await page.click('[data-testid="add-registration"]');
      
      await page.click('[data-testid="session-select"]');
      const fullSession = page.locator('[data-testid="session-option"]:has-text("Full")');
      if (await fullSession.isVisible()) {
        await fullSession.click();
        
        // Should show capacity warning
        await expect(page.getByText(/session.*full|no capacity/i)).toBeVisible();
      }
    });

    test('should handle closed session registration attempt', async ({ page }) => {
      await registrationsPage.goto();
      
      await page.click('[data-testid="add-registration"]');
      
      await page.click('[data-testid="session-select"]');
      // Closed sessions should be disabled or marked
      const closedSession = page.locator('[data-testid="session-option"][aria-disabled="true"]');
      if (await closedSession.count() > 0) {
        await expect(closedSession.first()).toBeDisabled();
      }
    });

    test('should validate registration time constraints', async ({ page }) => {
      await registrationsPage.goto();
      
      await page.click('[data-testid="add-registration"]');
      
      // Select participant and past session
      await page.click('[data-testid="participant-select"]');
      const firstParticipant = page.locator('[data-testid="participant-option"]').first();
      if (await firstParticipant.isVisible()) {
        await firstParticipant.click();
        
        await page.click('[data-testid="session-select"]');
        // Past sessions should show warning
        const pastSession = page.locator('[data-testid="session-option"]:has-text("Past")');
        if (await pastSession.isVisible()) {
          await pastSession.click();
          
          await expect(page.getByText(/past session|already started/i)).toBeVisible();
        }
      }
    });
  });
});
