# TODO: End-to-End Tests for ShoreExplorer (Playwright)

## Setup
```bash
npm init playwright@latest
# or
yarn create playwright
```

## Core User Flows to Test

### Flow 1: Landing Page
- [ ] Page loads with hero section
- [ ] "Start Planning" button navigates to /trips/new
- [ ] Feature cards are visible
- [ ] Navigation works (desktop and mobile)

### Flow 2: Create Trip
- [ ] Navigate to /trips/new
- [ ] Enter ship name and cruise line
- [ ] Add a port with all details (name, country, coordinates, dates)
- [ ] Use port suggestions dropdown
- [ ] Save trip successfully
- [ ] Verify redirect to trip detail page

### Flow 3: Generate Day Plan
- [ ] Navigate to a port's plan page
- [ ] Select all preferences (party, activity, transport, budget)
- [ ] Click "Generate Day Plan"
- [ ] Wait for AI generation (up to 30s)
- [ ] Verify plan displays with:
  - [ ] Title and summary
  - [ ] Activity timeline
  - [ ] Map with markers and route
  - [ ] Weather card
  - [ ] Cost estimates
  - [ ] Booking links (where applicable)

### Flow 4: My Trips
- [ ] List shows created trips
- [ ] Click on trip navigates to detail
- [ ] Edit trip works
- [ ] Delete trip with confirmation

### Flow 5: Terms & Conditions
- [ ] All T&C sections render
- [ ] External links open in new tab

### Flow 6: Mobile Responsiveness
- [ ] Bottom navigation appears on mobile viewport
- [ ] All pages are usable at 375px width
- [ ] Touch targets are at least 48px

## Example Playwright Test (TODO)
```javascript
import { test, expect } from '@playwright/test';

test('create trip and generate plan', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('get-started-btn')).toBeVisible();
  
  // Navigate to create trip
  await page.getByTestId('get-started-btn').click();
  await expect(page).toHaveURL('/trips/new');
  
  // Fill in ship details
  await page.getByTestId('ship-name-input').fill('Symphony of the Seas');
  await page.getByTestId('cruise-line-input').fill('Royal Caribbean');
  
  // Add a port
  await page.getByTestId('add-port-btn').click();
  // ... fill port details
  
  // Save and verify
  await page.getByTestId('save-trip-btn').click();
  // ... assertions
});
```
