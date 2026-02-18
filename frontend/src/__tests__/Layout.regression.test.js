/**
 * Regression test for page transition animations
 * 
 * This test ensures that the Layout component does NOT import or use
 * framer-motion's AnimatePresence or motion.div for page transitions.
 * 
 * Issue: FE refreshing content on load
 * https://github.com/slatewave-labs/cruise-planner/issues/XX
 * 
 * The bug was caused by wrapping all page content in AnimatePresence
 * which created jarring fade-in/fade-out effects on every navigation.
 */
import fs from 'fs';
import path from 'path';

describe('Layout Component - Animation Regression Prevention', () => {
  const layoutPath = path.join(__dirname, '../components/Layout.js');
  let layoutSource;

  beforeAll(() => {
    layoutSource = fs.readFileSync(layoutPath, 'utf8');
  });

  test('Layout.js does NOT import AnimatePresence from framer-motion', () => {
    // Check that AnimatePresence is not imported
    expect(layoutSource).not.toMatch(/import\s+{[^}]*AnimatePresence[^}]*}\s+from\s+['"]framer-motion['"]/);
    expect(layoutSource).not.toMatch(/import\s+{\s*AnimatePresence\s*}/);
  });

  test('Layout.js does NOT import motion from framer-motion', () => {
    // Check that motion is not imported for use in this component
    // (Note: Other pages may use motion for intentional animations)
    expect(layoutSource).not.toMatch(/import\s+{[^}]*\bmotion\b[^}]*}\s+from\s+['"]framer-motion['"]/);
  });

  test('Layout.js does NOT use <AnimatePresence> component', () => {
    // Check for usage of AnimatePresence in JSX
    expect(layoutSource).not.toMatch(/<AnimatePresence/);
    expect(layoutSource).not.toMatch(/AnimatePresence>/);
  });

  test('Layout.js does NOT use <motion.div> for page transitions', () => {
    // Check for usage of motion.div in the main content area
    expect(layoutSource).not.toMatch(/<motion\.div/);
  });

  test('Layout.js does NOT have animation props (initial, animate, exit)', () => {
    // These props are specific to framer-motion animations
    const hasAnimationProps = 
      layoutSource.includes('initial={{') ||
      layoutSource.includes('animate={{') ||
      layoutSource.includes('exit={{');
    
    expect(hasAnimationProps).toBe(false);
  });

  test('Layout.js renders children directly in main element', () => {
    // Verify that children are rendered directly, not wrapped
    // Look for the pattern: <main ...>{children}</main>
    const mainContentPattern = /<main[^>]*>\s*{children}\s*<\/main>/s;
    expect(layoutSource).toMatch(mainContentPattern);
  });

  test('Layout.js does NOT have mode="wait" prop (AnimatePresence specific)', () => {
    // mode="wait" is specific to AnimatePresence
    expect(layoutSource).not.toMatch(/mode\s*=\s*["']wait["']/);
  });

  test('Layout component source has expected structure', () => {
    // Ensure the component still exists and exports correctly
    expect(layoutSource).toMatch(/export default function Layout/);
    expect(layoutSource).toMatch(/function Layout\s*\(\s*{\s*children\s*}\s*\)/);
  });
});
