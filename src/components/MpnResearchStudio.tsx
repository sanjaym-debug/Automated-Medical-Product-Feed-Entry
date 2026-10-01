import React, { useState } from "react";
import { NormalizedPimRow } from "../types/pim.ts";
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Sliders,
  Layers,
  Check
} from "lucide-react";

interface MpnResearchStudioProps {
  catalogRows: NormalizedPimRow[];
  onApplyResearch: (targetSkuOrMpn: string, researchData: any) => void;
  initialBrand?: string;
  initialMpn?: string;
  initialRawName?: string;
}

export const MpnResearchStudio: React.FC<MpnResearchStudioProps> = ({
  catalogRows,
  onApplyResearch,
  initialBrand = "",
  initialMpn = "",
  initialRawName = "",
}) => {
  const [brand, setBrand] = useState(initialBrand || (catalogRows[0]?.BRAND || "ProNet"));
  const [mpn, setMpn] = useState(initialMpn || (catalogRows[0]?.MPN || "PNET8-1"));
  const [rawName, setRawName] = useState(initialRawName || (catalogRows[0]?.["PRODUCT NAME"] || ""));
  const [vendor, setVendor] = useState(catalogRows[0]?.Vendor || "Independence Medical");
  const [uom, setUom] = useState(catalogRows[0]?.["Unit Type"] || "Bag");

  const [loading, setLoading] = useState(false);
  const [researchResult, setResearchResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const handleSelectProduct = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const row = catalogRows.find((r) => r.id === selectedId);
    if (row) {
      setBrand(row.BRAND);
      setMpn(row.MPN);
      setRawName(row["PRODUCT NAME"]);
      setVendor(row.Vendor);
      setUom(row["Unit Type"] || "Each");
      setResearchResult(null);
      setApplied(false);
    }
  };

  const handleRunResearch = async () => {
    if (!brand && !mpn) {
      setError("Please provide at least a Brand or MPN to research.");
      return;
    }
    setLoading(true);
    setError(null);
    setApplied(false);

    try {
      const res = await fetch("/api/research-mpn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand,
          mpn,
          rawName,
          vendor,
          uom,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to research MPN.");
      }

      setResearchResult(data.research);
    } catch (err: any) {
      setError(err.message || "An error occurred during MPN verification.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!researchResult) return;
    onApplyResearch(mpn, researchResult);
    setApplied(true);
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-slate-900 border border-cyan-800/40 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-600/20 text-cyan-300 border border-cyan-500/30">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Google Search Grounding & MPN Verification Studio
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Rule 1: Verify official manufacturer attributes, naming sequence (<code className="text-cyan-300">Name, color, flavor etc</code>), and authorized category hierarchy using Brand & MPN.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Input Configuration Form */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
          <h4 className="text-sm font-semibold text-white flex items-center justify-between">
            <span>Product Research Inputs</span>
            {catalogRows.length > 0 && (
              <span className="text-[11px] text-slate-400 font-normal">Pick from feed</span>
            )}
          </h4>

          {/* Quick Dropdown Picker */}
          {catalogRows.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Select from Current Catalog:
              </label>
              <select
                onChange={handleSelectProduct}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              >
                <option value="">-- Choose a product row --</option>
                {catalogRows.map((r) => (
                  <option key={r.id} value={r.id}>
                    [{r.BRAND}] {r.MPN} - {r["PRODUCT NAME"].slice(0, 45)}...
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Brand */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Brand / Manufacturer <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. ProNet, Tylenol, Kendall, 3M, Medline"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
          </div>

          {/* MPN */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Model Number (MPN) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={mpn}
              onChange={(e) => setMpn(e.target.value)}
              placeholder="e.g. PNET8-1, 00450172, 30123014, 1583"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
          </div>

          {/* Raw Product Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Raw Supplier Product Name:
            </label>
            <textarea
              rows={2}
              value={rawName}
              onChange={(e) => setRawName(e.target.value)}
              placeholder="Messy raw vendor text with packaging abbreviations..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
          </div>

          {/* Vendor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Vendor:</label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Raw UOM:</label>
              <input
                type="text"
                value={uom}
                onChange={(e) => setUom(e.target.value)}
                placeholder="e.g. BX/50, EA, BAG/100"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleRunResearch}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-medium text-xs flex items-center justify-center space-x-2 transition shadow-md disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Grounding with Google Search...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Verify & Research Attributes</span>
              </>
            )}
          </button>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Research Results View */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-cyan-400" />
                <h4 className="text-sm font-semibold text-white">Manufacturer Verification Findings</h4>
              </div>
              {researchResult && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Grounding Verified
                </span>
              )}
            </div>

            {!researchResult && !loading && (
              <div className="py-16 text-center text-slate-500 text-xs">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                Select or enter a product and run research to inspect official specifications and strict category alignment.
              </div>
            )}

            {loading && (
              <div className="py-16 text-center text-slate-400 text-xs space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-cyan-400" />
                <p>Querying manufacturer specs and grounding with Google Search...</p>
                <p className="text-[11px] text-slate-500">Checking official attributes, size, color, flavor & UOM standards.</p>
              </div>
            )}

            {researchResult && !loading && (
              <div className="mt-4 space-y-4 text-xs">
                {/* Normalized Title Comparison */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                    Rule 3 Sequence: Name, color, flavor etc
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Normalized Base Title (Packaging Omitted):</span>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {researchResult.normalizedBaseTitle}
                    </div>
                  </div>
                  {researchResult.color && (
                    <div className="flex items-center space-x-2 text-slate-300">
                      <span className="text-slate-400">Color:</span>
                      <strong className="text-white">{researchResult.color}</strong>
                    </div>
                  )}
                  {researchResult.flavor && (
                    <div className="flex items-center space-x-2 text-slate-300">
                      <span className="text-slate-400">Flavor:</span>
                      <strong className="text-white">{researchResult.flavor}</strong>
                    </div>
                  )}
                  {researchResult.size && (
                    <div className="flex items-center space-x-2 text-slate-300">
                      <span className="text-slate-400">Size / Dimensions:</span>
                      <strong className="text-white">{researchResult.size}</strong>
                    </div>
                  )}
                </div>

                {/* Packaging & Unit Rules */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">Packaging Type:</span>
                    <span className="text-sm font-semibold text-cyan-300">
                      {researchResult.packagingType || "Each"}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">Packaging Multiplier:</span>
                    <span className="text-sm font-semibold text-amber-300">
                      {researchResult.packagingMultiplier || 1}
                    </span>
                  </div>
                </div>

                {/* Strict Category Reference Resolution */}
                <div className="bg-indigo-950/30 p-4 rounded-xl border border-indigo-800/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">
                      Strict Category Reference (Category.xlsx)
                    </span>
                    <span className="text-[10px] text-emerald-400 font-medium">100% Authorized</span>
                  </div>
                  <div className="text-xs font-mono font-medium text-white break-words">
                    {researchResult.bestCategoryPath}
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-indigo-900/60 flex items-center justify-between">
                    <span>Google Product Category (Root):</span>
                    <strong className="text-cyan-300">{researchResult.rootCategory}</strong>
                  </div>
                </div>

                {researchResult.notes && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                    <strong className="text-slate-300 block mb-0.5">Grounding Notes:</strong>
                    {researchResult.notes}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Action */}
          {researchResult && !loading && (
            <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Ready to sync official attributes to catalog row
              </span>
              <button
                onClick={handleApply}
                disabled={applied}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 ${
                  applied
                    ? "bg-emerald-600 text-white cursor-default"
                    : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm"
                }`}
              >
                {applied ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Applied to Catalog!</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Apply Attributes to SKU Row</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
