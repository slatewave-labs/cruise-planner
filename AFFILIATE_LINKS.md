# Affiliate Links Configuration Guide

## Overview

ShoreExplorer supports affiliate link monetization through partnerships with major booking platforms. When users book activities via the generated day plans, the application owner earns commission on those bookings.

## How It Works

1. **AI-Generated URLs**: The Gemini AI generates booking URLs for activities in day plans
2. **Automatic Wrapping**: The backend automatically adds affiliate tracking parameters to supported URLs
3. **Transparent to Users**: Users see the same booking links but with affiliate parameters appended
4. **Commission Tracking**: Booking platforms track conversions and pay commissions to the affiliate

## Supported Booking Platforms

ShoreExplorer currently supports affiliate programs from the following booking platforms:

| Platform | Primary Use | Typical Commission |
|----------|------------|-------------------|
| **Viator** | Tours & Activities | 5-8% |
| **GetYourGuide** | Tours & Experiences | 8-10% |
| **Klook** | Activities & Attractions | 4-6% |
| **TripAdvisor** | Experiences & Tours | 5-7% |
| **Booking.com** | Hotels & Accommodations | 3-4% |

## Configuration

### Environment Variables

To enable affiliate links, set the following environment variables in your backend `.env` file:

```bash
# Viator Affiliate Program
VIATOR_AFFILIATE_ID=your-viator-affiliate-id

# GetYourGuide Partner Program
GETYOURGUIDE_AFFILIATE_ID=your-getyourguide-partner-id

# Klook Affiliate Program
KLOOK_AFFILIATE_ID=your-klook-affiliate-id

# TripAdvisor Affiliate Program
TRIPADVISOR_AFFILIATE_ID=your-tripadvisor-affiliate-id

# Booking.com Affiliate Program
BOOKING_AFFILIATE_ID=your-booking-affiliate-id
```

### Getting Affiliate IDs

1. **Viator** - Apply at [Viator Affiliate Program](https://www.viator.com/affiliate)
2. **GetYourGuide** - Apply at [GetYourGuide Partner Program](https://partner.getyourguide.com/)
3. **Klook** - Apply at [Klook Affiliate Program](https://www.klook.com/affiliate/)
4. **TripAdvisor** - Apply at [TripAdvisor Affiliate Program](https://www.tripadvisor.com/Affiliates)
5. **Booking.com** - Apply at [Booking.com Affiliate Partner Program](https://www.booking.com/affiliate)

### Optional Configuration

Affiliate links work without any configuration:
- **Without IDs configured**: URLs are passed through unchanged
- **With IDs configured**: Affiliate parameters are automatically added
- **Partial configuration**: Only configured platforms get affiliate parameters

## Technical Details

### URL Processing

The system processes booking URLs as follows:

1. **Domain Detection**: Extracts the domain from the booking URL
2. **Partner Matching**: Checks if the domain matches a configured affiliate partner
3. **Parameter Addition**: Adds affiliate tracking parameters to the URL query string
4. **Preservation**: Maintains all existing URL parameters

Example transformation:
```
Original: https://www.viator.com/tours/Rome/Colosseum-Tour/d511-12345
With Affiliate: https://www.viator.com/tours/Rome/Colosseum-Tour/d511-12345?aid=your-affiliate-id&mcid=cruise-planner-app
```

### Implementation

The affiliate link system is implemented in `/backend/affiliate_config.py`:

- `get_affiliate_config(domain)` - Returns affiliate configuration for a domain
- `add_affiliate_params(url)` - Adds affiliate parameters to a URL
- `process_plan_activities(activities)` - Processes all activities in a plan

The system is integrated into plan generation in `/backend/server.py`:
- Processes activities after AI generation
- Adds affiliate parameters before saving to database
- Preserves original URLs if no affiliate program exists

## Monitoring & Analytics

### Tracking Conversions

Each booking platform provides an affiliate dashboard where you can track:
- Click-through rates
- Conversion rates
- Commission earnings
- Popular activities

### Best Practices

1. **Join Multiple Programs**: Don't rely on a single platform
2. **Monitor Performance**: Regularly check which platforms convert best
3. **Update IDs**: Keep affiliate IDs current and active
4. **Compliance**: Follow each platform's terms and conditions
5. **Transparency**: Consider adding a disclosure to your app's terms

## Testing

To test affiliate links:

1. Set test affiliate IDs in your `.env` file
2. Generate a day plan
3. Inspect the `booking_url` fields in the response
4. Verify affiliate parameters are present

Example test:
```bash
# Set test affiliate ID
export VIATOR_AFFILIATE_ID=test-123

# Generate a plan and check the booking URLs
curl -X POST http://localhost:8001/api/plans/generate \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: test-device" \
  -d '{
    "trip_id": "...",
    "port_id": "...",
    "preferences": {...}
  }' | jq '.plan.activities[].booking_url'
```

## Troubleshooting

### URLs Not Getting Affiliate Parameters

**Problem**: Booking URLs don't have affiliate parameters

**Solutions**:
1. Verify environment variables are set correctly
2. Check that the domain matches supported platforms
3. Ensure the URL is properly formatted (includes https://)
4. Check logs for any errors in URL processing

### Affiliate ID Not Working

**Problem**: Clicks aren't showing in affiliate dashboard

**Solutions**:
1. Verify the affiliate ID is correct
2. Check that your affiliate account is active
3. Allow 24-48 hours for tracking data to appear
4. Test with a known working URL from the platform

### AI Not Generating Supported URLs

**Problem**: AI generates URLs from unsupported platforms

**Solutions**:
1. The AI prompt includes preferred platforms
2. Consider adding more specific instructions to the prompt
3. Remember: Not all activities will have affiliate options

## Future Enhancements

Potential improvements to the affiliate system:

- [ ] Deep linking support for mobile apps
- [ ] A/B testing of different affiliate platforms
- [ ] Custom tracking parameters for analytics
- [ ] Affiliate link analytics dashboard
- [ ] Support for additional booking platforms
- [ ] Automatic commission tracking

## Legal Considerations

1. **Disclosure**: Add affiliate disclosure to Terms & Conditions
2. **Privacy**: Include affiliate tracking in Privacy Policy
3. **Compliance**: Follow FTC guidelines for affiliate marketing
4. **Terms**: Comply with each platform's affiliate terms

Example disclosure:
> "ShoreExplorer may earn commission on bookings made through links in generated day plans. This does not affect the price you pay."

## Support

For questions about affiliate configuration:
- Check platform documentation
- Contact affiliate program support
- Review `/backend/affiliate_config.py` for implementation details
- Test with environment variables before deploying
