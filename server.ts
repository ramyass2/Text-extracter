import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 images
  app.use(express.json({ limit: "50mb" }));

  // API Routes
  app.post("/api/extract", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Image data is required" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Server is missing Gemini API Key" });
      }

      // Initialize Gemini Client with correct schema and required User-Agent
      const ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });
      
      // Clean base64 string if it contains the data URI prefix
      const base64Data = image.includes("base64,") ? image.split("base64,")[1] : image;

      const prompt = `You are a data extraction AI. When a user uploads an image with text/data:
1. EXTRACT: Read all text (handwritten, printed, mixed, any background)
2. IDENTIFY: Determine what type of data this is (receipt, form, student info, bill, etc.)
3. GENERATE ATTRIBUTES: Create column headers BASED ON the actual content (e.g., "No. CC", "Company Name", "Address Line 1", "Date", "Customer Name", etc.). Do NOT use a generic "Field" & "Value" vertical representation.
4. STRUCTURE: Create a table where each custom attribute name is its own column, and all the actual parsed content values are mapped horizontally into a single, high-fidelity row under those schema columns. Clean, Excel-ready horizontal row format.

Analyze the provided image and return the result strictly as a JSON object with this exact schema:
{
  "documentType": "string (e.g., 'Receipt', 'Student ID Card')",
  "columns": ["string", "string"],
  "rows": [
    ["string", "string"]
  ]
}`;

      // Stable set of valid models from current gemini-api skill list.
      // If one is experiencing a 503 spike, we fall back to the next one automatically.
      const modelsToTry = [
        process.env.GEMINI_MODEL || "gemini-2.5-flash",
        "gemini-2.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
        "gemini-3.5-flash"
      ].filter((val, idx, self) => self.indexOf(val) === idx);

      let lastError = null;
      let parsedData: any = null;

      for (const modelName of modelsToTry) {
        try {
          console.log(`Attempting extraction using Gemini model: ${modelName}`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: "user",
                parts: [
                  { inlineData: { data: base64Data, mimeType: mimeType || "image/jpeg" } },
                  { text: prompt },
                ],
              },
            ],
            config: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          });

          const responseText = response.text;
          if (!responseText) {
            throw new Error(`Empty response returned from model ${modelName}`);
          }
          
          parsedData = JSON.parse(responseText);
          console.log(`Successfully extracted data using model ${modelName}`);
          break; // Exit loop on success
        } catch (err: any) {
          console.warn(`Model ${modelName} call failed:`, err.message || err);
          lastError = err;
        }
      }

      if (!parsedData) {
        throw new Error(
          `All available Gemini models are currently experiencing high demand. Details: ${lastError?.message || "Service Unavailable"}`
        );
      }

      // Safeguard: programmatically transpose if the model ended up returning a vertical column structure 
      // with column names resembling 'Field', 'Key', 'Parameter', 'Attribute' paired with 'Value', 'Data', 'Content', 'Text'
      if (parsedData && Array.isArray(parsedData.columns) && Array.isArray(parsedData.rows)) {
        const cols = parsedData.columns.map((c: string) => (c || "").trim().toLowerCase());
        const isKeyValueLayout = 
          cols.length === 2 && 
          (
            cols[0].includes("field") || 
            cols[0].includes("key") || 
            cols[0].includes("attribute") || 
            cols[0].includes("label") || 
            cols[0].includes("property") || 
            cols[0].includes("parameter") ||
            cols[0] === "name"
          ) && 
          (
            cols[1].includes("value") || 
            cols[1].includes("content") || 
            cols[1].includes("data") || 
            cols[1].includes("text")
          );

        if (isKeyValueLayout) {
          console.log("Safeguard trigger: Transposing layout to horizontal row form.");
          const newColumns: string[] = [];
          const newRowValues: string[] = [];

          for (const row of parsedData.rows) {
            if (Array.isArray(row) && row.length >= 2) {
              const key = String(row[0] || "").trim();
              const val = String(row[1] || "").trim();
              if (key) {
                newColumns.push(key);
                newRowValues.push(val);
              }
            }
          }

          parsedData = {
            documentType: parsedData.documentType || "Extracted Key-Value Document",
            columns: newColumns,
            rows: [newRowValues]
          };
        }
      }
      
      res.json(parsedData);
    } catch (error: any) {
      console.error("Extraction error:", error);
      res.status(500).json({ error: error.message || "Failed to extract data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
