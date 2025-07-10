# app.py
from flask import Flask, render_template, request, jsonify
import sqlite3
import json
from datetime import datetime

# --- App Configuration ---
app = Flask(__name__)
DB_NAME = 'sessions.db'

# --- Database Helper ---
def log_to_db(calculator, request_data, result_data):
    """Logs a calculation session to the SQLite database."""
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO session_logs (calculator, request_data, result_data) VALUES (?, ?, ?)",
            (calculator, json.dumps(request_data), json.dumps(result_data))
        )
        conn.commit()
    except sqlite3.Error as e:
        print(f"Database logging error: {e}") # Log to console instead of crashing
    finally:
        if conn:
            conn.close()

# --- Main Route ---
@app.route('/')
def index():
    """Renders the main calculator page."""
    return render_template('index.html')

# --- API Routes for Calculations ---

@app.route('/calculate/pcr', methods=['POST'])
def calculate_pcr():
    """Calculates PCR master mix volumes."""
    try:
        data = request.json
        num_reactions = float(data['reactions'])
        reaction_volume = float(data['volume'])
        components = data['components']

        # Add a safety margin (e.g., 10%) to account for pipetting errors
        safety_factor = 1.1 
        total_mm_volume = reaction_volume * num_reactions * safety_factor

        results = []
        total_component_vol = 0
        
        for comp in components:
            stock = float(comp['stock'])
            final = float(comp['final'])
            
            # C1V1 = C2V2  =>  V1 = (C2 * V2) / C1
            single_rxn_vol = (final * reaction_volume) / stock
            master_mix_vol = single_rxn_vol * num_reactions * safety_factor
            
            total_component_vol += master_mix_vol
            results.append({
                "name": comp['name'],
                "single_rxn_vol": round(single_rxn_vol, 2),
                "master_mix_vol": round(master_mix_vol, 2)
            })

        # Calculate required water volume
        water_volume = total_mm_volume - total_component_vol
        results.append({
            "name": "Nuclease-Free Water",
            "single_rxn_vol": round(water_volume / (num_reactions * safety_factor), 2),
            "master_mix_vol": round(water_volume, 2)
        })

        response = {
            "success": True, 
            "results": results,
            "total_mm_volume": round(total_mm_volume, 2),
            "explanation": f"Calculations based on C1V1=C2V2 for {num_reactions} reactions with a {int((safety_factor-1)*100)}% safety margin."
        }
        log_to_db('pcr_master_mix', data, response)
        return jsonify(response)

    except (KeyError, ValueError, ZeroDivisionError) as e:
        return jsonify({"success": False, "error": f"Invalid input. Please check all values. Details: {e}"}), 400


@app.route('/convert/dna_concentration', methods=['POST'])
def convert_dna():
    """Converts DNA concentration from ng/µL to pmol/µL."""
    try:
        data = request.json
        conc_ng_ul = float(data['concentration'])
        length_bp = float(data['length'])
        
        # Average molecular weight of a base pair (dsDNA) is ~650 g/mol
        # 1 ng = 1e-9 g; 1 pmol = 1e-12 mol
        # pmol/µL = (ng/µL * 1e-9 g/ng) / (length_bp * 650 g/mol) * (1 mol / 1e-12 pmol)
        # Simplified: pmol/µL = (conc_ng_ul * 1e3) / (length_bp * 650)
        
        pmol_per_ul = (conc_ng_ul * 1e3) / (length_bp * 650)

        response = {
            "success": True,
            "result": f"{pmol_per_ul:.4f} pmol/µL",
            "explanation": f"Calculated using the formula: (Concentration [ng/µL] × 10^6) / (DNA Length [bp] × 650 g/mol/bp). Assumes double-stranded DNA."
        }
        log_to_db('dna_concentration', data, response)
        return jsonify(response)

    except (KeyError, ValueError, ZeroDivisionError) as e:
        return jsonify({"success": False, "error": "Invalid input. Concentration and length must be positive numbers."}), 400


@app.route('/calculate/dilution', methods=['POST'])
def calculate_dilution():
    """Calculates one value from C1V1 = C2V2."""
    try:
        data = request.json
        c1 = float(data['c1'])
        v1 = '?'
        c2 = float(data['c2'])
        v2 = float(data['v2'])
        
        # We solve for V1
        # V1 = (C2 * V2) / C1
        v1_result = (c2 * v2) / c1
        
        response = {
            "success": True,
            "result": f"{v1_result:.2f} {data['v1_unit']}",
            "explanation": f"Using the formula C1V1 = C2V2, the required stock volume (V1) is ({c2} * {v2}) / {c1}."
        }
        log_to_db('buffer_dilution', data, response)
        return jsonify(response)
        
    except (KeyError, ValueError, ZeroDivisionError) as e:
        return jsonify({"success": False, "error": "Invalid input. Please provide valid numbers for C1, C2, and V2."}), 400


@app.route('/convert/ul_to_mmol', methods=['POST'])
def convert_ul_to_mmol():
    """Converts a volume (µL) of a solution with known molarity to millimoles (mmol)."""
    try:
        data = request.json
        volume_ul = float(data['volume'])
        molarity = float(data['molarity']) # Molarity is in mol/L

        # Moles = Molarity (mol/L) * Volume (L)
        # Moles = Molarity * (volume_ul / 1,000,000)
        # Millimoles = Moles * 1000
        # Millimoles = (Molarity * (volume_ul / 1,000,000)) * 1000
        # Simplified: mmol = Molarity * volume_ul / 1000
        
        result_mmol = (molarity * volume_ul) / 1000
        
        response = {
            "success": True,
            "result": f"{result_mmol:.6f} mmol",
            "explanation": f"Calculated using: (Molarity [mol/L] × Volume [µL]) / 1000 = Result [mmol]."
        }
        log_to_db('ul_to_mmol', data, response)
        return jsonify(response)
    
    except (KeyError, ValueError) as e:
        return jsonify({"success": False, "error": "Invalid input. Please provide a valid volume and molarity."}), 400


if __name__ == '__main__':
    # Initialize the database before running the app
    from database import init_db
    init_db()
    app.run(debug=True)