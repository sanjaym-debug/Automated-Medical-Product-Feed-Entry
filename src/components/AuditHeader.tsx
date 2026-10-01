import React from "react";
import { RuleAuditSummary } from "../types/pim.ts";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Hash,
  Layers,
  Sparkles,
  Truck,
  BookmarkCheck
} from "lucide-react";

interface AuditHeaderProps {
  summary: RuleAuditSummary;
  categorySource: string;
}

export const AuditHeader: React.FC<AuditHeaderProps> = ({ summary, categorySource }) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-6 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">
              PIM Automated Compliance & Rule Verification Engine
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Strict Rules Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Validating SKU generation, EA exception, quantity suffixes, shipping rates, and category mapping against{" "}
            <span className="text-indigo-300 font-medium">{categorySource}</span>.
          </p>
        </div>

        {/* Quick Rule Status Indicators */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>EA Suffix: <strong className="text-white">Omitted</strong></span>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>Indemed Rate: <strong className="text-amber-300">$4.80</strong></span>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>Category Check: <strong className="text-white">Strict</strong></span>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 text-xs">
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span>Total Catalog</span>
            <FileCheck2 className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <div className="text-lg font-bold text-white">{summary.totalRows}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">25-column items</div>
        </div>

        <div className="bg-purple-950/20 border border-purple-800/30 rounded-xl p-3">
          <div className="flex items-center justify-between text-purple-300 mb-1">
            <span>Matrix Parents</span>
            <Layers className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="text-lg font-bold text-purple-200">{summary.matrixParents}</div>
          <div className="text-[11px] text-purple-300/70 mt-0.5">-MI grouping items</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span>Child Variants</span>
            <Hash className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <div className="text-lg font-bold text-indigo-300">{summary.childVariants}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Linked Subitem Of</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span>Single Line Items</span>
            <BookmarkCheck className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-bold text-cyan-300">{summary.singleItems}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">No -MI parent needed</div>
        </div>

        <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-xl p-3">
          <div className="flex items-center justify-between text-emerald-300 mb-1">
            <span>EA Exception</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-200">{summary.eaExceptionCount}</div>
          <div className="text-[11px] text-emerald-300/70 mt-0.5">No suffix appended</div>
        </div>

        <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-3">
          <div className="flex items-center justify-between text-amber-300 mb-1">
            <span>Indemed Shipping</span>
            <Truck className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-amber-200">{summary.independenceMedicalCount}</div>
          <div className="text-[11px] text-amber-300/70 mt-0.5">Strictly $4.80 rate</div>
        </div>
      </div>
    </div>
  );
};
