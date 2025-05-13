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

    // --- Initialize all charts ---
    function initializeDashboard() {
        populateYearFilter(); // This will also call drawPlayerBarChart for the default year
        // Other charts
        drawLineChart('chart-line', '/api/data/line');
        drawScatterPlot('chart-scatter', '/api/data/scatter');
        drawPieChart('chart-pie', '/api/data/pie');
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
