/**
SJG Mar2018
Adapted from http://bl.ocks.org/d3noob/8952219'

This is a bar chart that initially displays just the graph outline, then populates when fillChart is called,
to allow a dynamic rendering of chart fill.

NOTE: initial dataMap and newDataMap must contain an IDENTICAL number of entries IN THE SAME EXACT ORDER
*/
function barChart() {

  var dispatch = d3.dispatch("d3rendered");

  // Instance variables
      var parentId,
      barColor = '#6c94b7',
      comingSoonFlag = false;

  // Private variables (can be made public if necessary except for _x and _y)
  var _x, _y,
      height = 160,
      dataHeight = height - 40,
      width = 220,
      roundedCorners = 2,
      yValueMax = 5;

  /* Takes in array of maps with {label:, value:} entries and draws bars based on provided values.
     Providing an empty data array will zero out all bars.
     NOTE: newDataMap MUST have an identical number of entries as the original dataMap, in the exact same order
   */

  var fillChart = function(newDataMap) {
    var svg = d3.select('#' + parentId).select('svg');

    // Reset all columns to 0 if nothing in map
    if (newDataMap == null || newDataMap.length == 0) {
      svg.selectAll("rect")
          .transition()
          .duration(700)
          .attr('y', dataHeight)
          .attr('height', function(d) { return dataHeight - _y(0); });
    }
    // SJG TODO: need to adjust y-axis labels
    else {
      newDataMap.forEach(function(dataBar) {
        var barId = "#bar_" + dataBar.label.replace(' ', '_');
        var barHeight = dataBar.value ? dataBar.value : 0;
        var column = svg.select(barId);

        if (column) {
          column.transition()
                .duration(700)
                .style('fill', barColor)
                .attr("y", function(d) { return _y(barHeight); })
                .attr('height', function(d) { return dataHeight - _y(barHeight); });
        }
      })
    }
  };

  /* Draws outline of chart and axes */
  function chart(dataMap) {
    var svg = d3.select('#' + parentId).append('svg')
                .attr('height', height)
                .attr('width', "100%")
                .attr('style', "padding-left: 15%; padding-top: 2%");  // SJG TODO this needs to change dynamically?

    // Define axes data
    _x = d3.scale.ordinal().rangeRoundBands([0, width], .05);
    _y = d3.scale.linear().range([dataHeight, 0]);

    var xAxis = d3.svg.axis()
        .scale(_x)
        .orient("bottom, center");

    var yAxis = d3.svg.axis()
        .scale(_y)
        .orient("left")
        .ticks(yValueMax);    // One tick per number - can be scaled up/down as needed by multiplying/dividing

    _x.domain(dataMap.map(function(d) { return d.label; }));
    _y.domain([0, yValueMax]);

    // Draw axes and labels
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + dataHeight + ")")
        .call(xAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.3em")
        .attr("transform", "rotate(-35)");

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6) // Distance label is from y-axis
        .attr("dx", "-3em")
        .attr("dy", "-3em")
        .style("text-anchor", "end")
        .text("# Samples");

    if (comingSoonFlag) {
      svg.append("g")
          .attr("class", "y axis")
          .append("text")
          .attr("transform", "rotate(-35)")
          .attr("y", 5) // Distance label is from y-axis
          .attr("dx", "7em")
          .attr("dy", "6em")
          .style('font-size', '18px')
          .style("text-anchor", "end")
          .style("fill", barColor)
          .text("COMING SOON");
    }


    // Draw bars
    if (dataMap.length > 0) {
      svg.selectAll("bar")
          .data(dataMap)
          .enter()
          .append("rect")
          .attr('id', function(d) {return 'bar_' + d.label.replace(' ', '_'); })  // Label each rect so we can find it later
          .attr('rx', roundedCorners)
          .attr('ry', roundedCorners)
          .style("fill", "white")
          .attr("x", function(d) { return _x(d.label); })
          .attr("width", _x.rangeBand())
          .attr("y", function(d) { return _y(d.value); })
          .attr("height", function(d) { return dataHeight - _y(d.value); });
    }

    dispatch.d3rendered();
  }

  /* Getters and setters */
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

  chart.barColor = function(_) {
    if (!arguments.length) {
      return barColor;
    }
    barColor = _;
    return chart;
  };

  chart.comingSoonFlag = function(_) {
    if (!arguments.length) {
      return comingSoonFlag;
    }
    comingSoonFlag = _;
    return chart;
  };

  d3.rebind(chart, dispatch, "on");
  return chart;
}
