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

import { NormalizedPimRow, RawSupplierRow } from "./types/pim.ts";
import { AUTHORIZED_CATEGORIES } from "./data/categories.ts";
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
          />
        )}
      </main>

      {/* Modals */}
      <RowDetailModal
        row={selectedRow}
        onClose={() => setSelectedRow(null)}
        onSave={handleUpdatePimRow}
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
