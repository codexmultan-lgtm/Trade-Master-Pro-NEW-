import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import adminRouter from "../src/routes/admin.js";
import walletRouter from "../src/routes/wallet.js";
import { generateToken } from "../src/middlewares/auth.js";
import { User } from "../src/models/User.js";
import { Transaction } from "../src/models/Transaction.js";
import { Notification } from "../src/models/Notification.js";
import { PlatformSettings } from "../src/models/PlatformSettings.js";

// Always uses a new disposable MongoDB. Never reads MONGODB_URI or touches live data.
let mongo: MongoMemoryServer;
let server: ReturnType<express.Express["listen"]>;
let base: string;
const adminToken = generateToken(new mongoose.Types.ObjectId().toString(), "admin");

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: "withdrawal_account_test" });
  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminRouter);
  app.use("/api/wallet", walletRouter);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  if (mongoose.connection.readyState) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (mongo) await mongo.stop();
});

async function request(path: string, token: string | null = adminToken, body?: unknown) {
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? "GET" : "PATCH",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json() };
}

test("admin edit persists, demo withdrawal approval works, and demo data is rolled back", async () => {
  const user = await User.create({
    name: "Temporary withdrawal test", email: "withdrawal-test@example.invalid",
    password: "temporary-test-only", balance: 1000, totalDeposited: 1000,
    withdrawalAccount: { currency: "PKR", accountTitle: "Demo Bank", accountHolderName: "Demo Holder", accountNumber: "00112233" },
  });
  const id = user._id.toString();
  const userToken = generateToken(id, "user");
  const path = `/admin/users/${id}/withdrawal-account`;
  try {
    const old = await Transaction.create({
      userId: user._id, type: "withdrawal", amount: 10, status: "pending",
      method: "bank_transfer", accountDetails: "Demo Bank | 00112233 | Demo Holder",
    });
    assert.equal((await request(path, null)).status, 401);
    assert.equal((await request(path, userToken)).status, 403);
    assert.equal((await request(path, userToken, { accountNumber: "009900" })).status, 403);
    assert.equal((await request(path)).data.accountNumber, "00112233");

    for (const body of [{}, { accountNumber: "" }, { accountNumber: "   " }, { accountNumber: 123 },
      { accountNumber: null }, { accountNumber: "x".repeat(129) }, { accountNumber: "001234", balance: 99999 }]) {
      assert.equal((await request(path, adminToken, body)).status, 400);
    }
    const update = await request(path, adminToken, { accountNumber: "  00998877  " });
    assert.equal(update.status, 200);
    assert.equal(update.data.accountNumber, "00998877");
    assert.equal(update.data.accountHolderName, "Demo Holder");
    assert.equal(update.data.accountTitle, "Demo Bank");
    assert.equal(update.data.currency, "PKR");
    assert.equal((await User.findById(id))!.balance, 1000);
    assert.equal((await Transaction.findById(old._id))!.accountDetails, old.accountDetails);
    const saved = await request("/wallet/withdrawal-account", userToken);
    assert.equal(saved.data.accountNumber, "00998877");
    assert.equal((await request(path)).data.accountNumber, "00998877");

    // Use the existing user's withdrawal endpoint, then the existing admin approval endpoint.
    const withdrawal = await fetch(`${base}/wallet/withdraw`, {
      method: "POST",
      headers: { Authorization: `Bearer ${userToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 100, method: "bank_transfer",
        accountDetails: `${saved.data.accountTitle} | ${saved.data.accountNumber} | ${saved.data.accountHolderName}` }),
    });
    assert.equal(withdrawal.status, 201);
    const tx = await withdrawal.json();
    assert.match(tx.accountDetails, /00998877/);
    assert.equal(tx.status, "pending");
    assert.equal((await User.findById(id))!.balance, 1000, "existing pending-withdrawal balance behavior is preserved");
    const approved = await request(`/admin/transactions/${tx.id}/approve`, adminToken, {});
    assert.equal(approved.status, 200);
    assert.equal(approved.data.status, "approved");
    const afterApproval = (await User.findById(id))!;
    assert.equal(afterApproval.balance, 900);
    assert.equal(afterApproval.totalWithdrawn, 100);
    assert.equal(afterApproval.totalDeposited, 1000);
    assert.equal(await Notification.countDocuments({ userId: user._id, type: "withdrawal_status" }), 1);
    // A later correction must not rewrite even an approved withdrawal.
    assert.equal((await request(path, adminToken, { accountNumber: "00112233" })).status, 200);
    assert.match((await Transaction.findById(tx.id))!.accountDetails!, /00998877/);
  } finally {
    await Notification.deleteMany({ userId: user._id });
    await Transaction.deleteMany({ userId: user._id });
    await User.deleteOne({ _id: user._id });
    await PlatformSettings.deleteMany({});
    assert.equal(await User.countDocuments({ _id: user._id }), 0);
    assert.equal(await Transaction.countDocuments({ userId: user._id }), 0);
    assert.equal(await Notification.countDocuments({ userId: user._id }), 0);
  }
});

test("all numbered currencies preserve details; missing and USDT accounts cannot be overwritten", async () => {
  const user = await User.create({ name: "Account cases", email: "account-cases@example.invalid", password: "temporary-test-only" });
  const path = `/admin/users/${user._id}/withdrawal-account`;
  try {
    assert.equal((await request(path)).data, null);
    assert.equal((await request(path, adminToken, { accountNumber: "00123" })).status, 400);
    for (const account of [
      { currency: "INR", accountType: "bank", accountHolder: "Demo", bankName: "Bank", ifscNumber: "DEMO123", accountNumber: "001" },
      { currency: "INR", accountType: "wallet", accountHolder: "Demo", accountName: "UPI", accountNumber: "demo@upi" },
      ...["PKR", "NPR", "PHP"].map((currency) => ({ currency, accountTitle: "Bank", accountHolderName: "Demo", accountNumber: "001" })),
    ]) {
      await User.updateOne({ _id: user._id }, { $set: { withdrawalAccount: account } });
      const result = await request(path, adminToken, { accountNumber: "000updated123" });
      assert.equal(result.status, 200);
      assert.deepEqual(result.data, { ...account, accountNumber: "000updated123" });
    }
    await User.updateOne({ _id: user._id }, { $set: { withdrawalAccount: { currency: "USDT", walletAddress: "demo-wallet-address" } } });
    assert.equal((await request(path, adminToken, { accountNumber: "00123" })).status, 400);
    assert.equal((await request(path)).data.walletAddress, "demo-wallet-address");
    assert.equal((await request("/admin/users/not-an-id/withdrawal-account")).status, 400);
    const missing = `/admin/users/${new mongoose.Types.ObjectId()}/withdrawal-account`;
    assert.equal((await request(missing)).status, 404);
    assert.equal((await request(missing, adminToken, { accountNumber: "00123" })).status, 404);
  } finally {
    await User.deleteOne({ _id: user._id });
  }
});
