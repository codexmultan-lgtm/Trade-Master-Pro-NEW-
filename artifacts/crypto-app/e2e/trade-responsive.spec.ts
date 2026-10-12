import { expect, test, type Page } from "@playwright/test";

const viewportCases = [
  { name: "320px phone", width: 320, height: 740 },
  { name: "360px phone", width: 360, height: 800 },
  { name: "phone landscape", width: 740, height: 360 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const marketFixtures = [
  {
    symbol: "EXTRALONGASSETNAMETHATSHOULDWRAPUSDT",
    baseAsset: "EXTRALONGASSETNAMETHATSHOULDWRAP",
    quoteAsset: "USDT",
    lastPrice: 987654321.123456,
    change24h: -99.99,
    high24h: 999999999,
    low24h: 0.000001,
    volume24h: 123456789,
  },
  {
    symbol: "BTCUSDT",
    baseAsset: "BTC",
    quoteAsset: "USDT",
    lastPrice: 67234.12,
    change24h: 2.45,
    high24h: 68000,
    low24h: 65000,
    volume24h: 1000000,
  },
];

function fixtureUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "responsive-fixture-user",
    name: "Responsive Fixture",
    email: "responsive-fixture@example.invalid",
    role: "user",
    status: "active",
    balance: 10000,
    createdAt: "2026-01-01T00:00:00.000Z",
    tradeBanned: false,
    ...overrides,
  };
}

async function installFixtureApi(page: Page, userOverrides: Record<string, unknown> = {}) {
  const user = fixtureUser(userOverrides);
  await page.addInitScript((sessionUser) => {
    // Seed the same local session fields read by AuthProvider. Production auth
    // and route guards remain active; only the network responses are fixtures.
    localStorage.setItem("crypto_token", "e2e-fixture-token");
    localStorage.setItem("crypto_user", JSON.stringify(sessionUser));
  }, user);

  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/me") {
      return route.fulfill({ json: user });
    }
    if (pathname === "/api/settings") {
      return route.fulfill({
        json: {
          currency: "USD",
          currencySymbol: "$",
          profit60s: 85,
          profit120s: 80,
          profit180s: 75,
          profit240s: 70,
          lossPercent: 100,
          minTradeAmount: 100,
          maxTradeAmount: 100000,
          enabledSymbols: marketFixtures.map((market) => market.symbol),
        },
      });
    }
    if (pathname === "/api/markets") {
      return route.fulfill({ json: marketFixtures });
    }
    if (/^\/api\/markets\/[^/]+\/candles$/.test(pathname)) {
      const candles = Array.from({ length: 48 }, (_, index) => {
        const close = 67000 + index * 3;
        return {
          time: 1760000000 + index * 60,
          open: close - 8,
          high: close + 12,
          low: close - 14,
          close,
          volume: 100 + index,
        };
      });
      return route.fulfill({ json: candles });
    }
    if (/^\/api\/markets\/[^/]+\/price$/.test(pathname)) {
      return route.fulfill({ json: { price: 987654321.123456, change24h: 3.21 } });
    }
    if (pathname === "/api/trades/active") {
      return route.fulfill({ json: [] });
    }
    if (pathname === "/api/notifications/unread-count") {
      return route.fulfill({ json: { count: 0 } });
    }

    // These pages do not need other API behavior. Keep incidental queries
    // deterministic without touching the real API server or database.
    return route.fulfill({ json: [] });
  });
}

async function expectNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document, `document width ${dimensions.document} exceeds viewport ${dimensions.viewport}`).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.body, `body width ${dimensions.body} exceeds viewport ${dimensions.viewport}`).toBeLessThanOrEqual(dimensions.viewport);
}

