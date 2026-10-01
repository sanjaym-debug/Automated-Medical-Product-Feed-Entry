import { AUTHORIZED_CATEGORIES, getRootCategory, matchCategory } from "../data/categories.ts";
import { NormalizedPimRow, RawSupplierRow, RuleAuditSummary } from "../types/pim.ts";

/**
 * Standard brand code prefix mapping for medical & consumer catalog brands.
 */
export const BRAND_PREFIX_MAP: Record<string, string> = {
  kendall: "KE",
  tylenol: "TY",
  pronet: "PN",
  medline: "ML",
  "3m": "3M",
  "becton dickinson": "BD",
  bd: "BD",
  "smith & nephew": "SN",
  "smith and nephew": "SN",
  smithnephew: "SN",
  coloplast: "CO",
  hollister: "HO",
  convatec: "CV",
  abbott: "AB",
  nestle: "NE",
  covidien: "CO",
  "johnson & johnson": "JJ",
  dynarex: "DY",
  drive: "DR",
  "drive devilbiss": "DR",
  invacare: "IN",
  "cardinal health": "CH",
  cardinal: "CH",
  mckesson: "MK",
  "independence medical": "IM",
  curad: "CU",
  bard: "BA",
  teleflex: "RU",
  rusch: "RU",
  "welch allyn": "WA",
  omron: "OM",
  baxter: "BX",
  hartmann: "HA",
  deroyal: "DR",
  roche: "RO",
};

/**
 * Derives a clean 2-letter capitalized Brand Prefix.
 */
export function deriveBrandPrefix(brandName: string): string {
  if (!brandName) return "XX";
  const clean = brandName.trim();
  const lower = clean.toLowerCase();

  if (BRAND_PREFIX_MAP[lower]) {
    return BRAND_PREFIX_MAP[lower];
  }

  // If brand has multiple words (e.g. "Independence Medical", "Smith Nephew")
  const words = clean.split(/[\s\-&_+/]+/).filter((w) => w.length > 0);
  if (words.length >= 2) {
    const p1 = words[0].replace(/[^a-zA-Z0-9]/g, "")[0] || "";
    const p2 = words[1].replace(/[^a-zA-Z0-9]/g, "")[0] || "";
    if (p1 && p2) return (p1 + p2).toUpperCase();
  }

  // Fallback: take first 2 alphanumeric chars
  const alphaNum = clean.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (alphaNum.length >= 2) {
    return alphaNum.slice(0, 2);
  } else if (alphaNum.length === 1) {
    return alphaNum + "X";
  }
  return "XX";
}

export interface ParsedUom {
  fullUnitType: string;
  multiplier: number;
  packagingSuffix: string | null; // e.g. "-BX", "-CS", "-BG", "-PK", or null for Each
  isEach: boolean;
}

/**
 * Normalizes raw UOM string into full unit name, multiplier, and packaging suffix.
 * Strictly respects:
 * - Each -> NO suffix
 * - Box -> -BX
 * - Case -> -CS
 * - Bag -> -BG
 * - Package -> -PK
 * - Unit Type spelled out fully: Each, Box, Case, Bag, Package, etc.
 */
