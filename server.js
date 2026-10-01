// server.ts
import express from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import * as XLSX from "xlsx";

// src/data/categories.ts
var AUTHORIZED_CATEGORIES = [
  // Diagnostic Instruments and Supplies
  "Diagnostic Instruments and Supplies > Blood Pressure Monitors and Cuffs",
  "Diagnostic Instruments and Supplies > Blood Pressure Monitors and Cuffs > Digital Blood Pressure Monitors",
  "Diagnostic Instruments and Supplies > Blood Pressure Monitors and Cuffs > Manual Sphygmomanometers",
  "Diagnostic Instruments and Supplies > Blood Pressure Monitors and Cuffs > Replacement Cuffs",
  "Diagnostic Instruments and Supplies > Diagnostic Penlights",
  "Diagnostic Instruments and Supplies > Otoscopes and Ophthalmoscopes",
  "Diagnostic Instruments and Supplies > Otoscopes and Ophthalmoscopes > Disposable Specula",
  "Diagnostic Instruments and Supplies > Pulse Oximeters",
  "Diagnostic Instruments and Supplies > Stethoscopes",
  "Diagnostic Instruments and Supplies > Stethoscopes > Acoustic Stethoscopes",
  "Diagnostic Instruments and Supplies > Stethoscopes > Electronic Stethoscopes",
  "Diagnostic Instruments and Supplies > Stethoscopes > Stethoscope Accessories and Parts",
  "Diagnostic Instruments and Supplies > Thermometers",
  "Diagnostic Instruments and Supplies > Thermometer Probes and Covers",
  "Diagnostic Instruments and Supplies > Thermometer Probes and Covers > Disposable Probe Covers",
  "Diagnostic Instruments and Supplies > Thermometers > Infrared Tympanic Thermometers",
  "Diagnostic Instruments and Supplies > Thermometers > Non-Contact Forehead Thermometers",
  "Diagnostic Instruments and Supplies > Thermometers > Oral and Rectal Digital Thermometers",
  // Wound Care
  "Wound Care > Bandages and Dressings",
  "Wound Care > Bandages and Dressings > Adhesive Bandages",
  "Wound Care > Bandages and Dressings > Antimicrobial and Silver Dressings",
  "Wound Care > Bandages and Dressings > Calcium Alginate Dressings",
  "Wound Care > Bandages and Dressings > Cohesive and Self-Adherent Bandages",
  "Wound Care > Bandages and Dressings > Collagens",
  "Wound Care > Bandages and Dressings > Composite Dressings",
  "Wound Care > Bandages and Dressings > Compression Bandages and Wraps",
  "Wound Care > Bandages and Dressings > Elastic Bandages",
  "Wound Care > Bandages and Dressings > Elastic Net Retainers",
  "Wound Care > Bandages and Dressings > Foam Dressings",
  "Wound Care > Bandages and Dressings > Gauze Bandages and Sponges",
  "Wound Care > Bandages and Dressings > Hydrocolloid Dressings",
  "Wound Care > Bandages and Dressings > Hydrogel Dressings",
  "Wound Care > Bandages and Dressings > Non-Adherent Dressings",
  "Wound Care > Bandages and Dressings > Transparent Film Dressings",
  "Wound Care > Bandages and Dressings > Tubular and Net Dressings",
  "Wound Care > Cleansers and Debridement",
  "Wound Care > Cleansers and Debridement > Saline Wound Washes",
  "Wound Care > Cleansers and Debridement > Topical Wound Cleansers",
  "Wound Care > Medical Tapes and Adhesives",
  "Wound Care > Medical Tapes and Adhesives > Cloth Tapes",
  "Wound Care > Medical Tapes and Adhesives > Paper Tapes",
  "Wound Care > Medical Tapes and Adhesives > Silicone Tapes",
  "Wound Care > Medical Tapes and Adhesives > Waterproof Tapes",
  "Wound Care > Scar Treatments and Skin Protectants",
  "Wound Care > Surgical Sutures and Staples",
  // Over-The-Counter Medications
  "Over-The-Counter Medications > Allergy, Sinus and Cold",
  "Over-The-Counter Medications > Allergy, Sinus and Cold > Antihistamines",
  "Over-The-Counter Medications > Allergy, Sinus and Cold > Decongestants",
  "Over-The-Counter Medications > Allergy, Sinus and Cold > Nasal Sprays and Rinses",
  "Over-The-Counter Medications > Digestive Health and Antacids",
  "Over-The-Counter Medications > Digestive Health and Antacids > Antidiarrheals",
  "Over-The-Counter Medications > Digestive Health and Antacids > Gas Relief",
  "Over-The-Counter Medications > Digestive Health and Antacids > Heartburn and Acid Reducers",
  "Over-The-Counter Medications > Digestive Health and Antacids > Laxatives and Stool Softeners",
  "Over-The-Counter Medications > First Aid Antiseptics and Antibiotics",
  "Over-The-Counter Medications > First Aid Antiseptics and Antibiotics > Antibiotic Ointments",
  "Over-The-Counter Medications > First Aid Antiseptics and Antibiotics > Hydrogen Peroxide and Alcohol",
  "Over-The-Counter Medications > First Aid Antiseptics and Antibiotics > Povidone Iodine Solutions",
  "Over-The-Counter Medications > Pain and Fever Relief",
  "Over-The-Counter Medications > Pain and Fever Relief > Acetaminophen",
  "Over-The-Counter Medications > Pain and Fever Relief > Aspirin",
  "Over-The-Counter Medications > Pain and Fever Relief > Ibuprofen and NSAIDs",
  "Over-The-Counter Medications > Pain and Fever Relief > Pediatric Pain Relief",
  "Over-The-Counter Medications > Pain and Fever Relief > Topical Pain Relief Creams and Patches",
  // Urological and Incontinence
  "Urological and Incontinence > Catheters and Collection",
  "Urological and Incontinence > Catheters and Collection > External Condom Catheters",
  "Urological and Incontinence > Catheters and Collection > Foley Catheters",
  "Urological and Incontinence > Catheters and Collection > Intermittent Catheters",
  "Urological and Incontinence > Catheters and Collection > Leg Bags and Bedside Drainage Bags",
  "Urological and Incontinence > Incontinence Care",
  "Urological and Incontinence > Incontinence Care > Adult Briefs and Diapers",
  "Urological and Incontinence > Incontinence Care > Disposable Underpads and Chux",
  "Urological and Incontinence > Incontinence Care > Incontinence Liners and Pads",
  "Urological and Incontinence > Incontinence Care > Perineal Skin Cleansers and Barrier Creams",
  "Urological and Incontinence > Incontinence Care > Protective Underwear and Pull-Ups",
  // Enteral Nutrition and Feeding
  "Enteral Nutrition and Feeding > Enteral Feeding Bags and Tubing Sets",
  "Enteral Nutrition and Feeding > Enteral Feeding Pumps and Accessories",
  "Enteral Nutrition and Feeding > Gastrostomy and Nasogastric Feeding Tubes",
  "Enteral Nutrition and Feeding > Oral Nutritional Supplements",
  "Enteral Nutrition and Feeding > Oral Nutritional Supplements > High Protein Liquid Supplements",
  "Enteral Nutrition and Feeding > Oral Nutritional Supplements > Pediatric Nutritional Shakes",
  "Enteral Nutrition and Feeding > Oral Nutritional Supplements > Specialized Disease-Specific Formulas",
  "Enteral Nutrition and Feeding > Thickened Beverages and Thickening Agents",
  // Respiratory and Oxygen Therapy
  "Respiratory and Oxygen Therapy > Aerosol and Nebulizer Therapy",
  "Respiratory and Oxygen Therapy > Aerosol and Nebulizer Therapy > Compressor Nebulizer Systems",
  "Respiratory and Oxygen Therapy > Aerosol and Nebulizer Therapy > Disposable Nebulizer Kits and Masks",
  "Respiratory and Oxygen Therapy > CPAP and BiPAP Therapy",
  "Respiratory and Oxygen Therapy > CPAP and BiPAP Therapy > CPAP Full Face and Nasal Masks",
  "Respiratory and Oxygen Therapy > CPAP and BiPAP Therapy > CPAP Tubing, Filters and Humidifier Chambers",
  "Respiratory and Oxygen Therapy > Incentive Spirometers and Peak Flow Meters",
  "Respiratory and Oxygen Therapy > Oxygen Delivery",
  "Respiratory and Oxygen Therapy > Oxygen Delivery > Nasal Cannulas",
  "Respiratory and Oxygen Therapy > Oxygen Delivery > Oxygen Regulators and Conservers",
  "Respiratory and Oxygen Therapy > Suction Therapy and Catheters",
  "Respiratory and Oxygen Therapy > Tracheostomy Care and Supplies",
  // Ostomy Supplies
  "Ostomy Supplies > Colostomy and Ileostomy Pouches",
  "Ostomy Supplies > Colostomy and Ileostomy Pouches > One-Piece Drainable Pouches",
  "Ostomy Supplies > Colostomy and Ileostomy Pouches > Two-Piece Pouch Systems",
  "Ostomy Supplies > Ostomy Accessories",
  "Ostomy Supplies > Ostomy Accessories > Barrier Rings and Strips",
  "Ostomy Accessories > Deodorants and Lubricants",
  "Ostomy Supplies > Ostomy Accessories > Ostomy Belts and Support",
  "Ostomy Supplies > Ostomy Accessories > Stoma Paste and Powder",
  "Ostomy Supplies > Skin Barriers and Wafers",
  "Ostomy Supplies > Urostomy Pouches and Adapters",
  // Needles, Syringes and Infusion
  "Needles, Syringes and Infusion > Blood Collection and Phlebotomy",
  "Needles, Syringes and Infusion > Hypodermic Needles and Safety Needles",
  "Needles, Syringes and Infusion > Insulin Syringes and Pen Needles",
  "Needles, Syringes and Infusion > IV Administration Sets and Tubing",
  "Needles, Syringes and Infusion > IV Catheters and Cannulas",
  "Needles, Syringes and Infusion > Sharps Disposal Containers",
  "Needles, Syringes and Infusion > Syringes with Needles",
  "Needles, Syringes and Infusion > Syringes without Needles",
  // Infection Control and Personal Protective Equipment (PPE)
  "Infection Control and Personal Protective Equipment > Antimicrobial Soaps and Hand Sanitizers",
  "Infection Control and Personal Protective Equipment > Disinfectant Wipes and Surface Sprays",
  "Infection Control and Personal Protective Equipment > Exam and Surgical Gloves",
  "Infection Control and Personal Protective Equipment > Exam and Surgical Gloves > Nitrile Exam Gloves",
  "Infection Control and Personal Protective Equipment > Exam and Surgical Gloves > Latex Exam Gloves",
  "Infection Control and Personal Protective Equipment > Exam and Surgical Gloves > Vinyl Exam Gloves",
  "Infection Control and Personal Protective Equipment > Face Masks and Shields",
  "Infection Control and Personal Protective Equipment > Face Masks and Shields > N95 and KN95 Respirators",
  "Infection Control and Personal Protective Equipment > Face Masks and Shields > Surgical and Procedure Face Masks",
  "Infection Control and Personal Protective Equipment > Isolation Gowns and Apparel",
  "Infection Control and Personal Protective Equipment > Sterilization Packaging and Chemical Indicators",
  // Patient Care and Bathing
  "Patient Care and Bathing > Bathing Wipes and Rinse-Free Shampoos",
  "Patient Care and Bathing > Bedpans, Urinals and Emesis Basins",
  "Patient Care and Bathing > Commode Chairs and Shower Stools",
  "Patient Care and Bathing > Moisturizers and Barrier Ointments",
  "Patient Care and Bathing > Oral Care Swabs and Denture Care",
  "Patient Care and Bathing > Patient Gowns and Slippers",
  // Mobility and Physical Therapy
  "Mobility and Physical Therapy > Canes and Crutches",
  "Mobility and Physical Therapy > Exercise Bands and Resistance Tubing",
  "Mobility and Physical Therapy > Patient Transfer and Slide Boards",
  "Mobility and Physical Therapy > Walkers and Rollators",
  "Mobility and Physical Therapy > Walkers and Rollators > Bariatric Heavy-Duty Walkers",
  "Mobility and Physical Therapy > Walkers and Rollators > Folding Standard Walkers",
  "Mobility and Physical Therapy > Walkers and Rollators > Four-Wheel Rollator Walkers with Seat",
  "Mobility and Physical Therapy > Wheelchairs and Seating Cushions",
  "Mobility and Physical Therapy > Wheelchairs and Seating Cushions > Pressure Relief Seat Cushions",
  "Mobility and Physical Therapy > Wheelchairs and Seating Cushions > Transport Chairs",
  // Orthopedics and Supports
  "Orthopedics and Supports > Ankle Braces and Supports",
  "Orthopedics and Supports > Arm Slings and Shoulder Immobilizers",
  "Orthopedics and Supports > Cervical Collars and Neck Supports",
  "Orthopedics and Supports > Knee Braces and Knee Immobilizers",
  "Orthopedics and Supports > Lumbar and Back Support Belts",
  "Orthopedics and Supports > Wrist and Hand Splints",
  // Surgical Instruments and Operating Room
  "Surgical Instruments and Operating Room > Biopsy Punches and Forceps",
  "Surgical Instruments and Operating Room > Electrosurgical Pencils and Grounding Pads",
  "Surgical Instruments and Operating Room > Scalpels, Blades and Handles",
  "Surgical Instruments and Operating Room > Surgical Drapes and Towels",
  "Surgical Instruments and Operating Room > Surgical Scissors and Hemostats",
  // Laboratory Supplies
  "Laboratory Supplies > Centrifuge Tubes and Vials",
  "Laboratory Supplies > Culture Swabs and Transport Media",
  "Laboratory Supplies > Microscope Slides and Cover Slips",
  "Laboratory Supplies > Pipettes and Tips",
  "Laboratory Supplies > Rapid Diagnostic Test Kits",
  "Laboratory Supplies > Specimen Collection Containers and Cups"
];
function getRootCategory(fullPath) {
  if (!fullPath) return "";
  const parts = fullPath.split(">");
  return parts[0].trim();
}
function matchCategory(query, customList) {
  const list = customList && customList.length > 0 ? customList : AUTHORIZED_CATEGORIES;
  if (!query) return list[0];
  const qClean = query.toLowerCase().trim();
  const exact = list.find((c) => c.toLowerCase() === qClean);
  if (exact) return exact;
  const leafMatch = list.find((c) => {
    const leaf = c.split(">").pop()?.trim().toLowerCase() || "";
    return leaf.length > 3 && (qClean.includes(leaf) || leaf.includes(qClean));
  });
  if (leafMatch) return leafMatch;
  const keywords = qClean.replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2);
  let bestMatch = list[0];
  let bestScore = -1;
  for (const cat of list) {
    const catLower = cat.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (catLower.includes(kw)) {
        const isLeaf = catLower.split(">").pop()?.includes(kw);
        score += isLeaf ? 3 : 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = cat;
    }
  }
  return bestMatch;
}

