/**
SJG Mar2018
Adapted from https://bl.ocks.org/mbostock/2368837

Scales to two columns if numBars not provided
*/

function barChart() {

  var dispatch = d3.dispatch("d3rendered");

  // Instance variables
  var chartHeight = 120,
      svgSegmentWidth = 500,
      chartWidth = 185,
      roundedCorners = 10,
      numBars = 6,  // SJG TODO: might make this change depending on how columns look
      backgroundFill = 'white',
      blueFill = '#85bdea',
      parentId;

  // Draw outlines
  function chart() {

    var margin = {top: 5, right: 5, bottom: 5, left: 5};
    width = chartWidth + (numBars*5) - margin.left - margin.right,
    height = chartHeight - margin.top - margin.bottom;

    var x = d3.scale.linear()
        .range([0, width]);

    var y = d3.scale.ordinal()
        .rangeRoundBands([0, height], 0.1);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .tickSize(1)
        .tickPadding(6);

    var svg = d3.select('#' + parentId)
                .append('svg')
                .attr('height', height)
                .attr('width', width);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + x(0) + ",0)")
        .call(yAxis);

    dispatch.d3rendered();
  }

  // Fill chart method
  var fillChart = function(dataMap) {
    // SJG TODO: scale x-axis to number of entries in map - should be 2, 3, or 6

    var progBar = d3.select('#' + parentId).select('svg').select('.progress-rect');

    // x.domain(d3.extent(data, function(d) { return d.value; })).nice();
    // y.domain(data.map(function(d) { return d.key; });

    svg.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", function(d) { return "bar bar--" + (d.value < 0 ? "negative" : "positive"); })
        .attr("x", function(d) { return x(Math.min(0, d.value)); })
        .attr("y", function(d) { return y(d.name); })
        .attr("width", function(d) { return Math.abs(x(d.value) - x(0)); })
        .attr("height", y.rangeBand());
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
/*
var margin = {top: 20, right: 30, bottom: 40, left: 30},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

var x = d3.scale.linear()
    .range([0, width]);

var y = d3.scale.ordinal()
    .rangeRoundBands([0, height], 0.1);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .tickSize(0)
    .tickPadding(6);

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

d3.tsv("data.tsv", type, function(error, data) {
  x.domain(d3.extent(data, function(d) { return d.value; })).nice();
  y.domain(data.map(function(d) { return d.name; }));

  svg.selectAll(".bar")
      .data(data)
    .enter().append("rect")
      .attr("class", function(d) { return "bar bar--" + (d.value < 0 ? "negative" : "positive"); })
      .attr("x", function(d) { return x(Math.min(0, d.value)); })
      .attr("y", function(d) { return y(d.name); })
      .attr("width", function(d) { return Math.abs(x(d.value) - x(0)); })
      .attr("height", y.rangeBand());

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + x(0) + ",0)")
      .call(yAxis);
});

function type(d) {
  d.value = +d.value;
  return d;
}
*/
