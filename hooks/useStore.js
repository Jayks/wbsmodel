"use client";
import { useState, useEffect, useMemo } from 'react';
import modelData from '../data/model.json';

export const useStore = () => {
  const [rateCard, setRateCard] = useState([]);
  const [deliveryModel, setDeliveryModel] = useState({
    offshoreRatio: 0.83,
    workingDays: 21,
    hoursPerDay: 8,
    bufferPercent: 0.05,
    scopeCreep: 0.0,
    costingMethod: 'global'
  });
  const [wbsItems, setWbsItems] = useState([]);
  const [savedScenarios, setSavedScenarios] = useState([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('wbs-scenario-')).map(k => k.replace('wbs-scenario-', ''));
      setSavedScenarios(keys);
    }
  }, []);

  const saveScenario = (name) => {
    const data = { rateCard, deliveryModel, wbsItems };
    localStorage.setItem(`wbs-scenario-${name}`, JSON.stringify(data));
    if (!savedScenarios.includes(name)) {
      setSavedScenarios([...savedScenarios, name]);
    }
  };

  const loadScenario = (name) => {
    const data = localStorage.getItem(`wbs-scenario-${name}`);
    if (data) {
      const parsed = JSON.parse(data);
      setRateCard(parsed.rateCard);
      setDeliveryModel(parsed.deliveryModel);
      setWbsItems(parsed.wbsItems);
    }
  };

  const importWbsData = (items) => {
    const formattedItems = items.map(item => ({
      ...item,
      isLeaf: item.id.toString().includes('.') && item.id.toString().split('.')[1] !== '0'
    }));
    setWbsItems(formattedItems);
  };

  useEffect(() => {
    try {
      if (!modelData || !modelData.Assumptions) return;

      const firstRow = modelData.Assumptions[0];
      const mainKey = Object.keys(firstRow)[0];

      const roles = modelData.Assumptions.slice(4, 11).map((row, idx) => ({
        id: idx,
        role: row[mainKey],
        onshoreHr: parseFloat(row["Unnamed: 1"]) || 0,
        offshoreHr: parseFloat(row["Unnamed: 2"]) || 0,
        onshorePd: parseFloat(row["Unnamed: 3"]) || 0,
        offshorePd: parseFloat(row["Unnamed: 4"]) || 0,
        notes: row["Unnamed: 5"]
      }));
      setRateCard(roles);

      const wbsSheet = modelData["WBS Detail"];
      if (wbsSheet) {
        const initialWbs = wbsSheet.map((row) => {
          const id = row["Work Breakdown Structure - Detailed Cost Model"]?.toString() || "";
          const effort = parseFloat(row["Unnamed: 5"]) || 0;
          const isLeaf = id.includes('.') && id.split('.')[1] !== '0';
          return {
            id,
            deliverable: row["Unnamed: 1"] || '',
            phase: row["Unnamed: 2"] || '',
            role: row["Unnamed: 3"] || '',
            offshoreRatio: parseFloat(row["Unnamed: 4"]) || 0,
            effort,
            isLeaf
          };
        }).filter(item => item.id && item.deliverable && /^\d/.test(item.id));

        const assumptions = modelData.Assumptions || [];
        const offshoreRow = assumptions.find(r => r["WBS Cost Model — Assumptions & Rate Card"]?.toString().includes("Offshore ratio"));
        const bufferRow = assumptions.find(r => r["WBS Cost Model — Assumptions & Rate Card"]?.toString().includes("buffer %"));
        const daysRow = assumptions.find(r => r["WBS Cost Model — Assumptions & Rate Card"]?.toString().includes("days per month"));
        const hoursRow = assumptions.find(r => r["WBS Cost Model — Assumptions & Rate Card"]?.toString().includes("Hours per day"));
        
        const initialDeliveryModel = {
          offshoreRatio: parseFloat(offshoreRow?.["Unnamed: 1"]) || 0.83,
          bufferPercent: parseFloat(bufferRow?.["Unnamed: 1"]) || 0.05,
          workingDays: parseFloat(daysRow?.["Unnamed: 1"]) || 21,
          hoursPerDay: parseFloat(hoursRow?.["Unnamed: 1"]) || 8,
          scopeCreep: 0.0,
          costingMethod: 'global'
        };

        setWbsItems(initialWbs);
        setRateCard(roles);
        setDeliveryModel(initialDeliveryModel);
      }
    } catch (err) {
      console.error("Error parsing model data:", err);
    }
  }, []);

  const deleteWbsItem = (id) => {
    setWbsItems(prev => prev.filter(item => item.id !== id));
  };

  const addWbsItem = (parentId) => {
    const prefix = parentId.split('.')[0] + '.';
    const siblings = wbsItems.filter(item => item.id.toString().startsWith(prefix) && item.isLeaf);
    const maxSubId = siblings.reduce((max, cur) => {
      const subId = parseInt(cur.id.toString().split('.')[1]) || 0;
      return Math.max(max, subId);
    }, 0);

    const newItem = {
      id: `${prefix}${maxSubId + 1}`,
      deliverable: 'New Deliverable Unit',
      phase: '1',
      role: rateCard.length > 0 ? rateCard[0].role : 'Data/Analytics Engineer',
      offshoreRatio: 0.8,
      effort: 0,
      isLeaf: true
    };
    
    setWbsItems(prev => {
      const lastSiblingIndex = prev.findLastIndex(item => item.id.toString().startsWith(prefix));
      const newItems = [...prev];
      newItems.splice(lastSiblingIndex + 1, 0, newItem);
      return newItems;
    });
  };

  const addRateItem = () => {
    setRateCard(prev => {
      const _id = prev.length ? Math.max(...prev.map(p => p.id)) + 1 : 1;
      return [...prev, {
        id: _id,
        role: 'New Persona',
        onshoreHr: 0,
        offshoreHr: 0,
        onshorePd: 0,
        offshorePd: 0,
        notes: ''
      }];
    });
  };

  const deleteRateItem = (id) => {
    setRateCard(prev => prev.filter(r => r.id !== id));
  };

  const metrics = useMemo(() => {
    const avgOnshoreHr = rateCard.reduce((acc, r) => acc + (parseFloat(r.onshoreHr) || 0), 0) / (rateCard.length || 1);
    const offshoreRolesList = rateCard.filter(r => r.offshoreHr && r.offshoreHr !== '—' && parseFloat(r.offshoreHr) > 0);
    const avgOffshoreHr = offshoreRolesList.reduce((acc, r) => acc + (parseFloat(r.offshoreHr) || 0), 0) / (offshoreRolesList.length || 1);
    
    const globalBlendedRateHr = (avgOnshoreHr * (1 - deliveryModel.offshoreRatio)) + (avgOffshoreHr * deliveryModel.offshoreRatio);
    const globalBlendedRate = globalBlendedRateHr * deliveryModel.hoursPerDay;

    const mult = 1 + (deliveryModel.scopeCreep || 0.0);
    
    const totalEffortBase = wbsItems.filter(i => i.isLeaf).reduce((acc, item) => acc + (parseFloat(item.effort) || 0) * mult, 0);
    const overheadEffort = totalEffortBase * 0.12; 
    const baseWithOverhead = totalEffortBase + overheadEffort;
    const bufferEffort = baseWithOverhead * deliveryModel.bufferPercent;
    const grandTotalEffort = baseWithOverhead + bufferEffort;

    let totalCostBase = 0;
    if (deliveryModel.costingMethod === 'detailed') {
      totalCostBase = wbsItems.filter(i => i.isLeaf).reduce((acc, item) => {
        const matchingRole = rateCard.find(r => r.role === item.role);
        let itemBlendedRate = globalBlendedRate;
        if (matchingRole) {
          const onHr = parseFloat(matchingRole.onshoreHr) || 0;
          const offHr = matchingRole.offshoreHr === '—' ? 0 : (parseFloat(matchingRole.offshoreHr) || 0);
          const rBlendedHr = (onHr * (1 - deliveryModel.offshoreRatio)) + (offHr * deliveryModel.offshoreRatio);
          itemBlendedRate = rBlendedHr * deliveryModel.hoursPerDay;
        }
        return acc + ((parseFloat(item.effort) || 0) * mult * itemBlendedRate);
      }, 0);
    } else {
      totalCostBase = totalEffortBase * globalBlendedRate;
    }

    const effectiveGlobalRate = totalEffortBase > 0 ? (totalCostBase / totalEffortBase) : globalBlendedRate;
    
    const overheadCost = overheadEffort * effectiveGlobalRate;
    const bufferCost = bufferEffort * effectiveGlobalRate;
    const budgetTotal = totalCostBase + overheadCost + bufferCost;

    const roleEfforts = wbsItems.filter(i => i.isLeaf).reduce((acc, item) => {
      const role = item.role || 'Unassigned';
      acc[role] = (acc[role] || 0) + (parseFloat(item.effort) || 0) * mult;
      return acc;
    }, {});

    const resourceDistribution = Object.entries(roleEfforts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    const getPhaseCost = (phaseNum) => {
      const baseCost = wbsItems
        .filter(item => item.isLeaf && item.phase && item.phase.toString().includes(phaseNum.toString()))
        .reduce((acc, item) => {
          const phases = item.phase.toString().split('-').length || 1;
          const perPhaseEffort = ((parseFloat(item.effort) || 0) * mult) / phases;
          
          let itemBlendedRate = effectiveGlobalRate;
          if (deliveryModel.costingMethod === 'detailed') {
            const matchingRole = rateCard.find(r => r.role === item.role);
            if (matchingRole) {
              const onHr = parseFloat(matchingRole.onshoreHr) || 0;
              const offHr = matchingRole.offshoreHr === '—' ? 0 : (parseFloat(matchingRole.offshoreHr) || 0);
              const rBlendedHr = (onHr * (1 - deliveryModel.offshoreRatio)) + (offHr * deliveryModel.offshoreRatio);
              itemBlendedRate = rBlendedHr * deliveryModel.hoursPerDay;
            }
          }
          return acc + (perPhaseEffort * itemBlendedRate);
        }, 0);
      return baseCost * 1.12 * (1 + deliveryModel.bufferPercent);
    };

    return {
      avgOnshorePd: avgOnshoreHr * deliveryModel.hoursPerDay,
      avgOffshorePd: avgOffshoreHr * deliveryModel.hoursPerDay,
      blendedRate: effectiveGlobalRate || 0,
      totalEffort: grandTotalEffort || 0,
      wbsTotalEffort: totalEffortBase,
      overheadEffort: overheadEffort,
      bufferEffort: bufferEffort,
      totalCost: budgetTotal || 0,
      totalCostWithBuffer: budgetTotal || 0,
      deliveryTimeline: (grandTotalEffort / (22 * deliveryModel.workingDays)),
      resourceDistribution,
      phaseCosts: {
        1: getPhaseCost(1),
        2: getPhaseCost(2),
        3: getPhaseCost(3)
      }
    };
  }, [rateCard, deliveryModel, wbsItems]);

  const updateWbsItem = (id, field, value) => {
    setWbsItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const updateRate = (id, field, value) => {
    setRateCard(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  return {
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
  };
};
