from flask import Flask, render_template, jsonify, request
import random
import pandas as pd
import os

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
            # Ensure yearID and HR are numeric, coercing errors to NaN then filling with 0
            _df_stats['year'] = pd.to_numeric(_df_stats['year'], errors='coerce').fillna(0).astype(int)
            _df_stats['home_run'] = pd.to_numeric(_df_stats['home_run'], errors='coerce').fillna(0).astype(int)
            print(f"Successfully loaded data from {DATA_FILE_PATH}")
            print(f"DataFrame head: \n{_df_stats.head()}")
            print(f"DataFrame dtypes: \n{_df_stats.dtypes}")
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

@app.route('/api/available_years')
def available_years():
    """Provides a sorted list of unique years from the stats data."""
    df = get_stats_data()
    if df.empty or 'year' not in df.columns:
        return jsonify([])
    
    unique_years = sorted(df['year'].unique().tolist(), reverse=True)
    return jsonify(unique_years)

@app.route('/api/player_home_runs')
def player_home_runs():
    """
    Provides player home run data for a given year.
    Filters by year, sums HR per player, and returns top N players by HR.
    """
    df = get_stats_data()
    year = request.args.get('year', default='2024', type=int)
    top_n = request.args.get('top_n', default=20, type=int) # Number of top players to show

    if df.empty or 'year' not in df.columns or 'player_id' not in df.columns or 'home_run' not in df.columns:
        return jsonify([])

    # Filter by year
    year_data = df[df['year'] == year]

    if year_data.empty:
        return jsonify([])

    # Group by playerID and sum HRs
    player_hrs = year_data.groupby('player_id')['home_run'].sum().reset_index()
    
    # Sort by HR in descending order and take top N
    top_players_hrs = player_hrs.sort_values(by='home_run', ascending=False).head(top_n)
    
    # Format for D3 bar chart: [{'name': playerID, 'value': HR}, ...]
    chart_data = [{'name': row['player_id'], 'value': row['home_run']} for index, row in top_players_hrs.iterrows()]
    
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
