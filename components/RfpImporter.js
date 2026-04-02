"use client";
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
import { 
  Upload, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Download, 
  FileSpreadsheet,
  FileCheck
} from 'lucide-react';
import { fuzzyMatchHeader, RFP_SCHEMA, validateRow, generateTemplate } from '../utils/importerUtils';

const RfpImporter = ({ onImport, onClose }) => {
  const [file, setFile] = useState(null);
  const [qcStatus, setQcStatus] = useState(null);
  const [qcReport, setQcReport] = useState([]);
  const [parsedData, setParsedData] = useState([]);

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    performQC(uploadedFile);
  };

  const performQC = (file) => {
    setQcStatus('scanning');
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('wbs')) || workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        const rawHeaders = json[0];
        const mapping = {};
        rawHeaders.forEach((h, i) => {
          const matchedKey = fuzzyMatchHeader(h, RFP_SCHEMA);
          if (matchedKey) mapping[matchedKey] = i;
        });

        const items = [];
        const errors = [];
        const rows = json.slice(1);

        rows.forEach((row, i) => {
          if (!row || row.length === 0) return;
          const item = {
            id: row[mapping.id],
            deliverable: row[mapping.deliverable] || '',
            phase: row[mapping.phase],
            role: row[mapping.role] || '',
            offshoreRatio: parseFloat(row[mapping.offshoreRatio]) || 0,
            effort: parseFloat(row[mapping.effort]) || 0
          };
          const rowErrors = validateRow(item, i);
          if (rowErrors.length > 0) errors.push(...rowErrors);
          items.push(item);
        });

        if (errors.length > 0) {
          setQcStatus('error');
          setQcReport(errors.slice(0, 5));
        } else if (items.length === 0) {
          setQcStatus('error');
          setQcReport(["No valid work packages found."]);
        } else {
          setQcStatus('success');
          setParsedData(items);
          setQcReport([`Quality Check Passed: ${items.length} deliverables validated.`]);
        }
      } catch (err) {
        setQcStatus('error');
        setQcReport([`Parsing Error: ${err.message}`]);
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const wb = generateTemplate(XLSX);
    XLSX.writeFile(wb, "WBS_RFP_Template.xlsx");
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-slate-900/90 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        {/* Mac Window Title Bar */}
        <div className="bg-slate-800/50 px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex gap-2">
            <div onClick={onClose} className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 transition-colors cursor-pointer flex items-center justify-center group">
              <X size={8} className="text-rose-900 opacity-0 group-hover:opacity-100" />
            </div>
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">RFP Importer</span>
          <div className="w-12"></div>
        </div>

        <div className="p-8 flex flex-col gap-8 text-white">
          {!file ? (
            <div className="flex flex-col gap-6 text-center">
              <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto text-indigo-400 shadow-inner">
                <Upload size={32} />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-bold">Import Spreadsheet</h3>
                <p className="text-slate-400 text-sm">Drag and drop your RFP file for an instant QC scan.</p>
              </div>
              
              <label className="border-2 border-dashed border-white/10 rounded-2xl p-10 hover:border-indigo-500/50 hover:bg-white/5 transition-all cursor-pointer group">
                <input type="file" className="hidden" onChange={handleFileUpload} accept=".xlsx,.csv" />
                <span className="font-bold text-indigo-400 group-hover:text-white transition-colors uppercase tracking-widest text-xs">Select Excel File</span>
              </label>

              <button 
                onClick={downloadTemplate}
                className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-2 group transition-colors"
                style={{ marginTop: '10px' }}
              >
                <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
                Download standard WBS template
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400">
                  <FileSpreadsheet size={20} />
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-bold text-sm truncate">{file.name}</h4>
                  <button onClick={() => setFile(null)} className="text-[10px] uppercase font-bold text-rose-400 hover:text-rose-300 transition-colors">Remove File</button>
                </div>
              </div>

              <div className={`p-5 rounded-xl border ${
                qcStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' : 
                qcStatus === 'scanning' ? 'bg-amber-500/10 border-amber-500/20' : 
                'bg-rose-500/10 border-rose-500/20'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  {qcStatus === 'success' ? <FileCheck className="text-emerald-400" size={18} /> : 
                   qcStatus === 'scanning' ? <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div> : 
                   <AlertTriangle className="text-rose-400" size={18} />}
                  <span className={`text-sm font-bold ${qcStatus === 'success' ? 'text-emerald-400' : qcStatus === 'scanning' ? 'text-amber-400' : 'text-rose-400'}`}>
                    {qcStatus === 'success' ? 'Ready for Import' : qcStatus === 'scanning' ? 'Performing Quality Check...' : 'Data Validation FAILED'}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1.5 pl-7">
                  {qcReport.map((msg, i) => (
                    <p key={i} className="text-[11px] text-slate-300 leading-relaxed opacity-80 whitespace-normal">• {msg}</p>
                  ))}
                  {qcStatus === 'error' && qcReport.length > 5 && (
                    <p className="text-[10px] text-rose-400 font-bold mt-1">Found more errors. Please check the source file.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-4 mt-2">
                <button 
                  onClick={onClose}
                  className="flex-1 py-4 rounded-xl bg-slate-700 hover:bg-slate-600 transition-colors font-bold text-sm tracking-wide"
                >
                  Cancel
                </button>
                <button 
                  disabled={qcStatus !== 'success'}
                  onClick={() => onImport(parsedData)}
                  className={`flex-1 py-4 rounded-xl font-bold text-sm transition-all shadow-lg border border-white/5 ${
                    qcStatus === 'success' ? 'bg-indigo-600 text-white hover:scale-[1.02]' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {qcStatus === 'success' ? 'Commit to Data' : 'Fix Issues First'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default RfpImporter;
