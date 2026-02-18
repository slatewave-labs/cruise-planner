# Layout Component Tests

This directory contains comprehensive tests for the Layout component, including regression tests to prevent the reintroduction of jarring page transition animations.

## Test Files

### Layout.test.js
Comprehensive unit tests for the Layout component covering:
- **Basic Rendering**: Verifies the component renders without errors
- **Navigation Items**: Tests all navigation links (desktop and mobile)
- **No Animation Wrappers**: Ensures children are rendered directly without animation wrappers (regression prevention)
- **Content Rendering**: Tests various content rendering scenarios
- **Route Changes**: Verifies content updates correctly on route changes
- **Accessibility**: Tests semantic HTML and accessibility features

**Key Regression Tests:**
- `children are rendered directly in main element without animation wrapper` - Verifies no wrapper divs exist between main and children
- `main element does not contain framer-motion animation wrapper` - Ensures no framer-motion artifacts
- `component structure matches expected DOM hierarchy` - Validates the exact DOM structure

### Layout.regression.test.js
Static source code analysis tests that prevent regression by checking:
- Layout.js does NOT import `AnimatePresence` from framer-motion
- Layout.js does NOT import `motion` from framer-motion
- Layout.js does NOT use `<AnimatePresence>` component in JSX
- Layout.js does NOT use `<motion.div>` for page transitions
- Layout.js does NOT have animation props (`initial`, `animate`, `exit`)
- Layout.js renders children directly in main element
- Layout.js does NOT have `mode="wait"` prop (AnimatePresence-specific)

These tests analyze the actual source code of Layout.js to ensure that no animation-related imports or usage are present.

## Why These Tests Matter

### The Original Bug
The Layout component was wrapping all page content in framer-motion's `AnimatePresence` and `motion.div`, causing:
- Jarring fade-in effects when navigating between pages
- Content appearing to "refresh" on page load
- Poor user experience with unnecessary animations

### Prevention Strategy
These tests ensure that:
1. **Runtime tests** (Layout.test.js) verify the component behaves correctly and renders children directly
2. **Static analysis tests** (Layout.regression.test.js) ensure the source code doesn't contain animation-related code

If anyone tries to reintroduce page transition animations in the Layout component, these tests will fail immediately.

## Running the Tests

```bash
# Run all Layout tests
npm test -- Layout

# Run only Layout component tests
npm test -- --testPathPattern=Layout.test.js

# Run only regression tests
npm test -- --testPathPattern=Layout.regression.test.js

# Run with coverage
npm test -- --coverage --testPathPattern=Layout
```

## What's Still Allowed

These tests only prevent animations **in the Layout component** for page transitions. Other components can still use framer-motion for:
- Landing page hero animations
- Feature card scroll animations
- MyTrips page card stagger effects
- Any other intentional, contextual animations

The key distinction: **Page-level transitions = bad**, **Feature-specific animations = good**

## Related Issues

- Issue: FE refreshing content on load
- PR: Remove page transition animations causing jarring content refresh
- Commit: b6a5428 - Remove page transition animations from Layout component
