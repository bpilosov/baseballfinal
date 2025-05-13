// Wait for the DOM to be fully loaded before executing D3.js code
document.addEventListener('DOMContentLoaded', function () {

    const DEFAULT_YEAR = 2024;
    // track the current pcp interaction mode
    let pcpDragMode = false;
    
    // Track selected position filters
    let selectedPositions = [];

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

    // --- Initialize Position Filter ---
    function initializePositionFilter() {
        // Position codes and their display names
        const positions = {
            'P': { name: 'Pitcher' },
            'C': { name: 'Catcher' },
            '1B': { name: 'First Base' },
            '2B': { name: 'Second Base' },
            '3B': { name: 'Third Base' },
            'SS': { name: 'Shortstop' },
            'OF': { name: 'Outfield' },
            'DH': { name: 'Designated Hitter' }
        };
        
        const fieldContainer = d3.select('#chart-field');
        if (fieldContainer.empty()) {
            console.error("Position filter container not found");
            return;
        }
        
        // Inject field SVG 
        const svgContainer = fieldContainer.append('div')
            .attr('class', 'baseball-field-svg-container');
            
        // Create SVG
        const svg = svgContainer.append('svg')
            .attr('viewBox', '0 0 87.18 80')
            .attr('width', '100%')
            .attr('height', '100%');
            
        // Draw the field diamond (infield)
        svg.append('path')
            .attr('d', 'M 0.675,21.541 L 43.59,64.456 L 86.505,21.541 C 75.846,8.608 60.567,0.5 43.59,0.5 C 26.613,0.5 11.335,8.608 0.675,21.541 z')
            .attr('fill', '#ccebc0')
            .attr('stroke', '#aaa9aa');
            
        // Draw home plate
        svg.append('rect')
            .attr('transform', 'matrix(0.7071,-0.7071,0.7071,0.7071,-20.9376,44.7822)')
            .attr('x', 31.718)
            .attr('y', 35.793)
            .attr('width', 23.745)
            .attr('height', 23.745)
            .attr('fill', '#faebc3')
            .attr('stroke', '#aaa9aa');
            
        // Position coordinates 
        const positionCoords = {
            'P': { x: 43.5, y: 40, radius: 5 },
            'C': { x: 43.5, y: 58, radius: 5 },
            '1B': { x: 62, y: 45, radius: 5 },
            '2B': { x: 54, y: 32, radius: 5 },
            '3B': { x: 25, y: 45, radius: 5 },
            'SS': { x: 33, y: 32, radius: 5 },
            'OF': { x: 43.5, y: 15, radius: 7 },
            'DH': { x: 43.5, y: 75, radius: 5 },
        };
        
        // Draw positions
        Object.entries(positionCoords).forEach(([pos, coords]) => {
            // Create position group
            const posGroup = svg.append('g')
                .attr('class', `position-group position-${pos}`)
                .attr('data-position', pos)
                .style('cursor', 'pointer');
                
            // Circle for the position
            posGroup.append('circle')
                .attr('cx', coords.x)
                .attr('cy', coords.y)
                .attr('r', coords.radius)
                .attr('fill', '#2c3e50')
                .attr('fill-opacity', 0.7)
                .attr('stroke', 'none');
                
            // Position label
            posGroup.append('text')
                .attr('x', coords.x)
                .attr('y', coords.y + 0.5)
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'middle')
                .attr('fill', 'white')
                .attr('font-size', '5')
                .attr('font-weight', 'bold')
                .text(pos);
                
            // Add hover and click effects
            posGroup.on('mouseover', function() {
                d3.select(this).select('circle').attr('fill-opacity', 1);
            })
            .on('mouseout', function() {
                const posCode = d3.select(this).attr('data-position');
                if (!selectedPositions.includes(posCode)) {
                    d3.select(this).select('circle').attr('fill-opacity', 0.7);
                }
            })
            .on('click', function() {
                const posCode = d3.select(this).attr('data-position');
                togglePositionFilter(posCode, this);
            });
        });
        
        // Add legend
        const legend = fieldContainer.append('div')
            .attr('class', 'position-filter-legend');
            
        legend.append('h4')
            .attr('class', 'legend-title')
            .text('Position Filter');
            
        const legendItems = legend.append('div')
            .attr('class', 'legend-items');
            
        Object.entries(positions).forEach(([pos, data]) => {
            legendItems.append('div')
                .attr('class', 'legend-item')
                .attr('data-position', pos)
                .html(`
                    <span class="legend-color" style="background-color: #2c3e50; opacity: 0.7"></span>
                    <span class="legend-label">${data.name} (${pos})</span>
                `)
                .on('click', function() {
                    togglePositionFilter(pos);
                });
        });
        
        // Add clear button
        legend.append('button')
            .attr('class', 'clear-filter-btn')
            .text('Clear Filters')
            .on('click', clearPositionFilters);
    }
    
    // Toggle position filter
    function togglePositionFilter(position, element) {
        const index = selectedPositions.indexOf(position);
        
        if (index === -1) {
            // Add position to filter
            selectedPositions.push(position);
            
            // Update visual indicator on field
            d3.selectAll(`.position-${position}`)
                .select('circle')
                .attr('fill', '#e74c3c')
                .attr('fill-opacity', 1)
                .attr('stroke', '#c0392b')
                .attr('stroke-width', 1);
                
            // Update legend
            d3.selectAll(`.legend-item[data-position="${position}"]`)
                .classed('selected', true)
                .select('.legend-color')
                .style('background-color', '#e74c3c')
                .style('opacity', 1);
        } else {
            // Remove position from filter
            selectedPositions.splice(index, 1);
            
            // Update visual indicator on field
            d3.selectAll(`.position-${position}`)
                .select('circle')
                .attr('fill', '#2c3e50')
                .attr('fill-opacity', 0.7)
                .attr('stroke', 'none');
                
            // Update legend
            d3.selectAll(`.legend-item[data-position="${position}"]`)
                .classed('selected', false)
                .select('.legend-color')
                .style('background-color', '#2c3e50')
                .style('opacity', 0.7);
        }
        
        // Redraw all charts with new filter
        applyPositionFilters();
    }
    
    // Clear all position filters
    function clearPositionFilters() {
        selectedPositions = [];
        
        // Reset all visual indicators
        d3.selectAll('.position-group circle')
            .attr('fill', '#2c3e50')
            .attr('fill-opacity', 0.7)
            .attr('stroke', 'none');
            
        d3.selectAll('.legend-item')
            .classed('selected', false)
            .select('.legend-color')
            .style('background-color', '#2c3e50')
            .style('opacity', 0.7);
            
        // Redraw all charts
        applyPositionFilters();
    }
    
    // Apply position filters to all charts
    function applyPositionFilters() {
        const selectedYear = d3.select('#year-filter').property('value') || DEFAULT_YEAR;
        drawPlayerBarChart(selectedYear);
        drawPositionStats();
        drawParallelCoordinates();
    }

    // --- 1. Bar Chart (Player Home Runs) ---
    function drawPlayerBarChart(year) {
        const containerId = 'chart-bar';
        const apiUrlBase = '/api/player_home_runs';
        let apiUrl = `${apiUrlBase}?year=${year}`;
        
        // Add position filter if active
        if (selectedPositions.length > 0) {
            apiUrl += `&position=${selectedPositions.join(',')}`;
        }

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
                   .text(`No home run data available for ${year}${selectedPositions.length > 0 ? ' with selected position filters' : ''}.`);
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
                .attr('class', d => `bar bar-${d.position}`)
                .attr('x', d => x(d.name))
                .attr('y', d => y(0)) // Start from y=0 for transition
                .attr('width', x.bandwidth())
                .attr('height', 0) // Start with height 0 for transition
                .transition()
                .duration(700)
                .delay((d,i) => i * 20)
                .attr('y', d => y(d.value))
                .attr('height', d => height - y(d.value));
                
            // Add tooltips
            svg.selectAll('.bar-tooltip')
                .data(data)
                .join('rect')
                .attr('class', 'bar-tooltip')
                .attr('x', d => x(d.name))
                .attr('y', d => y(d.value))
                .attr('width', x.bandwidth())
                .attr('height', d => height - y(d.value))
                .attr('fill', 'transparent')
                .on('mouseover', function(event, d) {
                    // Show tooltip
                    const tooltip = d3.select('body').append('div')
                        .attr('class', 'd3-tooltip')
                        .style('opacity', 0);
                        
                    tooltip.transition()
                        .duration(200)
                        .style('opacity', 0.9);
                        
                    tooltip.html(`
                        <strong>${d.name}</strong><br/>
                        Position: ${d.position}<br/>
                        Home Runs: ${d.value}
                    `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
                })
                .on('mouseout', function() {
                    // Remove tooltip
                    d3.selectAll('.d3-tooltip').remove();
                });

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

    // --- Position Stats Chart ---
    function drawPositionStats() {
        const containerId = 'chart-position-stats';
        let apiUrl = '/api/position_stats';
        
        // Add position filter if active (though it may not be needed for this chart)
        if (selectedPositions.length > 0) {
            apiUrl += `?position=${selectedPositions.join(',')}`;
        }
        
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
                   .text("No position stats available.");
                return;
            }
            
            // Get selected stat
            const selectedStat = d3.select('#position-stat-select').property('value') || 'ops';
            
            // Create a bar chart for position stats
            // X axis: Positions
            const x = d3.scaleBand()
                .range([0, width])
                .domain(data.map(d => d.position))
                .padding(0.3);
                
            svg.append('g')
                .attr('transform', `translate(0,${height})`)
                .call(d3.axisBottom(x));
                
            // Y axis: Selected stat
            const y = d3.scaleLinear()
                .domain([0, d3.max(data, d => d[selectedStat]) * 1.1])
                .range([height, 0]);
                
            svg.append('g')
                .call(d3.axisLeft(y));
                
            // Bars
            svg.selectAll('.stat-bar')
                .data(data)
                .join('rect')
                .attr('class', d => `stat-bar bar-${d.position}`)
                .attr('x', d => x(d.position))
                .attr('y', d => y(0))
                .attr('width', x.bandwidth())
                .attr('height', 0)
                .transition()
                .duration(700)
                .delay((d,i) => i * 50)
                .attr('y', d => y(d[selectedStat]))
                .attr('height', d => height - y(d[selectedStat]));
                
            // Add tooltips
            svg.selectAll('.stat-tooltip')
                .data(data)
                .join('rect')
                .attr('class', 'stat-tooltip')
                .attr('x', d => x(d.position))
                .attr('y', d => y(d[selectedStat]))
                .attr('width', x.bandwidth())
                .attr('height', d => height - y(d[selectedStat]))
                .attr('fill', 'transparent')
                .on('mouseover', function(event, d) {
                    // Show tooltip
                    const tooltip = d3.select('body').append('div')
                        .attr('class', 'd3-tooltip')
                        .style('opacity', 0);
                        
                    tooltip.transition()
                        .duration(200)
                        .style('opacity', 0.9);
                        
                    const statName = d3.select('#position-stat-select option:checked').text();
                    
                    tooltip.html(`
                        <strong>${d.position}</strong><br/>
                        ${statName}: ${d[selectedStat]}
                    `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
                })
                .on('mouseout', function() {
                    // Remove tooltip
                    d3.selectAll('.d3-tooltip').remove();
                });
                
            // Add labels for X and Y axes
            svg.append("text")
                .attr("text-anchor", "middle")
                .attr("x", width / 2)
                .attr("y", height + margin.bottom - 25)
                .style("font-size", "12px")
                .text("Position");
                
            svg.append("text")
                .attr("text-anchor", "middle")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", -margin.left + 25)
                .style("font-size", "12px")
                .text(d3.select('#position-stat-select option:checked').text());
                
        }).catch(error => {
            console.error(`Error fetching data for position stats chart (${apiUrl}):`, error);
            svg.append("text").attr("x", width/2).attr("y", height/2).attr("text-anchor", "middle").text("Error loading data.");
        });
        
        // Add event listener for stat selection
        d3.select('#position-stat-select').on('change', drawPositionStats);
    }

    // --- Parallel Coordinates Chart ---
    function drawParallelCoordinates() {
        const containerId = 'chart-parallel-coords';
        let apiUrl = '/api/parallel_coords_data';
        
        // Add position filter if active
        if (selectedPositions.length > 0) {
            apiUrl += `?position=${selectedPositions.join(',')}`;
        }

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
                .attr("transform", d => `translate(${x(d.name)},0)`);

            // function to setup drag behavior
            function setupDragBehavior() {
                axes.call(d3.drag()
                    .subject(function(event, d) {
                        return {x: x(d.name)};
                    })
                    .on("start", function(event, d) {
                        if (!pcpDragMode) return; // only allow drag in drag mode
                        
                        // highlight active axis
                        d3.select(this).raise().classed("active", true);
                        
                        // store initial position
                        d.startPosition = x(d.name);
                    })
                    .on("drag", function(event, d) {
                        if (!pcpDragMode) return; // only allow drag in drag mode
                        
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
                        if (!pcpDragMode) return; // only allow drag in drag mode
                        
                        // remove highlight
                        d3.select(this).classed("active", false);
                        
                        // update the final dimension positions
                        updatePositions();
                        
                        // reset any temporary stored positions
                        delete d.startPosition;
                        delete d.currentPosition;
                    })
                );
            }

            // apply initial drag behavior
            setupDragBehavior();

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

            // add visual indicator for draggable axes (hidden by default, shown in drag mode)
            axes.append("text")
                .attr("class", "drag-icon")
                .attr("x", 0)
                .attr("y", -15)
                .attr("text-anchor", "middle")
                .attr("fill", "#777")
                .html("&#8597;") // double-headed arrow symbol
                .style("font-size", "12px")
                .style("cursor", "move")
                .style("opacity", 0); // hidden by default

            // Store the brush objects to enable/disable them
            const brushes = [];

            // add brush functionality to each axis for filtering
            axes.each(function(d) {
                const brush = d3.brushY()
                    .extent([[-8, 0], [8, height]])
                    .on("start", brushstart)
                    .on("brush", brushed)
                    .on("end", brushend);
                
                d3.select(this)
                    .append("g")
                    .attr("class", "brush")
                    .call(brush);
                
                brushes.push({dimension: d.name, brush: brush});
            });

            let brushSelections = {};

            // brush event handlers
            function brushstart() {
                if (pcpDragMode) return; // only allow brushing in brush mode
                
                foreground.each(function(d) {
                    d._initial_opacity = d3.select(this).style("opacity");
                });
            }

            function brushed(event, dimension) {
                if (pcpDragMode || !event.selection) return; // only allow brushing in brush mode
                
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

            function brushend(event) {
                if (pcpDragMode) return; // only allow brushing in brush mode
                
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

            // Add color scale based on position
            const colorScale = d3.scaleOrdinal()
                .domain(['1B', '2B', '3B', 'SS', 'OF', 'C', 'DH', 'P'])
                .range(['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#e74c3c', '#34495e']);
                
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
                .style("opacity", 0) // start invisible for transition
                .style("stroke", d => colorScale(d.position)); // color by position

            // add transition to reveal lines with slight stagger
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
                        Position: ${d.position}<br/>
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

            // function to toggle between brushing and dragging modes
            function toggleMode(isDragMode) {
                pcpDragMode = isDragMode;
                
                if (isDragMode) {
                    // enable drag mode
                    axes.classed("drag-enabled", true);
                    axes.selectAll(".drag-icon").style("opacity", 1);
                    axes.selectAll(".brush").classed("brush-disabled", true);
                    
                    // Clear any active brushes
                    brushSelections = {};
                    foreground.style("opacity", null);
                    
                    // Update toggle button
                    d3.select("#toggle-pcp-mode")
                        .classed("rearrange-mode", true)
                        .select(".mode-text")
                        .text("Axis Rearrangement Mode");
                } else {
                    // enable brush mode
                    axes.classed("drag-enabled", false);
                    axes.selectAll(".drag-icon").style("opacity", 0);
                    axes.selectAll(".brush").classed("brush-disabled", false);
                    
                    // Update toggle button
                    d3.select("#toggle-pcp-mode")
                        .classed("rearrange-mode", false)
                        .select(".mode-text")
                        .text("Brushing Mode");
                }
            }

            // Setup toggle button behavior
            d3.select("#toggle-pcp-mode").on("click", function() {
                toggleMode(!pcpDragMode);
            });

            // Initialize in brushing mode
            toggleMode(false);

            // Add position filter legend
            const legendContainer = svg.append("g")
                .attr("class", "pcp-legend")
                .attr("transform", `translate(${width - 120}, 0)`);
                
            legendContainer.append("text")
                .attr("x", 0)
                .attr("y", -5)
                .attr("text-anchor", "start")
                .style("font-size", "10px")
                .style("font-weight", "bold")
                .text("Position Legend");
                
            const positions = ['1B', '2B', '3B', 'SS', 'OF', 'C', 'DH', 'P'];
            
            legendContainer.selectAll(".legend-item")
                .data(positions)
                .enter()
                .append("g")
                .attr("class", "legend-item")
                .attr("transform", (d, i) => `translate(0, ${i * 15 + 10})`)
                .each(function(d) {
                    // Color square
                    d3.select(this).append("rect")
                        .attr("width", 10)
                        .attr("height", 10)
                        .attr("fill", colorScale(d));
                        
                    // Label
                    d3.select(this).append("text")
                        .attr("x", 15)
                        .attr("y", 8)
                        .style("font-size", "9px")
                        .text(d);
                });

        }).catch(error => {
            console.error(`error fetching data for parallel coordinates (${apiUrl}):`, error);
            svg.append("text")
                .attr("x", width/2)
                .attr("y", height/2)
                .attr("text-anchor", "middle")
                .text("error loading data.");
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

    // --- Initialize all charts ---
    function initializeDashboard() {
        initializePositionFilter();
        populateYearFilter(); // This will also call drawPlayerBarChart for the default year
        drawPositionStats();
        drawParallelCoordinates();
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
            drawPositionStats();
            drawParallelCoordinates(); // redraw pcp, preserving mode
        }, 250);
    });
});