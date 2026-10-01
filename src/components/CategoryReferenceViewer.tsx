import React, { useState, useMemo } from "react";
import { AUTHORIZED_CATEGORIES, getRootCategory, matchCategory } from "../data/categories.ts";
import {
  BookOpen,
  Search,
  Download,
  Upload,
  CheckCircle2,
  FolderTree,
  ChevronRight,
  Filter,
  Layers,
  FileSpreadsheet
} from "lucide-react";
import * as XLSX from "xlsx";

interface CategoryReferenceViewerProps {
  categories: string[];
  onUploadCategories: (newCats: string[]) => void;
  categorySource: string;
}

export const CategoryReferenceViewer: React.FC<CategoryReferenceViewerProps> = ({
  categories = AUTHORIZED_CATEGORIES,
  onUploadCategories,
  categorySource,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoot, setSelectedRoot] = useState<string>("all");
  const [testQuery, setTestQuery] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  // Derive unique roots
  const rootCategories = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((c) => set.add(getRootCategory(c)));
    return Array.from(set).sort();
  }, [categories]);

  // Filtered categories
  const filtered = useMemo(() => {
    return categories.filter((c) => {
      if (selectedRoot !== "all" && getRootCategory(c) !== selectedRoot) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return c.toLowerCase().includes(q);
      }
      return true;
    });
  }, [categories, selectedRoot, searchQuery]);

  const handleTestMatch = () => {
    if (!testQuery.trim()) return;
    const res = matchCategory(testQuery, categories);
    setTestResult(res);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const list: string[] = [];

        for (let i = 0; i < json.length; i++) {
          const row = json[i];
          if (Array.isArray(row) && row[0]) {
            const val = String(row[0]).trim();
            if (i === 0 && val.toLowerCase().includes("category path")) continue;
            if (val.length > 2 && !list.includes(val)) {
              list.push(val);
            }
          }
        }

        if (list.length > 0) {
          onUploadCategories(list);
        }
      } catch (err) {
        alert("Failed to read Category file. Please upload a valid .xlsx or .csv file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadXlsx = () => {
    const wb = XLSX.utils.book_new();
    const wsData: (string | number)[][] = [["Category Path", "Root Category", "Level"]];
    categories.forEach((c) => {
      const parts = c.split(">");
      wsData.push([c, parts[0].trim(), parts.length]);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Authorized Categories");
    XLSX.writeFile(wb, "Category.xlsx");
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-800/40 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Strict Category Reference Directory (Category.xlsx)
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Rule 5: Categories must be strictly and exclusively selected from this verified reference list only. Zero outside hallucination.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition">
            <Upload className="h-3.5 w-3.5 text-indigo-400" />
            <span>Upload Category.xlsx</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={handleDownloadXlsx}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Category.xlsx</span>
          </button>
        </div>
      </div>

      {/* Interactive Category Tester */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Strict Category Match Tester</span>
          </h4>
          <span className="text-[11px] text-slate-400">
            Source: <strong className="text-indigo-300">{categorySource}</strong>
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Type any product title or keywords (e.g. 'ProNet Net Retainer', 'Thermometer Probes', 'Foley Catheter')..."
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTestMatch()}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleTestMatch}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition"
          >
            Test Strict Match
          </button>
        </div>

        {testResult && (
          <div className="mt-3 p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl text-xs space-y-1">
            <div className="text-slate-400">Matched Deepest Hierarchy:</div>
            <div className="font-mono text-white font-semibold">{testResult}</div>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-indigo-900/60">
              Google Product Category (Root): <strong className="text-cyan-300">{getRootCategory(testResult)}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search authorized paths or subcategories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Root Category Filter */}
          <div className="w-full sm:w-72">
            <select
              value={selectedRoot}
              onChange={(e) => setSelectedRoot(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Root Domains ({rootCategories.length})</option>
              {rootCategories.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Counts summary */}
        <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800">
          <span>
            Displaying <strong className="text-white">{filtered.length}</strong> of{" "}
            <strong className="text-white">{categories.length}</strong> authorized paths
          </span>
          <span>{rootCategories.length} Root Google Product Categories</span>
        </div>
      </div>

      {/* Category List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-[560px] overflow-y-auto">
        <div className="divide-y divide-slate-800/80">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No categories match your search.
            </div>
          ) : (
            filtered.map((cat, i) => {
              const parts = cat.split(">").map((p) => p.trim());
              const root = parts[0];
              const leaf = parts[parts.length - 1];

              return (
                <div
                  key={i}
                  className="p-3.5 hover:bg-slate-800/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5 text-xs text-slate-400 flex-wrap">
                      {parts.map((p, idx) => (
                        <React.Fragment key={idx}>
                          {idx > 0 && <ChevronRight className="h-3 w-3 text-slate-600" />}
                          <span
                            className={
                              idx === parts.length - 1
                                ? "text-indigo-200 font-semibold"
                                : idx === 0
                                ? "text-cyan-400 font-medium"
                                : "text-slate-400"
                            }
                          >
                            {p}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      Level {parts.length}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-800/40">
                      Root: {root}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
