import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/index.js";
import { connectDB, disconnectDB } from "../src/lib/db.js";

describe("Health Check API", () => {
  before(async () => {
    process.env.NODE_ENV = "test";
    await connectDB();
  });

  after(async () => {
    await disconnectDB();
  });

  it("GET /api/health returns 200 with status ok and connected database", async () => {
    const res = await request(app).get("/api/health");

    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
    assert.equal(typeof res.body.uptime, "number");
    assert.equal(res.body.database, "connected");
  });
});
