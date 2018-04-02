/**
SJG Apr2018
Adapted from http://d3-legend.susielu.com/
*/
function colorLegend() {

  var dispatch = d3.dispatch("d3rendered");
  var numberSegments = 4;

    function legend() {
    // SJG TODO: implement

      dispatch.d3rendered();
    }

    legend.numberSegments = function(_) {
        if (!arguments.length) {
            return numberSegments;
        }
        numberSegments = _;
        return bar;
    };

    d3.rebind(legend, dispatch, "on");
    return legend;
}
