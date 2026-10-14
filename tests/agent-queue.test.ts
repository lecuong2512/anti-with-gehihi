import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { AgentQueue, createAgentQueueRouter } from "../src/agent/queue.js";

describe("AgentQueue unit tests", () => {
  let queue: AgentQueue;

  beforeEach(() => {
    queue = new AgentQueue();
  });

  it("enqueues a task with unique id and pending status", () => {
    const task = queue.enqueue("Design a modern web app architecture");
    expect(task.id).toMatch(/^prompt_\d+_/);
    expect(task.prompt).toBe("Design a modern web app architecture");
    expect(task.status).toBe("pending");
    expect(queue.getTask(task.id)).toEqual(task);
  });

  it("getNextPending returns the first pending task or null", () => {
    expect(queue.getNextPending()).toBeNull();
    const task1 = queue.enqueue("Task 1");
    const task2 = queue.enqueue("Task 2");

    expect(queue.getNextPending()?.id).toBe(task1.id);
    queue.consume(task1.id);
    expect(queue.getNextPending()?.id).toBe(task2.id);
  });

  it("marks a task consumed and completed", async () => {
    const task = queue.enqueue("Test prompt");
    const consumed = queue.consume(task.id);
    expect(consumed?.status).toBe("consumed");
    expect(consumed?.consumedAt).toBeDefined();

    const completed = queue.complete(task.id, "Here is the response");
    expect(completed?.status).toBe("completed");
    expect(completed?.response).toBe("Here is the response");
    expect(completed?.completedAt).toBeDefined();
  });

  it("waitForCompletion resolves when task is completed", async () => {
    const task = queue.enqueue("Async question");
    const waitPromise = queue.waitForCompletion(task.id, 5000);

    setTimeout(() => {
      queue.complete(task.id, "Async answer from Gemini Web");
    }, 50);

    const result = await waitPromise;
    expect(result.status).toBe("completed");
    expect(result.response).toBe("Async answer from Gemini Web");
  });

  it("waitForCompletion times out if task is not completed", async () => {
    const task = queue.enqueue("Never ending question");
    await expect(queue.waitForCompletion(task.id, 100)).rejects.toThrow("Timeout");
  });
});

describe("createAgentQueueRouter integration tests", () => {
  let app: express.Express;
  let server: Server;
  let baseUrl: string;
  let queue: AgentQueue;

  beforeEach(async () => {
    queue = new AgentQueue();
    app = express();
    app.use(express.json());
    app.use("/api/agent", createAgentQueueRouter(queue));

    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        if (typeof addr === "object" && addr) {
          baseUrl = `http://127.0.0.1:${addr.port}/api/agent`;
        }
        resolve();
      });
    });
  });

  it("handles the full life cycle over HTTP: enqueue -> pending -> consume -> response", async () => {
    // 1. Post prompt via legacy or new route
    const postRes = await fetch(`${baseUrl}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Hello from test" }),
    });
    expect(postRes.status).toBe(200);
    const postData = (await postRes.json()) as { ok: boolean; id: string };
    expect(postData.ok).toBe(true);
    expect(postData.id).toBeDefined();

    // 2. Tampermonkey polls /pending
    const pendingRes = await fetch(`${baseUrl}/pending`);
    const pendingData = (await pendingRes.json()) as { pending: { id: string; prompt: string } | null };
    expect(pendingData.pending?.id).toBe(postData.id);
    expect(pendingData.pending?.prompt).toBe("Hello from test");

    // 3. Tampermonkey consumes the task
    const consumeRes = await fetch(`${baseUrl}/consume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: postData.id }),
    });
    expect(consumeRes.status).toBe(200);

    // 4. Pending is now empty
    const pendingRes2 = await fetch(`${baseUrl}/pending`);
    const pendingData2 = (await pendingRes2.json()) as { pending: unknown };
    expect(pendingData2.pending).toBeNull();

    // 5. Response is still pending before completion
    const respCheck = await fetch(`${baseUrl}/response/${postData.id}`);
    const respCheckData = (await respCheck.json()) as { status: string };
    expect(respCheckData.status).toBe("pending");

    // 6. Tampermonkey sends final response
    const submitRes = await fetch(`${baseUrl}/response`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: postData.id, response: "Complete test response" }),
    });
    expect(submitRes.status).toBe(200);

    // 7. Check response endpoint
    const finalRes = await fetch(`${baseUrl}/response/${postData.id}`);
    const finalData = (await finalRes.json()) as { status: string; response: string };
    expect(finalData.status).toBe("completed");
    expect(finalData.response).toBe("Complete test response");
  });

  it("handles synchronous wait via /enqueue", async () => {
    const enqueuePromise = fetch(`${baseUrl}/enqueue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Synchronous question", wait: true, timeoutMs: 3000 }),
    });

    // Simulate Tampermonkey consuming and responding
    setTimeout(async () => {
      const p = queue.getNextPending();
      if (p) {
        queue.consume(p.id);
        queue.complete(p.id, "Synchronous response");
      }
    }, 100);

    const res = await enqueuePromise;
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean; response: string };
    expect(data.ok).toBe(true);
    expect(data.response).toBe("Synchronous response");
  });
});
