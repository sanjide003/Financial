# Lighthouse / Accessibility / Performance Audit Checklist

## Lighthouse targets
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- PWA installability: pass

## Manual accessibility checks
- Keyboard navigation for profile menu, bottom nav, modals.
- Form labels and focus states.
- Color contrast for status badges and action buttons.
- Screen-reader text for icon-only buttons.

## Performance checks
- App shell loads under 2 seconds on mid-range mobile network.
- Service worker caches app shell.
- Firebase listeners do not duplicate after auth state changes.

## Current repo support
- Static E2E smoke checks exist in `tests/e2e-static.test.js`.
- CI runs `npm run check`.
