import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Navbar } from "./components/Navbar.tsx";
import { AuditHeader } from "./components/AuditHeader.tsx";
import { PimCatalogTable } from "./components/PimCatalogTable.tsx";
import { MatrixTreeView } from "./components/MatrixTreeView.tsx";
import { MpnResearchStudio } from "./components/MpnResearchStudio.tsx";
import { CategoryReferenceViewer } from "./components/CategoryReferenceViewer.tsx";
import { RawFeedTable } from "./components/RawFeedTable.tsx";
import { RowDetailModal } from "./components/RowDetailModal.tsx";
import { UploadModal } from "./components/UploadModal.tsx";
import { AutoCategoryMappingModal } from "./components/AutoCategoryMappingModal.tsx";

import { NormalizedPimRow, RawSupplierRow, AutoCategoryMappingResult } from "./types/pim.ts";
import { AUTHORIZED_CATEGORIES, autoMapProductCategory } from "./data/categories.ts";
import { SAMPLE_SUPPLIER_FEEDS } from "./data/sampleFeeds.ts";
import { groupSupplierRows, calculateAuditSummary } from "./utils/pimEngine.ts";
import * as XLSX from "xlsx";

const PIM_COLUMNS = [
  "SKU",
  "Subitem Of",
  "MPN",
  "Purchase Price",
  "BRAND",
  "Vendor",
  "Product Preferred Vendor",
  "PRODUCT NAME",
  "Unit Type",
  "Uom to Each",
  "Stock Description",
  "Indemed Item #",
  "Indemed UOM",
  "Mckesson ID",
  "Mckesson UOM",
  "Shipping Category",
  "Shipping Rate",
  "Logo Free Shipping",
  "Item Attribute Set",
  "G shopping",
  "Item Commerce Category",
  "Avatax Taxcode",
  "Google Product Category",
  "Item Manager",
  "Category",
] as const;

