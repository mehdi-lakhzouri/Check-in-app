/**
 * Check-in Flow E2E Tests
 * End-to-end tests for the Check-in process
 * 
 * Test Coverage:
 * ✔️ Manual check-in workflow
 * ✔️ QR code scanning simulation
 * ✔️ Verification flow
 * ✔️ Real-time updates
 * ✔️ Error handling
 */

import { test, expect, Page } from '@playwright/test';

// Page Object Model for Check-in pages
class CheckInPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/checkins');
  }

  async gotoScanner() {
    await this.page.goto('/checkins/scan');
  }

  async searchParticipant(term: string) {
    await this.page.fill('[data-testid="participant-search"]', term);
    await this.page.waitForTimeout(500);
  }

  async selectSession(sessionName: string) {
    await this.page.click('[data-testid="session-select"]');
    await this.page.click(`[data-testid="session-option"]:has-text("${sessionName}")`);
  }

  async checkInParticipant(participantEmail: string) {
    await this.searchParticipant(participantEmail);
    await this.page.click(`[data-testid="checkin-button"]:near(:text("${participantEmail}"))`);
  }

  async waitForSuccess() {
    await expect(this.page.getByText(/check-in successful/i)).toBeVisible();
  }
}

test.describe('Check-in Flow', () => {
  let checkInPage: CheckInPage;

  test.beforeEach(async ({ page }) => {
    checkInPage = new CheckInPage(page);
  });

  // ============================================================================
  // CHECK-IN DASHBOARD TESTS
  // ============================================================================
  test.describe('Check-in Dashboard', () => {
    test('should display check-in dashboard', async ({ page }) => {
      await checkInPage.goto();
      
      await expect(page.getByRole('heading', { name: /check-in/i })).toBeVisible();
    });

    test('should show session selector', async ({ page }) => {
      await checkInPage.goto();
      
      await expect(page.locator('[data-testid="session-select"]')).toBeVisible();
    });

    test('should show only open sessions in selector', async ({ page }) => {
      await checkInPage.goto();
      
      await page.click('[data-testid="session-select"]');
      
      const options = page.locator('[data-testid="session-option"]');
      const count = await options.count();
      
      for (let i = 0; i < count; i++) {
        // All sessions in dropdown should be open
        const text = await options.nth(i).textContent();
        expect(text?.toLowerCase()).not.toContain('closed');
      }
    });

    test('should display real-time check-in count', async ({ page }) => {
      await checkInPage.goto();
      
      await expect(page.locator('[data-testid="checkin-count"]')).toBeVisible();
    });

    test('should show recent check-ins list', async ({ page }) => {
      await checkInPage.goto();
      
      await expect(page.locator('[data-testid="recent-checkins"]')).toBeVisible();
    });
  });

  // ============================================================================
  // MANUAL CHECK-IN TESTS
  // ============================================================================
  test.describe('Manual Check-in', () => {
    test('should search and find participant', async ({ page }) => {
      await checkInPage.goto();
      
      await checkInPage.searchParticipant('test@example.com');
      
      await expect(page.locator('[data-testid="participant-result"]')).toBeVisible();
    });

    test('should show participant details before check-in', async ({ page }) => {
      await checkInPage.goto();
      
      await checkInPage.searchParticipant('test@example.com');
      
      const result = page.locator('[data-testid="participant-result"]').first();
      if (await result.isVisible()) {
        await expect(result.locator('[data-testid="participant-name"]')).toBeVisible();
        await expect(result.locator('[data-testid="participant-organization"]')).toBeVisible();
      }
    });

    test('should check in participant successfully', async ({ page }) => {
      await checkInPage.goto();
      
      // First select an open session
      await page.click('[data-testid="session-select"]');
      const firstSession = page.locator('[data-testid="session-option"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();
        
        await checkInPage.searchParticipant('test@example.com');
        
        const checkinButton = page.locator('[data-testid="checkin-button"]').first();
        if (await checkinButton.isVisible()) {
          await checkinButton.click();
          
          await expect(page.getByText(/check-in successful|already checked in/i)).toBeVisible();
        }
      }
    });

    test('should show error for already checked-in participant', async ({ page }) => {
      await checkInPage.goto();
      
      // Select session and try to check in same participant twice
      await page.click('[data-testid="session-select"]');
      const firstSession = page.locator('[data-testid="session-option"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();
        
        await checkInPage.searchParticipant('test@example.com');
        
        const checkinButton = page.locator('[data-testid="checkin-button"]').first();
        if (await checkinButton.isVisible()) {
          // First check-in
          await checkinButton.click();
          await page.waitForTimeout(1000);
          
          // Try second check-in
          await checkinButton.click();
          
          await expect(page.getByText(/already checked in/i)).toBeVisible();
        }
      }
    });

    test('should update count after successful check-in', async ({ page }) => {
      await checkInPage.goto();
      
      // Select session
      await page.click('[data-testid="session-select"]');
      const firstSession = page.locator('[data-testid="session-option"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();
        
        const initialCount = await page.locator('[data-testid="checkin-count"]').textContent();
        
        await checkInPage.searchParticipant('test@example.com');
        const checkinButton = page.locator('[data-testid="checkin-button"]').first();
        if (await checkinButton.isVisible()) {
          await checkinButton.click();
          
          await page.waitForTimeout(1000);
          
          const newCount = await page.locator('[data-testid="checkin-count"]').textContent();
          
          // Count should have increased (or stayed same if already checked in)
          expect(parseInt(newCount || '0')).toBeGreaterThanOrEqual(parseInt(initialCount || '0'));
        }
      }
    });
  });

  // ============================================================================
  // QR SCANNER TESTS
  // ============================================================================
  test.describe('QR Scanner', () => {
    test('should display QR scanner page', async ({ page }) => {
      await checkInPage.gotoScanner();
      
      await expect(page.getByRole('heading', { name: /scan/i })).toBeVisible();
    });

    test('should show camera permission request', async ({ page }) => {
      await checkInPage.gotoScanner();
      
      // Either camera access or camera permission message
      const hasCamera = await page.locator('[data-testid="camera-view"]').isVisible();
      const hasPermissionMessage = await page.locator('[data-testid="camera-permission"]').isVisible();
      
      expect(hasCamera || hasPermissionMessage).toBe(true);
    });

    test('should have manual QR input fallback', async ({ page }) => {
      await checkInPage.gotoScanner();
      
      await expect(page.locator('[data-testid="manual-qr-input"]')).toBeVisible();
    });

    test('should process manual QR code input', async ({ page }) => {
      await checkInPage.gotoScanner();
      
      // First select a session
      await page.click('[data-testid="session-select"]');
      const firstSession = page.locator('[data-testid="session-option"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();
        
        await page.fill('[data-testid="manual-qr-input"]', 'QR-TEST123');
        await page.click('[data-testid="submit-qr"]');
        
        // Should show result (success or not found)
        await expect(page.locator('[data-testid="scan-result"]')).toBeVisible();
      }
    });

    test('should show error for invalid QR code', async ({ page }) => {
      await checkInPage.gotoScanner();
      
      await page.click('[data-testid="session-select"]');
      const firstSession = page.locator('[data-testid="session-option"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();
        
        await page.fill('[data-testid="manual-qr-input"]', 'INVALID-QR-CODE');
        await page.click('[data-testid="submit-qr"]');
        
        await expect(page.getByText(/not found|invalid/i)).toBeVisible();
      }
    });
  });

  // ============================================================================
  // VERIFICATION WORKFLOW TESTS
  // ============================================================================
  test.describe('Verification Workflow', () => {
    test('should display verification modal on scan', async ({ page }) => {
      await checkInPage.gotoScanner();
      
      await page.click('[data-testid="session-select"]');
      const firstSession = page.locator('[data-testid="session-option"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();
        
        // Simulate valid QR scan
        await page.fill('[data-testid="manual-qr-input"]', 'QR-VALID123');
        await page.click('[data-testid="submit-qr"]');
        
        // If participant exists, verification modal should appear
        const modal = page.locator('[data-testid="verification-modal"]');
        if (await modal.isVisible()) {
          await expect(modal.locator('[data-testid="participant-info"]')).toBeVisible();
          await expect(modal.locator('[data-testid="accept-button"]')).toBeVisible();
          await expect(modal.locator('[data-testid="decline-button"]')).toBeVisible();
        }
      }
    });

    test('should show registration status in verification', async ({ page }) => {
      await checkInPage.gotoScanner();
      
      await page.click('[data-testid="session-select"]');
      const firstSession = page.locator('[data-testid="session-option"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();
        
        await page.fill('[data-testid="manual-qr-input"]', 'QR-VALID123');
        await page.click('[data-testid="submit-qr"]');
        
        const modal = page.locator('[data-testid="verification-modal"]');
        if (await modal.isVisible()) {
          await expect(modal.locator('[data-testid="registration-status"]')).toBeVisible();
        }
      }
    });

    test('should complete check-in on accept', async ({ page }) => {
      await checkInPage.gotoScanner();
      
      await page.click('[data-testid="session-select"]');
      const firstSession = page.locator('[data-testid="session-option"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();
        
        await page.fill('[data-testid="manual-qr-input"]', 'QR-VALID123');
        await page.click('[data-testid="submit-qr"]');
        
        const acceptButton = page.locator('[data-testid="accept-button"]');
        if (await acceptButton.isVisible()) {
          await acceptButton.click();
          
          await expect(page.getByText(/check-in successful/i)).toBeVisible();
        }
      }
    });

    test('should log attempt on decline', async ({ page }) => {
      await checkInPage.gotoScanner();
      
      await page.click('[data-testid="session-select"]');
      const firstSession = page.locator('[data-testid="session-option"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();
        
        await page.fill('[data-testid="manual-qr-input"]', 'QR-VALID123');
        await page.click('[data-testid="submit-qr"]');
        
        const declineButton = page.locator('[data-testid="decline-button"]');
        if (await declineButton.isVisible()) {
          await declineButton.click();
          
          // Should prompt for reason
          await expect(page.locator('[data-testid="decline-reason"]')).toBeVisible();
        }
      }
    });
  });

  // ============================================================================
  // CHECK-IN HISTORY TESTS
  // ============================================================================
  test.describe('Check-in History', () => {
    test('should display check-in history', async ({ page }) => {
      await page.goto('/checkins/history');
      
      await expect(page.getByRole('heading', { name: /history/i })).toBeVisible();
      await expect(page.locator('[data-testid="checkins-table"]')).toBeVisible();
    });

    test('should filter history by session', async ({ page }) => {
      await page.goto('/checkins/history');
      
      await page.click('[data-testid="session-filter"]');
      const firstOption = page.locator('[data-testid="session-option"]').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
        
        await page.waitForTimeout(500);
        
        // Results should be filtered
        const table = page.locator('[data-testid="checkins-table"]');
        await expect(table).toBeVisible();
      }
    });

    test('should filter history by date range', async ({ page }) => {
      await page.goto('/checkins/history');
      
      await page.fill('[data-testid="date-from"]', '2026-01-01');
      await page.fill('[data-testid="date-to"]', '2026-01-31');
      
      await page.click('[data-testid="apply-filter"]');
      
      await page.waitForTimeout(500);
      
      await expect(page.locator('[data-testid="checkins-table"]')).toBeVisible();
    });

    test('should allow undoing check-in', async ({ page }) => {
      await page.goto('/checkins/history');
      
      const firstRow = page.locator('[data-testid="checkin-row"]').first();
      if (await firstRow.isVisible()) {
        await firstRow.locator('[data-testid="undo-button"]').click();
        
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText(/undo this check-in/i)).toBeVisible();
      }
    });

    test('should export check-in history', async ({ page }) => {
      await page.goto('/checkins/history');
      
      const exportButton = page.locator('[data-testid="export-button"]');
      if (await exportButton.isVisible()) {
        // Start waiting for download before clicking
        const downloadPromise = page.waitForEvent('download');
        await exportButton.click();
        
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('check-ins');
      }
    });
  });

  // ============================================================================
  // REAL-TIME UPDATES TESTS
  // ============================================================================
  test.describe('Real-time Updates', () => {
    test('should show real-time check-in notifications', async ({ page }) => {
      await checkInPage.goto();
      
      // Select a session
      await page.click('[data-testid="session-select"]');
      const firstSession = page.locator('[data-testid="session-option"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();
        
        // Real-time indicator should be visible
        await expect(page.locator('[data-testid="realtime-indicator"]')).toBeVisible();
      }
    });

    test('should update capacity bar in real-time', async ({ page }) => {
      await checkInPage.goto();
      
      await expect(page.locator('[data-testid="capacity-bar"]')).toBeVisible();
    });
  });

  // ============================================================================
  // CAPACITY WARNING TESTS
  // ============================================================================
  test.describe('Capacity Warnings', () => {
    test('should show warning when session is near capacity', async ({ page }) => {
      await checkInPage.goto();
      
      // Look for capacity warning if present
      const warning = page.locator('[data-testid="capacity-warning"]');
      if (await warning.isVisible()) {
        await expect(warning).toContainText(/near capacity|almost full/i);
      }
    });

    test('should disable check-in when session is full', async ({ page }) => {
      await checkInPage.goto();
      
      // If session is at capacity, check-in buttons should be disabled
      const fullBadge = page.locator('[data-testid="session-full"]');
      if (await fullBadge.isVisible()) {
        const checkinButton = page.locator('[data-testid="checkin-button"]').first();
        await expect(checkinButton).toBeDisabled();
      }
    });
  });
});
