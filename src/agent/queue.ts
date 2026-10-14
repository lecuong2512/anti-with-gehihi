import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";

export type AgentTaskStatus = "pending" | "consumed" | "completed";

export interface AgentTask {
  id: string;
  prompt: string;
  status: AgentTaskStatus;
  response?: string;
  createdAt: string;
  consumedAt?: string;
  completedAt?: string;
}

export class AgentQueue {
  private tasks = new Map<string, AgentTask>();
  private waiters = new Map<string, Array<(task: AgentTask) => void>>();

  enqueue(prompt: string): AgentTask {
    const task: AgentTask = {
      id: `prompt_${Date.now()}_${randomUUID().slice(0, 8)}`,
      prompt,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  getNextPending(): AgentTask | null {
    for (const task of this.tasks.values()) {
      if (task.status === "pending") return task;
    }
    return null;
  }

  consume(id: string): AgentTask | null {
    const task = this.tasks.get(id);
    if (!task) return null;
    task.status = "consumed";
    task.consumedAt = new Date().toISOString();
    return task;
  }

  complete(id: string, responseText: string): AgentTask | null {
    const task = this.tasks.get(id);
    if (!task) return null;
    task.status = "completed";
    task.response = responseText;
    task.completedAt = new Date().toISOString();
    const callbacks = this.waiters.get(id) ?? [];
    this.waiters.delete(id);
    for (const cb of callbacks) cb(task);
    return task;
  }

  getTask(id: string): AgentTask | null {
    return this.tasks.get(id) ?? null;
  }

  waitForCompletion(id: string, timeoutMs = 600_000): Promise<AgentTask> {
    const existing = this.tasks.get(id);
    if (!existing) return Promise.reject(new Error("Task not found"));
    if (existing.status === "completed") return Promise.resolve(existing);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for Gemini Web response (${timeoutMs}ms)`));
      }, timeoutMs);

      const list = this.waiters.get(id) ?? [];
      list.push((completedTask) => {
        clearTimeout(timer);
        resolve(completedTask);
      });
      this.waiters.set(id, list);
    });
  }
}

export function createAgentQueueRouter(queue = new AgentQueue()): Router {
  const router = Router();

  router.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (_req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  router.get("/pending", (_req: Request, res: Response) => {
    const pending = queue.getNextPending();
    res.json({ pending: pending ? { id: pending.id, prompt: pending.prompt } : null });
  });

  router.post("/consume", (req: Request, res: Response) => {
    const { id } = req.body as { id?: string };
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const task = queue.consume(id);
    if (!task) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({ ok: true, id: task.id, status: task.status });
  });

  router.post("/response", (req: Request, res: Response) => {
    const { id, response } = req.body as { id?: string; response?: string };
    if (!id || typeof response !== "string") {
      res.status(400).json({ error: "invalid_payload" });
      return;
    }
    const task = queue.complete(id, response);
    if (!task) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({ ok: true, id: task.id, status: task.status });
  });

  // Backward compatibility with /api/agent/prompt and /api/agent/response/:id
  router.post("/prompt", (req: Request, res: Response) => {
    const { prompt } = req.body as { prompt?: string };
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      res.status(400).json({ error: "empty_prompt" });
      return;
    }
    const task = queue.enqueue(prompt.trim());
    res.json({ ok: true, id: task.id });
  });

  router.get("/response/:id", (req: Request, res: Response) => {
    const id = String(req.params.id);
    const task = queue.getTask(id);
    if (!task || task.status !== "completed") {
      res.json({ status: "pending" });
      return;
    }
    res.json({ status: "completed", response: task.response });
  });

  router.post("/enqueue", async (req: Request, res: Response) => {
    const { prompt, wait = true, timeoutMs = 600_000 } = req.body as {
      prompt?: string;
      wait?: boolean;
      timeoutMs?: number;
    };
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      res.status(400).json({ error: "empty_prompt" });
      return;
    }
    const task = queue.enqueue(prompt.trim());
    if (!wait) {
      res.json({ ok: true, task });
      return;
    }
    try {
      const completed = await queue.waitForCompletion(task.id, timeoutMs);
      res.json({
        ok: true,
        id: completed.id,
        response: completed.response,
        completedAt: completed.completedAt,
      });
    } catch (err) {
      res.status(504).json({ error: "timeout", id: task.id, message: (err as Error).message });
    }
  });

  router.get("/status/:id", (req: Request, res: Response) => {
    const task = queue.getTask(String(req.params.id));
    if (!task) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({ ok: true, task });
  });

  return router;
}