for (const viewport of viewportCases) {
  test(`trade screen fits without global overflow at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await installFixtureApi(page);
    await page.goto("/trade/BTCUSDT");

    await expect(page.getByRole("heading", { name: "BTC/USDT" })).toBeVisible();
    await expect(page.locator(".trade-chart-container canvas").first()).toBeVisible();
    await expectNoPageOverflow(page);

    const chartLayout = await page.locator(".trade-chart-container").evaluate((container) => {
      const canvas = container.querySelector("canvas");
      const parent = container.getBoundingClientRect();
      const chart = canvas?.getBoundingClientRect();
      return {
        parentWidth: parent.width,
        parentHeight: parent.height,
        chartWidth: chart?.width ?? 0,
        chartHeight: chart?.height ?? 0,
        clientWidth: container.clientWidth,
        scrollWidth: container.scrollWidth,
      };
    });
    expect(chartLayout.parentWidth).toBeGreaterThan(0);
    expect(chartLayout.parentHeight).toBeGreaterThan(0);
    expect(chartLayout.chartWidth).toBeGreaterThan(0);
    expect(chartLayout.chartWidth).toBeLessThanOrEqual(chartLayout.clientWidth + 1);
    expect(chartLayout.chartHeight).toBeGreaterThan(0);
    expect(chartLayout.scrollWidth).toBeLessThanOrEqual(chartLayout.clientWidth + 1);

    const actionBar = page.locator(".trade-actions");
    const bottomNav = page.locator(".trade-bottom-nav nav");
    await actionBar.scrollIntoViewIfNeeded();
    const [actionsBox, navBox] = await Promise.all([actionBar.boundingBox(), bottomNav.boundingBox()]);
    expect(actionsBox).not.toBeNull();
    expect(navBox).not.toBeNull();
    expect(actionsBox!.y + actionsBox!.height).toBeLessThanOrEqual(navBox!.y + 1);
  });

  test(`markets screen contains long symbols and prices at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await installFixtureApi(page);
    await page.goto("/trade");

    const longMarket = page.getByRole("link", { name: /EXTRALONGASSETNAMETHATSHOULDWRAP/ });
    await expect(longMarket).toBeVisible();
    await expect(longMarket).toContainText("987,654,321");
    await expectNoPageOverflow(page);

    const linkBounds = await longMarket.boundingBox();
    expect(linkBounds).not.toBeNull();
    expect(linkBounds!.x).toBeGreaterThanOrEqual(0);
    expect(linkBounds!.x + linkBounds!.width).toBeLessThanOrEqual(viewport.width + 1);
  });
}

test("chart surface resizes when the viewport changes", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await installFixtureApi(page);
  await page.goto("/trade/BTCUSDT");
  const chartCanvas = page.locator(".trade-chart-container canvas").first();
  await expect(chartCanvas).toBeVisible();
  const narrowWidth = await chartCanvas.evaluate((canvas) => canvas.getBoundingClientRect().width);

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect.poll(() => chartCanvas.evaluate((canvas) => canvas.getBoundingClientRect().width)).toBeGreaterThan(narrowWidth + 100);
  await expectNoPageOverflow(page);
});

test("banned accounts see the trading notice instead of trade actions", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await installFixtureApi(page, {
    tradeBanned: true,
    tradeBanReason: "Trading is disabled during a compliance review.",
  });
  await page.goto("/trade/BTCUSDT");

  await expect(page.getByText("Trading Disabled")).toBeVisible();
  await expect(page.getByText("Trading is disabled during a compliance review.")).toBeVisible();
  await expect(page.getByRole("button", { name: /BUY UP/ })).toHaveCount(0);
  await expectNoPageOverflow(page);
});

test("short-screen confirmation sheet scrolls and its close target remains usable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 360 });
  await installFixtureApi(page);
  await page.goto("/trade/BTCUSDT");
  await page.getByRole("button", { name: /BUY UP/ }).click();

  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  const closeButton = sheet.getByRole("button", { name: "Close" });
  await expect(closeButton).toBeVisible();
  const closeBounds = await closeButton.boundingBox();
  expect(closeBounds).not.toBeNull();
  expect(closeBounds!.width).toBeGreaterThanOrEqual(44);
  expect(closeBounds!.height).toBeGreaterThanOrEqual(44);

  await closeButton.click();
  await expect(sheet).toBeHidden();

  await page.getByRole("button", { name: /BUY DOWN/ }).click();
  await expect(sheet).toBeVisible();
  const confirmButton = sheet.getByRole("button", { name: "CONFIRM" });
  const scrollState = await sheet.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY,
  }));
  expect(scrollState.scrollHeight).toBeGreaterThan(scrollState.clientHeight);
  expect(["auto", "scroll"]).toContain(scrollState.overflowY);

  await confirmButton.scrollIntoViewIfNeeded();
  const confirmBounds = await confirmButton.boundingBox();
  expect(confirmBounds).not.toBeNull();
  expect(confirmBounds!.y).toBeGreaterThanOrEqual(0);
  expect(confirmBounds!.y + confirmBounds!.height).toBeLessThanOrEqual(360);
});
