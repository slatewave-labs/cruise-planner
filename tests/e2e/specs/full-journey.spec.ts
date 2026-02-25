/**
 * Full user journey E2E tests.
 *
 * Tests end-to-end flows that span multiple pages,
 * simulating realistic user interactions.
 */
import { test, expect } from '@playwright/test';
import { mockAllApiRoutes, VALID_TRIP_ID, buildTrip, buildPort, buildPlan } from './fixtures';

test.describe('Full Journey — Create Trip and Generate Plan', () => {
  test('user can create a trip, add a port, save, and generate a day plan', async ({ page }) => {
    await mockAllApiRoutes(page, {
      trips: [],
      plans: [],
      seedTrips: false,
      seedPlans: false,
    });

    let generatedPlanId = '';
    let generatedTripId = '';
    let generatedPortId = '';
    await page.route('**/api/plans/generate', async (route) => {
      const payload = route.request().postDataJSON();
      generatedPlanId = 'plan-e2e-dynamic-001';
      generatedTripId = payload.trip_id;
      generatedPortId = payload.port_id;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          plan_id: generatedPlanId,
          trip_id: generatedTripId,
          port_id: generatedPortId,
          port_name: payload.port_name,
          port_country: payload.port_country,
          generated_at: '2026-01-16T12:00:00Z',
          preferences: payload.preferences,
          weather: {
            temperature: 22,
            description: 'Partly cloudy',
            wind_speed: 12,
            precipitation: 0,
            weather_code: 2,
          },
          plan: {
            plan_title: 'Barcelona Highlights',
            summary: 'A wonderful day exploring the Gothic Quarter and waterfront.',
            return_by: '17:00',
            total_estimated_cost: '£45',
            activities: [
              {
                order: 1,
                name: 'La Rambla Walk',
                description: 'Stroll down the famous La Rambla boulevard.',
                location: 'La Rambla, Barcelona',
                latitude: 41.3797,
                longitude: 2.1746,
                start_time: '09:00',
                end_time: '09:45',
                duration_minutes: 45,
                cost_estimate: 'Free',
                booking_url: null,
                transport_to_next: 'Walk',
                travel_time_to_next: '5 mins',
                tips: 'Start early to avoid crowds.',
              },
            ],
            packing_suggestions: ['Sunscreen', 'Comfortable walking shoes', 'Water bottle'],
            safety_tips: ['Watch for pickpockets on La Rambla', 'Stay hydrated'],
          },
        }),
      });
    });

    // 1. Start on landing page
    await page.goto('/');
    await expect(page.getByTestId('landing-page')).toBeVisible();

    // 2. Click "Start Planning"
    await page.getByTestId('get-started-btn').click();
    await expect(page).toHaveURL(/\/trips\/new/);

    // 3. Fill in ship details
    await page.getByTestId('ship-name-input').fill('Explorer of the Seas');
    await page.getByTestId('cruise-line-input').fill('Royal Caribbean');

    // 4. Add a port
    await page.getByTestId('add-port-btn').click();
    await expect(page.getByTestId('port-entry-0')).toBeVisible();

    // 5. Fill user-facing port details
    await page.getByTestId('port-country-0').fill('Spain');

    // 6. Save the trip
    await page.getByTestId('save-trip-btn').click();
    await expect(page).toHaveURL(/\/trips\/[0-9a-f-]+$/);
    const tripMatch = page.url().match(/\/trips\/([0-9a-f-]+)$/);
    expect(tripMatch).not.toBeNull();
    const createdTripId = tripMatch![1];

    // 7. Verify trip detail page loaded
    await expect(page.getByTestId('trip-detail-page')).toBeVisible();
    await expect(page.getByTestId('trip-ship-name')).toHaveText('Explorer of the Seas');

    // 8. Click "Plan Day" for the first port
    await page.getByTestId('plan-port-btn-0').click();
    await expect(page).toHaveURL(new RegExp(`/trips/${createdTripId}/ports/[0-9a-f-]+/plan$`));
    const portMatch = page.url().match(/\/ports\/([0-9a-f-]+)\/plan$/);
    expect(portMatch).not.toBeNull();
    const createdPortId = portMatch![1];

    // 9. Select preferences
    await page.getByTestId('option-party_type-family').click();
    await page.getByTestId('option-activity_level-light').click();
    await page.getByTestId('option-transport_mode-walking').click();
    await page.getByTestId('option-budget-free').click();

    // 10. Generate plan
    await page.getByTestId('generate-plan-btn').click();
    await expect(page).toHaveURL(new RegExp(`/plans/${generatedPlanId}`));
    expect(generatedTripId).toBe(createdTripId);
    expect(generatedPortId).toBe(createdPortId);

    // 11. Verify plan content
    await expect(page.getByTestId('plan-title')).toHaveText('Barcelona Highlights');
    await expect(page.getByText('La Rambla Walk')).toBeVisible();

    // 12. Verify localStorage relationship integrity
    const persisted = await page.evaluate(
      ({ tripId, planId }) => {
        const trips = JSON.parse(localStorage.getItem('shoreexplorer_trips') || '{}');
        const plans = JSON.parse(localStorage.getItem('shoreexplorer_plans') || '{}');
        const trip = trips[tripId];
        const plan = plans[planId];
        const firstPortId = trip?.ports?.[0]?.port_id;
        return {
          tripExists: !!trip,
          planExists: !!plan,
          planTripId: plan?.trip_id,
          planPortId: plan?.port_id,
          firstPortId,
        };
      },
      { tripId: createdTripId, planId: generatedPlanId }
    );
    expect(persisted.tripExists).toBe(true);
    expect(persisted.planExists).toBe(true);
    expect(persisted.planTripId).toBe(createdTripId);
    expect(persisted.planPortId).toBe(persisted.firstPortId);
  });
});

