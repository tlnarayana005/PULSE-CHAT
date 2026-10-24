import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/index.js";
import { connectDB, disconnectDB } from "../src/lib/db.js";

describe("Messages API", () => {
  let aliceCookie;
  let aliceUser;
  let bobCookie;
  let bobUser;
  let charlieCookie;
  let charlieUser;
  let sentMessageId;

  before(async () => {
    await connectDB();

    // Log in Alice
    const aliceRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@example.com", password: "123456" });
    aliceCookie = aliceRes.headers["set-cookie"];
    aliceUser = aliceRes.body;

    // Log in Bob
    const bobRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "bob@example.com", password: "123456" });
    bobCookie = bobRes.headers["set-cookie"];
    bobUser = bobRes.body;

    // Log in Charlie
    const charlieRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "charlie@example.com", password: "123456" });
    charlieCookie = charlieRes.headers["set-cookie"];
    charlieUser = charlieRes.body;
  });

  after(async () => {
    await disconnectDB();
  });

  describe("GET /api/messages/users", () => {
    it("should return 401 when accessed without token", async () => {
      const res = await request(app).get("/api/messages/users");
      assert.equal(res.status, 401);
      assert.equal(res.body.message, "Unauthorized - No Token Provided");
    });

    it("should return list of sidebar contacts excluding the logged-in user", async () => {
      const res = await request(app)
        .get("/api/messages/users")
        .set("Cookie", aliceCookie);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      // Alice should not see herself in the sidebar
      assert.ok(!res.body.some((u) => u._id === aliceUser._id));
      // Should contain Bob
      assert.ok(res.body.some((u) => u._id === bobUser._id));
    });
  });

  describe("POST /api/messages/send/:id", () => {
    it("should reject message if receiver ID is not a valid ObjectId", async () => {
      const res = await request(app)
        .post("/api/messages/send/not-a-valid-id")
        .set("Cookie", aliceCookie)
        .send({ text: "Hello" });

      assert.equal(res.status, 400);
      assert.equal(res.body.message, "Invalid receiver ID format");
    });

    it("should reject sending a message to oneself", async () => {
      const res = await request(app)
        .post(`/api/messages/send/${aliceUser._id}`)
        .set("Cookie", aliceCookie)
        .send({ text: "Talking to myself" });

      assert.equal(res.status, 400);
      assert.equal(res.body.message, "Cannot send a message to yourself");
    });

    it("should reject completely empty message (no text and no image)", async () => {
      const res = await request(app)
        .post(`/api/messages/send/${bobUser._id}`)
        .set("Cookie", aliceCookie)
        .send({ text: "   " });

      assert.equal(res.status, 400);
      assert.equal(res.body.message, "Message text or image is required");
    });

    it("should successfully send a text message between two users", async () => {
      const res = await request(app)
        .post(`/api/messages/send/${bobUser._id}`)
        .set("Cookie", aliceCookie)
        .send({ text: "Hey Bob! Ready for the interview?" });

      assert.equal(res.status, 201);
      assert.equal(res.body.text, "Hey Bob! Ready for the interview?");
      assert.equal(res.body.senderId, aliceUser._id);
      assert.equal(res.body.receiverId, bobUser._id);

      sentMessageId = res.body._id;
    });
  });

  describe("GET /api/messages/:id", () => {
    it("should return 400 for malformed user ID", async () => {
      const res = await request(app)
        .get("/api/messages/invalid-object-id")
        .set("Cookie", aliceCookie);

      assert.equal(res.status, 400);
      assert.equal(res.body.message, "Invalid user ID format");
    });

    it("should retrieve conversation history between sender and receiver", async () => {
      const res = await request(app)
        .get(`/api/messages/${bobUser._id}`)
        .set("Cookie", aliceCookie);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.some((m) => m._id === sentMessageId));
    });
  });

  describe("POST /api/messages/react/:id (Security & Authorization)", () => {
    it("should prevent a third party user from reacting to messages outside their conversation", async () => {
      // Charlie tries to react to a message between Alice and Bob
      const res = await request(app)
        .post(`/api/messages/react/${sentMessageId}`)
        .set("Cookie", charlieCookie)
        .send({ emoji: "👀" });

      assert.equal(res.status, 403);
      assert.equal(
        res.body.message,
        "Forbidden - You cannot react to messages outside your conversation"
      );
    });

    it("should allow a valid participant (Bob) to react to Alice's message", async () => {
      const res = await request(app)
        .post(`/api/messages/react/${sentMessageId}`)
        .set("Cookie", bobCookie)
        .send({ emoji: "👍" });

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.reactions));
      assert.ok(
        res.body.reactions.some(
          (r) => r.userId === bobUser._id && r.emoji === "👍"
        )
      );
    });

    it("should toggle the emoji reaction off when clicked again", async () => {
      const res = await request(app)
        .post(`/api/messages/react/${sentMessageId}`)
        .set("Cookie", bobCookie)
        .send({ emoji: "👍" });

      assert.equal(res.status, 200);
      assert.ok(
        !res.body.reactions.some(
          (r) => r.userId === bobUser._id && r.emoji === "👍"
        )
      );
    });
  });
});
