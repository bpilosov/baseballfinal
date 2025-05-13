// Wait for the DOM to be fully loaded before executing D3.js code
document.addEventListener('DOMContentLoaded', function () {

    const DEFAULT_YEAR = 2024;

    // --- Helper function to get dimensions of a chart container ---
    function getChartDimensions(containerElement) {
        if (!containerElement || containerElement.node() === null) {
            console.error("Invalid container element passed to getChartDimensions.");
            return { width: 0, height: 0, margin: { top: 0, right: 0, bottom: 0, left: 0 } };
        }
        // Margins for the chart inside the SVG
        const margin = { top: 20, right: 30, bottom: 70, left: 70 }; // Increased bottom margin for angled labels
        
        // Get dimensions of the chart-container div
        const containerWidth = containerElement.node().clientWidth;
        const containerHeight = containerElement.node().clientHeight;

        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;
        
        return { width, height, margin, containerWidth, containerHeight };
    }


    // --- 1. Bar Chart (Player Home Runs) ---
    function drawPlayerBarChart(year) {
        const containerId = 'chart-bar';
        const apiUrlBase = '/api/player_home_runs';
        const apiUrl = `${apiUrlBase}?year=${year}`;

        const chartContainer = d3.select(`#${containerId}`);
        if (chartContainer.empty()) {
            console.error(`Chart container #${containerId} not found.`);
            return;
        }
        chartContainer.selectAll("*").remove(); // Clear previous chart

        const { width, height, margin, containerWidth, containerHeight } = getChartDimensions(chartContainer);

        if (width <= 0 || height <= 0) {
            console.warn(`Invalid dimensions for ${containerId}. Width: ${width}, Height: ${height}`);
            chartContainer.html("<p style='text-align:center; padding-top:20px;'>Chart area too small or data not loaded.</p>");
            return;
        }

        const svg = chartContainer.append('svg')
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        d3.json(apiUrl).then(data => {
            if (!data || data.length === 0) {
                svg.append("text")
                   .attr("x", width / 2)
                   .attr("y", height / 2)
                   .attr("text-anchor", "middle")
                   .style("font-size", "14px")
                   .text(`No home run data available for ${year}.`);
                return;
            }

            // X axis: Player Names
            const x = d3.scaleBand()
                .range([0, width])
                .domain(data.map(d => d.name)) // 'name' is playerID from Flask
                .padding(0.3); // Increased padding

            svg.append('g')
                .attr('transform', `translate(0,${height})`)
                .call(d3.axisBottom(x))
                .selectAll('text')
                .attr('transform', 'translate(-10,5)rotate(-45)')
                .style('text-anchor', 'end')
                .style('font-size', '10px'); // Adjust font size if playerIDs are long

            // Y axis: Home Runs
            const yMax = d3.max(data, d => d.value);
            const y = d3.scaleLinear()
                .domain([0, yMax > 0 ? yMax * 1.1 : 10]) // Ensure max is at least 10, add buffer
                .range([height, 0]);

            svg.append('g')
                .call(d3.axisLeft(y).ticks(Math.min(10, yMax))); // Adjust number of ticks

            // Bars
            svg.selectAll('.bar')
                .data(data)
                .join('rect')
                .attr('class', 'bar')
                .attr('x', d => x(d.name))
                .attr('y', d => y(0)) // Start from y=0 for transition
                .attr('width', x.bandwidth())
                .attr('height', 0) // Start with height 0 for transition
                .attr('fill', '#2a9d8f') // A teal color
                .transition()
                .duration(700)
                .delay((d,i) => i * 20)
                .attr('y', d => y(d.value))
                .attr('height', d => height - y(d.value));

            // Add labels for X and Y axes
            svg.append("text")
                .attr("text-anchor", "middle")
                .attr("x", width / 2)
                .attr("y", height + margin.bottom - 15) // Position below X axis labels
                .style("font-size", "12px")
                .text("Player");

            svg.append("text")
                .attr("text-anchor", "middle")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", -margin.left + 25) // Position left of Y axis
                .style("font-size", "12px")
                .text("Home Runs");


        }).catch(error => {
            console.error(`Error fetching data for player bar chart (${apiUrl}):`, error);
            svg.append("text").attr("x", width/2).attr("y", height/2).attr("text-anchor", "middle").text("Error loading data.");
        });
    }

    // populate year filter dropdown
    function populateYearFilter() {
        const dropdown = d3.select('#year-filter');
        if (dropdown.empty()) {
            console.error("Year filter dropdown not found.");
            return;
        }

            const years = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
            years.forEach(year => {
                dropdown.append('option')
                    .attr('value', year)
                    .text(year);
        });

            dropdown.property('value', DEFAULT_YEAR);
            drawPlayerBarChart(DEFAULT_YEAR);

            dropdown.on('change', function() {
                drawPlayerBarChart(this.value);
        });
    }


    // --- Other Chart Drawing Functions (Unchanged but use new getChartDimensions) ---

    function drawLineChart(containerId, apiUrl) {
        const chartContainer = d3.select(`#${containerId}`);
         if (chartContainer.empty()) {
            console.error(`Chart container #${containerId} not found.`);
            return;
        }
        chartContainer.selectAll("*").remove(); // Clear previous
        const { width, height, margin, containerWidth, containerHeight } = getChartDimensions(chartContainer);

         if (width <= 0 || height <= 0) {
            chartContainer.html("<p style='text-align:center; padding-top:20px;'>Chart area too small.</p>");
            return;
        }

        const svg = chartContainer.append('svg')
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        d3.json(apiUrl).then(data => {
            if (!data || data.length === 0) {
                svg.append("text").attr("x", width/2).attr("y", height/2).attr("text-anchor", "middle").text("No data available.");
                return;
            }

            const x = d3.scaleLinear()
                .domain(d3.extent(data, d => d.x))
                .range([0, width]);
            svg.append('g')
                .attr('transform', `translate(0,${height})`)
                .call(d3.axisBottom(x));

            const y = d3.scaleLinear()
                .domain([0, d3.max(data, d => d.y) * 1.1 || 10])
                .range([height, 0]);
            svg.append('g')
                .call(d3.axisLeft(y));

            const line = d3.line()
                .x(d => x(d.x))
                .y(d => y(d.y));

            svg.append('path')
                .datum(data)
                .attr('fill', 'none')
                .attr('stroke', '#e67e22')
                .attr('stroke-width', 2.5)
                .attr('d', line)
                .attr("stroke-dasharray", function() { return this.getTotalLength() + " " + this.getTotalLength(); })
                .attr("stroke-dashoffset", function() { return this.getTotalLength(); })
                .transition()
                .duration(1500)
                .attr("stroke-dashoffset", 0);
        }).catch(error => console.error(`Error for line chart (${apiUrl}):`, error));
    }

    function drawScatterPlot(containerId, apiUrl) {
        const chartContainer = d3.select(`#${containerId}`);
        if (chartContainer.empty()) return;
        chartContainer.selectAll("*").remove(); // Clear previous
        const { width, height, margin, containerWidth, containerHeight } = getChartDimensions(chartContainer);

        if (width <= 0 || height <= 0) {
            chartContainer.html("<p style='text-align:center; padding-top:20px;'>Chart area too small.</p>");
            return;
        }
        const svg = chartContainer.append('svg')
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        d3.json(apiUrl).then(data => {
            if (!data || data.length === 0) {
                svg.append("text").attr("x", width/2).attr("y", height/2).attr("text-anchor", "middle").text("No data available.");
                return;
            }
            const x = d3.scaleLinear().domain([0, d3.max(data, d => d.x) * 1.1 || 100]).range([0, width]);
            svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));
            const y = d3.scaleLinear().domain([0, d3.max(data, d => d.y) * 1.1 || 100]).range([height, 0]);
            svg.append('g').call(d3.axisLeft(y));

            svg.selectAll('circle').data(data).join('circle')
                .attr('cx', d => x(d.x)).attr('cy', d => y(d.y))
                .attr('r', 0).style('fill', '#3498db').style('opacity', 0.7)
                .transition().duration(800).delay((d,i) => i * 20).attr('r', d => d.r || 5);
        }).catch(error => console.error(`Error for scatter plot (${apiUrl}):`, error));
    }

    function drawPieChart(containerId, apiUrl) {
        const chartContainer = d3.select(`#${containerId}`);
        if (chartContainer.empty()) return;
        chartContainer.selectAll("*").remove(); // Clear previous
        const { width, height, margin, containerWidth, containerHeight } = getChartDimensions(chartContainer);

        if (width <= 0 || height <= 0) {
             chartContainer.html("<p style='text-align:center; padding-top:20px;'>Chart area too small.</p>");
            return;
        }
        const radius = Math.min(width, height) / 2 - 5; // Small padding

        const svg = chartContainer.append('svg')
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .append('g')
            .attr('transform', `translate(${containerWidth / 2}, ${containerHeight / 2})`);

        const color = d3.scaleOrdinal(d3.schemeCategory10);
        const pie = d3.pie().value(d => d.value).sort(null);
        const arc = d3.arc().innerRadius(0).outerRadius(radius);

        d3.json(apiUrl).then(data => {
            if (!data || data.length === 0) {
                svg.append("text").attr("text-anchor", "middle").text("No data available.");
                return;
            }
            svg.selectAll('path').data(pie(data)).join('path')
                .attr('fill', d => color(d.data.label)).attr('d', arc)
                .each(function(d) { this._current = d; })
                .transition().duration(1000)
                .attrTween("d", function(d) {
                    const interpolate = d3.interpolate({startAngle: 0, endAngle: 0}, d);
                    return t => arc(interpolate(t));
                });
            svg.selectAll('text.pie-label').data(pie(data)).join('text').attr('class', 'pie-label')
                .attr('transform', d => `translate(${arc.centroid(d)})`).attr('text-anchor', 'middle')
                .attr('dy', '0.35em').style('font-size', '10px').style('fill', 'white')
                .text(d => d.data.label.substring(0,3)).style("opacity", 0)
                .transition().duration(1000).delay(500).style("opacity", 1);
        }).catch(error => console.error(`Error for pie chart (${apiUrl}):`, error));
    }

