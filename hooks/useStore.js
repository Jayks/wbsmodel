"use client";
import { useState, useEffect, useMemo } from 'react';
import modelData from '../data/model.json';

export const useStore = () => {
  const [rateCard, setRateCard] = useState([]);
  const [deliveryModel, setDeliveryModel] = useState({
    offshoreRatio: 0.83,
    workingDays: 21,
    hoursPerDay: 8,
    bufferPercent: 0.05
  });
  const [wbsItems, setWbsItems] = useState([]);

  // Action: Replace WBS data with new RFP import
  const importWbsData = (items) => {
    const formattedItems = items.map(item => ({
      ...item,
      isLeaf: item.id.toString().includes('.') && item.id.toString().split('.')[1] !== '0'
    }));
    setWbsItems(formattedItems);
  };

  // Initialization
  useEffect(() => {
    try {
      if (!modelData || !modelData.Assumptions) return;

      // Parse Rate Card (Roles are in rows 4-11 of Assumptions sheet)
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

      // Parse WBS Detail
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

        // Extract precise delivery parameters from Assumptions
        const assumptions = modelData.Assumptions || [];
        const offshoreRow = assumptions.find(r => r["WBS Cost Model — Assumptions & Rate Card"]?.toString().includes("Offshore ratio"));
        const bufferRow = assumptions.find(r => r["WBS Cost Model — Assumptions & Rate Card"]?.toString().includes("buffer %"));
        const daysRow = assumptions.find(r => r["WBS Cost Model — Assumptions & Rate Card"]?.toString().includes("days per month"));
        const hoursRow = assumptions.find(r => r["WBS Cost Model — Assumptions & Rate Card"]?.toString().includes("Hours per day"));
        
        const initialDeliveryModel = {
          offshoreRatio: parseFloat(offshoreRow?.["Unnamed: 1"]) || 0.83,
          bufferPercent: parseFloat(bufferRow?.["Unnamed: 1"]) || 0.05,
          workingDays: parseFloat(daysRow?.["Unnamed: 1"]) || 21,
          hoursPerDay: parseFloat(hoursRow?.["Unnamed: 1"]) || 8
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
      role: 'Data/Analytics Engineer',
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

  // Calculations
  const metrics = useMemo(() => {
    const avgOnshoreHr = rateCard.reduce((acc, r) => acc + (parseFloat(r.onshoreHr) || 0), 0) / (rateCard.length || 1);
    const offshoreRolesList = rateCard.filter(r => r.offshoreHr && r.offshoreHr !== '—' && parseFloat(r.offshoreHr) > 0);
    const avgOffshoreHr = offshoreRolesList.reduce((acc, r) => acc + (parseFloat(r.offshoreHr) || 0), 0) / (offshoreRolesList.length || 1);
    
    const blendedRateHr = (avgOnshoreHr * (1 - deliveryModel.offshoreRatio)) + (avgOffshoreHr * deliveryModel.offshoreRatio);
    const blendedRate = blendedRateHr * deliveryModel.hoursPerDay;

    const totalEffortBase = wbsItems.filter(i => i.isLeaf).reduce((acc, item) => acc + (parseFloat(item.effort) || 0), 0);
    
    const overheadEffort = totalEffortBase * 0.12; 
    const baseWithOverhead = totalEffortBase + overheadEffort;
    const bufferEffort = baseWithOverhead * deliveryModel.bufferPercent;
    const grandTotalEffort = baseWithOverhead + bufferEffort;

    const budgetTotal = grandTotalEffort * blendedRate;

    const roleEfforts = wbsItems.filter(i => i.isLeaf).reduce((acc, item) => {
      const role = item.role || 'Unassigned';
      acc[role] = (acc[role] || 0) + (parseFloat(item.effort) || 0);
      return acc;
    }, {});

    const resourceDistribution = Object.entries(roleEfforts).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const getPhaseCost = (phaseNum) => {
      const baseCost = wbsItems
        .filter(item => item.isLeaf && item.phase && item.phase.toString().includes(phaseNum.toString()))
        .reduce((acc, item) => {
          const phases = item.phase.toString().split('-').length || 1;
          const perPhaseEffort = (parseFloat(item.effort) || 0) / phases;
          return acc + (perPhaseEffort * blendedRate);
        }, 0);
      return baseCost * 1.12 * (1 + deliveryModel.bufferPercent);
    };

    return {
      avgOnshorePd: avgOnshoreHr * deliveryModel.hoursPerDay,
      avgOffshorePd: avgOffshoreHr * deliveryModel.hoursPerDay,
      blendedRate: blendedRate || 0,
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
    importWbsData
  };
};
