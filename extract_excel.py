import pandas as pd
import json
import os

def extract_excel():
    excel_path = "data/CPG_Analytics_WBS_CostModel.xlsx"
    if not os.path.exists(excel_path):
        print(f"Error: {excel_path} not found.")
        return

    # Load Sheets
    xls = pd.ExcelFile(excel_path)
    data = {}
    
    for sheet in xls.sheet_names:
        # Convert each sheet to a list of dicts/lists for JSON
        df = pd.read_excel(xls, sheet_name=sheet)
        # Ensure all types of NaN/NA/NaT are converted to None (null in JSON)
        # Using fillna with None first, then where for extra safety
        df = df.fillna(value=pd.NA).replace({pd.NA: None})
        data[sheet] = df.to_dict(orient='records')
    
    # Save to model.json
    os.makedirs("data", exist_ok=True)
    with open("data/model.json", "w") as f:
        json.dump(data, f, indent=2, default=str)
    
    print("Success: Generated data/model.json")

if __name__ == "__main__":
    extract_excel()
