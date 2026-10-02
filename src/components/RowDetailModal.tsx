import React, { useState } from "react";
import { NormalizedPimRow } from "../types/pim.ts";
import { X, Check, Save, Layers, ShieldCheck, Tag, Info, Zap } from "lucide-react";
import { autoMapProductCategory } from "../data/categories.ts";

interface RowDetailModalProps {
  row: NormalizedPimRow | null;
  onClose: () => void;
  onSave: (updated: NormalizedPimRow) => void;
  authorizedCategories?: string[];
}

export const RowDetailModal: React.FC<RowDetailModalProps> = ({
  row,
  onClose,
  onSave,
  authorizedCategories,
}) => {
  if (!row) return null;

  const [formData, setFormData] = useState<NormalizedPimRow>({ ...row });

  const handleChange = (field: keyof NormalizedPimRow, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAutoMapCategory = () => {
    const match = autoMapProductCategory(
      {
        brand: formData.BRAND,
        mpn: formData.MPN,
        productName: formData["PRODUCT NAME"],
      },
      authorizedCategories
    );

    const parts = match.categoryPath.split(">").map((p) => p.trim());
    setFormData((prev) => ({
      ...prev,
      Category: match.categoryPath,
      "Google Product Category": match.rootCategory,
      "Item Commerce Category": parts[parts.length - 1],
      auditNotes: [
        ...(prev.auditNotes || []),
        `Auto-mapped from Category.xlsx: ${match.categoryPath} (${match.confidence}% confidence - ${match.matchType})`,
      ],
    }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const columns: { key: keyof NormalizedPimRow; label: string; num: number; readonly?: boolean }[] = [
    { key: "SKU", label: "SKU", num: 1 },
    { key: "Subitem Of", label: "Subitem Of", num: 2 },
    { key: "MPN", label: "MPN", num: 3 },
    { key: "Purchase Price", label: "Purchase Price", num: 4 },
    { key: "BRAND", label: "BRAND", num: 5 },
    { key: "Vendor", label: "Vendor", num: 6 },
    { key: "Product Preferred Vendor", label: "Product Preferred Vendor", num: 7 },
    { key: "PRODUCT NAME", label: "PRODUCT NAME", num: 8 },
    { key: "Unit Type", label: "Unit Type", num: 9 },
    { key: "Uom to Each", label: "Uom to Each", num: 10 },
    { key: "Stock Description", label: "Stock Description", num: 11 },
    { key: "Indemed Item #", label: "Indemed Item #", num: 12 },
    { key: "Indemed UOM", label: "Indemed UOM", num: 13 },
    { key: "Mckesson ID", label: "Mckesson ID", num: 14 },
    { key: "Mckesson UOM", label: "Mckesson UOM", num: 15 },
    { key: "Shipping Category", label: "Shipping Category", num: 16 },
    { key: "Shipping Rate", label: "Shipping Rate", num: 17 },
    { key: "Logo Free Shipping", label: "Logo Free Shipping", num: 18 },
    { key: "Item Attribute Set", label: "Item Attribute Set", num: 19 },
    { key: "G shopping", label: "G shopping", num: 20 },
    { key: "Item Commerce Category", label: "Item Commerce Category", num: 21 },
    { key: "Avatax Taxcode", label: "Avatax Taxcode", num: 22 },
    { key: "Google Product Category", label: "Google Product Category", num: 23 },
    { key: "Item Manager", label: "Item Manager", num: 24 },
    { key: "Category", label: "Category", num: 25 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-300 border border-blue-500/30">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white font-mono">{formData.SKU}</h3>
                {formData.isParent && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Matrix Parent (-MI)
                  </span>
                )}
                {formData.isChild && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Child Variant
                  </span>
                )}
                {formData.isSingleLineItem && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Single Line Item
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{formData["PRODUCT NAME"]}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Audit Notes Banner */}
        {formData.auditNotes && formData.auditNotes.length > 0 && (
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
              <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Verified Rule Executions
            </span>
            <ul className="list-disc list-inside text-slate-300 space-y-0.5">
              {formData.auditNotes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 25 Columns Form Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-2 text-xs">
          {columns.map((col) => {
            const isFullWidth =
              col.key === "PRODUCT NAME" || col.key === "Category" || col.key === "Item Commerce Category";
            const rawVal = formData[col.key];
            const val = typeof rawVal === "string" ? rawVal : "";

            return (
              <div
                key={col.key}
                className={isFullWidth ? "sm:col-span-2 md:col-span-3 space-y-1" : "space-y-1"}
              >
                <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                  <span>
                    <strong className="text-slate-500 mr-1">{col.num}.</strong> {col.label}
                  </span>
                  {col.key === "Category" && (
                    <button
                      type="button"
                      onClick={handleAutoMapCategory}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white border border-indigo-500/40 text-[10px] font-medium transition"
                      title="Automatically map Category from Category.xlsx"
                    >
                      <Zap className="h-2.5 w-2.5 text-amber-300" />
                      <span>Auto-Map from Category.xlsx</span>
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  value={val}
                  onChange={(e) => handleChange(col.key, e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center space-x-1.5"
          >
            <Save className="h-4 w-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
