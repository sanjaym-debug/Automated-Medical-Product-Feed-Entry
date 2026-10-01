import express, { Request, Response } from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import * as XLSX from "xlsx";
import { AUTHORIZED_CATEGORIES, getRootCategory, matchCategory } from "./src/data/categories.ts";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === "production";

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize GoogleGenAI
const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Category file path
const CATEGORY_FILE_PATH = path.resolve(process.cwd(), "Category.xlsx");

// Helper to load categories from file
function loadAuthorizedCategories(): string[] {
  try {
    if (fs.existsSync(CATEGORY_FILE_PATH)) {
      const workbook = XLSX.readFile(CATEGORY_FILE_PATH);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const paths: string[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (Array.isArray(row) && row[0]) {
          const val = String(row[0]).trim();
          // skip header row if contains "Category" or "Level"
          if (i === 0 && val.toLowerCase().includes("category path")) continue;
          if (val.length > 2 && !paths.includes(val)) {
            paths.push(val);
          }
        }
      }
      if (paths.length > 0) return paths;
    }
  } catch (err) {
    console.error("Error reading Category.xlsx:", err);
  }
  return AUTHORIZED_CATEGORIES;
}

// ================= API ROUTES =================

/**
 * GET /api/categories
 * Returns the current authorized category reference list.
 */
app.get("/api/categories", (_req: Request, res: Response) => {
  const categories = loadAuthorizedCategories();
  res.json({
    total: categories.length,
    categories,
    sourceFile: fs.existsSync(CATEGORY_FILE_PATH) ? "Category.xlsx" : "Built-in Authorized Reference",
  });
});

/**
 * GET /api/download-categories
 * Allows downloading the Category.xlsx file.
 */
app.get("/api/download-categories", (_req: Request, res: Response) => {
  if (fs.existsSync(CATEGORY_FILE_PATH)) {
    res.setHeader("Content-Disposition", 'attachment; filename="Category.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    fs.createReadStream(CATEGORY_FILE_PATH).pipe(res);
  } else {
    // Generate on the fly
    const wb = XLSX.utils.book_new();
    const wsData = [["Category Path", "Root Category"]];
    AUTHORIZED_CATEGORIES.forEach((c) => {
      wsData.push([c, getRootCategory(c)]);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Authorized Categories");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", 'attachment; filename="Category.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  }
});

/**
 * POST /api/categories/upload
 * Updates authorized categories from uploaded list or Excel
 */
app.post("/api/categories/upload", (req: Request, res: Response) => {
  try {
    const { categories } = req.body;
    if (Array.isArray(categories) && categories.length > 0) {
      const cleanList = categories
        .map((c: string) => String(c).trim())
        .filter((c: string) => c.length > 0);

      // Save to Category.xlsx
      const wb = XLSX.utils.book_new();
      const wsData = [["Category Path", "Root Category"]];
      cleanList.forEach((c) => {
        wsData.push([c, getRootCategory(c)]);
      });
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "Authorized Categories");
      XLSX.writeFile(wb, CATEGORY_FILE_PATH);

      return res.json({
        success: true,
        count: cleanList.length,
        message: `Successfully loaded ${cleanList.length} authorized categories.`,
      });
    }
    return res.status(400).json({ error: "Invalid categories list provided." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to save categories" });
  }
});

/**
 * POST /api/research-mpn
 * Uses Gemini 3.8 Flash with Google Search grounding to verify official manufacturer
 * attributes for Brand + MPN, normalize product title sequence (Name, color, flavor etc),
 * and map to deepest authorized category path from Category.xlsx.
 */
app.post("/api/research-mpn", async (req: Request, res: Response) => {
  const { brand, mpn, rawName, vendor, uom } = req.body;

  if (!brand && !mpn && !rawName) {
    return res.status(400).json({ error: "Brand and MPN or rawName are required." });
  }

  const authorizedList = loadAuthorizedCategories();
  const sampleCategoriesForPrompt = authorizedList.slice(0, 50).join("\n");

  const prompt = `You are an expert E-commerce Catalog PIM Specialist.
Perform research on this product using its Brand and MPN (Model Number / Manufacturer Part Number):
- Brand: "${brand || "Unknown"}"
- MPN: "${mpn || "Unknown"}"
- Raw Vendor Text: "${rawName || ""}"
- Vendor: "${vendor || ""}"
- Raw UOM: "${uom || ""}"

TASK:
1. Verify official manufacturer naming and specifications for this MPN & Brand.
2. Construct the normalized base product name following the exact sequence: "Name, color, flavor etc" (omit packaging terms like Box of 50, Bag of 100, or Each from this base title).
3. Identify official attributes: color, flavor, size, packaging multiplier, packaging unit.
4. Select the deepest, most accurate matching hierarchical category path strictly from the authorized Category Reference list.

Authorized Categories reference sample (pick the most accurate matching path or closest standard match):
${sampleCategoriesForPrompt}

Respond in strictly valid JSON format with keys:
{
  "officialBrand": string,
  "officialMpn": string,
  "normalizedBaseTitle": string,
  "color": string,
  "flavor": string,
  "size": string,
  "packagingType": "Each" | "Box" | "Case" | "Bag" | "Package",
  "packagingMultiplier": number,
  "bestCategoryPath": string,
  "confidence": "high" | "medium" | "low",
  "notes": string
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    // Extract JSON block
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Enforce strict category reference check:
      // If the AI returned category is not strictly in the list, match it strictly against authorized list!
      const strictCategory = matchCategory(parsed.bestCategoryPath || rawName, authorizedList);
      parsed.bestCategoryPath = strictCategory;
      parsed.rootCategory = getRootCategory(strictCategory);

      return res.json({
        success: true,
        research: parsed,
      });
    }

    // Fallback if model output wasn't pure JSON
    const matched = matchCategory(`${brand} ${rawName}`, authorizedList);
    return res.json({
      success: true,
      research: {
        officialBrand: brand,
        officialMpn: mpn,
        normalizedBaseTitle: rawName,
        packagingType: "Each",
        packagingMultiplier: 1,
        bestCategoryPath: matched,
        rootCategory: getRootCategory(matched),
        notes: text,
      },
    });
  } catch (err: any) {
    console.warn("Gemini research call error (falling back to deterministic rule engine):", err?.message);
    const matched = matchCategory(`${brand} ${rawName}`, authorizedList);
    return res.json({
      success: true,
      fallback: true,
      research: {
        officialBrand: brand,
        officialMpn: mpn,
        normalizedBaseTitle: rawName,
        packagingType: "Each",
        packagingMultiplier: 1,
        bestCategoryPath: matched,
        rootCategory: getRootCategory(matched),
        notes: "Deterministic catalog match applied.",
      },
    });
  }
});

// ================= VITE DEV / PROD SERVING =================
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PIM Automation Specialist Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