export function parseUom(rawUom: string | undefined): ParsedUom {
  const str = (rawUom || "EA").trim().toUpperCase();

  // Pattern matches:
  // e.g. "BX/50", "50/BX", "BX of 50", "BAG/100", "100/BG", "CS 12", "EA", "1/EA", "PK/2"
  let multiplier = 1;
  let fullUnitType = "Each";
  let packagingSuffix: string | null = null;
  let isEach = false;

  // Extract numeric multiplier if present
  const numMatch = str.match(/\b(\d+)\b/);
  if (numMatch) {
    multiplier = parseInt(numMatch[1], 10) || 1;
  }

  // Identify unit type
  if (str.includes("BX") || str.includes("BOX")) {
    fullUnitType = "Box";
    packagingSuffix = "-BX";
  } else if (str.includes("CS") || str.includes("CASE")) {
    fullUnitType = "Case";
    packagingSuffix = "-CS";
  } else if (str.includes("BG") || str.includes("BAG")) {
    fullUnitType = "Bag";
    packagingSuffix = "-BG";
  } else if (str.includes("PK") || str.includes("PACK") || str.includes("PACKAGE")) {
    fullUnitType = "Package";
    packagingSuffix = "-PK";
  } else if (str.includes("RL") || str.includes("ROLL")) {
    fullUnitType = "Roll";
    packagingSuffix = "-RL";
  } else if (str.includes("PR") || str.includes("PAIR")) {
    fullUnitType = "Pair";
    packagingSuffix = "-PR";
  } else if (str.includes("BT") || str.includes("BOTTLE")) {
    fullUnitType = "Bottle";
    packagingSuffix = "-BT";
  } else if (str.includes("VL") || str.includes("VIAL")) {
    fullUnitType = "Vial";
    packagingSuffix = "-VL";
  } else if (str.includes("KT") || str.includes("KIT")) {
    fullUnitType = "Kit";
    packagingSuffix = "-KT";
  } else if (str.includes("DZ") || str.includes("DOZEN")) {
    fullUnitType = "Dozen";
    packagingSuffix = "-DZ";
  } else {
    // Default to Each
    fullUnitType = "Each";
    packagingSuffix = null; // EA Exception: strictly NO suffix!
    isEach = true;
    if (!numMatch) multiplier = 1;
  }

  if (fullUnitType === "Each") {
    packagingSuffix = null;
    isEach = true;
  }

  return {
    fullUnitType,
    multiplier,
    packagingSuffix,
    isEach,
  };
}

/**
 * Builds standard SKU according to:
 * - EA Exception: strictly [BrandPrefix][MPN] (no suffix)
 * - Packaged Items: [BrandPrefix][MPN]-[UOM_SUFFIX] (e.g. -BX, -CS, -BG, -PK)
 */
export function buildSku(brandPrefix: string, mpn: string, parsedUom: ParsedUom): string {
  const cleanMpn = (mpn || "").trim().replace(/\s+/g, "");
  if (parsedUom.isEach || !parsedUom.packagingSuffix) {
    return `${brandPrefix}${cleanMpn}`;
  }
  return `${brandPrefix}${cleanMpn}${parsedUom.packagingSuffix}`;
}

/**
 * Cleans and strips existing quantity / packaging suffixes from product titles
 * to get the pure base attribute sequence: "Name, color, flavor etc"
 */
export function extractBaseTitle(rawTitle: string): string {
  if (!rawTitle) return "";
  let title = rawTitle.trim();

  // Strip trailing packaging details like:
  // "- Box of 50", "- Bag of 100", "- Each", "1/EA", "50/BX", ", 50/bx", "(50/bx)", "- 100 per bag"
  title = title
    .replace(/[-–—]\s*(each|ea|box\s*of\s*\d+|bag\s*of\s*\d+|case\s*of\s*\d+|package\s*of\s*\d+|pack\s*of\s*\d+|\d+\s*per\s*[a-z]+|\d+\s*\/\s*[a-z]+)\s*$/i, "")
    .replace(/[,]?\s*\(?\d+\s*[\/]\s*(ea|bx|cs|bg|pk|box|case|bag|pack)\)?\s*$/i, "")
    .replace(/[,]?\s*\b\d+\s*(ct|count|pk|pack)\b\s*$/i, "")
    .trim();

  // Remove trailing commas or hyphens
  title = title.replace(/[,;\-–—\s]+$/, "").trim();

  return title;
}

/**
 * Formats variant title:
 * - Child variant or single item:
 *   - If Each: "Name, color, flavor etc - Each"
 *   - If packaged: "Name, color, flavor etc - [Packaging Type] of [Quantity]"
 */
export function formatVariantTitle(baseTitle: string, parsedUom: ParsedUom): string {
  const cleanBase = extractBaseTitle(baseTitle);
  if (parsedUom.isEach || parsedUom.fullUnitType === "Each") {
    return `${cleanBase} - Each`;
  }
  return `${cleanBase} - ${parsedUom.fullUnitType} of ${parsedUom.multiplier}`;
}

/**
 * Groups raw rows into multi-variant families vs single line items.
 */
