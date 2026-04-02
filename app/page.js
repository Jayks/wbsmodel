"use client";
import React, { useState } from 'react';
import { useStore } from '../hooks/useStore';
import { 
  LayoutDashboard, 
  Settings, 
  ListTodo, 
  BarChart2, 
  Download,
  DollarSign,
  Users,
  Clock,
  Upload,
  TrendingUp,
  Plus,
  Trash2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import RfpImporter from '../components/RfpImporter';

const MetricCard = ({ title, value, icon: Icon, color }) => (
  <div className="glass-card p-6 flex items-center gap-4 hover:border-white/20 transition-all cursor-default group">
    <div className={`p-4 rounded-xl bg-${color}-500/10 text-${color}-400 group-hover:scale-110 transition-transform`}>
      <Icon size={24} />
    </div>
    <div className="flex-1">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold tracking-tight text-white">{value}</h3>
    </div>
  </div>
);

export default function Home() {
  const [activeTab, setActiveTab] = useState('summary');
  const [showImporter, setShowImporter] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState(null);
  
  const { 
    rateCard, 
    deliveryModel, 
    setDeliveryModel, 
    wbsItems, 
    metrics, 
    updateWbsItem, 
    updateRate,
    addWbsItem,
    deleteWbsItem,
    addRateItem,
    deleteRateItem,
    savedScenarios,
    saveScenario,
    loadScenario,
    importWbsData
  } = useStore();

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet([
      { Parameter: "Total Project Cost ($)", Value: metrics.totalCost },
      { Parameter: "Total Effort (pd)", Value: metrics.totalEffort },
      { Parameter: "Blended Rate ($/pd)", Value: metrics.blendedRate },
      { Parameter: "Offshore Ratio", Value: deliveryModel.offshoreRatio }
    ]);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
    const wsWbs = XLSX.utils.json_to_sheet(wbsItems);
    XLSX.utils.book_append_sheet(wb, wsWbs, "WBS Detail");
    XLSX.writeFile(wb, "WBS_Modern_Model_Export.xlsx");
  };

  const chartData = [
    { name: 'Phase 1', value: metrics.phaseCosts[1] },
    { name: 'Phase 2', value: metrics.phaseCosts[2] },
    { name: 'Phase 3', value: metrics.phaseCosts[3] },
  ];

  const COLORS = ['#6366f1', '#10b981', '#f59e0b'];

  const getParentRollup = (parentId) => {
    const prefix = parentId.split('.')[0] + '.';
    const children = wbsItems.filter(i => i.isLeaf && i.id.toString().startsWith(prefix));
    const totalEffort = children.reduce((acc, curr) => acc + (parseFloat(curr.effort) || 0) * (1 + (deliveryModel.scopeCreep || 0.0)), 0);
    const totalCost = totalEffort * metrics.blendedRate;
    return { totalEffort, totalCost };
  };

  const displayWbsItems = selectedPhase 
    ? wbsItems.filter(item => {
        if (item.isLeaf) {
          return item.phase && item.phase.toString().includes(selectedPhase);
        } else {
          const prefix = item.id.split('.')[0] + '.';
          return wbsItems.some(child => child.isLeaf && child.id.toString().startsWith(prefix) && child.phase?.toString().includes(selectedPhase));
        }
      })
    : wbsItems;

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      <div className="bg-gradient" />

      <AnimatePresence>
        {showImporter && (
          <RfpImporter 
            onClose={() => setShowImporter(false)} 
            onImport={(data) => {
              importWbsData(data);
              setShowImporter(false);
              setActiveTab('wbs');
            }} 
          />
        )}
      </AnimatePresence>

      <div className="flex flex-1 z-10">
        <aside className="w-72 bg-slate-950/50 backdrop-blur-3xl border-r border-white/5 flex flex-col p-8 sticky top-0 h-screen">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]">W</div>
            <h1 className="font-black text-xl tracking-tight text-white">WBS <span className="text-indigo-400 font-normal">MODEL</span></h1>
          </div>
          <nav className="flex flex-col gap-2">
            {[
              { id: 'summary', name: 'Portfolio Overview', icon: LayoutDashboard },
              { id: 'assumptions', name: 'Rate Assumptions', icon: Settings },
              { id: 'wbs', name: 'WBS details', icon: ListTodo },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-300 font-bold text-sm tracking-wide ${
                  activeTab === tab.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/10' : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon size={20} />
                {tab.name}
              </button>
            ))}
          </nav>

          <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
            <div className="px-2">
              <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-3">Saved Scenarios</p>
              <div className="flex gap-2">
                 <button onClick={() => saveScenario(`V${savedScenarios.length + 1}`)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all">Save</button>
                 <select 
                   className="flex-1 bg-slate-900 border border-white/10 rounded-xl text-xs font-bold text-white px-3" 
                   onChange={(e) => { if(e.target.value) loadScenario(e.target.value) }}
                   value=""
                 >
                    <option value="" disabled>Load...</option>
                    {savedScenarios.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-8 border-t border-white/5">
            <button onClick={exportToExcel} className="flex items-center justify-center gap-3 w-full px-5 py-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all font-bold group">
              <Download size={20} className="group-hover:translate-y-0.5 transition-transform" />
              Export Model
            </button>
          </div>
        </aside>

        <main className="flex-1 p-12 overflow-y-auto h-screen bg-transparent">
          <header className="flex justify-between items-start mb-14">
            <div>
              <h2 className="text-4xl font-black tracking-tight text-white mb-3">
                {activeTab === 'summary' ? 'Investment Synthesis' : activeTab === 'assumptions' ? 'Financial Guardrails' : 'Work Package Detail'}
              </h2>
              <div className="flex items-center gap-3 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                <TrendingUp size={14} className="text-emerald-500" />
                Advanced Forecasting Engine Active v3.0
              </div>
            </div>
          </header>

          {activeTab === 'summary' && (
            <div className="flex flex-col gap-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <MetricCard title="Est. Project Budget" value={`$${metrics.totalCost.toLocaleString(undefined, {maximumFractionDigits: 0})}`} icon={DollarSign} color="indigo" />
                <MetricCard title="Resource Effort" value={`${Math.round(metrics.totalEffort).toLocaleString()} Days`} icon={Users} color="emerald" />
                <MetricCard title="Global Blend Rate" value={`$${metrics.blendedRate.toFixed(2)}/pd`} icon={Clock} color="amber" />
                <MetricCard title="Timeline" value={`${metrics.deliveryTimeline.toFixed(1)} Mo`} icon={BarChart2} color="rose" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-5 glass-card p-10">
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8 flex justify-between">
                    Phase Allocation
                    {selectedPhase && <span className="text-indigo-400 text-[10px]">Filtered: Phase {selectedPhase}</span>}
                  </h4>
                  <div className="h-64 w-full cursor-pointer">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={chartData} 
                        onClick={(data) => {
                          if (data && data.activeLabel) {
                            const phaseMap = { 'Phase 1': '1', 'Phase 2': '2', 'Phase 3': '3' };
                            const target = phaseMap[data.activeLabel];
                            if (target === selectedPhase) {
                              setSelectedPhase(null);
                            } else {
                              setSelectedPhase(target);
                              setActiveTab('wbs');
                            }
                          }
                        }}
                      >
                        <XAxis dataKey="name" hide />
                        <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `$${v/1000}k`} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{ background: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                        <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={40}>
                          {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={selectedPhase ? (selectedPhase === (index+1).toString() ? 1 : 0.3) : 1} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="lg:col-span-4 glass-card p-10">
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8">Team Composition</h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={metrics.resourceDistribution}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={120} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: '#020617', border: 'none' }} />
                        <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-3 glass-card p-10 flex flex-col justify-between">
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8">Scenario Modifiers</h4>
                  <div className="flex flex-col gap-6">
                    <div>
                        <div className="text-[10px] font-black mb-3 flex justify-between uppercase text-slate-500">
                          <span>Cost Strategy</span>
                        </div>
                        <select 
                          className="w-full bg-slate-800 rounded-lg text-white text-xs font-bold px-3 py-2 border-none outline-none focus:ring-1 focus:ring-indigo-500"
                          value={deliveryModel.costingMethod || 'global'}
                          onChange={(e) => setDeliveryModel({...deliveryModel, costingMethod: e.target.value})}
                        >
                          <option value="global">Global Blended Rate</option>
                          <option value="detailed">Role-Specific Rates</option>
                        </select>
                    </div>

                    <div>
                      <div className="text-[10px] font-black mb-2 flex justify-between uppercase text-slate-500">
                        <span>Scope Creep</span>
                        <span className="text-rose-400">+{((deliveryModel.scopeCreep || 0) * 100).toFixed(0)}%</span>
                      </div>
                      <input type="range" min="0" max="0.5" step="0.05" className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500" value={deliveryModel.scopeCreep ?? 0} onChange={(e) => setDeliveryModel({...deliveryModel, scopeCreep: parseFloat(e.target.value)})} />
                    </div>

                    <div>
                      <div className="text-[10px] font-black mb-2 flex justify-between uppercase text-slate-500">
                        <span>Offshore Leverage</span>
                        <span className="text-indigo-400">{Math.round((deliveryModel.offshoreRatio ?? 0.83) * 100)}%</span>
                      </div>
                      <input type="range" min="0" max="1" step="0.01" className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" value={deliveryModel.offshoreRatio ?? 0.83} onChange={(e) => setDeliveryModel({...deliveryModel, offshoreRatio: parseFloat(e.target.value)})} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] font-black mb-2 flex justify-between uppercase text-slate-500">
                          <span>Hrs / Day</span>
                          <span className="text-emerald-400">{deliveryModel.hoursPerDay ?? 8}h</span>
                        </div>
                        <input type="range" min="4" max="12" step="0.5" className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" value={deliveryModel.hoursPerDay ?? 8} onChange={(e) => setDeliveryModel({...deliveryModel, hoursPerDay: parseFloat(e.target.value)})} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black mb-2 flex justify-between uppercase text-slate-500">
                          <span>Risk Buffer</span>
                          <span className="text-amber-500">{Math.round((deliveryModel.bufferPercent ?? 0.05) * 100)}%</span>
                        </div>
                        <input type="range" min="0" max="0.2" step="0.01" className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" value={deliveryModel.bufferPercent ?? 0.05} onChange={(e) => setDeliveryModel({...deliveryModel, bufferPercent: parseFloat(e.target.value)})} />
                      </div>
                    </div>

                  </div>
                </motion.div>
              </div>
            </div>
          )}

          {activeTab === 'assumptions' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden">
               <table className="w-full">
                  <thead>
                     <tr className="bg-white/[0.02]">
                        <th className="px-10 py-6 text-left text-[10px] uppercase tracking-widest text-slate-400">Resource Persona</th>
                        <th className="px-10 py-6 text-left text-[10px] uppercase tracking-widest text-slate-400">Onshore $/hr</th>
                        <th className="px-10 py-6 text-left text-[10px] uppercase tracking-widest text-slate-400">Offshore $/hr</th>
                        <th className="px-10 py-6 text-left text-[10px] uppercase tracking-widest text-slate-400 opacity-50">Onshore $/pd</th>
                        <th className="px-10 py-6 text-left text-[10px] uppercase tracking-widest text-slate-400 opacity-50">Offshore $/pd</th>
                        <th className="px-10 py-6 text-center text-[10px] uppercase tracking-widest text-slate-400 opacity-50">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                     <AnimatePresence>
                     {rateCard.map(role => (
                        <motion.tr layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} key={role.id} className="hover:bg-white/[0.01] transition-colors group">
                           <td className="px-10 py-6">
                             <input className="bg-transparent border-none outline-none font-bold text-white text-sm tracking-tight w-full hover:bg-white/5 p-1 rounded transition-colors" value={role.role} onChange={(e) => updateRate(role.id, 'role', e.target.value)} />
                           </td>
                           <td className="px-10 py-6"><input type="number" className="glass-input w-24 text-indigo-400 font-black" value={role.onshoreHr} onChange={(e) => updateRate(role.id, 'onshoreHr', parseFloat(e.target.value) || 0)} /></td>
                           <td className="px-10 py-6"><input type="number" className="glass-input w-24 text-emerald-400 font-black" value={role.offshoreHr} onChange={(e) => updateRate(role.id, 'offshoreHr', parseFloat(e.target.value) || 0)} /></td>
                           <td className="px-10 py-6 font-black text-white/30 tabular-nums">${Math.round(role.onshoreHr * deliveryModel.hoursPerDay).toLocaleString()}</td>
                           <td className="px-10 py-6 font-black text-white/30 tabular-nums">${Math.round(role.offshoreHr * deliveryModel.hoursPerDay).toLocaleString()}</td>
                           <td className="px-10 py-6 text-center">
                              <button onClick={() => deleteRateItem(role.id)} className="p-2 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-lg text-rose-400 transition-all" title="Remove Persona">
                                 <Trash2 size={16} />
                              </button>
                           </td>
                        </motion.tr>
                     ))}
                     </AnimatePresence>
                  </tbody>
               </table>
               <div className="p-5 border-t border-white/5 flex justify-end">
                  <button onClick={addRateItem} className="px-6 py-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-colors">
                     <Plus size={14} /> Add Persona
                  </button>
               </div>
            </motion.div>
          )}

          {activeTab === 'wbs' && (
            <div className="flex flex-col gap-14 pb-20">
               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
                  <div className="flex justify-between items-center p-10 border-b border-white/5">
                     <div>
                       <h4 className="text-2xl font-black text-white tracking-tight mb-2">Work Breakdown Logic</h4>
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">
                         {selectedPhase ? `Filtered Context: Phase ${selectedPhase}` : 'Modeling Scope: 1.0 — 8.0 Unit Clusters'}
                       </p>
                     </div>
                     <div className="flex gap-4">
                       {selectedPhase && (
                         <button onClick={() => setSelectedPhase(null)} className="px-8 py-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-black text-[10px] uppercase tracking-[2px] transition-all flex items-center gap-2">
                           Clear Filter
                         </button>
                       )}
                       <button onClick={() => setShowImporter(true)} className="px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-[2px] border border-white/10 transition-all flex items-center gap-3">
                          <Upload size={16} /> Replace Scope
                        </button>
                     </div>
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full">
                        <thead>
                           <tr>
                              <th className="px-8 py-6 text-left text-[10px] uppercase tracking-widest text-slate-400">ID</th>
                              <th className="px-8 py-6 text-left w-1/3 text-[10px] uppercase tracking-widest text-slate-400">Deliverable Unit</th>
                              <th className="px-8 py-6 text-left text-[10px] uppercase tracking-widest text-slate-400">Phase</th>
                              <th className="px-8 py-6 text-left text-[10px] uppercase tracking-widest text-slate-400">Role Assignee</th>
                              <th className="px-8 py-6 text-left text-[10px] uppercase tracking-widest text-slate-400">Effort (pd)</th>
                              <th className="px-8 py-6 text-left text-[10px] uppercase tracking-widest text-slate-400">Value (USD)</th>
                              <th className="px-8 py-6 text-center text-[10px] uppercase tracking-widest text-slate-400 text-sm opacity-50">Actions</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                           <AnimatePresence mode="popLayout">
                           {displayWbsItems.map((item, idx) => (
                              <motion.tr layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} key={item.id || idx} className={!item.isLeaf ? 'bg-white/[0.02] group' : 'group hover:bg-white/[0.01] transition-colors'}>
                                 <td className="font-mono text-slate-500 text-[10px] px-8 py-5">{item.id}</td>
                                 <td className="px-8 py-5">
                                    <input className={`bg-transparent border-none outline-none w-full ${!item.isLeaf ? 'font-black text-base text-white' : 'font-bold text-slate-400 text-sm'} hover:bg-white/5 p-1 rounded`} value={item.deliverable} onChange={(e) => updateWbsItem(item.id, 'deliverable', e.target.value)} />
                                 </td>
                                 <td className="px-8 py-5 text-sm text-slate-400">
                                   <div className="flex gap-2">
                                     {(item.phase?.toString() || "").split('-').map(p => p.trim()).filter(p => p).map(p => (
                                       <span key={p} className="px-2 py-0.5 rounded bg-slate-900 text-indigo-400 text-[8px] font-black uppercase">PH {p}</span>
                                     ))}
                                   </div>
                                 </td>
                                 <td className="px-8 py-5">
                                   {item.isLeaf && (
                                     <select 
                                       className="bg-transparent border border-white/10 rounded p-1 text-xs text-slate-400 focus:text-white"
                                       value={item.role || ''}
                                       onChange={(e) => updateWbsItem(item.id, 'role', e.target.value)}
                                     >
                                       {rateCard.map(r => <option key={r.id} value={r.role} className="bg-slate-900">{r.role}</option>)}
                                     </select>
                                   )}
                                 </td>
                                 <td className="px-8 py-5">
                                    {item.isLeaf ? <input type="number" className="glass-input w-24 text-white font-black text-sm" value={item.effort} onChange={(e) => updateWbsItem(item.id, 'effort', parseFloat(e.target.value) || 0)} /> : <span className="font-black text-indigo-400/50 text-sm">{getParentRollup(item.id).totalEffort.toLocaleString()} PD</span>}
                                 </td>
                                 <td className="px-8 py-5 font-black tabular-nums text-sm">
                                    <span className={item.isLeaf ? "text-emerald-400" : "text-white/40 italic"}>${Math.round(item.isLeaf ? (item.effort * (1 + (deliveryModel.scopeCreep || 0)) * (deliveryModel.costingMethod === 'detailed' && rateCard.find(r=>r.role===item.role) ? (((rateCard.find(r=>r.role===item.role).onshoreHr * (1-deliveryModel.offshoreRatio)) + ((rateCard.find(r=>r.role===item.role).offshoreHr==='—'?0:parseFloat(rateCard.find(r=>r.role===item.role).offshoreHr)) * deliveryModel.offshoreRatio)) * deliveryModel.hoursPerDay) : metrics.blendedRate)) : getParentRollup(item.id).totalCost).toLocaleString()}</span>
                                 </td>
                                 <td className="px-8 py-5 text-center">
                                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                       {!item.isLeaf ? <button onClick={() => addWbsItem(item.id)} className="p-2 hover:bg-white/10 rounded-lg text-indigo-400" title="Add Child"><Plus size={16} /></button> : <button onClick={() => deleteWbsItem(item.id)} className="p-2 hover:bg-white/10 rounded-lg text-rose-400" title="Delete"><Trash2 size={16} /></button>}
                                    </div>
                                 </td>
                              </motion.tr>
                           ))}
                           </AnimatePresence>
                        </tbody>
                        <tfoot className="bg-slate-900/50 border-t-2 border-indigo-600/50">
                           <tr className="font-black">
                              <td colSpan="4" className="text-right py-8 px-10 text-[10px] uppercase text-slate-400">WBS deliverable total:</td>
                              <td className="py-8 px-10 text-xl text-indigo-400">{Math.round(metrics.wbsTotalEffort).toLocaleString()} <span className="text-[10px] opacity-50">PD</span></td>
                              <td className="py-8 px-10 text-xl text-emerald-400">${Math.round(metrics.wbsTotalEffort * metrics.blendedRate).toLocaleString()}</td>
                           </tr>
                        </tfoot>
                     </table>
                  </div>
               </motion.div>

               <div className="glass-card">
                  <div className="p-10 border-b border-white/5">
                    <h4 className="text-2xl font-black text-white tracking-tight leading-none mb-2">Programme Cost Reconciliation</h4>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">Internal audit view — Final cost build-up</p>
                  </div>
                  <table className="w-full">
                     <thead>
                        <tr className="bg-white/[0.02] text-[10px] uppercase tracking-widest text-slate-400">
                           <th className="px-10 py-6 text-left">Component</th>
                           <th className="px-10 py-6 text-left">Person-days</th>
                           <th className="px-10 py-6 text-left">Cost (USD)</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-white/[0.03]">
                        <tr className="font-black text-sm text-white">
                           <td className="px-10 py-8">WBS deliverable total</td>
                           <td className="px-10 py-8 text-indigo-300">{Math.round(metrics.wbsTotalEffort).toLocaleString()} PD</td>
                           <td className="px-10 py-8 text-emerald-400">${Math.round(metrics.wbsTotalEffort * metrics.blendedRate).toLocaleString()}</td>
                        </tr>
                        <tr className="font-black text-sm text-white/70">
                           <td className="px-10 py-8">Programmes overhead (12%)</td>
                           <td className="px-10 py-8 text-indigo-300/50">{Math.round(metrics.overheadEffort).toLocaleString()} PD</td>
                           <td className="px-10 py-8 text-emerald-400/50">${Math.round(metrics.overheadEffort * metrics.blendedRate).toLocaleString()}</td>
                        </tr>
                        <tr className="font-black text-sm text-white/70">
                           <td className="px-10 py-8">Coordination buffer (5%)</td>
                           <td className="px-10 py-8 text-indigo-300/50">{Math.round(metrics.bufferEffort).toLocaleString()} PD</td>
                           <td className="px-10 py-8 text-emerald-400/50">${Math.round(metrics.bufferEffort * metrics.blendedRate).toLocaleString()}</td>
                        </tr>
                     </tbody>
                     <tfoot className="bg-indigo-600/10 border-t border-indigo-500/20 font-black">
                        <tr>
                           <td className="px-10 py-10 text-white text-lg uppercase">Total Programmes Cost</td>
                           <td className="px-10 py-10 text-indigo-400 text-3xl">{Math.round(metrics.totalEffort).toLocaleString()} <span className="text-xs font-normal opacity-50">PD</span></td>
                           <td className="px-10 py-10 text-emerald-400 text-3xl">${Math.round(metrics.totalCost).toLocaleString()}</td>
                        </tr>
                     </tfoot>
                  </table>
               </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
