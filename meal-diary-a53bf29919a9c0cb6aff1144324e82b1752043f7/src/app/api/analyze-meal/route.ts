import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { description, imageBase64 } = body;

    if (!description && !imageBase64) {
      return NextResponse.json(
        { error: "Description or image is required" },
        { status: 400 }
      );
    }

    // If no API key is provided, return a mocked response so the UI still works
    if (!process.env.GEMINI_API_KEY) {
      console.warn("No GEMINI_API_KEY provided. Returning mock data.");
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate delay
      return NextResponse.json({
        items: ["מרכיב לדוגמה 1", "מרכיב לדוגמה 2", description || "תמונה"],
      });
    }

    const prompt = `You are a helpful dietary assistant. Your job is to extract individual food items and ingredients from the user's description and/or image.
Return ONLY a JSON array of strings in Hebrew, representing the individual food items. 
For example: ["חביתה", "סלט ירקות", "קפה"]. 
Do not return any markdown formatting, only the JSON array.
If the user provided text: ${description || "No text provided."}`;

    const contents = [];

    if (imageBase64) {
      // Remove data:image/jpeg;base64,
      const mimeTypeMatch = imageBase64.match(/^data:(.*);base64,/);
      let mimeType = "image/jpeg";
      let base64Data = imageBase64;
      if (mimeTypeMatch) {
        mimeType = mimeTypeMatch[1];
        base64Data = imageBase64.replace(/^data:.*;base64,/, "");
      }

      contents.push({
        inlineData: {
          data: base64Data,
          mimeType,
        },
      });
    }

    contents.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || "[]";
    let items = [];
    try {
      items = JSON.parse(responseText);
      if (!Array.isArray(items)) {
        items = [responseText];
      }
    } catch (e) {
      console.error("Failed to parse AI response as JSON", responseText);
      items = [responseText];
    }

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Meal analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze meal" },
      { status: 500 }
    );
  }
}
