/**
 * Fuzzy matches a header against a list of target synonyms.
 * Returns the matched target if a high enough similarity is found.
 */
export const fuzzyMatchHeader = (header, schema) => {
  if (!header || typeof header !== 'string') return null;
  const h = header.toLowerCase().trim();
  
  for (const [key, synonyms] of Object.entries(schema)) {
    if (synonyms.some(s => h.includes(s.toLowerCase()))) {
      return key;
    }
  }
  return null;
};

export const RFP_SCHEMA = {
  id: ['id', 'wbs', 'code', 'index'],
  deliverable: ['deliverable', 'work package', 'task', 'description', 'name'],
  phase: ['phase', 'stage', 'timeline'],
  role: ['role', 'lead member', 'resource', 'title'],
  offshoreRatio: ['offshore ratio', 'offshore %', 'location split'],
  effort: ['effort', 'pd', 'days', 'person days', 'duration']
};

/**
 * Validates a row of data for strict quality requirements.
 * Returns an array of errors (empty if valid).
 */
export const validateRow = (row, index) => {
  const errors = [];
  
  if (!row.id || row.id.toString().trim() === '') {
    errors.push(`Row ${index + 1}: Missing WBS ID`);
  }
  
  if (row.phase === undefined || row.phase === null || row.phase.toString().trim() === '') {
    errors.push(`Row ${index + 1}: Missing Phase`);
  }
  
  if (isNaN(parseFloat(row.effort)) || parseFloat(row.effort) < 0) {
    errors.push(`Row ${index + 1}: Invalid or missing Effort (must be a positive number)`);
  }

  return errors;
};

/**
 * Generates a standard Excel template for WBS Detail
 */
export const generateTemplate = (XLSX) => {
  const data = [
    ["WBS ID", "Deliverable / Work Package", "Phase", "Lead Role", "Offshore Ratio", "Effort (pd)"],
    ["1.0", "Main Project Phase", "1", "Project Manager", "0.2", "10"],
    ["1.1", "Sample Setup Task", "1", "Solution Architect", "0.8", "40"],
    ["1.2", "Analysis Phase", "1", "BA / Governance Lead", "0.5", "20"]
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "WBS Detail");
  return wb;
};
