/**
 * Participants Page E2E Tests
 * End-to-end tests for the Participants management pages
 * 
 * Test Coverage:
 * ✔️ Participant listing and search
 * ✔️ Participant creation and validation
 * ✔️ Participant editing
 * ✔️ QR code functionality
 * ✔️ Ambassador management
 */

import { test, expect, Page } from '@playwright/test';

// Test data generators
const generateParticipant = () => ({
  name: `Test User ${Date.now()}`,
  email: `test${Date.now()}@example.com`,
  organization: 'Test Organization',
  phone: '+1234567890',
});

// Page Object Model helpers
class ParticipantsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/participants');
  }

  async gotoCreate() {
    await this.page.goto('/participants/new');
  }

  async fillParticipantForm(participant: ReturnType<typeof generateParticipant>) {
    await this.page.fill('[data-testid="participant-name"]', participant.name);
    await this.page.fill('[data-testid="participant-email"]', participant.email);
    await this.page.fill('[data-testid="participant-organization"]', participant.organization);
    await this.page.fill('[data-testid="participant-phone"]', participant.phone);
  }

  async submitForm() {
    await this.page.click('[data-testid="submit-participant"]');
  }

  async waitForSuccess() {
    await expect(this.page.getByText(/created successfully|updated successfully/i)).toBeVisible();
  }

  async searchParticipant(term: string) {
    await this.page.fill('[data-testid="search-input"]', term);
    await this.page.waitForTimeout(500); // Debounce
  }

  getParticipantRow(email: string) {
    return this.page.locator(`[data-testid="participant-row"]:has-text("${email}")`);
  }
}

