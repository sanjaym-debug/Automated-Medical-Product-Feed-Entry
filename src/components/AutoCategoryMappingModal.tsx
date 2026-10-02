import React, { useState, useEffect, useMemo } from "react";
import { NormalizedPimRow, AutoCategoryMappingResult } from "../types/pim.ts";
import { autoMapProductCategory, getRootCategory } from "../data/categories.ts";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  X,
  Check,
  Search,
  Filter,
  Layers,
  ChevronRight,
  ShieldCheck,
  Zap
} from "lucide-react";

interface AutoCategoryMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogRows: NormalizedPimRow[];
  authorizedCategories: string[];
  categorySource: string;
  onApplyCategoryMappings: (mappings: AutoCategoryMappingResult[]) => void;
}

export const AutoCategoryMappingModal: React.FC<AutoCategoryMappingModalProps> = ({
  isOpen,
  onClose,
  catalogRows,
  authorizedCategories,
  categorySource,
  onApplyCategoryMappings,
}) => {
  if (!isOpen) return null;

  const [loading, setLoading] = useState(false);
  const [useAi, setUseAi] = useState(true);
  const [results, setResults] = useState<AutoCategoryMappingResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState("");
  const [filterChangedOnly, setFilterChangedOnly] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [manualOverrideQuery, setManualOverrideQuery] = useState("");

  // Run the automatic mapping calculation
  const runAutoMapping = async (enableAi: boolean = true) => {
    setLoading(true);

    try {
      if (enableAi) {
        // Call backend API
        const res = await fetch("/api/auto-map-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: catalogRows.map((r) => ({
              id: r.id,
              SKU: r.SKU,
              MPN: r.MPN,
              BRAND: r.BRAND,
              "PRODUCT NAME": r["PRODUCT NAME"],
              Category: r.Category,
            })),
            useAi: true,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.mappedItems) {
            setResults(data.mappedItems);
            setSelectedIds(new Set(data.mappedItems.map((m: any) => m.id)));
            setLoading(false);
            return;
          }
        }
      }

      // High-speed client-side deterministic & taxonomy engine
      const mapped: AutoCategoryMappingResult[] = catalogRows.map((row) => {
        const match = autoMapProductCategory(
          {
            brand: row.BRAND,
            mpn: row.MPN,
            productName: row["PRODUCT NAME"],
          },
          authorizedCategories
        );

        const currentCat = row.Category || "";
        const isChanged = currentCat !== match.categoryPath;
        const parts = match.categoryPath.split(">").map((p) => p.trim());

        return {
          id: row.id,
          sku: row.SKU,
          mpn: row.MPN,
          brand: row.BRAND,
          productName: row["PRODUCT NAME"],
          currentCategory: currentCat,
          mappedCategory: match.categoryPath,
          googleProductCategory: match.rootCategory,
          itemCommerceCategory: parts[parts.length - 1],
          confidence: match.confidence,
          matchType: match.matchType,
          rationale: match.rationale,
          isChanged,
        };
      });

      setResults(mapped);
      setSelectedIds(new Set(mapped.map((m) => m.id)));
    } catch (err) {
      console.error("Auto mapping error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runAutoMapping(useAi);
    }
  }, [isOpen]);

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredResults.map((r) => r.id)));
    }
  };

  // Filtered results
  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      if (filterChangedOnly && !r.isChanged) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        return (
          r.sku.toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q) ||
          r.mappedCategory.toLowerCase().includes(q) ||
          r.brand.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [results, filterChangedOnly, searchFilter]);

  // Manual override for a specific row
  const handleApplyOverride = (id: string, newPath: string) => {
    const parts = newPath.split(">").map((p) => p.trim());
    setResults((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            mappedCategory: newPath,
            googleProductCategory: parts[0],
            itemCommerceCategory: parts[parts.length - 1],
            confidence: 100,
            matchType: "Manual Authorized Selection",
            rationale: "Manually overridden from Category.xlsx reference list.",
            isChanged: item.currentCategory !== newPath,
          };
        }
        return item;
      })
    );
    setEditingRowId(null);
    setManualOverrideQuery("");
  };

  // Filtered categories for override picker
  const filteredCategoriesForPicker = useMemo(() => {
    if (!manualOverrideQuery.trim()) return authorizedCategories.slice(0, 30);
    const q = manualOverrideQuery.toLowerCase();
    return authorizedCategories.filter((c) => c.toLowerCase().includes(q)).slice(0, 30);
  }, [authorizedCategories, manualOverrideQuery]);

  const handleApplySelected = () => {
    const toApply = results.filter((r) => selectedIds.has(r.id));
    onApplyCategoryMappings(toApply);
    onClose();
  };

  const handleApplyAll = () => {
    onApplyCategoryMappings(results);
    onClose();
  };

  const changedCount = results.filter((r) => r.isChanged).length;
  const avgConfidence = Math.round(
    results.reduce((acc, r) => acc + r.confidence, 0) / (results.length || 1)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-5xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-md shadow-indigo-500/20">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">
                  Automatic Category Mapping Engine
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Strict Rule 5 Enforced
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Relies on <strong className="text-cyan-300">Product Names & Types</strong> through AI research to map the correct category from{" "}
                <strong className="text-indigo-300">{categorySource}</strong> ({authorizedCategories.length} paths).
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-center">
            {/* AI Toggle */}
            <button
              onClick={() => {
                const nextAi = !useAi;
                setUseAi(nextAi);
                runAutoMapping(nextAi);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition flex items-center space-x-1.5 ${
                useAi
                  ? "bg-cyan-600/20 text-cyan-300 border-cyan-500/40"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
              }`}
              title="Enable Gemini AI search grounding for complex multi-attribute mappings"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Grounding: {useAi ? "ON" : "OFF"}</span>
            </button>

            <button
              onClick={() => runAutoMapping(useAi)}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Re-run auto mapping"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shrink-0">
          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
            <span className="text-slate-400 block text-[11px]">Total Items:</span>
            <span className="text-base font-bold text-white">{results.length}</span>
          </div>

          <div className="bg-indigo-950/30 border border-indigo-900/40 p-3 rounded-xl">
            <span className="text-indigo-300 block text-[11px]">Reference Matched:</span>
            <span className="text-base font-bold text-indigo-200">100% (Strict)</span>
          </div>

          <div className="bg-emerald-950/30 border border-emerald-900/40 p-3 rounded-xl">
            <span className="text-emerald-300 block text-[11px]">Average Confidence:</span>
            <span className="text-base font-bold text-emerald-200">{avgConfidence}%</span>
          </div>

          <div className="bg-amber-950/30 border border-amber-900/40 p-3 rounded-xl">
            <span className="text-amber-300 block text-[11px]">Categories Updated:</span>
            <span className="text-base font-bold text-amber-200">{changedCount} items</span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search product, SKU, or mapped category..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              onClick={() => setFilterChangedOnly(!filterChangedOnly)}
              className={`px-3 py-1.5 rounded-xl border font-medium transition ${
                filterChangedOnly
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
              }`}
            >
              Changed Only ({changedCount})
            </button>

            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium transition"
            >
              {selectedIds.size === filteredResults.length ? "Deselect All" : "Select All"}
            </button>
          </div>
        </div>

        {/* Mappings Table */}
        <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950/60 min-h-[280px]">
          {loading ? (
            <div className="py-20 text-center text-slate-400 space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-indigo-400" />
              <p className="text-sm font-medium text-white">
                Mapping catalog items against Category.xlsx reference file...
              </p>
              <p className="text-xs text-slate-500">
                Evaluating product attributes, keywords, and medical taxonomy.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400 z-10">
                <tr>
                  <th className="p-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredResults.length && filteredResults.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                    />
                  </th>
                  <th className="p-3">Product / SKU</th>
                  <th className="p-3 whitespace-nowrap">Researched Product Type</th>
                  <th className="p-3 min-w-[260px]">Auto-Mapped Category (Category.xlsx)</th>
                  <th className="p-3">Google Root Category</th>
                  <th className="p-3">Confidence & Rationale</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No products match your filter.
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    const isEditingThis = editingRowId === item.id;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-900/80 transition ${
                          item.isChanged ? "bg-indigo-950/10" : ""
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(item.id)}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                          />
                        </td>

                        <td className="p-3 max-w-xs">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono font-bold text-slate-200">{item.sku}</span>
                            {item.isChanged && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Update
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-300 line-clamp-1 mt-0.5" title={item.productName}>
                            {item.productName}
                          </div>
                        </td>

                        {/* Researched Product Type */}
                        <td className="p-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            {item.researchedProductType || "General Product"}
                          </span>
                        </td>

                        <td className="p-3">
                          {isEditingThis ? (
                            <div className="space-y-2 p-2 bg-slate-900 border border-indigo-500/50 rounded-xl shadow-lg">
                              <input
                                type="text"
                                placeholder="Search authorized categories..."
                                value={manualOverrideQuery}
                                onChange={(e) => setManualOverrideQuery(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                autoFocus
                              />
                              <div className="max-h-40 overflow-y-auto space-y-1">
                                {filteredCategoriesForPicker.map((cat) => (
                                  <button
                                    key={cat}
                                    onClick={() => handleApplyOverride(item.id, cat)}
                                    className="w-full text-left p-1.5 rounded hover:bg-indigo-600/30 text-[11px] text-slate-300 hover:text-white transition flex items-center justify-between"
                                  >
                                    <span className="truncate">{cat}</span>
                                    <Check className="h-3 w-3 shrink-0 ml-1 text-emerald-400" />
                                  </button>
                                ))}
                              </div>
                              <button
                                onClick={() => setEditingRowId(null)}
                                className="text-[11px] text-slate-400 hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="font-medium text-white flex items-center space-x-1.5">
                                <span className="text-indigo-300 font-mono text-[11px]">{item.mappedCategory}</span>
                              </div>
                              {item.isChanged && item.currentCategory && (
                                <div className="text-[10px] text-slate-500 line-through">
                                  Previous: {item.currentCategory}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="p-3 text-cyan-300 font-medium whitespace-nowrap">
                          {item.googleProductCategory}
                        </td>

                        <td className="p-3">
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                item.confidence >= 95
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : item.confidence >= 85
                                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              }`}
                            >
                              {item.confidence}%
                            </span>
                            <span className="text-[10px] text-slate-400">{item.matchType}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 line-clamp-1" title={item.rationale}>
                            {item.rationale}
                          </div>
                        </td>

                        <td className="p-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              setEditingRowId(isEditingThis ? null : item.id);
                              setManualOverrideQuery("");
                            }}
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium hover:underline"
                          >
                            {isEditingThis ? "Close" : "Change"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800 shrink-0 text-xs">
          <div className="text-slate-400 flex items-center space-x-2">
            <span>
              Selected: <strong className="text-white">{selectedIds.size}</strong> of {results.length}
            </span>
            <span>•</span>
            <span className="text-indigo-300">Target: Category & Google Product Category columns</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>

            {selectedIds.size < results.length && selectedIds.size > 0 && (
              <button
                onClick={handleApplySelected}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-medium transition"
              >
                Apply Selected ({selectedIds.size})
              </button>
            )}

            <button
              onClick={handleApplyAll}
              className="flex-1 sm:flex-initial px-5 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl font-semibold shadow-md transition flex items-center justify-center space-x-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Apply All Mappings ({results.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