// Modified drawParallelCoordinates function with draggable axes
function drawParallelCoordinates() {
    const containerId = 'chart-parallel-coords';
    const apiUrl = '/api/parallel_coords_data';

    const chartContainer = d3.select(`#${containerId}`);
    if (chartContainer.empty()) {
        console.error(`chart container #${containerId} not found.`);
        return;
    }
    
    // remove any tooltips from previous render
    d3.select("body").selectAll(".d3-tooltip").remove();
    
    chartContainer.selectAll("*").remove(); // clear previous chart

    const { width, height, margin, containerWidth, containerHeight } = getChartDimensions(chartContainer);

    if (width <= 0 || height <= 0) {
        console.warn(`invalid dimensions for ${containerId}. width: ${width}, height: ${height}`);
        chartContainer.html("<p style='text-align:center; padding-top:20px;'>chart area too small or data not loaded.</p>");
        return;
    }

    const svg = chartContainer.append('svg')
        .attr('width', containerWidth)
        .attr('height', containerHeight)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    d3.json(apiUrl).then(data => {
        if (!data || data.length === 0) {
            svg.append("text")
               .attr("x", width / 2)
               .attr("y", height / 2)
               .attr("text-anchor", "middle")
               .style("font-size", "14px")
               .text("no player data available.");
            return;
        }

        // define the dimensions we'll use for the parallel coordinates
        let dimensions = [
            {name: "player_age", label: "Age", type: "number"},
            {name: "bb_percent", label: "BB%", type: "number"},
            {name: "batting_avg", label: "Batting Avg", type: "number"},
            {name: "slg_percent", label: "SLG%", type: "number"},
            {name: "on_base_percent", label: "OBP", type: "number"},
            {name: "on_base_plus_slg", label: "OPS", type: "number"},
            {name: "woba", label: "wOBA", type: "number"},
            // {name: "height", label: "Height (in)", type: "number"},
            // {name: "weight", label: "Weight (lb)", type: "number"}
        ];

        // create scale for each dimension
        const y = {};
        dimensions.forEach(dim => {
            // use different domain calculation based on type
            if (dim.type === "categorical") {
                y[dim.name] = d3.scalePoint()
                    .domain(Object.keys(dim.categories).map(k => parseFloat(k)))
                    .range([height, 0]);
            } else {
                y[dim.name] = d3.scaleLinear()
                    .domain(d3.extent(data, d => d[dim.name]))
                    .range([height, 0]);
            }
        });

        // build the x scale (position of each axis)
        // store the original position for dragging reference
        dimensions.forEach((dim, i) => {
            dim.position = i;
        });

        function updatePositions() {
            // update x scale based on current dimension order
            x.domain(dimensions.map(d => d.name));
            
            // update position of each dimension axis
            axes.attr("transform", d => `translate(${x(d.name)},0)`);
            
            // update path positions
            background.attr("d", d => {
                return line(dimensions.map(p => {
                    return [p.name, y[p.name](d[p.name])];
                }));
            });
            
            foreground.attr("d", d => {
                return line(dimensions.map(p => {
                    return [p.name, y[p.name](d[p.name])];
                }));
            });
        }

        const x = d3.scalePoint()
            .range([0, width])
            .domain(dimensions.map(d => d.name));

        // path function to draw lines
        const line = d3.line()
            .defined(d => !isNaN(d[1]))
            .x(d => x(d[0]))
            .y(d => d[1]);

        // add a group for each dimension axis
        const axes = svg.selectAll(".dimension")
            .data(dimensions)
            .enter().append("g")
            .attr("class", "dimension")
            .attr("transform", d => `translate(${x(d.name)},0)`)
            .call(d3.drag()
                .subject(function(event, d) {
                    return {x: x(d.name)};
                })
                .on("start", function(event, d) {
                    // highlight active axis
                    d3.select(this).raise().classed("active", true);
                    
                    // store initial position
                    d.startPosition = x(d.name);
                })
                .on("drag", function(event, d) {
                    // update x position during drag
                    d.currentPosition = Math.max(0, Math.min(width, event.x));
                    
                    // move the axis
                    d3.select(this).attr("transform", `translate(${d.currentPosition},0)`);
                    
                    // reorder dimensions based on current x positions
                    dimensions.sort((a, b) => {
                        return (a.name === d.name ? d.currentPosition : x(a.name)) - 
                               (b.name === d.name ? d.currentPosition : x(b.name));
                    });
                    
                    // update line paths during drag for interactivity
                    foreground.attr("d", path => {
                        return line(dimensions.map(p => {
                            return [p.name, y[p.name](path[p.name])];
                        }));
                    });
                })
                .on("end", function(event, d) {
                    // remove highlight
                    d3.select(this).classed("active", false);
                    
                    // update the final dimension positions
                    updatePositions();
                    
                    // reset any temporary stored positions
                    delete d.startPosition;
                    delete d.currentPosition;
                })
            );

        // create categorical axis formatters
        const formatters = {};
        dimensions.forEach(dim => {
            if (dim.type === "categorical") {
                formatters[dim.name] = d => dim.categories[d] || d;
            }
        });

        // add axes with proper formatters for categorical variables
        axes.append("g")
            .attr("class", "axis")
            .each(function(d) { 
                // use formatters for categorical variables
                const axis = d3.axisLeft().scale(y[d.name]);
                if (d.type === "categorical") {
                    axis.tickFormat(formatters[d.name]);
                }
                d3.select(this).call(axis);
            })
            .append("text")
            .attr("y", -9)
            .attr("text-anchor", "middle")
            .attr("fill", "#000")
            .text(d => d.label)
            .style("font-size", "10px");

        // add visual indicator that axes are draggable
        axes.append("text")
            .attr("x", 0)
            .attr("y", -15)
            .attr("text-anchor", "middle")
            .attr("fill", "#777")
            .html("&#8597;") // double-headed arrow symbol
            .style("font-size", "12px")
            .style("cursor", "move");

        // add brush functionality to each axis for filtering
        axes.each(function(d) {
            d3.select(this)
                .call(d3.brushY()
                    .extent([[-8, 0], [8, height]])
                    .on("start", brushstart)
                    .on("brush", brushed)
                    .on("end", brushend)
                );
        });

        let brushSelections = {};

        // brush event handlers
        function brushstart() {
            foreground.each(function(d) {
                d._initial_opacity = d3.select(this).style("opacity");
            });
        }

        function brushed(event, dimension) {
            if (event.selection) {
                // get selection range
                const range = event.selection.map(y[dimension.name].invert);
                
                // store this brush's selection
                brushSelections[dimension.name] = range;
                
                // filter lines based on all active brushes
                foreground.style("opacity", d => {
                    return Object.entries(brushSelections).every(([dim, range]) => {
                        const value = d[dim];
                        return value >= range[1] && value <= range[0]; // y axis is inverted
                    }) ? null : 0.02; // use CSS opacity for matched, very faint for non-matched
                });
            }
        }

        function brushend(event) {
            if (!event.selection) {
                // if this brush was cleared, remove its selection
                const dimension = d3.select(this).datum();
                delete brushSelections[dimension.name];
                
                // if no brushes remain, restore all lines
                if (Object.keys(brushSelections).length === 0) {
                    foreground.style("opacity", null); // use CSS default
                } else {
                    // otherwise, reapply the remaining brushes
                    brushed({selection: true}, dimension);
                }
            }
        }

        // add background lines for context with softer styling
        const background = svg.append("g")
            .attr("class", "background")
            .selectAll("path")
            .data(data)
            .enter().append("path")
            .attr("d", d => {
                return line(dimensions.map(p => {
                    return [p.name, y[p.name](d[p.name])];
                }));
            });
            // styling now controlled by CSS

        // add foreground lines with enhanced path styling and alpha blending
        const foreground = svg.append("g")
            .attr("class", "foreground")
            .selectAll("path")
            .data(data)
            .enter().append("path")
            .attr("d", d => {
                return line(dimensions.map(p => {
                    return [p.name, y[p.name](d[p.name])];
                }));
            })
            // basic attributes now controlled by CSS for better blending
            .style("opacity", 0); // start invisible for transition

        // create color scale for categorical coloring (optional)
        // can color by position (e.g. OF, 1B, etc)
        const positionScale = d3.scaleOrdinal()
            .domain(["OF", "1B", "2B", "3B", "SS", "C", "DH"])
            .range(d3.schemeCategory10);

        // add transition to reveal lines with slight stagger for visual interest
        foreground.transition()
            .duration(1200)
            .delay((d, i) => i * 4)
            .style("opacity", null); // use the CSS value

        // add tooltip div
        const tooltip = d3.select("body").append("div")
            .attr("class", "d3-tooltip")
            .style("opacity", 0);
            
        // add hover interaction with tooltip
        foreground
            .on("mouseover", function(event, d) {
                // highlight the hovered line
                d3.select(this)
                    .classed("highlighted", true)
                    .raise(); // bring to front
                
                // show tooltip with player info
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                
                tooltip.html(`
                    <strong>${d.name}</strong><br/>
                    Age: ${d.player_age}<br/>
                    Bats: ${d.bats} / Throws: ${d.throws}<br/>
                    AVG/OBP/SLG: ${d.batting_avg.toFixed(3)}/${d.on_base_percent.toFixed(3)}/${d.slg_percent.toFixed(3)}<br/>
                    OPS: ${d.on_base_plus_slg.toFixed(3)} / wOBA: ${d.woba.toFixed(3)}<br/>
                    BB%: ${d.bb_percent.toFixed(1)}%<br/>
                    Height: ${Math.floor(d.height/12)}'${Math.round(d.height%12)}" / Weight: ${d.weight} lbs
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                // restore line style
                d3.select(this)
                    .classed("highlighted", false);
                
                // hide tooltip
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        // add styles for active (being dragged) axis
        svg.append("style").text(`
            .dimension.active {
                cursor: move;
            }
            .dimension.active .axis path {
                stroke: #e74c3c;
                stroke-width: 2px;
            }
        `);

    }).catch(error => {
        console.error(`error fetching data for parallel coordinates (${apiUrl}):`, error);
        svg.append("text")
            .attr("x", width/2)
            .attr("y", height/2)
            .attr("text-anchor", "middle")
            .text("error loading data.");
    });
}

    // --- Initialize all charts ---
    function initializeDashboard() {
        populateYearFilter(); // This will also call drawPlayerBarChart for the default year
        // Other charts
        drawLineChart('chart-line', '/api/data/line');
        drawScatterPlot('chart-scatter', '/api/data/scatter');
        drawPieChart('chart-pie', '/api/data/pie');
        drawParallelCoordinates(); // add parallel coordinates chart
    }
    initializeDashboard();

    // --- Responsive Resizing ---
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            // For the bar chart, redraw with the currently selected year
            const selectedYear = d3.select('#year-filter').property('value') || DEFAULT_YEAR;
            drawPlayerBarChart(selectedYear);

            // Redraw other charts
            drawLineChart('chart-line', '/api/data/line');
            drawScatterPlot('chart-scatter', '/api/data/scatter');
            drawPieChart('chart-pie', '/api/data/pie');
        }, 250);
    });
});
