import assert from "node:assert/strict";
import test from "node:test";
import type { NextRequest } from "next/server";

import { POST } from "./route";

type FetchMock = typeof fetch;

function makeRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/summarise", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function jsonResponse(payload: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(payload), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}

test("returns 400 for empty payload", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GROQ_API_KEY;
  let fetchCalls = 0;

  global.fetch = (async () => {
    fetchCalls += 1;
    return jsonResponse({});
  }) as FetchMock;

  try {
    process.env.GROQ_API_KEY = "test-key";
    const res = await POST(makeRequest({}));
    const data = (await res.json()) as { error?: string };

    assert.equal(res.status, 400);
    assert.match(data.error ?? "", /Invalid payload/);
    assert.equal(fetchCalls, 0);
  } finally {
    global.fetch = originalFetch;
    process.env.GROQ_API_KEY = originalKey;
  }
});

test("returns 500 when GROQ_API_KEY is missing", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GROQ_API_KEY;
  let fetchCalls = 0;

  global.fetch = (async () => {
    fetchCalls += 1;
    return jsonResponse({});
  }) as FetchMock;

  try {
    delete process.env.GROQ_API_KEY;
    const res = await POST(makeRequest({ abstract: "Study abstract" }));
    const data = (await res.json()) as { error?: string };

    assert.equal(res.status, 500);
    assert.equal(data.error, "Server configuration error");
    assert.equal(fetchCalls, 0);
  } finally {
    global.fetch = originalFetch;
    process.env.GROQ_API_KEY = originalKey;
  }
});

test("returns 502 when Groq responds with non-OK status", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GROQ_API_KEY;

  global.fetch = (async () =>
    new Response('{"error":"rate limited"}', {
      status: 429,
      headers: { "Content-Type": "application/json" },
    })) as FetchMock;

  try {
    process.env.GROQ_API_KEY = "test-key";
    const res = await POST(makeRequest({ abstract: "Study abstract" }));
    const data = (await res.json()) as { error?: string };

    assert.equal(res.status, 502);
    assert.equal(data.error, "Failed to generate summary");
  } finally {
    global.fetch = originalFetch;
    process.env.GROQ_API_KEY = originalKey;
  }
});

test("returns summary when Groq succeeds", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GROQ_API_KEY;
  let fetchCalls = 0;

  global.fetch = (async (input: RequestInfo | URL) => {
    fetchCalls += 1;
    const url = typeof input === "string" ? input : input.toString();
    assert.match(url, /api\.groq\.com/);

    return jsonResponse({
      choices: [{ message: { content: "Concise summary text." } }],
    });
  }) as FetchMock;

  try {
    process.env.GROQ_API_KEY = "test-key";
    const res = await POST(
      makeRequest({
        title: "Paper title",
        abstract: "Paper abstract",
      })
    );
    const data = (await res.json()) as { summary?: string };

    assert.equal(res.status, 200);
    assert.equal(data.summary, "Concise summary text.");
    assert.equal(fetchCalls, 1);
  } finally {
    global.fetch = originalFetch;
    process.env.GROQ_API_KEY = originalKey;
  }
});