test.describe('Full Journey — View Trips and Navigate', () => {
  test('user can view trip list, open a trip, and navigate back', async ({ page }) => {
    await mockAllApiRoutes(page, {
      trips: [buildTrip({ ports: [buildPort()] })],
      seedTrips: true,
    });

    // 1. Go to My Trips
    await page.goto('/trips');
    await expect(page.getByTestId('my-trips-page')).toBeVisible();

    // 2. Click on the first trip
    await page.getByTestId('trip-card-0').click();
    await expect(page).toHaveURL(/\/trips\/trip-e2e-001/);

    // 3. Verify trip detail
    await expect(page.getByTestId('trip-ship-name')).toHaveText('Symphony of the Seas');

    // 4. Navigate to edit
    await page.getByTestId('edit-trip-btn').click();
    await expect(page).toHaveURL(/\/edit/);

    // 5. Verify edit mode
    await expect(page.getByRole('heading', { name: /edit trip/i })).toBeVisible();
  });
});

test.describe('Full Journey — Delete Trip', () => {
  test('user can delete a trip from the detail page', async ({ page }) => {
    await mockAllApiRoutes(page, {
      trips: [buildTrip({ ports: [buildPort()] })],
      plans: [buildPlan()],
      seedTrips: true,
      seedPlans: true,
    });

    await page.goto(`/trips/${VALID_TRIP_ID}`);
    await expect(page.getByTestId('trip-detail-page')).toBeVisible();

    // Accept the confirm dialog
    page.on('dialog', (dialog) => dialog.accept());

    await page.getByTestId('delete-trip-btn').click();
    await expect(page).toHaveURL(/\/trips$/);

    const storesAfterDelete = await page.evaluate(() => ({
      trips: JSON.parse(localStorage.getItem('shoreexplorer_trips') || '{}'),
      plans: JSON.parse(localStorage.getItem('shoreexplorer_plans') || '{}'),
    }));
    expect(storesAfterDelete.trips[VALID_TRIP_ID]).toBeUndefined();
    const orphanedPlans = Object.values(storesAfterDelete.plans).filter(
      (plan: any) => plan.trip_id === VALID_TRIP_ID
    );
    expect(orphanedPlans).toHaveLength(0);
  });
});
