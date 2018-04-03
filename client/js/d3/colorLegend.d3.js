/**
SJG Apr2018
*/
function colorLegend() {

  var dispatch = d3.dispatch("d3rendered");
  var numberSegments = 4,
      borderRadius = 1,
      height = 75,
      variantHeight = 12;

    function legend() {
      // Add svg
      var svg = d3.select('#enrichmentColorLegend')
      .append('svg')
      .attr('height', height)
      .attr('width', '100%');

      // Add rectangles
      svg.append('rect')
        .attr('rx', borderRadius)
        .attr('ry', borderRadius)
        .attr('height', variantHeight)
        .attr('width', variantHeight)
        .attr('fill', '#a9ccca')
        .attr('x', 50)
        .attr('y', 0);

      svg.append('rect')
        .attr('rx', borderRadius)
        .attr('ry', borderRadius)
        .attr('height', variantHeight)
        .attr('width', variantHeight)
        .attr('fill', '#6ca7a5')
        .attr('x', 50)
        .attr('y', 15);

      svg.append('rect')
        .attr('rx', borderRadius)
        .attr('ry', borderRadius)
        .attr('height', variantHeight)
        .attr('width', variantHeight)
        .attr('fill', '#518785')
        .attr('x', 50)
        .attr('y', 30);

      svg.append('rect')
        .attr('rx', borderRadius)
        .attr('ry', borderRadius)
        .attr('height', variantHeight)
        .attr('width', variantHeight)
        .attr('fill', '#3b6261')
        .attr('x', 50)
        .attr('y', 45);

      // Add category text
      svg.append('text')
        .attr('x', 65)
        .attr('y', 10)
        .style('font-size', '12px')
        .text("0 - 25%");

      svg.append('text')
        .attr('x', 65)
        .attr('y', 25)
        .style('font-size', '12px')
        .text("25 - 50%");

      svg.append('text')
        .attr('x', 65)
        .attr('y', 40)
        .style('font-size', '12px')
        .text("50 - 75%");

      svg.append('text')
        .attr('x', 65)
        .attr('y', 55)
        .style('font-size', '12px')
        .text("75 - 100%");

      dispatch.d3rendered();
    }

    legend.numberSegments = function(_) {
        if (!arguments.length) {
            return numberSegments;
        }
        numberSegments = _;
        return legend;
    };

    d3.rebind(legend, dispatch, "on");
    return legend;
}
