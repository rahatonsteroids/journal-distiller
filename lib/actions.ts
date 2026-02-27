"use server";

import { getDb as prisma } from "./prisma";
import { revalidatePath } from "next/cache";

export async function generateSummary(articleId: string) {
  // The API key is injected by the environment automatically
  const apiKey = ""; 

  try {
    // Initialize the database connection
    const db = prisma() as any;

    // 1. Fetch the specific article from your Neon database
    const article = await db.article.findUnique({
      where: { id: articleId },
    });

    if (!article) throw new Error("Article not found");

    // 2. Craft the prompt for Gemini
    const prompt = `
      You are an expert medical editor. Distill the following medical abstract 
      into a clear, clinical summary for busy doctors.
      
      ABSTRACT: ${article.originalAbstract}

      Respond ONLY with valid JSON in this format:
      {
        "bottomLine": "One sentence clinical takeaway.",
        "methodology": "2-3 words describing study design.",
        "clinicalImpact": "How this changes practice in 1-2 sentences."
      }
    `;

    // 3. Call the Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.7 
          }
        }),
      }
    );

    if (!response.ok) throw new Error("AI Request failed");

    const result = await response.json();
    const aiContent = JSON.parse(result.candidates[0].content.parts[0].text);

    // 4. Save the new summary to your Summary table in Neon
    await db.summary.create({
      data: {
        bottomLine: aiContent.bottomLine,
        methodology: aiContent.methodology,
        clinicalImpact: aiContent.clinicalImpact,
        articleId: article.id,
        isPublished: true,
      },
    });

    // 5. Tell Next.js to refresh the page data
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("AI Generation Error:", error);
    return { success: false, error: "Failed to distill article." };
  }
}