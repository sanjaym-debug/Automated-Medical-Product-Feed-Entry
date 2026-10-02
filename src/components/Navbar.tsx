import React from "react";
import {
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  Download,
  Upload,
  BookOpen,
  Search,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Zap
} from "lucide-react";

interface NavbarProps {
  activeTab: "pim" | "raw" | "matrix" | "research" | "categories";
  setActiveTab: (tab: "pim" | "raw" | "matrix" | "research" | "categories") => void;
  onOpenUpload: () => void;
  onExportExcel: () => void;
  onExportCsv: () => void;
  onOpenCategories: () => void;
  onOpenAutoMapModal?: () => void;
  totalPimRows: number;
  itemManagerName: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenUpload,
  onExportExcel,
  onExportCsv,
  onOpenCategories,
  onOpenAutoMapModal,
  totalPimRows,
  itemManagerName,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">
                  PIM Catalog Specialist
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400">
                E-Commerce Catalog Data Management & Matrix SKU Engine
              </p>
            </div>
          </div>

          {/* Quick Context & Item Manager Info */}
          <div className="hidden lg:flex items-center space-x-3 text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
            <div className="flex items-center space-x-1.5 text-slate-300">
              <UserCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-slate-400">Item Manager:</span>
              <span className="font-semibold text-white">{itemManagerName}</span>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center space-x-1 text-slate-300">
              <ShieldCheck className="h-4 w-4 text-cyan-400" />
              <span>Indemed Shipping:</span>
              <span className="font-semibold text-amber-300">$4.80</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {onOpenAutoMapModal && (
              <button
                onClick={onOpenAutoMapModal}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-sm transition"
                title="Automatically map products to Category.xlsx reference file"
              >
                <Zap className="h-3.5 w-3.5 text-amber-300" />
                <span className="hidden sm:inline">Auto-Map Categories</span>
                <span className="sm:hidden">Auto-Map</span>
              </button>
            )}

            <button
              onClick={onOpenCategories}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="View & manage authorized Category.xlsx reference list"
            >
              <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Category.xlsx</span>
            </button>

            <button
              onClick={onOpenUpload}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Ingest Feed</span>
            </button>

            {/* Export Dropdown / Buttons */}
            <div className="flex items-center bg-emerald-600 hover:bg-emerald-500 rounded-lg transition shadow-sm text-white">
              <button
                onClick={onExportExcel}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium border-r border-emerald-700/50"
                title="Export exact 25-column PIM table to Excel (.xlsx)"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Export .xlsx</span>
              </button>
              <button
                onClick={onExportCsv}
                className="px-2 py-1.5 text-xs font-medium hover:bg-emerald-700/60 rounded-r-lg"
                title="Export as CSV"
              >
                CSV
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 overflow-x-auto py-2 border-t border-slate-800/80 text-xs">
          <button
            onClick={() => setActiveTab("pim")}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center space-x-1.5 ${
              activeTab === "pim"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>25-Column PIM Catalog</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-900/80 text-blue-200 text-[10px]">
              {totalPimRows}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("matrix")}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center space-x-1.5 ${
              activeTab === "matrix"
                ? "bg-purple-600 text-white shadow"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Matrix & Single Hierarchy</span>
          </button>

          <button
            onClick={() => setActiveTab("research")}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center space-x-1.5 ${
              activeTab === "research"
                ? "bg-cyan-600 text-white shadow"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>MPN & Brand Research Studio</span>
          </button>

          <button
            onClick={() => setActiveTab("raw")}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center space-x-1.5 ${
              activeTab === "raw"
                ? "bg-slate-700 text-white shadow"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            <span>Raw Supplier Feed</span>
          </button>

          <button
            onClick={() => setActiveTab("categories")}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center space-x-1.5 ${
              activeTab === "categories"
                ? "bg-slate-700 text-white shadow"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Category Reference List</span>
          </button>
        </div>
      </div>
    </header>
  );
};
