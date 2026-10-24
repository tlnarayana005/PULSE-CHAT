import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/index.js";
import { connectDB, disconnectDB } from "../src/lib/db.js";

describe("Authentication API", () => {
  before(async () => {
    await connectDB();
  });

  after(async () => {
    await disconnectDB();
  });

  const uniqueEmail = `testuser_${Date.now()}@example.com`;

  describe("POST /api/auth/signup", () => {
    it("should successfully register a new user and return a JWT cookie", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          fullName: "Test User",
          email: uniqueEmail,
          password: "password123",
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.fullName, "Test User");
      assert.equal(res.body.email, uniqueEmail);
      assert.ok(res.body._id);

      // Verify HTTP-only cookie was set
      const cookies = res.headers["set-cookie"];
      assert.ok(cookies);
      assert.ok(cookies.some((c) => c.startsWith("jwt=")));
    });

    it("should reject registration with duplicate email", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          fullName: "Another User",
          email: uniqueEmail,
          password: "password123",
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.message, "Email already exists");
    });

    it("should reject registration with invalid email format", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          fullName: "Invalid Email User",
          email: "not-an-email",
          password: "password123",
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.message, "Invalid email format");
    });

    it("should reject registration with password shorter than 6 characters", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          fullName: "Short Password User",
          email: `short_${Date.now()}@example.com`,
          password: "123",
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.message, "Password must be at least 6 characters");
    });

    it("should reject registration with missing fields", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          email: "missing_fields@example.com",
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.message, "All fields are required");
    });
  });

  describe("POST /api/auth/login", () => {
    it("should successfully log in seeded user and return a JWT cookie", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "alice@example.com",
          password: "123456",
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.email, "alice@example.com");
      assert.equal(res.body.fullName, "Alice Johnson");

      const cookies = res.headers["set-cookie"];
      assert.ok(cookies);
      assert.ok(cookies.some((c) => c.startsWith("jwt=")));
    });

    it("should reject login with wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "alice@example.com",
          password: "wrongpassword",
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.message, "Invalid credentials");
    });

    it("should reject login with non-existent email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "password123",
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.message, "Invalid credentials");
    });
  });

  describe("Protected Routes & Session", () => {
    it("GET /api/auth/check should return 401 when no token is provided", async () => {
      const res = await request(app).get("/api/auth/check");
      assert.equal(res.status, 401);
      assert.equal(res.body.message, "Unauthorized - No Token Provided");
    });

    it("GET /api/auth/check should return user data when authenticated via cookie", async () => {
      // First log in to obtain cookie
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "bob@example.com",
          password: "123456",
        });

      const cookie = loginRes.headers["set-cookie"];

      const checkRes = await request(app)
        .get("/api/auth/check")
        .set("Cookie", cookie);

      assert.equal(checkRes.status, 200);
      assert.equal(checkRes.body.email, "bob@example.com");
      assert.equal(checkRes.body.fullName, "Bob Smith");
    });

    it("POST /api/auth/logout should clear JWT cookie and return 200", async () => {
      const res = await request(app).post("/api/auth/logout");
      assert.equal(res.status, 200);
      assert.equal(res.body.message, "Logged out successfully");

      const cookies = res.headers["set-cookie"];
      assert.ok(cookies);
      assert.ok(cookies.some((c) => c.includes("jwt=;") || c.includes("jwt=; Max-Age=0")));
    });
  });
});
