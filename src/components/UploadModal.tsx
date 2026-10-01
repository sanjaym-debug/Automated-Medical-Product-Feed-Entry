import React, { useState } from "react";
import { RawSupplierRow } from "../types/pim.ts";
import { Upload, FileSpreadsheet, X, Check, ArrowRight, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFeedIngested: (rows: RawSupplierRow[]) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onFeedIngested }) => {
  if (!isOpen) return null;

  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawJsonRows, setRawJsonRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<{
    mpn: string;
    brand: string;
    vendorName: string;
    productName: string;
    uom: string;
    purchasePrice: string;
    indemedItemId: string;
    hcpcs: string;
    familyKey: string;
  }>({
    mpn: "",
    brand: "",
    vendorName: "",
    productName: "",
    uom: "",
    purchasePrice: "",
    indemedItemId: "",
    hcpcs: "",
    familyKey: "",
  });
  const [step, setStep] = useState<"upload" | "map">("upload");
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(sheet);

        if (!json || json.length === 0) {
          setError("The uploaded file contains no rows.");
          return;
        }

        const detectedHeaders = Object.keys(json[0]);
        setHeaders(detectedHeaders);
        setRawJsonRows(json);

        // Auto detect mappings
        const findHeader = (patterns: string[]) => {
          return detectedHeaders.find((h) => {
            const hLow = h.toLowerCase().replace(/[^a-z0-9]/g, "");
            return patterns.some((p) => hLow.includes(p.replace(/[^a-z0-9]/g, "")));
          }) || "";
        };

        setMapping({
          mpn: findHeader(["mpn", "model", "modelnum", "partnum", "part", "itemno"]),
          brand: findHeader(["brand", "mfg", "manufacturer"]),
          vendorName: findHeader(["vendor", "vendorname", "supplier"]),
          productName: findHeader(["productname", "description", "title", "itemdesc", "name"]),
          uom: findHeader(["uom", "unit", "unitofmeasure", "pack", "packaging"]),
          purchasePrice: findHeader(["price", "cost", "purchaseprice", "unitcost"]),
          indemedItemId: findHeader(["indemed", "indemeditem", "itemid", "indemed#"]),
          hcpcs: findHeader(["hcpcs", "billingcode"]),
          familyKey: findHeader(["family", "parent", "matrix", "basegroup"]),
        });

        setStep("map");
      } catch (err: any) {
        setError("Failed to parse file: " + (err.message || "Unknown error"));
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const handleConfirmMapping = () => {
    if (!mapping.mpn || !mapping.brand || !mapping.productName) {
      setError("Please map at least MPN, Brand, and Product Name columns.");
      return;
    }

    const convertedRows: RawSupplierRow[] = rawJsonRows.map((r, i) => {
      return {
        id: `uploaded-${i + 1}`,
        mpn: String(r[mapping.mpn] || "").trim(),
        brand: String(r[mapping.brand] || "").trim(),
        vendorName: mapping.vendorName ? String(r[mapping.vendorName] || "").trim() : "Independence Medical",
        productName: String(r[mapping.productName] || "").trim(),
        uom: mapping.uom ? String(r[mapping.uom] || "").trim() : "EA",
        purchasePrice: mapping.purchasePrice ? String(r[mapping.purchasePrice] || "0.00").trim() : "0.00",
        indemedItemId: mapping.indemedItemId ? String(r[mapping.indemedItemId] || "").trim() : "",
        indemedUom: mapping.uom ? String(r[mapping.uom] || "").trim() : "EA",
        hcpcs: mapping.hcpcs ? String(r[mapping.hcpcs] || "").trim() : "",
        familyKey: mapping.familyKey ? String(r[mapping.familyKey] || "").trim() : undefined,
      };
    });

    onFeedIngested(convertedRows);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Ingest Raw Supplier Feed</h3>
              <p className="text-xs text-slate-400">
                Upload supplier catalog file (.xlsx, .xls, .csv) with column auto-mapping.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === "upload" && (
          <div className="space-y-4">
            <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/50 hover:bg-slate-950">
              <Upload className="h-10 w-10 text-indigo-400 mb-3" />
              <span className="text-sm font-semibold text-white">
                Choose Excel or CSV Supplier Feed
              </span>
              <span className="text-xs text-slate-400 mt-1">
                Supports .xlsx, .xls, and .csv formats
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span>File: <strong className="text-white">{file?.name}</strong></span>
              <span>Detected Rows: <strong className="text-emerald-400">{rawJsonRows.length}</strong></span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
              <div>
                <label className="block text-slate-300 mb-1">Brand Column *</label>
                <select
                  value={mapping.brand}
                  onChange={(e) => setMapping({ ...mapping, brand: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Model / MPN Column *</label>
                <select
                  value={mapping.mpn}
                  onChange={(e) => setMapping({ ...mapping, mpn: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 mb-1">Product Description / Name Column *</label>
                <select
                  value={mapping.productName}
                  onChange={(e) => setMapping({ ...mapping, productName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">UOM Column</label>
                <select
                  value={mapping.uom}
                  onChange={(e) => setMapping({ ...mapping, uom: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                >
                  <option value="">-- Optional (Defaults to EA) --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Vendor Name Column</label>
                <select
                  value={mapping.vendorName}
                  onChange={(e) => setMapping({ ...mapping, vendorName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                >
                  <option value="">-- Optional (Defaults to Independence Medical) --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Purchase Price Column</label>
                <select
                  value={mapping.purchasePrice}
                  onChange={(e) => setMapping({ ...mapping, purchasePrice: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                >
                  <option value="">-- Optional --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Indemed Item Id Column</label>
                <select
                  value={mapping.indemedItemId}
                  onChange={(e) => setMapping({ ...mapping, indemedItemId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                >
                  <option value="">-- Optional --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep("upload")}
                className="px-3 py-2 text-slate-400 hover:text-white"
              >
                Back
              </button>
              <button
                onClick={handleConfirmMapping}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition flex items-center space-x-1"
              >
                <span>Normalize {rawJsonRows.length} Items</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