export default function App() {
  const [activeTab, setActiveTab] = useState<"pim" | "raw" | "matrix" | "research" | "categories">("pim");
  const [categories, setCategories] = useState<string[]>(AUTHORIZED_CATEGORIES);
  const [categorySource, setCategorySource] = useState<string>("Category.xlsx");

  // Initial raw rows load from default Independence Medical feed
  const [rawRows, setRawRows] = useState<RawSupplierRow[]>(SAMPLE_SUPPLIER_FEEDS.independence_medical.rows);

  // Normalized 25-column PIM rows
  const [pimRows, setPimRows] = useState<NormalizedPimRow[]>(() => {
    return groupSupplierRows(SAMPLE_SUPPLIER_FEEDS.independence_medical.rows, AUTHORIZED_CATEGORIES);
  });

  // Modals state
  const [selectedRow, setSelectedRow] = useState<NormalizedPimRow | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAutoMapModalOpen, setIsAutoMapModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Research studio context
  const [researchTarget, setResearchTarget] = useState<{ brand: string; mpn: string; rawName: string }>({
    brand: "ProNet",
    mpn: "PNET8-1",
    rawName: "ProNet Elastic Net Retainer Dressing White, 8 Inch Length Size 1 (100/BG)",
  });

  // Fetch authorized categories on mount from server
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.categories && data.categories.length > 0) {
          setCategories(data.categories);
          setCategorySource(data.sourceFile || "Category.xlsx");
        }
      })
      .catch((err) => {
        console.warn("Using built-in category fallback:", err);
      });
  }, []);

  // Re-run transformation whenever raw rows or categories change
  const handleReTransform = useCallback(() => {
    const normalized = groupSupplierRows(rawRows, categories);
    setPimRows(normalized);
  }, [rawRows, categories]);

  useEffect(() => {
    handleReTransform();
  }, [rawRows, categories, handleReTransform]);

  // Audit summary
  const auditSummary = useMemo(() => {
    return calculateAuditSummary(pimRows);
  }, [pimRows]);

  // Updating a single PIM row (e.g. from table or modal)
  const handleUpdatePimRow = (updated: NormalizedPimRow) => {
    setPimRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  // Applying research findings to catalog
  const handleApplyResearch = (targetMpn: string, researchData: any) => {
    setPimRows((prev) =>
      prev.map((row) => {
        if (row.MPN === targetMpn || row.SKU.includes(targetMpn)) {
          return {
            ...row,
            BRAND: researchData.officialBrand || row.BRAND,
            "PRODUCT NAME": row.isParent
              ? researchData.normalizedBaseTitle
              : `${researchData.normalizedBaseTitle} - ${row["Unit Type"]} of ${row["Uom to Each"]}`,
            Category: researchData.bestCategoryPath || row.Category,
            "Google Product Category": researchData.rootCategory || row["Google Product Category"],
            auditNotes: [
              ...(row.auditNotes || []),
              "Verified with Google Search Grounding MPN research.",
            ],
          };
        }
        return row;
      })
    );
  };

  // Applying bulk automatic category mappings
  const handleApplyCategoryMappings = (mappings: AutoCategoryMappingResult[]) => {
    const mapDict = new Map<string, AutoCategoryMappingResult>();
    mappings.forEach((m) => {
      mapDict.set(m.id, m);
      if (m.sku) mapDict.set(m.sku, m);
    });

    setPimRows((prev) =>
      prev.map((row) => {
        const match = mapDict.get(row.id) || mapDict.get(row.SKU);
        if (match) {
          return {
            ...row,
            Category: match.mappedCategory,
            "Google Product Category": match.googleProductCategory,
            "Item Commerce Category": match.itemCommerceCategory,
            auditNotes: [
              ...(row.auditNotes || []),
              `Auto-mapped from Category.xlsx (${match.confidence}% confidence, ${match.matchType})`,
            ],
          };
        }
        return row;
      })
    );

    setToastMessage(`Successfully auto-mapped ${mappings.length} items from Category.xlsx!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Single-row automatic category mapping using AI
  const handleAutoMapSingleRow = async (row: NormalizedPimRow) => {
    try {
      const res = await fetch("/api/auto-map-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              id: row.id,
              SKU: row.SKU,
              MPN: row.MPN,
              BRAND: row.BRAND,
              "PRODUCT NAME": row["PRODUCT NAME"],
              Category: row.Category,
            },
          ],
          useAi: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const mapped = data.mappedItems?.[0];
        if (mapped && mapped.mappedCategory) {
          const updated: NormalizedPimRow = {
            ...row,
            Category: mapped.mappedCategory,
            "Google Product Category": mapped.googleProductCategory,
            "Item Commerce Category": mapped.itemCommerceCategory,
            auditNotes: [
              ...(row.auditNotes || []),
              `AI mapped to exact Category.xlsx: ${mapped.mappedCategory} (${mapped.confidence}% confidence, ${mapped.matchType})`,
            ],
          };
          handleUpdatePimRow(updated);
          setToastMessage(`AI mapped SKU ${row.SKU} to: ${mapped.mappedCategory}`);
          setTimeout(() => setToastMessage(null), 3500);
          return;
        }
      }
    } catch (e) {
      console.warn("AI single-row mapping fallback to deterministic matcher:", e);
    }

    // Fallback if API was unavailable
    const match = autoMapProductCategory(
      {
        brand: row.BRAND,
        mpn: row.MPN,
        productName: row["PRODUCT NAME"],
      },
      categories
    );

    const parts = match.categoryPath.split(">").map((p) => p.trim());
    const fallbackUpdated: NormalizedPimRow = {
      ...row,
      Category: match.categoryPath,
      "Google Product Category": match.rootCategory,
      "Item Commerce Category": parts[parts.length - 1],
      auditNotes: [
        ...(row.auditNotes || []),
        `Auto-mapped from Category.xlsx: ${match.categoryPath} (${match.confidence}% confidence)`,
      ],
    };

    handleUpdatePimRow(fallbackUpdated);
    setToastMessage(`Auto-mapped SKU ${row.SKU} to: ${match.categoryPath}`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenResearchForMpn = (brand: string, mpn: string, rawName: string) => {
    setResearchTarget({ brand, mpn, rawName });
    setActiveTab("research");
  };

  // Uploading new custom Category reference list
  const handleUploadCategories = async (newCats: string[]) => {
    setCategories(newCats);
    setCategorySource("Custom Upload (Category.xlsx)");
    try {
      await fetch("/api/categories/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: newCats }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Excel (.xlsx) Export
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Map rows strictly to the 25-column specification
    const exportData = pimRows.map((r) => {
      const obj: Record<string, string> = {};
      PIM_COLUMNS.forEach((col) => {
        obj[col] = r[col] || "";
      });
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(exportData, { header: [...PIM_COLUMNS] });
    XLSX.utils.book_append_sheet(wb, ws, "PIM Catalog");
    XLSX.writeFile(wb, "PIM_Catalog_Normalized_Export.xlsx");
  };

  // CSV Export
  const handleExportCsv = () => {
    const wb = XLSX.utils.book_new();
    const exportData = pimRows.map((r) => {
      const obj: Record<string, string> = {};
      PIM_COLUMNS.forEach((col) => {
        obj[col] = r[col] || "";
      });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(exportData, { header: [...PIM_COLUMNS] });
    XLSX.utils.book_append_sheet(wb, ws, "PIM Catalog");
    XLSX.writeFile(wb, "PIM_Catalog_Normalized_Export.csv", { bookType: "csv" });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenUpload={() => setIsUploadOpen(true)}
        onExportExcel={handleExportExcel}
        onExportCsv={handleExportCsv}
        onOpenCategories={() => setActiveTab("categories")}
        onOpenAutoMapModal={() => setIsAutoMapModalOpen(true)}
        totalPimRows={pimRows.length}
        itemManagerName="Sanjay Meghwal"
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Compliance and Audit Status Summary */}
        <AuditHeader summary={auditSummary} categorySource={categorySource} />

        {/* Tab 1: Normalized 25-Column PIM Table */}
        {activeTab === "pim" && (
          <PimCatalogTable
            rows={pimRows}
            onSelectRow={(r) => setSelectedRow(r)}
            onUpdateRow={handleUpdatePimRow}
            onOpenResearchForMpn={handleOpenResearchForMpn}
            onOpenAutoMapModal={() => setIsAutoMapModalOpen(true)}
            onAutoMapSingleRow={handleAutoMapSingleRow}
          />
        )}

        {/* Tab 2: Matrix & Single Hierarchy */}
        {activeTab === "matrix" && (
          <MatrixTreeView
            rows={pimRows}
            onSelectRow={(r) => setSelectedRow(r)}
          />
        )}

        {/* Tab 3: MPN & Brand Research Studio */}
        {activeTab === "research" && (
          <MpnResearchStudio
            catalogRows={pimRows}
            onApplyResearch={handleApplyResearch}
            initialBrand={researchTarget.brand}
            initialMpn={researchTarget.mpn}
            initialRawName={researchTarget.rawName}
          />
        )}

        {/* Tab 4: Raw Supplier Feed Ingestion Queue */}
        {activeTab === "raw" && (
          <RawFeedTable
            rows={rawRows}
            onUpdateRows={(newRows) => setRawRows(newRows)}
            onTransform={handleReTransform}
            onOpenUploadModal={() => setIsUploadOpen(true)}
          />
        )}

        {/* Tab 5: Strict Category Reference Viewer */}
        {activeTab === "categories" && (
          <CategoryReferenceViewer
            categories={categories}
            onUploadCategories={handleUploadCategories}
            categorySource={categorySource}
            onTriggerAutoMap={() => setIsAutoMapModalOpen(true)}
          />
        )}
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-indigo-500/60 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 text-xs animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <RowDetailModal
        row={selectedRow}
        onClose={() => setSelectedRow(null)}
        onSave={handleUpdatePimRow}
        authorizedCategories={categories}
      />

      <AutoCategoryMappingModal
        isOpen={isAutoMapModalOpen}
        onClose={() => setIsAutoMapModalOpen(false)}
        catalogRows={pimRows}
        authorizedCategories={categories}
        categorySource={categorySource}
        onApplyCategoryMappings={handleApplyCategoryMappings}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onFeedIngested={(rows) => {
          setRawRows(rows);
          setActiveTab("pim");
        }}
      />
    </div>
  );
}
