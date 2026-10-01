import React, { useState } from "react";
import { RawSupplierRow } from "../types/pim.ts";
import { SAMPLE_SUPPLIER_FEEDS } from "../data/sampleFeeds.ts";
import {
  FileText,
  Plus,
  Trash2,
  RefreshCw,
  Upload,
  ArrowRight,
  Database,
  Sparkles
} from "lucide-react";

interface RawFeedTableProps {
  rows: RawSupplierRow[];
  onUpdateRows: (rows: RawSupplierRow[]) => void;
  onTransform: () => void;
  onOpenUploadModal: () => void;
}

export const RawFeedTable: React.FC<RawFeedTableProps> = ({
  rows,
  onUpdateRows,
  onTransform,
  onOpenUploadModal,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRow, setNewRow] = useState<Partial<RawSupplierRow>>({
    brand: "",
    mpn: "",
    vendorName: "Independence Medical",
    productName: "",
    purchasePrice: "10.00",
    uom: "EA",
    indemedItemId: "",
    indemedUom: "EA",
  });

  const handleLoadSample = (key: string) => {
    const sample = SAMPLE_SUPPLIER_FEEDS[key];
    if (sample) {
      onUpdateRows(sample.rows);
    }
  };

  const handleAddRow = () => {
    if (!newRow.brand || !newRow.mpn || !newRow.productName) {
      alert("Please fill in Brand, MPN, and Product Name.");
      return;
    }

    const row: RawSupplierRow = {
      id: `raw-${Date.now()}`,
      brand: newRow.brand || "",
      mpn: newRow.mpn || "",
      vendorName: newRow.vendorName || "Independence Medical",
      purchasePrice: newRow.purchasePrice || "0.00",
      productName: newRow.productName || "",
      uom: newRow.uom || "EA",
      indemedItemId: newRow.indemedItemId || "",
      indemedUom: newRow.indemedUom || "EA",
      hcpcs: newRow.hcpcs || "",
      familyKey: newRow.familyKey || "",
    };

    onUpdateRows([...rows, row]);
    setShowAddForm(false);
    setNewRow({
      brand: "",
      mpn: "",
      vendorName: "Independence Medical",
      productName: "",
      purchasePrice: "10.00",
      uom: "EA",
      indemedItemId: "",
      indemedUom: "EA",
    });
  };

  const handleDeleteRow = (idx: number) => {
    const updated = [...rows];
    updated.splice(idx, 1);
    onUpdateRows(updated);
  };

  return (
    <div className="space-y-6">
      {/* Feed Controls Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Database className="h-5 w-5 text-indigo-400" />
            <span>Raw Supplier Ingestion Queue ({rows.length} rows)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Supplier data before normalization, UOM standard formatting, matrix grouping, and strict category alignment.
          </p>
        </div>

        {/* Quick Sample Feeds */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 mr-1">Load Presets:</span>
          <button
            onClick={() => handleLoadSample("independence_medical")}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-amber-300 border border-amber-900/40 transition"
          >
            Independence Medical Feed
          </button>
          <button
            onClick={() => handleLoadSample("multi_vendor_catalog")}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 transition"
          >
            Multi-Supplier Diagnostic
          </button>
          <button
            onClick={onOpenUploadModal}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white shadow-sm transition flex items-center space-x-1"
          >
            <Upload className="h-3 w-3" />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Add Row Form (Expandable) */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition flex items-center space-x-1.5"
        >
          <Plus className="h-3.5 w-3.5 text-emerald-400" />
          <span>{showAddForm ? "Cancel Add Row" : "Add Product Row Manually"}</span>
        </button>

        <button
          onClick={onTransform}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-md transition flex items-center space-x-1.5"
        >
          <span>Re-Run PIM Normalization</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {showAddForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
            Add New Raw Supplier Item
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Brand *</label>
              <input
                type="text"
                placeholder="e.g. ProNet, Tylenol, Kendall"
                value={newRow.brand}
                onChange={(e) => setNewRow({ ...newRow, brand: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">MPN *</label>
              <input
                type="text"
                placeholder="e.g. PNET8-4, 00450172"
                value={newRow.mpn}
                onChange={(e) => setNewRow({ ...newRow, mpn: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Vendor Name</label>
              <input
                type="text"
                value={newRow.vendorName}
                onChange={(e) => setNewRow({ ...newRow, vendorName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">UOM</label>
              <input
                type="text"
                placeholder="e.g. BX/50, EA, BAG/100, CS/12"
                value={newRow.uom}
                onChange={(e) => setNewRow({ ...newRow, uom: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1">Raw Product Title *</label>
              <input
                type="text"
                placeholder="e.g. ProNet Elastic Net Retainer Dressing White, 8 Inch Length Size 4 (50/BX)"
                value={newRow.productName}
                onChange={(e) => setNewRow({ ...newRow, productName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Purchase Price</label>
              <input
                type="text"
                placeholder="29.90"
                value={newRow.purchasePrice}
                onChange={(e) => setNewRow({ ...newRow, purchasePrice: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Indemed Item Id</label>
              <input
                type="text"
                placeholder="IND-99404"
                value={newRow.indemedItemId}
                onChange={(e) => setNewRow({ ...newRow, indemedItemId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
              />
            </div>
          </div>
          <button
            onClick={handleAddRow}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition"
          >
            Add to Queue
          </button>
        </div>
      )}

      {/* Raw Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-3 w-10 text-center">#</th>
              <th className="p-3">Brand</th>
              <th className="p-3">MPN</th>
              <th className="p-3">Vendor Name</th>
              <th className="p-3 min-w-[260px]">Raw Product Description</th>
              <th className="p-3">Raw UOM</th>
              <th className="p-3">Purchase Price</th>
              <th className="p-3">Indemed Item Id</th>
              <th className="p-3">HCPCS</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-500">
                  No raw rows in queue. Load a preset or upload an Excel/CSV file.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id || idx} className="hover:bg-slate-800/50 transition">
                  <td className="p-3 text-slate-500 font-mono text-center">{idx + 1}</td>
                  <td className="p-3 font-semibold text-white">{row.brand}</td>
                  <td className="p-3 font-mono text-slate-200">{row.mpn}</td>
                  <td className="p-3 text-slate-300">{row.vendorName}</td>
                  <td className="p-3 text-slate-200">{row.productName}</td>
                  <td className="p-3 font-mono text-amber-300">{row.uom}</td>
                  <td className="p-3 font-mono text-slate-300">
                    {row.purchasePrice ? `$${parseFloat(String(row.purchasePrice)).toFixed(2)}` : "—"}
                  </td>
                  <td className="p-3 font-mono text-slate-400">{row.indemedItemId || "—"}</td>
                  <td className="p-3 font-mono text-slate-400">{row.hcpcs || "—"}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleDeleteRow(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition"
                      title="Remove row"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
