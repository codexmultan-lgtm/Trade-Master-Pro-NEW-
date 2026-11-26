import { expect, test, type Page } from "@playwright/test";

const userId = "507f1f77bcf86cd799439011";
const user = {
  id: userId, name: "Demo user", email: "demo@example.invalid", role: "user",
  status: "active", balance: 1000, totalDeposited: 1000, totalWithdrawn: 0,
  totalProfit: 0, totalLoss: 0, createdAt: "2026-01-01T00:00:00Z", profileHealth: 100,
};
const originalAccount = {
  currency: "PKR", accountTitle: "Demo Bank", accountHolderName: "Demo Holder", accountNumber: "00112233",
};

async function setup(page: Page, initial: Record<string, string> | null = originalAccount, failSave = false) {
  let saved = initial;
  const writes: unknown[] = [];
  const admin = { ...user, id: "507f1f77bcf86cd799439012", role: "admin" };
  await page.addInitScript((session) => {
    localStorage.setItem("crypto_token", "admin-ui-test-fixture");
    localStorage.setItem("crypto_user", JSON.stringify(session));
  }, admin);
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ json: admin });
    if (path === `/api/admin/users/${userId}/withdrawal-account`) {
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON();
        writes.push(body);
        if (failSave) return route.fulfill({ status: 400, json: { error: "Demo save rejected" } });
        saved = { ...saved, ...body };
      }
      return route.fulfill({ json: saved });
    }
    if (path === `/api/admin/users/${userId}`) {
      return route.fulfill({ json: { user, recentTrades: [], recentTransactions: [] } });
    }
    if (path === "/api/settings") return route.fulfill({ json: { currency: "PKR", currencySymbol: "₨", enabledSymbols: [] } });
    if (path === "/api/notifications/unread-count") return route.fulfill({ json: { count: 0 } });
    return route.fulfill({ json: [] });
  });
  await page.goto(`/admin/users/${userId}`);
  await expect(page.getByRole("heading", { name: "User Details" })).toBeVisible();
  return { writes };
}

test("admin saves the number, cancels edits, and sees saved data after reload", async ({ page }) => {
  const { writes } = await setup(page);
  const input = page.getByLabel("Withdrawal account number");
  const save = page.getByRole("button", { name: "Save account number" });
  await expect(input).toHaveValue("00112233");
  await expect(save).toBeDisabled();
  await input.fill("00998877");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(input).toHaveValue("00112233");
  expect(writes).toHaveLength(0);
  await input.fill("00998877");
  await save.click();
  await expect(page.getByText("Withdrawal account number updated", { exact: true })).toBeVisible();
  expect(writes).toEqual([{ accountNumber: "00998877" }]);
  await expect(save).toBeDisabled();
  await page.reload();
  await expect(input).toHaveValue("00998877");
  await expect(page.getByText("Demo Holder", { exact: true })).toBeVisible();
  await expect(page.getByText(/Existing transactions and all other account details stay unchanged/)).toBeVisible();
});

test("invalid blank input cannot save and a failed request retains the draft", async ({ page }) => {
  const { writes } = await setup(page, originalAccount, true);
  const input = page.getByLabel("Withdrawal account number");
  await input.fill("   ");
  await expect(page.getByRole("button", { name: "Save account number" })).toBeDisabled();
  await input.fill("00998877");
  await page.getByRole("button", { name: "Save account number" }).click();
  await expect(page.getByText("Demo save rejected", { exact: true })).toBeVisible();
  await expect(input).toHaveValue("00998877");
  expect(writes).toHaveLength(1);
});

test("missing accounts and USDT accounts are read-only", async ({ page }) => {
  await setup(page, null);
  await expect(page.getByText("This user has not saved a withdrawal account.")).toBeVisible();
  await expect(page.getByLabel("Withdrawal account number")).toHaveCount(0);
  await setup(page, { currency: "USDT", walletAddress: "demo-wallet-address" });
  await expect(page.getByText("USDT uses a wallet address, not an account number.")).toBeVisible();
  await expect(page.getByLabel("Withdrawal account number")).toHaveCount(0);
});

test("admin account editor fits a narrow phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await setup(page);
  await expect(page.getByLabel("Withdrawal account number")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
