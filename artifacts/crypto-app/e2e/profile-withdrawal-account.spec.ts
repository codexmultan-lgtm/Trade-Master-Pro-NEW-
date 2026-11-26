import { expect, test } from "@playwright/test";

test("user profile displays the current saved withdrawal account", async ({ page }) => {
  const user = {
    id: "507f1f77bcf86cd799439011",
    name: "Demo user",
    email: "demo@example.invalid",
    role: "user",
    status: "active",
    balance: 1000,
    totalDeposited: 1000,
    totalWithdrawn: 0,
    totalProfit: 0,
    totalLoss: 0,
    createdAt: "2026-01-01T00:00:00Z",
    profileHealth: 100,
  };
  let accountNumber = "00998877";
  await page.addInitScript(() => {
    localStorage.setItem("crypto_token", "profile-test-fixture");
    localStorage.setItem("crypto_user", JSON.stringify({
      id: "507f1f77bcf86cd799439011", name: "Demo user",
      email: "demo@example.invalid", role: "user", status: "active",
    }));
  });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ json: user });
    if (path === "/api/wallet/withdrawal-account") {
      return route.fulfill({ json: {
        currency: "PKR", accountTitle: "Demo Bank", accountHolderName: "Demo Holder",
        accountNumber,
      } });
    }
    if (path === "/api/settings") {
      return route.fulfill({ json: { currency: "PKR", currencySymbol: "₨", enabledSymbols: [] } });
    }
    if (path === "/api/notifications/unread-count") return route.fulfill({ json: { count: 0 } });
    return route.fulfill({ json: [] });
  });

  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  await expect(page.getByText("Withdrawal Account", { exact: true })).toBeVisible();
  const accountNumberRow = page.locator("dl > div").filter({ hasText: "Account number:" });
  await expect(accountNumberRow).toContainText("00998877");
  await expect(page.getByText("Demo Holder", { exact: true })).toBeVisible();

  accountNumber = "00112233";
  await page.reload();
  await expect(accountNumberRow).toContainText("00112233");
});