test.describe('Participants Page', () => {
  let participantsPage: ParticipantsPage;

  test.beforeEach(async ({ page }) => {
    participantsPage = new ParticipantsPage(page);
  });

  // ============================================================================
  // PARTICIPANT LISTING TESTS
  // ============================================================================
  test.describe('Participant Listing', () => {
    test('should display participants list', async ({ page }) => {
      await participantsPage.goto();
      
      await expect(page.getByRole('heading', { name: /participants/i })).toBeVisible();
      await expect(page.locator('[data-testid="participants-table"]')).toBeVisible();
    });

    test('should show participant count', async ({ page }) => {
      await participantsPage.goto();
      
      await expect(page.locator('[data-testid="participant-count"]')).toBeVisible();
    });

    test('should display participant details in table', async ({ page }) => {
      await participantsPage.goto();
      
      const firstRow = page.locator('[data-testid="participant-row"]').first();
      if (await firstRow.isVisible()) {
        await expect(firstRow.locator('[data-testid="participant-name"]')).toBeVisible();
        await expect(firstRow.locator('[data-testid="participant-email"]')).toBeVisible();
        await expect(firstRow.locator('[data-testid="participant-organization"]')).toBeVisible();
      }
    });

    test('should show QR code button for each participant', async ({ page }) => {
      await participantsPage.goto();
      
      const firstRow = page.locator('[data-testid="participant-row"]').first();
      if (await firstRow.isVisible()) {
        await expect(firstRow.locator('[data-testid="qr-button"]')).toBeVisible();
      }
    });
  });

  // ============================================================================
  // PARTICIPANT CREATION TESTS
  // ============================================================================
  test.describe('Participant Creation', () => {
    test('should create a new participant with valid data', async ({ page }) => {
      const participant = generateParticipant();
      
      await participantsPage.gotoCreate();
      await participantsPage.fillParticipantForm(participant);
      await participantsPage.submitForm();
      await participantsPage.waitForSuccess();

      // Verify redirect
      await expect(page).toHaveURL(/\/participants/);
    });

    test('should show validation error for empty name', async ({ page }) => {
      await participantsPage.gotoCreate();
      
      await page.fill('[data-testid="participant-email"]', 'test@example.com');
      await participantsPage.submitForm();
      
      await expect(page.getByText(/name is required/i)).toBeVisible();
    });

    test('should show validation error for invalid email', async ({ page }) => {
      await participantsPage.gotoCreate();
      
      await page.fill('[data-testid="participant-name"]', 'Test User');
      await page.fill('[data-testid="participant-email"]', 'not-an-email');
      await participantsPage.submitForm();
      
      await expect(page.getByText(/valid email/i)).toBeVisible();
    });

    test('should show validation error for duplicate email', async ({ page }) => {
      const participant = generateParticipant();
      
      // Create first participant
      await participantsPage.gotoCreate();
      await participantsPage.fillParticipantForm(participant);
      await participantsPage.submitForm();
      await participantsPage.waitForSuccess();
      
      // Try to create duplicate
      await participantsPage.gotoCreate();
      await participantsPage.fillParticipantForm(participant);
      await participantsPage.submitForm();
      
      await expect(page.getByText(/already exists/i)).toBeVisible();
    });

    test('should auto-generate QR code on creation', async ({ page }) => {
      const participant = generateParticipant();
      
      await participantsPage.gotoCreate();
      await participantsPage.fillParticipantForm(participant);
      await participantsPage.submitForm();
      await participantsPage.waitForSuccess();

      // Navigate to participant details and verify QR code
      await participantsPage.searchParticipant(participant.email);
      const row = participantsPage.getParticipantRow(participant.email);
      await row.locator('[data-testid="qr-button"]').click();
      
      await expect(page.locator('[data-testid="qr-code-image"]')).toBeVisible();
    });

    test('should allow setting role as ambassador', async ({ page }) => {
      const participant = generateParticipant();
      
      await participantsPage.gotoCreate();
      await participantsPage.fillParticipantForm(participant);
      
      await page.click('[data-testid="role-select"]');
      await page.click('[data-testid="role-ambassador"]');
      
      await participantsPage.submitForm();
      await participantsPage.waitForSuccess();
    });
  });

  // ============================================================================
  // PARTICIPANT EDITING TESTS
  // ============================================================================
  test.describe('Participant Editing', () => {
    test('should load existing participant data in form', async ({ page }) => {
      await participantsPage.goto();
      
      const firstRow = page.locator('[data-testid="participant-row"]').first();
      if (await firstRow.isVisible()) {
        const email = await firstRow.locator('[data-testid="participant-email"]').textContent();
        
        await firstRow.locator('[data-testid="edit-button"]').click();
        
        await expect(page.locator('[data-testid="participant-email"]')).toHaveValue(email || '');
      }
    });

    test('should update participant successfully', async ({ page }) => {
      await participantsPage.goto();
      
      const firstRow = page.locator('[data-testid="participant-row"]').first();
      if (await firstRow.isVisible()) {
        await firstRow.locator('[data-testid="edit-button"]').click();
        
        const newName = `Updated User ${Date.now()}`;
        await page.fill('[data-testid="participant-name"]', newName);
        await participantsPage.submitForm();
        
        await expect(page.getByText(/updated successfully/i)).toBeVisible();
      }
    });

    test('should not allow changing email to existing one', async ({ page }) => {
      await participantsPage.goto();
      
      const rows = page.locator('[data-testid="participant-row"]');
      const count = await rows.count();
      
      if (count >= 2) {
        // Get second participant's email
        const secondEmail = await rows.nth(1).locator('[data-testid="participant-email"]').textContent();
        
        // Edit first participant and try to use second's email
        await rows.first().locator('[data-testid="edit-button"]').click();
        await page.fill('[data-testid="participant-email"]', secondEmail || '');
        await participantsPage.submitForm();
        
        await expect(page.getByText(/already exists/i)).toBeVisible();
      }
    });
  });

  // ============================================================================
  // SEARCH AND FILTER TESTS
  // ============================================================================
  test.describe('Search and Filtering', () => {
    test('should search participants by name', async ({ page }) => {
      await participantsPage.goto();
      
      await participantsPage.searchParticipant('John');
      
      const rows = page.locator('[data-testid="participant-row"]');
      const count = await rows.count();
      
      for (let i = 0; i < count; i++) {
        const name = await rows.nth(i).locator('[data-testid="participant-name"]').textContent();
        expect(name?.toLowerCase()).toContain('john');
      }
    });

    test('should search participants by email', async ({ page }) => {
      await participantsPage.goto();
      
      await participantsPage.searchParticipant('@example.com');
      
      const rows = page.locator('[data-testid="participant-row"]');
      const count = await rows.count();
      
      for (let i = 0; i < count; i++) {
        const email = await rows.nth(i).locator('[data-testid="participant-email"]').textContent();
        expect(email?.toLowerCase()).toContain('@example.com');
      }
    });

    test('should filter by role', async ({ page }) => {
      await participantsPage.goto();
      
      await page.click('[data-testid="role-filter"]');
      await page.click('[data-testid="filter-ambassador"]');
      
      await page.waitForTimeout(500);
      
      const rows = page.locator('[data-testid="participant-row"]');
      const count = await rows.count();
      
      for (let i = 0; i < count; i++) {
        await expect(rows.nth(i).locator('[data-testid="participant-role"]')).toHaveText(/ambassador/i);
      }
    });

    test('should show no results message for empty search', async ({ page }) => {
      await participantsPage.goto();
      
      await participantsPage.searchParticipant('xyznonexistent123');
      
      await expect(page.getByText(/no participants found/i)).toBeVisible();
    });
  });

  // ============================================================================
  // QR CODE FUNCTIONALITY TESTS
  // ============================================================================
  test.describe('QR Code Functionality', () => {
    test('should display QR code modal on button click', async ({ page }) => {
      await participantsPage.goto();
      
      const firstRow = page.locator('[data-testid="participant-row"]').first();
      if (await firstRow.isVisible()) {
        await firstRow.locator('[data-testid="qr-button"]').click();
        
        await expect(page.locator('[data-testid="qr-modal"]')).toBeVisible();
        await expect(page.locator('[data-testid="qr-code-image"]')).toBeVisible();
      }
    });

    test('should show download button for QR code', async ({ page }) => {
      await participantsPage.goto();
      
      const firstRow = page.locator('[data-testid="participant-row"]').first();
      if (await firstRow.isVisible()) {
        await firstRow.locator('[data-testid="qr-button"]').click();
        
        await expect(page.locator('[data-testid="download-qr"]')).toBeVisible();
      }
    });

    test('should close QR modal on dismiss', async ({ page }) => {
      await participantsPage.goto();
      
      const firstRow = page.locator('[data-testid="participant-row"]').first();
      if (await firstRow.isVisible()) {
        await firstRow.locator('[data-testid="qr-button"]').click();
        await page.click('[data-testid="close-modal"]');
        
        await expect(page.locator('[data-testid="qr-modal"]')).not.toBeVisible();
      }
    });
  });

  // ============================================================================
  // PARTICIPANT DELETION TESTS
  // ============================================================================
  test.describe('Participant Deletion', () => {
    test('should show confirmation dialog on delete', async ({ page }) => {
      await participantsPage.goto();
      
      const firstRow = page.locator('[data-testid="participant-row"]').first();
      if (await firstRow.isVisible()) {
        await firstRow.locator('[data-testid="delete-button"]').click();
        
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText(/are you sure/i)).toBeVisible();
      }
    });

    test('should warn about related data on delete', async ({ page }) => {
      await participantsPage.goto();
      
      const firstRow = page.locator('[data-testid="participant-row"]').first();
      if (await firstRow.isVisible()) {
        await firstRow.locator('[data-testid="delete-button"]').click();
        
        // Should mention registrations and check-ins
        await expect(page.getByText(/registrations|check-ins/i)).toBeVisible();
      }
    });

    test('should delete participant on confirmation', async ({ page }) => {
      await participantsPage.goto();
      
      const firstRow = page.locator('[data-testid="participant-row"]').first();
      if (await firstRow.isVisible()) {
        const email = await firstRow.locator('[data-testid="participant-email"]').textContent();
        
        await firstRow.locator('[data-testid="delete-button"]').click();
        await page.click('[data-testid="confirm-delete"]');
        
        await expect(page.getByText(/deleted successfully/i)).toBeVisible();
        await expect(page.getByText(email || '')).not.toBeVisible();
      }
    });
  });

  // ============================================================================
  // BULK OPERATIONS TESTS
  // ============================================================================
  test.describe('Bulk Operations', () => {
    test('should show bulk actions when selecting participants', async ({ page }) => {
      await participantsPage.goto();
      
      const checkbox = page.locator('[data-testid="participant-checkbox"]').first();
      if (await checkbox.isVisible()) {
        await checkbox.check();
        
        await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();
      }
    });

    test('should select all participants', async ({ page }) => {
      await participantsPage.goto();
      
      const selectAll = page.locator('[data-testid="select-all"]');
      if (await selectAll.isVisible()) {
        await selectAll.check();
        
        const checkboxes = page.locator('[data-testid="participant-checkbox"]');
        const count = await checkboxes.count();
        
        for (let i = 0; i < count; i++) {
          await expect(checkboxes.nth(i)).toBeChecked();
        }
      }
    });
  });

  // ============================================================================
  // AMBASSADOR LEADERBOARD TESTS
  // ============================================================================
  test.describe('Ambassador Leaderboard', () => {
    test('should navigate to ambassador leaderboard', async ({ page }) => {
      await page.goto('/participants/ambassadors');
      
      await expect(page.getByRole('heading', { name: /ambassador/i })).toBeVisible();
    });

    test('should display ambassador rankings', async ({ page }) => {
      await page.goto('/participants/ambassadors');
      
      const leaderboard = page.locator('[data-testid="leaderboard"]');
      if (await leaderboard.isVisible()) {
        await expect(leaderboard.locator('[data-testid="rank"]')).toBeVisible();
        await expect(leaderboard.locator('[data-testid="points"]')).toBeVisible();
      }
    });
  });
});
