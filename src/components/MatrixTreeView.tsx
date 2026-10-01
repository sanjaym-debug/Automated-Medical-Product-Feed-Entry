import React from "react";
import { NormalizedPimRow } from "../types/pim.ts";
import { Layers, ChevronRight, Hash, BookmarkCheck, ExternalLink, ShieldCheck } from "lucide-react";

interface MatrixTreeViewProps {
  rows: NormalizedPimRow[];
  onSelectRow: (row: NormalizedPimRow) => void;
}

export const MatrixTreeView: React.FC<MatrixTreeViewProps> = ({ rows, onSelectRow }) => {
  // Group into families
  const parentMap = new Map<string, { parent: NormalizedPimRow | null; children: NormalizedPimRow[] }>();
  const singleItems: NormalizedPimRow[] = [];

  for (const row of rows) {
    if (row.isSingleLineItem) {
      singleItems.push(row);
    } else if (row.isParent) {
      if (!parentMap.has(row.SKU)) {
        parentMap.set(row.SKU, { parent: row, children: [] });
      } else {
        parentMap.get(row.SKU)!.parent = row;
      }
    } else if (row.isChild) {
      const parentSku = row["Subitem Of"];
      if (!parentMap.has(parentSku)) {
        parentMap.set(parentSku, { parent: null, children: [] });
      }
      parentMap.get(parentSku)!.children.push(row);
    }
  }

  const families = Array.from(parentMap.entries());

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-800/40 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Matrix SKU Architecture & Single-Line Item Classification
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Rule Enforcement: Base product families with multiple sizes/packaging are unified under a single{" "}
              <code className="text-purple-300 font-mono font-bold">-MI</code> parent. Standalone products remain clean Single Line Items without unnecessary parents.
            </p>
          </div>
        </div>
      </div>

      {/* Multi-Variant Families Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-purple-300 flex items-center space-x-2">
            <Layers className="h-4 w-4" />
            <span>Matrix Families with Child Variants ({families.length})</span>
          </h4>
          <span className="text-xs text-slate-400">
            Parent SKU: <code className="text-purple-300 font-mono">[Prefix][BaseMPN]-MI</code>
          </span>
        </div>

        {families.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center text-slate-500 text-xs">
            No multi-variant matrix families generated.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {families.map(([parentSku, { parent, children }]) => {
              return (
                <div
                  key={parentSku}
                  className="bg-slate-900/80 border border-purple-900/40 hover:border-purple-700/60 rounded-2xl p-5 transition shadow-sm"
                >
                  {/* Parent Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 mt-0.5">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-sm text-purple-200">
                            {parentSku}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Parent Matrix Item (-MI)
                          </span>
                          <span className="text-xs text-slate-400">
                            Brand: <strong className="text-white">{parent?.BRAND || "—"}</strong>
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-white mt-1">
                          {parent?.["PRODUCT NAME"] || "Base Product Family"}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                          <span>Vendor: <strong className="text-slate-300">{parent?.Vendor}</strong></span>
                          <span>Category: <strong className="text-indigo-300">{parent?.Category}</strong></span>
                          <span>Subitem Of: <strong className="text-slate-500">None (Root)</strong></span>
                        </div>
                      </div>
                    </div>

                    {parent && (
                      <button
                        onClick={() => onSelectRow(parent)}
                        className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-medium transition flex items-center space-x-1"
                      >
                        <span>View Parent Row</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Child Variants List */}
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-slate-400 mb-2.5 flex items-center justify-between">
                      <span>Child Variants ({children.length})</span>
                      <span className="text-[11px] text-slate-500">Subitem Of = {parentSku}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {children.map((child) => (
                        <div
                          key={child.id}
                          onClick={() => onSelectRow(child)}
                          className="bg-slate-950/60 border border-slate-800 hover:border-indigo-600/50 p-3 rounded-xl cursor-pointer transition hover:bg-slate-900 group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-indigo-300 group-hover:text-white transition">
                              {child.SKU}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {child["Unit Type"]}
                            </span>
                          </div>

                          <div className="text-xs text-slate-200 mt-1.5 font-medium line-clamp-2">
                            {child["PRODUCT NAME"]}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
                            <span>MPN: <strong className="text-slate-300 font-mono">{child.MPN}</strong></span>
                            <span className="font-mono text-amber-300">
                              {child["Stock Description"]}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Single Line Items Section */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-cyan-300 flex items-center space-x-2">
            <BookmarkCheck className="h-4 w-4" />
            <span>Single Line Items ({singleItems.length})</span>
          </h4>
          <span className="text-xs text-slate-400">
            Rule: Unique standalone items have <code className="text-cyan-300 font-mono">Subitem Of = ""</code> and no parent created.
          </span>
        </div>

        {singleItems.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center text-slate-500 text-xs">
            No single line items in current feed.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {singleItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectRow(item)}
                className="bg-slate-900/70 border border-cyan-900/30 hover:border-cyan-600/50 p-4 rounded-xl cursor-pointer transition hover:bg-slate-800/80 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-cyan-300 group-hover:text-white transition">
                    {item.SKU}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    Single Item
                  </span>
                </div>

                <div className="text-xs text-slate-100 font-medium mt-2 line-clamp-2">
                  {item["PRODUCT NAME"]}
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-800/80 gap-2">
                  <span>MPN: <strong className="text-slate-300 font-mono">{item.MPN}</strong></span>
                  <span>Unit: <strong className="text-slate-200">{item["Unit Type"]}</strong></span>
                  <span className="font-mono text-amber-300">{item["Stock Description"]}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
