// app/api/summarise/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { title, abstract } = await req.json();

    if (!abstract) {
      return NextResponse.json({ error: "No abstract provided" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Groq API key not configured" }, { status: 500 });
    }

    const prompt = `You are a medical research communicator. Write a clear 2-3 sentence plain-language summary that a non-scientist can understand. Focus on what was studied, what was found, and why it matters.

Title: ${title}

Abstract: ${abstract}

Write only the summary, no preamble or labels.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 200,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq error:", JSON.stringify(data));
      return NextResponse.json({ error: "Groq request failed", details: data }, { status: 500 });
    }

    const summary = data.choices?.[0]?.message?.content ?? "Could not generate summary.";
    return NextResponse.json({ summary });

  } catch (error) {
    console.error("Summarise route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}