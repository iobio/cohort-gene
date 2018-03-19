/**
SJG Mar2018
Adapted from https://bl.ocks.org/mbostock/2368837

Scales to two columns if numBars not provided
*/
function barChart() {

  var dispatch = d3.dispatch("d3rendered");

  // Instance variables
  var height = 160,
      width = 220,
      roundedCorners = 10,
      numBars = 6,  // SJG TODO: might make this change depending on how columns look
      backgroundFill = 'white',
      blueFill = '#85bdea',
      parentId;

  // Draw outlines
  function chart() {

    var offsetHeight = height - 40;

    var svg = d3.select('#' + parentId).append('svg')
                .attr('height', height)
                .attr('width', "100%")
                .attr('style', "padding-left: 15%; padding-top: 2%");  // SJG this needs to change dynamically

    // List of maps
    var data = [];
    data.push({label: 'hom ref', value: 2});
    data.push({label: 'het', value: 4});
    data.push({label: 'hom alt', value: 3});
    data.push({label: 'no call', value: 1});

    var x = d3.scale.ordinal().rangeRoundBands([0, width], .05);
    var y = d3.scale.linear().range([offsetHeight, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom, center");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .ticks(data.length);

    x.domain(data.map(function(d) { return d.label; }));
    y.domain([0, d3.max(data, function(d) { return d.value; })]);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + offsetHeight + ")")  // Controls where line drawn relative to y-axis/display labels on x-axis
        .call(xAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.3em")
        .attr("transform", "rotate(-35)");

    svg.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + x(0) + ",0)")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6) // Distance label is from y-axis
        .attr("dx", "-3em")
        .attr("dy", "-3em")
        .style("text-anchor", "end")
        .text("# Samples");

    svg.selectAll("bar")
        .data(data)
        .enter().append("rect")
        .style("fill", "steelblue")
        .attr("x", function(d) { return x(d.label); })
        .attr("width", x.rangeBand())
        .attr("y", function(d) { return y(d.value); })
        .attr("height", function(d) { return offsetHeight - y(d.value); });

    dispatch.d3rendered();
  }

  // Fill chart method
  var fillChart = function(dataMap) {
    // SJG TODO: scale x-axis to number of entries in map - should be 2, 3, or 6

    var progBar = d3.select('#' + parentId).select('svg').select('.progress-rect');
    // x.domain(d3.extent(data, function(d) { return d.value; })).nice();
    // y.domain(data.map(function(d) { return d.key; });

    // svg.selectAll(".bar")
    //     .data(data)
    //     .enter().append("rect")
    //     .attr("class", function(d) { return "bar bar--" + (d.value < 0 ? "negative" : "positive"); })
    //     .attr("x", function(d) { return x(Math.min(0, d.value)); })
    //     .attr("y", function(d) { return y(d.name); })
    //     .attr("width", function(d) { return Math.abs(x(d.value) - x(0)); })
    //     .attr("height", y.rangeBand());
  }

  // Getters & setters
  chart.fillChart = function(_) {
      if (!arguments.length) {
          return fillChart;
      }
      fillChart = _;
      return chart;
  };

  chart.parentId = function(_) {
    if (!arguments.length) {
      return parentId;
    }
    parentId = _;
    return chart;
  };

  chart.numBars = function(_) {
    if (!arguments.length) {
      return numBars;
    }
    numBars = _;
    return chart;
  };

  d3.rebind(chart, dispatch, "on");
  return chart;
}
