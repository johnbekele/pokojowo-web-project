import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home page passes automated semantic accessibility checks', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="viewport"]')).not.toHaveAttribute('content', /maximum-scale\s*=\s*1/);
  await expect(page.locator('main, #root')).toBeVisible();

  const results = await new AxeBuilder({ page })
    // The editorial palette has a separate design-token contrast audit. Keep
    // this CI gate deterministic while still covering names, labels, images,
    // landmarks, and ARIA semantics on every build.
    .withRules([
      'aria-allowed-attr',
      'aria-allowed-role',
      'aria-command-name',
      'aria-hidden-body',
      'aria-hidden-focus',
      'aria-input-field-name',
      'aria-meter-name',
      'aria-progressbar-name',
      'aria-required-attr',
      'aria-required-children',
      'aria-required-parent',
      'aria-roles',
      'aria-toggle-field-name',
      'aria-tooltip-name',
      'aria-treeitem-name',
      'button-name',
      'document-title',
      'html-has-lang',
      'image-alt',
      'input-button-name',
      'input-image-alt',
      'label',
      'link-name',
      'meta-viewport',
    ])
    .analyze();

  const seriousOrCritical = results.violations.filter((violation) =>
    ['serious', 'critical'].includes(violation.impact),
  );

  expect(seriousOrCritical, seriousOrCritical
    .map(({ id, impact, help, nodes }) => `${impact} ${id}: ${help} (${nodes.length} nodes)`)
    .join('\n')).toEqual([]);
});
