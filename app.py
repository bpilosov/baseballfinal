from flask import Flask, render_template, jsonify, request
import random
import pandas as pd
import numpy as np
import json

# Initialize the Flask application
app = Flask(__name__)

# --- Configuration for data file ---
DATA_FILE_PATH = "data/stats1524_handedness_people.csv"

# --- Helper function to load and cache data ---
_df_stats = None

def get_stats_data():
    """Loads the CSV data into a pandas DataFrame and caches it."""
    global _df_stats
    if _df_stats is None:
        try:
            _df_stats = pd.read_csv(DATA_FILE_PATH)
            print(f"Successfully loaded data from {DATA_FILE_PATH}")
            # print(f"DataFrame dtypes: \n{_df_stats.dtypes}")
        except FileNotFoundError:

            print(f"Error: The data file was not found at {DATA_FILE_PATH}")
            _df_stats = pd.DataFrame() # Return empty DataFrame on error

        except Exception as e:
            print(f"Error loading or processing data: {e}")
            _df_stats = pd.DataFrame()
    return _df_stats

# --- Routes ---

@app.route('/')
def index():
    """Serves the main HTML page for the dashboard."""
    get_stats_data() # Load data on first request if not already loaded
    return render_template('index.html')

# --- API Endpoints for D3.js Charts ---

@app.route('/api/parallel_coords_data')
def parallel_coords_data():
    """
    provides data for the parallel coordinates plot with selected player metrics
    """
    df = get_stats_data()
    
    if df.empty:
        return jsonify([])
    
    # select only the columns we need for parallel coordinates
    cols = ['last_name, first_name', 'player_age', 'bb_percent', 'batting_avg', 
            'slg_percent', 'on_base_percent', 'on_base_plus_slg', 'woba', 
            'BATS', 'THROWS', 'height', 'weight']
    
    # handle missing data - drop rows with NaN in our columns of interest
    data_subset = df[cols].dropna()
    
    # convert categorical variables to numeric for parallel coords
    # create a mapping for BATS: L=0, R=1, B=2
    bats_map = {'L': 0, 'R': 1, 'B': 2}
    data_subset['bats_num'] = data_subset['BATS'].map(bats_map)
    
    # create mapping for THROWS: L=0, R=1
    throws_map = {'L': 0, 'R': 1}
    data_subset['throws_num'] = data_subset['THROWS'].map(throws_map)
    
    # format data for d3 parallel coordinates
    result = []
    for _, row in data_subset.head(100).iterrows():  # limit to 100 players for performance
        player_data = {
            'name': row['last_name, first_name'],
            'player_age': float(row['player_age']),
            'bb_percent': float(row['bb_percent']),
            'batting_avg': float(row['batting_avg']),
            'slg_percent': float(row['slg_percent']),
            'on_base_percent': float(row['on_base_percent']),
            'on_base_plus_slg': float(row['on_base_plus_slg']),
            'woba': float(row['woba']),
            'bats': row['BATS'],
            'bats_num': float(row['bats_num']),
            'throws': row['THROWS'],
            'throws_num': float(row['throws_num']),
            'height': float(row['height']),
            'weight': float(row['weight'])
        }
        result.append(player_data)
    
    return jsonify(result)

@app.route('/api/player_home_runs')
def player_home_runs():
    """
    Provides player home run data for a given year.
    Filters by year, sums HR per player, and returns top N players by HR.
    """
    year = request.args.get('year', default='2024', type=int)
    top_n = request.args.get('top_n', default=20, type=int) # Number of top players to show

    df = _df_stats[["year", "last_name, first_name", "home_run"]].copy()

    # if df.empty or 'year' not in df.columns or 'player_id' not in df.columns or 'home_run' not in df.columns:
    #     return jsonify([])

    # Filter by year
    year_data = df[df['year'] == year]

    if year_data.empty:
        return jsonify([])

    # Group by playerID and sum HRs
    player_hrs = year_data.groupby('last_name, first_name')['home_run'].sum().reset_index()
    
    # Sort by HR in descending order and take top N
    top_players_hrs = player_hrs.sort_values(by='home_run', ascending=False).head(top_n)
    
    # Format for D3 bar chart: [{'name': playerID, 'value': HR}, ...]
    chart_data = [{'name': str(row['last_name, first_name']), 'value': int(row['home_run'])} for index, row in top_players_hrs.iterrows()]
    
    return jsonify(chart_data)


# --- API Endpoints for Other Charts (Unchanged from previous version) ---
@app.route('/api/data/line')
def data_line():
    """Provides data for the line chart."""
    data = [{'x': i, 'y': random.randint(20, 80)} for i in range(10)]
    return jsonify(data)

@app.route('/api/data/scatter')
def data_scatter():
    """Provides data for the scatter plot."""
    data = [{'x': random.randint(0, 100), 'y': random.randint(0, 100), 'r': random.randint(3, 12)} for _ in range(25)]
    return jsonify(data)

@app.route('/api/data/pie')
def data_pie():
    """Provides data for the pie chart."""
    labels = ['Alpha', 'Beta', 'Gamma', 'Delta']
    data = [{'label': label, 'value': random.randint(10, 70)} for label in labels]
    return jsonify(data)

# --- Main Execution ---

if __name__ == '__main__':
    app.run(debug=True)
