/**
SJG Mar2018
Adapted from https://github.com/sarahob/d3ProgressBar/blob/master/d3progressbar.js
*/
function progressBar() {

  var dispatch = d3.dispatch("d3rendered");
  var height = 20,
      svgSegmentWidth = 500,
      segmentWidth = 200,
      roundedCorners = 10,
      backgroundFill = 'white',
      currentStatus,
      parentId,
      states;

    function bar() {
      var svg = d3.select('#' + parentId)
        .append('svg')
        .attr('height', height)
        .attr('width', svgSegmentWidth)
        .attr('style', 'padding-top: 4px; padding-left: 1px')
        .attr('x', 0);

      // Background bubble
      svg.append('rect')
        .attr('class', 'bar-outline')
        .attr('rx', roundedCorners)
        .attr('ry', roundedCorners)
        .attr('fill', backgroundFill)
        .attr('height', 15)
        .attr('width', function(){
          return 200;
        })
        .attr('x', 0);

      // Progress bubble
      // svg.append('rect')
      //   .attr('class', 'progress-rect')
      //   .attr('width', 0)
      //   .attr('height', 15)
      //   .attr('rx', roundedCorners)
      //   .attr('ry' roundedCorners)
      //   .attr('fill', '85bdea');

      dispatch.d3rendered();
    }

    bar.moveProgressBar = function(frequency, flexId) {

      // Remove any existing progress bars
      var svg = d3.select('#' + parentId).select('svg')

      var freqNum = parseInt(frequency);
      if (freqNum != NaN && freqNum > 0)
      {
        var svg = d3.select('#' + parentId).select('svg');

        var bar = svg.append('rect')
            .attr('class', 'progress-rect')
            .attr('width', 0)
            .attr('height', 15)
            .attr('rx', roundedCorners)
            .attr('ry', roundedCorners)
            .attr('fill', '#85bdea');

        // debugger;
        bar.transition()
            .duration(700)
            .attr('width', function() {
                return freqNum * 2;
            });
      }
      // Otherwise remove colored bar
      else {
        var svg = d3.select('#' + parentId).select('svg');
        var existingRect = svg.select('.progress-rect');
        if (existingRect) {
          // Fade color out
          existingRect.transition()
          .duration(700)
          .attr('width', 0);

          // Remove component so we can redraw it
          existingRect.remove();
        }
      }
    }

    bar.height = function(_) {
        if (!arguments.length) {
            return height;
        }
        height = _;
        return bar;
    };

    bar.svgSegmentWidth = function(_) {
        if (!arguments.length) {
            return svgSegmentWidth;
        }
        svgSegmentWidth = _;
        return bar;
    };

    bar.segmentWidth = function(_) {
        if (!arguments.length) {
            return segmentWidth;
        }
        segmentWidth = _;
        return bar;
    };

    bar.roundedCorners = function(_) {
        if (!arguments.length) {
            return roundedCorners;
        }
        roundedCorners = _;
        return bar;
    };

    bar.backgroundFill = function(_) {
        if (!arguments.length) {
            return backgroundFill;
        }
        backgroundFill = _;
        return bar;
    };

    bar.currentStatus = function(_) {
        if (!arguments.length) {
            return currentStatus;
        }
        currentStatus = _;
        return bar;
    };

    bar.parentId = function(_) {
      if (!arguments.length) {
        return parentId;
      }
      parentId = _;
      return bar;
    };

    bar.states = function(_) {
      if (!arguments.length) {
        return states;
      }
      states = _;
      return bar;
    };

    d3.rebind(bar, dispatch, "on");
    return bar;
}