export function groupSupplierRows(
  rows: RawSupplierRow[],
  authorizedCategories: string[] = AUTHORIZED_CATEGORIES
): NormalizedPimRow[] {
  // Map rows by a candidate family identifier
  // If user provided a familyKey, use that. Otherwise derive by Brand + normalized base title.
  const familyMap = new Map<string, RawSupplierRow[]>();

  for (const row of rows) {
    const brand = (row.brand || "").trim();
    const baseTitle = extractBaseTitle(row.productName || "");
    const baseKey = row.familyKey
      ? `${brand}::${row.familyKey.trim()}`
      : `${brand.toLowerCase()}::${baseTitle.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

    if (!familyMap.has(baseKey)) {
      familyMap.set(baseKey, []);
    }
    familyMap.get(baseKey)!.push(row);
  }

  const outputRows: NormalizedPimRow[] = [];

  for (const [, familyRows] of familyMap.entries()) {
    const isMultiVariantFamily = familyRows.length > 1;
    const firstRow = familyRows[0];
    const brand = (firstRow.brand || "").trim();
    const brandPrefix = deriveBrandPrefix(brand);
    const vendor = (firstRow.vendorName || "").trim();
    const isIndependenceMedical = vendor.toLowerCase().includes("independence medical");
    const shippingRate = isIndependenceMedical ? "4.80" : "0.00";

    const baseTitle = extractBaseTitle(firstRow.productName || "");
    const matchedCategory = matchCategory(
      `${brand} ${baseTitle} ${firstRow.rawAttributes || ""}`,
      authorizedCategories
    );
    const rootCategory = getRootCategory(matchedCategory);
    const leafCategory = matchedCategory.split(">").pop()?.trim() || matchedCategory;

    if (isMultiVariantFamily) {
      // 1. Create Parent Matrix Item (-MI)
      // Base MPN is derived from common prefix or first MPN base
      const commonMpnBase = deriveCommonMpn(familyRows.map((r) => r.mpn)) || firstRow.mpn.trim();
      const parentSku = `${brandPrefix}${commonMpnBase}-MI`;

      const parentRow: NormalizedPimRow = {
        id: `parent-${parentSku}`,
        isParent: true,
        isChild: false,
        isSingleLineItem: false,
        familyId: parentSku,

        SKU: parentSku,
        "Subitem Of": "", // Parent matrix item has empty Subitem Of
        MPN: commonMpnBase,
        "Purchase Price": "", // Typically empty at matrix parent level
        BRAND: brand,
        Vendor: vendor,
        "Product Preferred Vendor": vendor,
        "PRODUCT NAME": baseTitle, // Parent omits quantity/packaging details
        "Unit Type": "",
        "Uom to Each": "",
        "Stock Description": "",
        "Indemed Item #": firstRow.indemedItemId || "",
        "Indemed UOM": "",
        "Mckesson ID": firstRow.mckessonId || "NaN",
        "Mckesson UOM": firstRow.mckessonUom || "NaN",
        "Shipping Category": "Standard",
        "Shipping Rate": shippingRate,
        "Logo Free Shipping": "No",
        "Item Attribute Set": "Medical Supplies",
        "G shopping": "Yes",
        "Item Commerce Category": leafCategory,
        "Avatax Taxcode": "PC040100",
        "Google Product Category": rootCategory,
        "Item Manager": "Sanjay Meghwal",
        Category: matchedCategory,

        auditNotes: [
          `Matrix Parent created with SKU: ${parentSku}`,
          `Grouping ${familyRows.length} child variants`,
          `Parent title omits packaging/quantity details`,
          isIndependenceMedical ? "Independence Medical shipping rate set to 4.80" : "Standard shipping rate",
          `Assigned authorized category: ${matchedCategory}`,
        ],
        ruleFlags: {
          isMatrixParentCreated: true,
          isIndependenceMedicalRateApplied: isIndependenceMedical,
          isStrictCategoryMatched: true,
        },
      };

      outputRows.push(parentRow);

      // 2. Create Child Variants
      for (const raw of familyRows) {
        const uomParsed = parseUom(raw.uom);
        const childSku = buildSku(brandPrefix, raw.mpn, uomParsed);
        const formattedTitle = formatVariantTitle(raw.productName || baseTitle, uomParsed);
        const stockDesc = `${uomParsed.multiplier}/${uomParsed.fullUnitType}`;
        const itemPrice = raw.purchasePrice ? String(raw.purchasePrice) : "0.00";

        const childRow: NormalizedPimRow = {
          id: `child-${childSku}-${raw.mpn}`,
          isParent: false,
          isChild: true,
          isSingleLineItem: false,
          familyId: parentSku,

          SKU: childSku,
          "Subitem Of": parentSku, // Strictly points to parent matrix SKU
          MPN: (raw.mpn || "").trim(),
          "Purchase Price": itemPrice,
          BRAND: brand,
          Vendor: vendor,
          "Product Preferred Vendor": vendor,
          "PRODUCT NAME": formattedTitle,
          "Unit Type": uomParsed.fullUnitType, // Full descriptive word
          "Uom to Each": String(uomParsed.multiplier),
          "Stock Description": stockDesc, // [Quantity]/[Unit]
          "Indemed Item #": raw.indemedItemId || "",
          "Indemed UOM": raw.indemedUom || (uomParsed.isEach ? "EA" : uomParsed.fullUnitType.slice(0, 2).toUpperCase()),
          "Mckesson ID": raw.mckessonId || "NaN",
          "Mckesson UOM": raw.mckessonUom || "NaN",
          "Shipping Category": "Standard",
          "Shipping Rate": shippingRate,
          "Logo Free Shipping": "No",
          "Item Attribute Set": "Medical Supplies",
          "G shopping": "Yes",
          "Item Commerce Category": leafCategory,
          "Avatax Taxcode": "PC040100",
          "Google Product Category": rootCategory,
          "Item Manager": "Sanjay Meghwal",
          Category: matchedCategory,

          auditNotes: [
            `Child variant of parent: ${parentSku}`,
            uomParsed.isEach
              ? "EA Exception applied: No packaging suffix appended to SKU"
              : `Packaging suffix ${uomParsed.packagingSuffix} appended to SKU`,
            `Unit Type spelled out as '${uomParsed.fullUnitType}'`,
            `Stock description: '${stockDesc}'`,
            uomParsed.isEach
              ? "Title formatted with '- Each'"
              : `Title formatted with '- ${uomParsed.fullUnitType} of ${uomParsed.multiplier}'`,
          ],
          ruleFlags: {
            isEaExceptionApplied: uomParsed.isEach,
            isPackagingSuffixApplied: !uomParsed.isEach,
            isUnitTypeFullSpelled: true,
            isFullQuantitySuffixApplied: uomParsed.isEach,
            isIndependenceMedicalRateApplied: isIndependenceMedical,
            isStrictCategoryMatched: true,
          },
        };

        outputRows.push(childRow);
      }
    } else {
      // Single Line Item Rule:
      // Do NOT create a parent -MI item. Classify as Single Line Item!
      const raw = familyRows[0];
      const uomParsed = parseUom(raw.uom);
      const singleSku = buildSku(brandPrefix, raw.mpn, uomParsed);
      const formattedTitle = formatVariantTitle(raw.productName || baseTitle, uomParsed);
      const stockDesc = `${uomParsed.multiplier}/${uomParsed.fullUnitType}`;
      const itemPrice = raw.purchasePrice ? String(raw.purchasePrice) : "0.00";

      const singleRow: NormalizedPimRow = {
        id: `single-${singleSku}-${raw.mpn}`,
        isParent: false,
        isChild: false,
        isSingleLineItem: true,

        SKU: singleSku,
        "Subitem Of": "", // Single line item has empty Subitem Of
        MPN: (raw.mpn || "").trim(),
        "Purchase Price": itemPrice,
        BRAND: brand,
        Vendor: vendor,
        "Product Preferred Vendor": vendor,
        "PRODUCT NAME": formattedTitle,
        "Unit Type": uomParsed.fullUnitType, // Full descriptive word
        "Uom to Each": String(uomParsed.multiplier),
        "Stock Description": stockDesc, // [Quantity]/[Unit]
        "Indemed Item #": raw.indemedItemId || "",
        "Indemed UOM": raw.indemedUom || (uomParsed.isEach ? "EA" : uomParsed.fullUnitType.slice(0, 2).toUpperCase()),
        "Mckesson ID": raw.mckessonId || "NaN",
        "Mckesson UOM": raw.mckessonUom || "NaN",
        "Shipping Category": "Standard",
        "Shipping Rate": shippingRate,
        "Logo Free Shipping": "No",
        "Item Attribute Set": "Medical Supplies",
        "G shopping": "Yes",
        "Item Commerce Category": leafCategory,
        "Avatax Taxcode": "PC040100",
        "Google Product Category": rootCategory,
        "Item Manager": "Sanjay Meghwal",
        Category: matchedCategory,

        auditNotes: [
          "Single Line Item (no matrix parent created)",
          uomParsed.isEach
            ? "EA Exception applied: No packaging suffix appended to SKU"
            : `Packaging suffix ${uomParsed.packagingSuffix} appended to SKU`,
          `Unit Type spelled out as '${uomParsed.fullUnitType}'`,
          `Stock description: '${stockDesc}'`,
          uomParsed.isEach
            ? "Title formatted with '- Each'"
            : `Title formatted with '- ${uomParsed.fullUnitType} of ${uomParsed.multiplier}'`,
          isIndependenceMedical ? "Independence Medical shipping rate set to 4.80" : "Standard shipping rate",
        ],
        ruleFlags: {
          isEaExceptionApplied: uomParsed.isEach,
          isPackagingSuffixApplied: !uomParsed.isEach,
          isUnitTypeFullSpelled: true,
          isFullQuantitySuffixApplied: uomParsed.isEach,
          isIndependenceMedicalRateApplied: isIndependenceMedical,
          isStrictCategoryMatched: true,
        },
      };

      outputRows.push(singleRow);
    }
  }

  return outputRows;
}

/**
 * Finds common alphanumeric prefix or base among multiple MPNs in the same family.
 */
function deriveCommonMpn(mpns: string[]): string {
  if (!mpns || mpns.length === 0) return "";
  const cleaned = mpns.map((m) => (m || "").trim()).filter(Boolean);
  if (cleaned.length === 0) return "";
  if (cleaned.length === 1) return cleaned[0];

  let prefix = cleaned[0];
  for (let i = 1; i < cleaned.length; i++) {
    while (!cleaned[i].startsWith(prefix) && prefix.length > 0) {
      prefix = prefix.substring(0, prefix.length - 1);
    }
  }

  // If prefix is too short, use the first MPN's base
  if (prefix.length < 3) {
    const first = cleaned[0].replace(/[^a-zA-Z0-9]/g, "");
    return first.slice(0, 5) || cleaned[0];
  }
  return prefix.replace(/[^a-zA-Z0-9]/g, "");
}

/**
 * Computes audit summary stats for the catalog.
 */
export function calculateAuditSummary(rows: NormalizedPimRow[]): RuleAuditSummary {
  let matrixParents = 0;
  let childVariants = 0;
  let singleItems = 0;
  let eaExceptionCount = 0;
  let packagingSuffixCount = 0;
  let independenceMedicalCount = 0;
  let strictCategoryMatches = 0;
  let nonReferenceCategoryWarnings = 0;

  for (const row of rows) {
    if (row.isParent) matrixParents++;
    if (row.isChild) childVariants++;
    if (row.isSingleLineItem) singleItems++;

    if (row.ruleFlags?.isEaExceptionApplied) eaExceptionCount++;
    if (row.ruleFlags?.isPackagingSuffixApplied) packagingSuffixCount++;
    if (row.ruleFlags?.isIndependenceMedicalRateApplied) independenceMedicalCount++;
    if (row.ruleFlags?.isStrictCategoryMatched) strictCategoryMatches++;

    // Check if category is in authorized list
    if (row.Category && !AUTHORIZED_CATEGORIES.includes(row.Category)) {
      nonReferenceCategoryWarnings++;
    }
  }

  return {
    totalRows: rows.length,
    matrixParents,
    childVariants,
    singleItems,
    eaExceptionCount,
    packagingSuffixCount,
    independenceMedicalCount,
    strictCategoryMatches,
    nonReferenceCategoryWarnings,
  };
}