// server.ts
dotenv.config();
var app = express();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
var isProd = process.env.NODE_ENV === "production";
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
var apiKey = process.env.GEMINI_API_KEY || "";
var ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
var CATEGORY_FILE_PATH = path.resolve(process.cwd(), "Category.xlsx");
function loadAuthorizedCategories() {
  try {
    if (fs.existsSync(CATEGORY_FILE_PATH)) {
      const workbook = XLSX.readFile(CATEGORY_FILE_PATH);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const paths = [];
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (Array.isArray(row) && row[0]) {
          const val = String(row[0]).trim();
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
app.get("/api/categories", (_req, res) => {
  const categories = loadAuthorizedCategories();
  res.json({
    total: categories.length,
    categories,
    sourceFile: fs.existsSync(CATEGORY_FILE_PATH) ? "Category.xlsx" : "Built-in Authorized Reference"
  });
});
app.get("/api/download-categories", (_req, res) => {
  if (fs.existsSync(CATEGORY_FILE_PATH)) {
    res.setHeader("Content-Disposition", 'attachment; filename="Category.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    fs.createReadStream(CATEGORY_FILE_PATH).pipe(res);
  } else {
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
app.post("/api/categories/upload", (req, res) => {
  try {
    const { categories } = req.body;
    if (Array.isArray(categories) && categories.length > 0) {
      const cleanList = categories.map((c) => String(c).trim()).filter((c) => c.length > 0);
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
        message: `Successfully loaded ${cleanList.length} authorized categories.`
      });
    }
    return res.status(400).json({ error: "Invalid categories list provided." });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to save categories" });
  }
});
app.post("/api/research-mpn", async (req, res) => {
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
        tools: [{ googleSearch: {} }]
      }
    });
    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const strictCategory = matchCategory(parsed.bestCategoryPath || rawName, authorizedList);
      parsed.bestCategoryPath = strictCategory;
      parsed.rootCategory = getRootCategory(strictCategory);
      return res.json({
        success: true,
        research: parsed
      });
    }
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
        notes: text
      }
    });
  } catch (err) {
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
        notes: "Deterministic catalog match applied."
      }
    });
  }
});
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
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
