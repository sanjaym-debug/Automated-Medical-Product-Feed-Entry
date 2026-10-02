import express, { Request, Response } from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import * as XLSX from "xlsx";
import { AUTHORIZED_CATEGORIES, getRootCategory, matchCategory, autoMapProductCategory } from "./src/data/categories.ts";

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
          if (val === "Category" || val === "Category Path" || val === "Root Category") continue;
          if (val.includes(">") && !paths.includes(val)) {
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
 * POST /api/auto-map-categories
 * Uses Gemini AI to map products to the most relevant category path,
 * strictly and exclusively taking the exact names of the categories from Category.xlsx.
 */
app.post("/api/auto-map-categories", async (req: Request, res: Response) => {
  try {
    const { items, useAi = true } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items array is required" });
    }

    const authorizedList = loadAuthorizedCategories();
    const mappedResults: any[] = [];

    // Helper to snap to exact literal string from authorizedList
    const snapToExactCategory = (candidate: string): string => {
      if (!candidate) return authorizedList[0];
      const trimmed = candidate.trim().replace(/^["']|["']$/g, "");
      // 1. Exact case-sensitive match
      const exact = authorizedList.find((c) => c === trimmed);
      if (exact) return exact;
      // 2. Case-insensitive exact match
      const ci = authorizedList.find((c) => c.toLowerCase() === trimmed.toLowerCase());
      if (ci) return ci;
      // 3. Normalized delimiter match (e.g. if spaces around > differ)
      const normCandidate = trimmed.replace(/\s*>\s*/g, " > ").toLowerCase();
      const normMatch = authorizedList.find(
        (c) => c.replace(/\s*>\s*/g, " > ").toLowerCase() === normCandidate
      );
      if (normMatch) return normMatch;
      // 4. Closest leaf/keyword match strictly from authorizedList
      return matchCategory(trimmed, authorizedList);
    };

    let aiMappedSuccessfully = false;
    let lastAiError: string | null = null;

    // Use Gemini 3.8 Flash as the primary AI mapper
    if (apiKey && useAi !== false) {
      try {
        const categoryListString = authorizedList
          .map((c, idx) => `${idx + 1}. "${c}"`)
          .join("\n");

        // Process in batches of up to 25 items
        const batchSize = 25;
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
          batches.push(items.slice(i, i + batchSize));
        }

        const aiResponses = await Promise.all(
          batches.map(async (batch, bIdx) => {
            const prompt = `You are an expert E-Commerce Catalog & Healthcare PIM Specialist.
Your primary objective is to RELY DEEPLY ON THE PRODUCT NAME AND PRODUCT TYPE THROUGH AI RESEARCH TO MAP TO THE CORRECT CATEGORY strictly from the provided Category reference file.

INSTRUCTIONS:
1. PRODUCT NAME & TYPE RESEARCH:
   - Deeply inspect the product name, descriptive keywords, formulation, dimensions, active ingredients, and specifications.
   - Accurately deduce and identify the functional/clinical Product Type (for example: "Tubular Elastic Net Dressing Retainer", "Disposable Tympanic Thermometer Probe Cover", "Pediatric Liquid Acetaminophen Suspension", "2-Way Indwelling Foley Catheter", "Digital Upper Arm Blood Pressure Monitor", "Self-Adherent Cohesive Compression Bandage", etc.).
2. STRICT CATEGORY SELECTION:
   - Relying on the researched Product Name and identified Product Type, select the single most accurate and relevant category path from the Authorized Category reference list below.
   - CRITICAL: "bestCategoryPath" MUST be an EXACT literal match to one of the category paths listed below from the Category file. Do not invent, alter, or abbreviate category names under any circumstances.
3. ID PRESERVATION: You MUST retain the exact "id" given for each product in your JSON output.

AUTHORIZED CATEGORY PATHS FROM CATEGORY FILE:
${categoryListString}

PRODUCTS TO MAP:
${JSON.stringify(
  batch.map((item, idx) => ({
    id: String(item.id || item.SKU || `item-${bIdx * batchSize + idx}`),
    brand: item.brand || item.BRAND || "",
    mpn: item.mpn || item.MPN || "",
    productName: item.productName || item["PRODUCT NAME"] || "",
    rawAttributes: item.rawAttributes || "",
  }))
)}

Respond in strictly valid JSON format with a JSON array:
[
  {
    "id": string,
    "researchedProductType": string, // The specific product type identified through research (e.g. "Tubular Elastic Net Dressing Retainer")
    "bestCategoryPath": string, // EXACT string from the authorized Category list
    "confidence": number, // 0 to 100
    "rationale": string // Detailed explanation of how product name and researched type map to this exact category
  }
]`;

            const aiResponse = await ai.models.generateContent({
              model: "gemini-3.8-flash",
              contents: prompt,
              config: {
                temperature: 0.1,
                responseMimeType: "application/json",
              },
            });

            const text = (aiResponse.text || "[]").trim();
            const cleanText = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
            try {
              return JSON.parse(cleanText);
            } catch (pErr) {
              console.error("Failed to parse AI JSON:", text);
              return [];
            }
          })
        );

        const flattenedAiResults = aiResponses.flat();
        const aiMap = new Map<string, any>();
        flattenedAiResults.forEach((res, idx) => {
          if (res && res.id) {
            aiMap.set(String(res.id), res);
          }
          aiMap.set(`idx-${idx}`, res);
        });

        // Assemble mapped results
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const itemId = String(item.id || item.SKU || `item-${i}`);
          const aiItem = aiMap.get(itemId) || aiMap.get(`idx-${i}`) || flattenedAiResults[i];

          const categoryCandidate = aiItem?.bestCategoryPath || "";
          if (categoryCandidate) {
            const exactCategory = snapToExactCategory(categoryCandidate);
            const parts = exactCategory.split(">").map((p) => p.trim());
            const currentCat = item.currentCategory || item.Category || "";
            const isChanged = currentCat !== exactCategory;
            const conf = aiItem.confidence
              ? (aiItem.confidence <= 1 ? Math.round(aiItem.confidence * 100) : Math.round(aiItem.confidence))
              : 96;

            mappedResults.push({
              id: itemId,
              sku: item.SKU || item.sku || "",
              mpn: item.mpn || item.MPN || "",
              brand: item.brand || item.BRAND || "",
              productName: item.productName || item["PRODUCT NAME"] || "",
              researchedProductType: aiItem.researchedProductType || parts[parts.length - 1],
              currentCategory: currentCat,
              mappedCategory: exactCategory,
              googleProductCategory: parts[0],
              itemCommerceCategory: parts[parts.length - 1],
              confidence: conf,
              matchType: "AI Product Name & Type Research",
              rationale: aiItem.rationale || `Researched type: ${aiItem.researchedProductType || parts[parts.length - 1]} mapped to ${exactCategory}`,
              isChanged,
            });
          } else {
            const match = autoMapProductCategory(
              {
                brand: item.brand || item.BRAND,
                mpn: item.mpn || item.MPN,
                productName: item.productName || item["PRODUCT NAME"] || "",
                rawAttributes: item.rawAttributes || "",
              },
              authorizedList
            );
            const exactCategory = snapToExactCategory(match.categoryPath);
            const parts = exactCategory.split(">").map((p) => p.trim());
            const currentCat = item.currentCategory || item.Category || "";

            mappedResults.push({
              id: itemId,
              sku: item.SKU || item.sku || "",
              mpn: item.mpn || item.MPN || "",
              brand: item.brand || item.BRAND || "",
              productName: item.productName || item["PRODUCT NAME"] || "",
              researchedProductType: match.researchedProductType || parts[parts.length - 1],
              currentCategory: currentCat,
              mappedCategory: exactCategory,
              googleProductCategory: parts[0],
              itemCommerceCategory: parts[parts.length - 1],
              confidence: match.confidence,
              matchType: match.matchType,
              rationale: match.rationale,
              isChanged: currentCat !== exactCategory,
            });
          }
        }

        if (mappedResults.length > 0) {
          aiMappedSuccessfully = true;
        }
      } catch (aiErr: any) {
        lastAiError = aiErr ? String(aiErr.message || aiErr) : "Unknown AI error";
        console.warn("AI categorization notice (using deterministic exact matcher fallback):", aiErr);
      }
    }

    // Complete fallback only if mappedResults is empty
    if (mappedResults.length === 0) {
      for (const item of items) {
        const match = autoMapProductCategory(
          {
            brand: item.brand || item.BRAND,
            mpn: item.mpn || item.MPN,
            productName: item.productName || item["PRODUCT NAME"] || "",
            rawAttributes: item.rawAttributes || "",
          },
          authorizedList
        );

        const exactCategory = snapToExactCategory(match.categoryPath);
        const parts = exactCategory.split(">").map((p) => p.trim());
        const currentCat = item.currentCategory || item.Category || "";
        const isChanged = currentCat !== exactCategory;

        mappedResults.push({
          id: item.id || item.SKU,
          sku: item.SKU || item.sku || "",
          mpn: item.mpn || item.MPN || "",
          brand: item.brand || item.BRAND || "",
          productName: item.productName || item["PRODUCT NAME"] || "",
          researchedProductType: match.researchedProductType || parts[parts.length - 1],
          currentCategory: currentCat,
          mappedCategory: exactCategory,
          googleProductCategory: parts[0],
          itemCommerceCategory: parts[parts.length - 1],
          confidence: match.confidence,
          matchType: match.matchType,
          rationale: match.rationale,
          isChanged,
        });
      }
    }

    const changedCount = mappedResults.filter((r) => r.isChanged).length;
    const avgConfidence =
      mappedResults.reduce((acc, r) => acc + r.confidence, 0) / (mappedResults.length || 1);

    return res.json({
      success: true,
      mappedItems: mappedResults,
      total: mappedResults.length,
      changedCount,
      averageConfidence: Math.round(avgConfidence),
      categorySource: fs.existsSync(CATEGORY_FILE_PATH) ? "Category.xlsx" : "Built-in Authorized Reference",
      isAiPowered: aiMappedSuccessfully,
      aiError: lastAiError,
    });
  } catch (err: any) {
    console.error("Auto category mapping error:", err);
    return res.status(500).json({ error: err.message || "Failed to auto-map categories" });
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
  const categoryListString = authorizedList.map((c, i) => `${i + 1}. "${c}"`).join("\n");

  const prompt = `You are an expert E-Commerce Catalog & Healthcare PIM Specialist.
Perform comprehensive AI research on this product relying deeply on the Product Name, Vendor Text, Brand, and MPN to determine its clinical/functional Product Type and map it to the correct Category strictly from the Category reference file:
- Brand: "${brand || "Unknown"}"
- MPN: "${mpn || "Unknown"}"
- Raw Vendor Text: "${rawName || ""}"
- Vendor: "${vendor || ""}"
- Raw UOM: "${uom || ""}"

RESEARCH OBJECTIVES:
1. RELY ON PRODUCT NAME AND TYPE THROUGH AI SEARCH RESEARCH:
   - Search and verify official manufacturer specifications, active ingredients, formulation, and clinical purpose.
   - Accurately identify and determine the precise Product Type (e.g. "Tubular Elastic Net Dressing Retainer", "Tympanic Thermometer Probe Cover", "Pediatric Liquid Acetaminophen Suspension", "2-Way Indwelling Foley Catheter", "Digital Upper Arm Blood Pressure Monitor", etc.).
2. MAP CORRECT CATEGORY FROM CATEGORY FILE:
   - Rely on the researched Product Name and Product Type to select the single most accurate, deepest category path from the Authorized Categories reference list below.
   - CRITICAL CONSTRAINT: "bestCategoryPath" MUST be an EXACT literal match to one of the category paths listed below from the Category file.
3. CONSTRUCT NORMALIZED BASE TITLE:
   - Construct the normalized base product name following the exact sequence: "Name, color, flavor etc" (strictly omit packaging quantities like Box of 50, Bag of 100, or Each from this base title).

AUTHORIZED CATEGORY PATHS FROM CATEGORY FILE:
${categoryListString}

Respond in strictly valid JSON format with keys:
{
  "officialBrand": string,
  "officialMpn": string,
  "researchedProductType": string,
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
