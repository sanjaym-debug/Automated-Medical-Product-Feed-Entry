import React, { useState, useMemo } from "react";
import { NormalizedPimRow } from "../types/pim.ts";
import {
  Search,
  Filter,
  Layers,
  ArrowUpDown,
  Eye,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Truck,
  BookmarkCheck,
  Columns,
  Download
} from "lucide-react";

interface PimCatalogTableProps {
  rows: NormalizedPimRow[];
  onSelectRow: (row: NormalizedPimRow) => void;
  onUpdateRow: (row: NormalizedPimRow) => void;
  onOpenResearchForMpn?: (brand: string, mpn: string, rawName: string) => void;
}

export const PimCatalogTable: React.FC<PimCatalogTableProps> = ({
  rows,
  onSelectRow,
  onUpdateRow,
  onOpenResearchForMpn,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "parents" | "children" | "single" | "indemed">("all");
  const [sortField, setSortField] = useState<keyof NormalizedPimRow>("SKU");
  const [sortAsc, setSortAsc] = useState(true);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string; value: string } | null>(null);

  // Filtered & sorted rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // Type filter
      if (filterType === "parents" && !r.isParent) return false;
      if (filterType === "children" && !r.isChild) return false;
      if (filterType === "single" && !r.isSingleLineItem) return false;
      if (filterType === "indemed" && !r.Vendor.toLowerCase().includes("independence medical")) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          r.SKU.toLowerCase().includes(q) ||
          r.MPN.toLowerCase().includes(q) ||
          r.BRAND.toLowerCase().includes(q) ||
          r["PRODUCT NAME"].toLowerCase().includes(q) ||
          r.Vendor.toLowerCase().includes(q) ||
          r.Category.toLowerCase().includes(q) ||
          r["Subitem Of"].toLowerCase().includes(q) ||
          r["Stock Description"].toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [rows, filterType, searchQuery]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const aVal = String(a[sortField] || "");
      const bVal = String(b[sortField] || "");
      const res = aVal.localeCompare(bVal, undefined, { numeric: true });
      return sortAsc ? res : -res;
    });
  }, [filteredRows, sortField, sortAsc]);

  const handleSort = (field: keyof NormalizedPimRow) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleSaveCell = () => {
    if (!editingCell) return;
    const target = rows.find((r) => r.id === editingCell.id);
    if (target) {
      const updated = { ...target, [editingCell.field]: editingCell.value };
      onUpdateRow(updated);
    }
    setEditingCell(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU, MPN, Brand, Product Name, Category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
          <span className="text-slate-400 flex items-center mr-1">
            <Filter className="h-3.5 w-3.5 mr-1" /> Filter:
          </span>
          <button
            onClick={() => setFilterType("all")}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition ${
              filterType === "all" ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            All ({rows.length})
          </button>
          <button
            onClick={() => setFilterType("parents")}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center space-x-1 ${
              filterType === "parents"
                ? "bg-purple-600 text-white"
                : "text-purple-300 hover:bg-slate-800"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span>Matrix Parents (-MI)</span>
          </button>
          <button
            onClick={() => setFilterType("children")}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center space-x-1 ${
              filterType === "children"
                ? "bg-indigo-600 text-white"
                : "text-indigo-300 hover:bg-slate-800"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span>Child Variants</span>
          </button>
          <button
            onClick={() => setFilterType("single")}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center space-x-1 ${
              filterType === "single"
                ? "bg-cyan-600 text-white"
                : "text-cyan-300 hover:bg-slate-800"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Single Items</span>
          </button>
          <button
            onClick={() => setFilterType("indemed")}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center space-x-1 ${
              filterType === "indemed"
                ? "bg-amber-600 text-white"
                : "text-amber-300 hover:bg-slate-800"
            }`}
          >
            <Truck className="h-3 w-3" />
            <span>Indemed ($4.80)</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto max-h-[640px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-950 text-slate-300 sticky top-0 z-20 shadow-sm border-b border-slate-800">
            <tr>
              <th className="p-3 font-semibold text-slate-400 w-12 text-center">#</th>
              <th className="p-3 font-semibold text-slate-400">Classification</th>

              {/* 1. SKU */}
              <th
                onClick={() => handleSort("SKU")}
                className="p-3 font-semibold cursor-pointer hover:text-white transition whitespace-nowrap"
              >
                <div className="flex items-center space-x-1">
                  <span>1. SKU</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>

              {/* 2. Subitem Of */}
              <th className="p-3 font-semibold text-slate-300 whitespace-nowrap">2. Subitem Of</th>

              {/* 3. MPN */}
              <th
                onClick={() => handleSort("MPN")}
                className="p-3 font-semibold cursor-pointer hover:text-white transition whitespace-nowrap"
              >
                <div className="flex items-center space-x-1">
                  <span>3. MPN</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>

              {/* 4. Purchase Price */}
              <th className="p-3 font-semibold text-slate-300 whitespace-nowrap">4. Purchase Price</th>

              {/* 5. BRAND */}
              <th
                onClick={() => handleSort("BRAND")}
                className="p-3 font-semibold cursor-pointer hover:text-white transition whitespace-nowrap"
              >
                <div className="flex items-center space-x-1">
                  <span>5. BRAND</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>

              {/* 6. Vendor */}
              <th className="p-3 font-semibold text-slate-300 whitespace-nowrap">6. Vendor</th>

              {/* 7. Product Preferred Vendor */}
              <th className="p-3 font-semibold text-slate-300 whitespace-nowrap">7. Pref. Vendor</th>

              {/* 8. PRODUCT NAME */}
              <th
                onClick={() => handleSort("PRODUCT NAME")}
                className="p-3 font-semibold cursor-pointer hover:text-white transition min-w-[260px]"
              >
                <div className="flex items-center space-x-1">
                  <span>8. PRODUCT NAME</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>

              {/* 9. Unit Type */}
              <th className="p-3 font-semibold text-slate-300 whitespace-nowrap">9. Unit Type</th>

              {/* 10. Uom to Each */}
              <th className="p-3 font-semibold text-slate-300 whitespace-nowrap">10. Uom to Each</th>

              {/* 11. Stock Description */}
              <th className="p-3 font-semibold text-slate-300 whitespace-nowrap">11. Stock Desc</th>

              {/* 12. Indemed Item # */}
              <th className="p-3 font-semibold text-slate-300 whitespace-nowrap">12. Indemed #</th>

              {/* 13. Indemed UOM */}
              <th className="p-3 font-semibold text-slate-300 whitespace-nowrap">13. Indemed UOM</th>

              {/* 14. Mckesson ID */}
              <th className="p-3 font-semibold text-slate-300 whitespace-nowrap">14. Mckesson ID</th>

              {/* 15. Mckesson UOM */}
              <th className="p-3 font-semibold text-slate-300 whitespace-nowrap">15. Mckesson UOM</th>

              {/* 16. Shipping Category */}
              <th className="p-3 font-semibold text-slate-300 whitespace-nowrap">16. Ship Cat</th>

              {/* 17. Shipping Rate */}
              <th className="p-3 font-semibold text-slate-300 whitespace-nowrap">17. Ship Rate</th>

              {/* 18. Logo Free Shipping */}
              <th className="p-3 font-semibold text-slate-300 whitespace-nowrap">18. Free Ship</th>

              {/* 19. Item Attribute Set */}
              <th className="p-3 font-semibold text-slate-300 whitespace-nowrap">19. Attr Set</th>

              {/* 20. G shopping */}
              <th className="p-3 font-semibold text-slate-300 whitespace-nowrap">20. G Shopping</th>

              {/* 21. Item Commerce Category */}
              <th className="p-3 font-semibold text-slate-300 whitespace-nowrap">21. Commerce Cat</th>

              {/* 22. Avatax Taxcode */}
              <th className="p-3 font-semibold text-slate-300 whitespace-nowrap">22. Taxcode</th>

              {/* 23. Google Product Category */}
              <th className="p-3 font-semibold text-slate-300 whitespace-nowrap">23. Google Root Cat</th>

              {/* 24. Item Manager */}
              <th className="p-3 font-semibold text-slate-300 whitespace-nowrap">24. Item Manager</th>

              {/* 25. Category */}
              <th
                onClick={() => handleSort("Category")}
                className="p-3 font-semibold cursor-pointer hover:text-white transition min-w-[220px]"
              >
                <div className="flex items-center space-x-1">
                  <span>25. Category (Strict Path)</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>

              <th className="p-3 font-semibold text-slate-400 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/80">
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={27} className="p-8 text-center text-slate-500">
                  No catalog items found matching your filters.
                </td>
              </tr>
            ) : (
              sortedRows.map((row, idx) => {
                const isParent = row.isParent;
                const isChild = row.isChild;
                const isSingle = row.isSingleLineItem;
                const isIndemed = row.Vendor.toLowerCase().includes("independence medical");

                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-slate-800/60 transition ${
                      isParent
                        ? "bg-purple-950/15 font-medium"
                        : isChild
                        ? "bg-slate-900/40"
                        : "bg-slate-900/70"
                    }`}
                  >
                    {/* Index */}
                    <td className="p-3 text-center text-slate-500 font-mono text-[11px]">{idx + 1}</td>

                    {/* Classification Badge */}
                    <td className="p-3 whitespace-nowrap">
                      {isParent && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          <Layers className="h-2.5 w-2.5 mr-1" /> Parent -MI
                        </span>
                      )}
                      {isChild && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          ↳ Variant
                        </span>
                      )}
                      {isSingle && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          Single Item
                        </span>
                      )}
                    </td>

                    {/* 1. SKU */}
                    <td className="p-3 font-mono font-bold text-white whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <span className={isParent ? "text-purple-300" : isChild ? "text-indigo-200" : "text-cyan-200"}>
                          {row.SKU}
                        </span>
                        {row.ruleFlags?.isEaExceptionApplied && (
                          <span
                            className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-sans"
                            title="EA Exception: No packaging suffix appended"
                          >
                            EA
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 2. Subitem Of */}
                    <td className="p-3 font-mono text-slate-400 whitespace-nowrap">
                      {row["Subitem Of"] ? (
                        <span className="text-purple-300 bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-800/40">
                          {row["Subitem Of"]}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* 3. MPN */}
                    <td className="p-3 font-mono text-slate-200 whitespace-nowrap">
                      {row.MPN}
                    </td>

                    {/* 4. Purchase Price */}
                    <td className="p-3 text-slate-300 whitespace-nowrap font-mono">
                      {row["Purchase Price"] ? `$${parseFloat(row["Purchase Price"]).toFixed(2)}` : "—"}
                    </td>

                    {/* 5. BRAND */}
                    <td className="p-3 text-slate-200 whitespace-nowrap font-medium">
                      {row.BRAND}
                    </td>

                    {/* 6. Vendor */}
                    <td className="p-3 text-slate-300 whitespace-nowrap">
                      {row.Vendor}
                    </td>

                    {/* 7. Product Preferred Vendor */}
                    <td className="p-3 text-slate-400 whitespace-nowrap">
                      {row["Product Preferred Vendor"]}
                    </td>

                    {/* 8. PRODUCT NAME */}
                    <td className="p-3 text-slate-100 max-w-sm truncate" title={row["PRODUCT NAME"]}>
                      <span className="hover:text-blue-300 transition cursor-pointer" onClick={() => onSelectRow(row)}>
                        {row["PRODUCT NAME"]}
                      </span>
                    </td>

                    {/* 9. Unit Type */}
                    <td className="p-3 whitespace-nowrap">
                      {row["Unit Type"] ? (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-medium border border-slate-700">
                          {row["Unit Type"]}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* 10. Uom to Each */}
                    <td className="p-3 font-mono text-slate-300 text-center">
                      {row["Uom to Each"] || "—"}
                    </td>

                    {/* 11. Stock Description */}
                    <td className="p-3 whitespace-nowrap font-mono text-amber-200/90">
                      {row["Stock Description"] || "—"}
                    </td>

                    {/* 12. Indemed Item # */}
                    <td className="p-3 font-mono text-slate-300 whitespace-nowrap">
                      {row["Indemed Item #"] || "—"}
                    </td>

                    {/* 13. Indemed UOM */}
                    <td className="p-3 font-mono text-slate-400 text-center">
                      {row["Indemed UOM"] || "—"}
                    </td>

                    {/* 14. Mckesson ID */}
                    <td className="p-3 font-mono text-slate-500 text-center">
                      {row["Mckesson ID"] === "NaN" || !row["Mckesson ID"] ? "NaN" : row["Mckesson ID"]}
                    </td>

                    {/* 15. Mckesson UOM */}
                    <td className="p-3 font-mono text-slate-500 text-center">
                      {row["Mckesson UOM"] === "NaN" || !row["Mckesson UOM"] ? "NaN" : row["Mckesson UOM"]}
                    </td>

                    {/* 16. Shipping Category */}
                    <td className="p-3 text-slate-400 whitespace-nowrap">
                      {row["Shipping Category"]}
                    </td>

                    {/* 17. Shipping Rate */}
                    <td className="p-3 whitespace-nowrap font-mono">
                      {isIndemed ? (
                        <span className="font-bold text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">
                          ${parseFloat(row["Shipping Rate"]).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400">${parseFloat(row["Shipping Rate"] || "0").toFixed(2)}</span>
                      )}
                    </td>

                    {/* 18. Logo Free Shipping */}
                    <td className="p-3 text-slate-400 text-center">
                      {row["Logo Free Shipping"]}
                    </td>

                    {/* 19. Item Attribute Set */}
                    <td className="p-3 text-slate-400 whitespace-nowrap">
                      {row["Item Attribute Set"]}
                    </td>

                    {/* 20. G shopping */}
                    <td className="p-3 text-slate-400 text-center">
                      {row["G shopping"]}
                    </td>

                    {/* 21. Item Commerce Category */}
                    <td className="p-3 text-slate-300 whitespace-nowrap max-w-xs truncate" title={row["Item Commerce Category"]}>
                      {row["Item Commerce Category"]}
                    </td>

                    {/* 22. Avatax Taxcode */}
                    <td className="p-3 font-mono text-slate-400 whitespace-nowrap">
                      {row["Avatax Taxcode"]}
                    </td>

                    {/* 23. Google Product Category */}
                    <td className="p-3 text-blue-300 font-medium whitespace-nowrap">
                      {row["Google Product Category"]}
                    </td>

                    {/* 24. Item Manager */}
                    <td className="p-3 text-emerald-300 font-medium whitespace-nowrap">
                      {row["Item Manager"]}
                    </td>

                    {/* 25. Category */}
                    <td className="p-3 text-slate-200 max-w-sm truncate" title={row.Category}>
                      <span className="text-slate-300 hover:text-white">
                        {row.Category}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => onSelectRow(row)}
                          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-blue-400 transition"
                          title="View all 25 fields & audit details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {onOpenResearchForMpn && row.MPN && (
                          <button
                            onClick={() => onOpenResearchForMpn(row.BRAND, row.MPN, row["PRODUCT NAME"])}
                            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition"
                            title="Research Brand & MPN with Search Grounding"
                          >
                            <Search className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Row Counter */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
        <div>
          Showing <span className="text-white font-medium">{sortedRows.length}</span> of{" "}
          <span className="text-white font-medium">{rows.length}</span> catalog items
        </div>
        <div className="flex items-center space-x-3 text-slate-500">
          <span>Item Manager: Sanjay Meghwal</span>
          <span>•</span>
          <span>Avatax: PC040100</span>
          <span>•</span>
          <span>Schema: Exact 25 Columns</span>
        </div>
      </div>
    </div>
  );
};
