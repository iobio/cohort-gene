function scaledVariantD3() {
    var dispatch = d3.dispatch("d3brush", "d3rendered", "d3outsideclick", "d3click", "d3mouseover", "d3mouseout", "d3glyphmouseover", "d3glyphmouseout", "d3variantsselected");

    // dimensions
    var yAxisWidth = 45;
    var yAxisPadding = 4;
    var margin = {top: 0, right: 2, bottom: 0, left: 2},
        width = 800,
        height = 250;

    // scales
    var x = d3.scale.linear(),
        y = d3.scale.linear();
    // axis
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("top")
        .tickFormat(tickFormatter);
    // variables
    var borderRadius = 1,
        variantHeight = 8,    // Default in card assignment is 8
        regionStart = undefined,
        regionEnd = undefined,
        showXAxis = false,
        xTickFormat = null,
        heightPercent = "100%",
        widthPercent = "100%",
        showBrush = false,
        verticalLayers = 1,
        verticalPadding = 4,
        verticalScaleFactor = 0.5,
        posVertLayers = 1,
        negVertLayers = 1,
        maxSubLevel = 0,
        vertLevelRange = [],
        showTransition = true,
        lowestWidth = 3,      // SJG NOTE: pretty sure this isn't used to size variants or stack them
        dividerLevel = null,
        container = null,
        clazz = null,
        selectedVariants = [],
        availableVertSpace = 0;

    //  options
    var defaults = {};

    var tooltipHTML = function (variant) {
        return (variant.type + ': '
            + variant.start
            + (variant.end > variant.start + 1 ? ' - ' + variant.end : ""));
    }


    function getSymbol(d, i) {
        if (d.type.toUpperCase() === 'DEL') {
            return 'triangle-up';
        } else if (d.type.toUpperCase() === 'INS') {
            return 'circle';
        } else if (d.type.toUpperCase() === 'COMPLEX') {
            return 'diamond';
        }
    }

    let displayBrush = function() {

        // Remove any old brush
        container.select('svg').selectAll("g.y.brush").remove();

        // Create new brush object
        let brush = d3.svg.brush()
            .y(y)
            // Show resize arrows
            .on('brush', function () {
                container.selectAll("svg").selectAll(".g.y.brush .resize line")
                    .style("visibility", "visible");
                container.selectAll("svg").selectAll(".g.y.brush .resize path")
                    .style("visibility", "visible");
            })
            .on('brushend', function () {
                let extentRect = d3.select("g.brush rect.extent");
                let yExtent = +extentRect.attr("y");

                extentRect.attr("y", yExtent);

                // Hide resize arrows if not a real area
                if (brush.empty()) {
                    container.selectAll("svg").selectAll(".g.y.brush .resize line")
                        .style("visibility", "hidden");
                    container.selectAll("svg").selectAll(".g.y.brush .resize path")
                        .style("visibility", "hidden");
                }

                // Switch back any variants selected from last time
                if (selectedVariants.length > 0) {
                    switchSelectedColorScheme(false);
                }

                // Get variants encompassed by brush box
                let yBottom = yExtent;
                let yTop = +(yExtent + (+extentRect.attr("height")));
                let selectedVarIds = [];

                let candidateVars = container.select('svg').selectAll('.variant.filtered');
                if (candidateVars.length > 0 && candidateVars[0].length === 0) {
                    candidateVars = container.select('svg').selectAll('.variant');
                }

                selectedVariants = candidateVars.filter(function (variant) {
                    // Check to see if variant y coordinate b/w box top and bottom
                    if (y(variant.adjustedLevel) <= yTop && y(variant.adjustedLevel) >= yBottom) {
                        selectedVarIds.push(variant.id);
                        return true;
                    }
                    else {
                        return false;
                    }
                });

                // Only show modal if we've captured variants in our selection box
                if (selectedVarIds.length > 0) {
                    // Change coloring on selected variants
                    switchSelectedColorScheme(true);

                    // Get position info to send into modal
                    let graphDimensions = container.select('svg').select('g.group').node().getBoundingClientRect();
                    let zoomBoxDimensions = extentRect.node().getBoundingClientRect();
                    // Compare height of zoom to graph to determine drawing box above or below selection
                    let drawBelow = false;
                    let yStart = yBottom;
                    if (zoomBoxDimensions.height < (graphDimensions.height/2)) {
                        drawBelow = true;
                        yStart = yTop;
                    }
                    dispatch.d3variantsselected(selectedVarIds, (zoomBoxDimensions.x-1), yStart, drawBelow, (zoomBoxDimensions.width+1));
                }
            });

        // Set area for selection
        let theBrush = container.select('svg').selectAll("g.y.brush").data([0]);

        // Draw actual brush with preset coordinates
        theBrush.enter().append("g")
            .attr("class", "y brush")
            .call(brush)
            .selectAll("rect")
            .attr('x', 0)
            .attr("width", width + yAxisPadding);

        // Draw resize arrows
        theBrush.selectAll(".resize")
            .append("line")
            .style("visibility", "visible")
            .attr("y2", height);
        theBrush.selectAll(".resize.e rect")
            .attr("y0", 0);
        theBrush.selectAll(".resize")
            .append("path")
            .style("visibility", "visible")
            .attr("d", d3.svg.symbol().type("triangle-up").size(30))
            .attr("transform", function (d, i) {
                return i ? "translate(" + (width + 1) + ",0) rotate(-90)" : "translate(" + (width + 1) + ",0) rotate(-90)";
            });
    };


    let hideBrush = function() {
        // Get rid of brushing area
        if (container != null) {
            let svg = container.select('svg');
            if (svg != null) {
                let brush = svg.selectAll("g.y.brush");
                brush.remove();
            }

            if (selectedVariants.length > 0) {
                switchSelectedColorScheme(false);
            }

            // Reset variants
            selectedVariants = [];
        }
    };

    var showCircle = function (d, svgContainer, indicateMissingVariant, pinned) {
        // Find the matching variant
        var matchingVariant = null;
        svgContainer.selectAll(".variant").each(function (variant, i) {
            if (d.start === variant.start
                && d.end === variant.end
                && d.ref === variant.ref
                && d.alt === variant.alt
                && d.type.toLowerCase() === variant.type.toLowerCase()) {

                if (variant.zygosity != null && variant.zygosity.toLowerCase() === 'homref') {
                    // we want to show an "x" for homozygous reference variants
                    // instead of a circle
                } else {
                    matchingVariant = variant;
                }
            }
        });

        // Get the x for this position
        if (matchingVariant) {
            var mousex = x(matchingVariant.start);    // Have to offset this by y-axis
            var mousey = y(matchingVariant.adjustedLevel);

            var circleClazz = pinned ? '.pinned.circle' : '.hover.circle';
            var circle = svgContainer.select(circleClazz);
            circle.transition()
                .duration(200)
                .style("opacity", 1);
            circle.attr("cx", mousex + margin.left + 2)
                .attr("cy", mousey + margin.top + 4);


            var matrix = circle.node()
                .getScreenCTM()
                .translate(+circle.node().getAttribute("cx"), +circle.node().getAttribute("cy"));
            var boundRect = circle.node().getBoundingClientRect();

            // Firefox doesn't consider the transform (slideout's shift left) with the getScreenCTM() method,
            // so instead the app will use getBoundingClientRect() method instead which does take into consideration
            // the transform.
            matchingVariant.screenX = d3.round(boundRect.left + (boundRect.width / 2));

            // Since the body is vertically scrollable, we need to calculate the y by offsetting to a height of the
            // scroll position in the container.
            matchingVariant.screenY = d3.round((window.pageYOffset + matrix.f + margin.top) - boundRect.height);

            //showCoordinateFrame(matchingVariant.screenX);

        } else if (indicateMissingVariant) {
            var mousex = x(d.start - yAxisWidth);
            var mousey = height - verticalPadding;
            var arrowClazz = pinned ? 'g.pinned.arrow' : 'g.hover.arrow';
            var garrow = svgContainer.select(arrowClazz);
            garrow.attr("transform", "translate(" + (mousex + margin.left - variantHeight / 2) + "," + (mousey + margin.top - 6) + ")");
            garrow.selectAll('.arrow').transition()
                .duration(200)
                .style("opacity", 1);

            // svgContainer.select(".circle").classed("emphasize", false);
        }


        return matchingVariant;
    };

    var hideCircle = function (svgContainer, pinned) {
        var circleClazz = pinned ? '.pinned.circle' : '.hover.circle';
        var pinnedArrowClazz = 'g.pinned.arrow';
        var hoverArrowClazz  = 'g.hover.arrow';

        svgContainer.select(circleClazz).transition()
            .duration(500)
            .style("opacity", 0);
        if (pinned) {
            svgContainer.select(pinnedArrowClazz).selectAll(".arrow").transition()
                .duration(500)
                .style("opacity", 0);
        }
        if (!pinned) {
            svgContainer.select(hoverArrowClazz).selectAll(".arrow").transition()
                .duration(500)
                .style("opacity", 0);
        }
    }

    var clearVariants = function (svgContainer) {
        svgContainer.remove();
    }

    var switchSelectedColorScheme = function (zoomMode) {
        if (zoomMode) {
            // Remove impact or enrichment coloring
            selectedVariants.classed('impact_HIGH', false);
            selectedVariants.classed('impact_MODERATE', false);
            selectedVariants.classed('impact_MODIFIER', false);
            selectedVariants.classed('impact_LOW', false);
            selectedVariants.classed('impact_none', false);

            // Turn on selected coloring
            selectedVariants.classed('zoom_selected', true);
        } else {
            // Turn off selected coloring
            selectedVariants.classed('zoom_selected', false);

            // Turn impact coloring back on
            let highVars = selectedVariants.filter(".HIGH");
            highVars.classed('impact_HIGH', true);
            let moderateVars = selectedVariants.filter(".MODERATE");
            moderateVars.classed('impact_MODERATE', true);
            let modifierVars = selectedVariants.filter(".MODIFIER");
            modifierVars.classed('impact_MODIFIER', true);
            let lowVars = selectedVariants.filter(".LOW");
            lowVars.classed('impact_LOW', true);
            let noVars = selectedVariants.filter(".NONE");
            noVars.classed('impact_none', true);
        }
    };

    /* Takes in a list of filter classes. If a variant contains any of them, it will be hidden.
    *  Takes in a filter cutoff object that a variant must meet or be lower than. */
    var filterVariants = function(filterClasses, svgContainer) {
        let allVariants = svgContainer.selectAll(".variant");

        // Add filtered class to all variants
        allVariants.classed({'filtered': true});

        // If we're out of active filters, display all variants
        if (filterClasses.length === 0) {
            allVariants.style("opacity", 1);
            allVariants.style("pointer-events", 'auto');
        }

        // Remove filtered class for any variants that contain the given class criteria
        filterClasses.forEach((filterClass) => {
            allVariants.filter(filterClass).classed({'filtered': false});
            allVariants.style("pointer-events", 'none');
        });

        // Include previously filtered variants into the equation
        let filteredVars = svgContainer.selectAll('.filtered');

        // Remove filtered class for any variants that don't meet cutoffs
        let cutoffs = Object.keys(filterCutoffs);
        if (cutoffs.length > 0) {
            filteredVars.each(function (d, i) {
                cutoffs.forEach((cutoff) => {
                    if (d[cutoff] > filterCutoffs[cutoff]) {
                        // TODO: check to make sure this actually works
                        d.classed({'filtered': false});
                        d.style('pointer-events', 'none');
                    }
                })
            });
        }

        // Re-check for all filtered variants
        filteredVars = svgContainer.selectAll('.filtered');

        // Hide all variants
        allVariants.style("opacity", 0)
            .style("pointer-events", "none")
            .transition()
            .duration(1000);

        // Reveal variants that pass filter
        filteredVars.style("opacity", 1)
            .style("pointer-events", "auto");

        if (filteredVars) {
            return filteredVars[0].length === 0;
        } else {
            return false;
        }
    };

    /* Takes in ONLY a single class name (aka .snp or .impact_HIGH) and removes
    *  filtered class on any items that have the given class. To be used immediately
    *  prior to filterVariants method. */
    var unfilterVariants = function(filterClassName, svgContainer) {
        // Remove filter status for vars corresponding to the given filter name
        let filterClassedVars = svgContainer.selectAll(filterClassName);
        filterClassedVars.classed({'filtered': false});
    };

    /* Takes in a single cutoff criteria and removes filtered class. To be used
    *  immediately prior to filterVariants. */
    var unfilterVariantsByCutoff = function(filterCutoffName, svgContainer) {

    };

    /* Returns true if selected variant passes filter and is visible. */
    var checkForSelectedVar = function(selectedVarId, svgContainer) {
        let stillVisible = false;
        svgContainer.selectAll('.filtered').each(function(d, i) {
           if (d.id === selectedVarId) {
               stillVisible = true;
           }
        });
        return stillVisible;
    };

    var switchColorScheme = function (enrichmentMode, svgContainer) {
        let variants = svgContainer.selectAll(".variant");
        let varsToSwitch = variants;
        if (selectedVariants.length > 0) {
            let selectedIds = {};
            selectedVariants[0].forEach(function (v) {
                selectedIds[v.id] = true;
            });
            varsToSwitch = variants.filter(function (v) {
                return selectedIds[v.id] == null;
            })
        }

        let highVars = varsToSwitch.filter(".iHIGH");
        let moderateVars = varsToSwitch.filter(".iMODERATE");
        let modifierVars = varsToSwitch.filter(".iMODIFIER");
        let lowVars = varsToSwitch.filter(".iLOW");
        let noVars = varsToSwitch.filter(".iNONE");

        highVars.classed({
            'impact_HIGH': true
        });
        moderateVars.classed({
            'impact_MODERATE': true
        });
        modifierVars.classed({
            'impact_MODIFIER': true
        });
        lowVars.classed({
            'impact_LOW': true
        });
        noVars.classed({
            'impact_none': true
        });

        // let enrichUp = varsToSwitch.filter(".eUP");
        // let enrichDown = varsToSwitch.filter(".eDOWN");
        // let enrichLow = varsToSwitch.filter(".eLOW");
        // let enrichNotApplic = varsToSwitch.filter(".eNA");

        // if (enrichmentMode) {
        //     // Remove impact color scheme
        //     highVars.classed({
        //         'impact_HIGH': false
        //     });
        //     moderateVars.classed({
        //         'impact_MODERATE': false
        //     });
        //     modifierVars.classed({
        //         'impact_MODIFIER': false
        //     });
        //     lowVars.classed({
        //         'impact_LOW': false
        //     });
        //     noVars.classed({
        //         'impact_none': false
        //     });
        //
        //     // Turn on enrichment color scheme
        //     enrichUp.classed({
        //         'enrichment_subset_UP': true
        //     });
        //     enrichDown.classed({
        //         'enrichment_subset_DOWN': true
        //     });
        //     enrichLow.classed({
        //         'enrichment_LOW': true
        //     });
        //     enrichNotApplic.classed({
        //         'enrichment_NA': true
        //     });
        // }

        //else {
            // // Turn off enrichment color scheme
            // enrichUp.classed({
            //     'enrichment_subset_UP': false
            // });
            // enrichDown.classed({
            //     'enrichment_subset_DOWN': false
            // });
            // enrichLow.classed({
            //     'enrichment_LOW': false
            // });
            // enrichNotApplic.classed({
            //     'enrichment_NA': false
            // });
            // Turn on impact color scheme
            // highVars.classed({
            //     'impact_HIGH': true
            // });
            // moderateVars.classed({
            //     'impact_MODERATE': true
            // });
            // modifierVars.classed({
            //     'impact_MODIFIER': true
            // });
            // lowVars.classed({
            //     'impact_LOW': true
            // });
            // noVars.classed({
            //     'impact_none': true
            // });
        //}
    };

    function chart(selection, options) {
        let topLayer = posVertLayers;
        let bottomLayer = 0.1;  // Gives a bit of space on bottom
        let totalLayers = topLayer + bottomLayer;

        if (availableVertSpace !== 0) {
            height = availableVertSpace;
        } else {
            height = totalLayers * 5 * (variantHeight + verticalPadding);    // Scale this to main layers size
            height += (variantHeight + verticalPadding);
            //if (height < 500) height = 500;   // Set a minimum
            if (height > 750) height = 750;   // Set a maximum
        }

        // Account for the margin when we are showing the xAxis
        if (showXAxis) {
            height += margin.bottom;
        }
        if (dividerLevel) {
            height += (variantHeight + verticalPadding);
        }
        var dividerY = dividerLevel ? height - ((dividerLevel + 1) * (variantHeight + verticalPadding)) : null;

        // Determine inner height (w/o margins)
        var innerHeight = height - margin.top - margin.bottom;

        selection.each(function (data) {
            // set svg element
            container = d3.select(this).classed('ibo-variant', true);
            container.selectAll("svg").remove();

            if (data && data.length > 0 && data[0] && data[0].features && data[0].features.length > 0) {

                // Update the x-scale.
                if (regionStart && regionEnd) {
                    x.domain([regionStart, regionEnd]);
                } else {
                    x.domain([d3.min(data, function (d) {
                        return d3.min(d.features, function (f) {
                            return parseInt(f.start);
                        })
                    }),
                        d3.max(data, function (d) {
                            return d3.max(d.features, function (f) {
                                return parseInt(f.end);
                            })
                        })
                    ]);

                }
                x.range([0, width - margin.left - margin.right]);

                // Update the y-scale.
                y.domain([-0.1, topLayer]);
                y.range([innerHeight, 0]);

                // Find out the smallest width interval between variants on the x-axis
                // for each level. For a single nucleotide variant, what is
                // the standard width we would like to show given the minimum
                // distance between all variants.
                let minWidth = 6;

                for (let l = 0; l < totalLayers; l += 0.1) {  // We'll never be below 0
                    // For each row in array (per variant set; only one variant set)
                    let minInterval = null;
                    data.forEach(function (d) {
                        // For each variant.  Calculate the distance on the screen
                        // between the 2 variants.
                        for (let i = 0; i < d.features.length - 1; i++) {
                            let currAdjLevel = Math.round(d.features[i].adjustedLevel * 100) / 100;
                            if (currAdjLevel === l) {
                                // find the next feature at the same level
                                var nextPos = null;
                                for (let next = i + 1; next < d.features.length; next++) {
                                    let nextAdjLevel = Math.round(d.features[next].adjustedLevel * 100) / 100;
                                    if (nextAdjLevel === l) {
                                        nextPos = next;
                                        break;
                                    }
                                }
                                if (nextPos) {
                                    let interval = Math.round(x(d.features[nextPos].start) - x(d.features[i].end));
                                    interval = Math.max(interval, 1);
                                    if (minInterval == null || interval < minInterval) {
                                        minInterval = interval;
                                    }
                                } else {
                                    // We couldn't find a second position at the same
                                    // level
                                }
                            }
                        }
                        // Once we know the smallest interval for a level, compare it
                        // so that we can keep track of the smallest between all levels.
                        // This will determine the width of a snp.
                        if (minInterval != null && minInterval < minWidth) {
                            minWidth = minInterval;
                        }
                    });
                }

                // TODO:  Come up with a better pileup algorithm to ensure
                // there is at least one pixel between each variant.  This
                // works if the variant can be 1 pixel width, but we really want
                // to signify a square for snps.  For now, try out
                // a rectangle with a min width of 3.
                //minWidth = Math.max(minWidth, lowestWidth);

                // TODO:  Need to review this code!!!  Added for exhibit
                minWidth = variantHeight;

                var symbolScaleCircle = d3.scale.ordinal()
                    .domain([3, 4, 5, 6, 7, 8, 10, 12, 14, 16])
                    .range([9, 15, 25, 38, 54, 58, 70, 100, 130, 260]);
                var symbolSizeCircle = symbolScaleCircle(minWidth);

                var symbolScale = d3.scale.ordinal()
                    .domain([3, 4, 5, 6, 7, 8, 10, 12, 14, 16])
                    .range([9, 15, 20, 25, 32, 58, 70, 100, 130, 160]);

                var symbolSize = symbolScale(minWidth);

                // Select the svg element, if it exists.
                var svg = container.selectAll("svg").data([0]);
                svg.enter()
                    .append("svg")
                    .attr("width", widthPercent)
                    .attr("height", heightPercent)
                    .attr('viewBox', (-yAxisWidth - yAxisPadding) + " 0 " + parseInt(width + margin.left + margin.right + yAxisWidth + yAxisPadding) + " " + parseInt(height + margin.top + margin.bottom))
                    .attr("preserveAspectRatio", "none")
                    .append("g")
                    .attr("class", "group")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                svg.on("click", function(d) {
                    dispatch.d3outsideclick(null);
                });

                var g = svg.select("g.group");

                // The chart dimensions could change after instantiation, so update viewbox dimensions
                // every time we draw the chart.
                d3.select(this).selectAll("svg")
                    .filter(function () {
                        return this.parentNode === container.node();
                    })
                    .attr('viewBox', (-yAxisWidth - yAxisPadding) + " 0 " + parseInt(width + margin.left + margin.right + yAxisWidth + yAxisPadding) + " " + parseInt(height + margin.top + margin.bottom));



                // Add grouping for flagged variants
                svg.select("g.flagged-variants").remove();
                svg.append("g")
                    .attr("class", "flagged-variants");


                // Create the X-axis.
                g.selectAll(".x.axis").remove();
                if (showXAxis) {
                    g.append("g").attr("class", "x axis").attr("transform", "translate(0," + (y.range()[0] + margin.bottom) + ")");
                }

                // Create the Y-axis.
                svg.selectAll(".y.axis").remove();

                var yAxis = d3.svg.axis()
                    .orient("left")
                    .scale(y)
                    .ticks(posVertLayers)
                    .tickFormat(function (d) {
                        return (y.tickFormat(5, d3.format(""))(d))
                    });

                // Draw y-axis using axis style class
                svg.append("g").attr("class", "y axis")
                    .attr("transform", "translate(" + [0, 5] + ")")
                    .call(yAxis)
                    .append("text")
                    .attr("transform", "rotate(-90)")
                    .attr("dx", "-6em")
                    .attr("dy", "-2.5em")
                    .style('font-size', '14px')
                    .style("text-anchor", "middle")
                    .text("Adjusted p-value");

                // Create dividing line
                g.selectAll(".divider").remove();
                if (dividerLevel) {
                    var divider = g.append("g")
                        .attr("class", "divider")
                        .attr("transform", "translate(0," + dividerY + ")");
                    divider.append("line").attr("class", "dashed")
                        .attr("x1", 0)
                        .attr("x2", width)
                        .attr("y", 0);
                    divider.append("text").attr("x", width / 2)
                        .attr("y", 20)
                        .text("Heterozygous");
                    divider.append("text").attr("x", width / 2)
                        .attr("y", -10)
                        .text("Homozygous");
                }

                // add tooltip div
                var tooltip = container.selectAll(".tooltip").data([0])
                    .enter().append('div')
                    .attr("class", "tooltip")
                    .style("opacity", 0);


                // Start variant model
                // add elements
                var track = g.selectAll('.track.snp').data(data);
                track.enter().append('g')
                    .attr('class', 'track snp')
                    .attr('transform', function (d, i) {
                        return "translate(0,0)"
                    });

                var trackindel = g.selectAll('.track.indel').data(data);
                trackindel.enter().append('g')
                    .attr('class', 'track indel')
                    .attr('transform', function (d, i) {
                        return "translate(0,0)"
                    });

                track.selectAll('.variant').remove();
                trackindel.selectAll('.variant').remove();

                // snps
                track.selectAll('.variant').data(function (d) {
                    return d['features'].filter(function (d) {
                        return d.type.toUpperCase() === 'SNP' || d.type.toUpperCase() === 'MNP';
                    });
                }).enter().append('rect')
                    .attr('class', function (d) {
                        return chart.clazz()(d);
                    })
                    .attr('id', function (d) {
                        return d.id;
                    })
                    .attr('rx', borderRadius)
                    .attr('ry', borderRadius)
                    .attr('x', function (d) {
                        return Math.round(x(d.start) - (minWidth / 2) + (minWidth / 4));
                    })
                    .attr('width', function (d) {
                        return showTransition ? 0 : variantHeight;
                    })
                    .attr('y', function (d) {
                        return showTransition ? 0 : y(d.adjustedLevel);
                    })
                    .attr('height', variantHeight);


                // insertions and deletions
                trackindel.selectAll('.variant').data(function (d) {
                    var indels = d['features'].filter(function (d) {
                        return d.type.toUpperCase() == 'DEL'
                            || d.type.toUpperCase() == 'INS'
                            || d.type.toUpperCase() == 'COMPLEX';
                    });
                    return indels;
                }).enter().append('path')
                    .attr("d", function (d, i) {
                        return d3.svg
                            .symbol()
                            .type(getSymbol(d, i))
                            .size(symbolSize)();
                    })
                    .attr('class', function (d) {
                        return chart.clazz()(d);
                    })
                    .attr('id', function (d) {
                        return d.id;
                    })
                    .attr("transform", function (d) {
                        var xCoord = x(d.start) + 2;
                        var yCoord = showTransition ? 0 : y(d.adjustedLevel) + 3;
                        var tx = "translate(" + xCoord + "," + yCoord + ")";
                        return tx;
                    });

                g.selectAll('.variant')
                    .on("click", function (d) {
                        dispatch.d3click(d);
                        d3.event.stopPropagation();
                    })
                    .on("mouseover", function (d) {
                        dispatch.d3mouseover(d);
                    })
                    .on("mouseout", function (d) {
                        dispatch.d3mouseout();
                    });

                // exit
                track.exit().remove();
                trackindel.exit().remove();

                // update
                if (showTransition) {
                    var interval = 1000 / data[0].features.length;

                    track.transition()
                        .duration(1000)
                        .attr('transform', function (d, i) {
                            return "translate(0," + y(i + 1) + ")"
                        });


                    track.selectAll('.variant.snp, .variant.mnp').sort(function (a, b) {
                        return parseInt(a.start) - parseInt(b.start)
                    })
                        .transition()
                        .duration(1000)
                        .delay(function (d, i) {
                            return i * interval;
                        })
                        .ease("bounce")
                        .attr('x', function (d) {
                            return d3.round(x(d.start) - (minWidth / 2) + (minWidth / 4));
                        })
                        .attr('width', function (d) {
                            return variantHeight;
                        })
                        .attr('y', function (d) {
                            var yCoord = y(d.adjustedLevel + 1) + 3;
                        })
                        .attr('height', function (d) {
                            return variantHeight;
                        });

                    trackindel.selectAll('.variant.del')
                        .transition()
                        .duration(1000)
                        .delay(function (d, i) {
                            return i * interval;
                        })
                        .ease("bounce")
                        .attr("d", function (d, i) {
                            return d3.svg
                                .symbol()
                                .type(getSymbol(d, i))
                                .size(symbolSize)();
                        })
                        .attr("transform", function (d) {
                            var xCoord = x(d.start) + 2;
                            var yCoord = y(d.adjustedLevel + 1) + 3;
                            var tx = "translate(" + xCoord + "," + yCoord + ")";
                            return tx;
                        });

                    trackindel.selectAll('.variant.ins')
                        .transition()
                        .duration(1000)
                        .delay(function (d, i) {
                            return i * interval;
                        })
                        .ease("bounce")
                        .attr("d", function (d, i) {
                            return d3.svg
                                .symbol()
                                .type(getSymbol(d, i))
                                .size(symbolSizeCircle)();
                        })
                        .attr("transform", function (d) {
                            var xCoord = x(d.start) + 2;
                            var yCoord = y(d.adjustedLevel + 1) + 3;
                            var tx = "translate(" + xCoord + "," + yCoord + ")";
                            return tx;
                        });

                    trackindel.selectAll('.variant.complex')
                        .transition()
                        .duration(1000)
                        .delay(function (d, i) {
                            return i * interval;
                        })
                        .attr("d", function (d, i) {
                            return d3.svg
                                .symbol()
                                .type(getSymbol(d, i))
                                .size(symbolSize)();
                        })
                        .attr("transform", function (d) {
                            var xCoord = x(d.start) + 2;
                            var yCoord = y(d.adjustedLevel + 1) + 3;
                            var tx = "translate(" + xCoord + "," + yCoord + ")";
                            return tx;
                        });


                }

                // Generate the x axis
                if (showXAxis) {
                    if (xTickFormat) {
                        xAxis.tickFormat(xTickFormat);
                    }
                    svg.select(".x.axis").transition()
                        .duration(200)
                        .call(xAxis);
                }

                // add a circle and arrows for 'hover' event and 'pinned' event
                ['hover', 'pinned'].forEach(function(clazz) {
                    var circleClazz = '.' + clazz + '.circle';
                    if (svg.selectAll(circleClazz).empty()) {
                        svg.selectAll(circleClazz).data([0])
                            .enter().append('circle')
                            .attr("class", clazz + " circle")
                            .attr("cx", 0)
                            .attr("cy", 0)
                            .attr("r", variantHeight + 2)
                            .style("opacity", 0);
                    }

                    var arrowClazz = 'g.' + clazz + '.arrow';
                    if (svg.selectAll(arrowClazz).empty()) {
                        //svg.selectAll("g.arrow").remove();
                        var garrow = svg.selectAll(arrowClazz).data([0])
                            .enter().append("g")
                            .attr("class", clazz + " arrow")
                            .attr("transform", "translate(1,0)");

                        garrow.append('line')
                            .attr("class", "arrow arrow-line")
                            .attr("x1", variantHeight + 2)
                            .attr("x2", -2)
                            .attr("y1", variantHeight + 2)
                            .attr("y2", 0)
                            .style("opacity", 0);
                        garrow.append('line')
                            .attr("class", "arrow arrow-line")
                            .attr("x1", variantHeight + 2)
                            .attr("x2", -2)
                            .attr("y1", 0)
                            .attr("y2", variantHeight + 2)
                            .style("opacity", 0);
                    }
                });
                // // add a circle and label
                // if (svg.selectAll(".circle").empty()) {
                //     //svg.selectAll(".circle").remove();
                //     var circle = svg.selectAll(".circle").data([0])
                //         .enter().append('circle')
                //         .attr("class", "circle")
                //         .attr("cx", 0)
                //         .attr("cy", 0)
                //         .attr("r", variantHeight + 2)
                //         .style("opacity", 0);
                // }
                //
                //
                // // add a arrow on the x-axis
                // if (svg.selectAll(".arrow").empty()) {
                //     //svg.selectAll("g.arrow").remove();
                //     var garrow = svg.selectAll("g.arrow").data([0])
                //         .enter().append("g")
                //         .attr("class", "arrow")
                //         .attr("transform", "translate(1,0)");
                //
                //     garrow.append('line')
                //         .attr("class", "arrow arrow-line")
                //         .attr("x1", variantHeight + 2)
                //         .attr("x2", -2)
                //         .attr("y1", variantHeight + 2)
                //         .attr("y2", 0)
                //         .style("opacity", 0);
                //     garrow.append('line')
                //         .attr("class", "arrow arrow-line")
                //         .attr("x1", variantHeight + 2)
                //         .attr("x2", -2)
                //         .attr("y1", 0)
                //         .attr("y2", variantHeight + 2)
                //         .style("opacity", 0);
                // }
                dispatch.d3rendered();
            }
        });
    }

    function tickFormatter(d) {
        if ((d / 1000000) >= 1)
            d = d / 1000000 + "M";
        else if ((d / 1000) >= 1)
            d = d / 1000 + "K";
        return d;
    }

    chart.showFlaggedVariant = function (svg, variant, key) {

        // Find the matching variant
        var matchingVariant = null;
        svg.selectAll(".variant").each(function (d, i) {
            if (d.start === variant.start
                && d.end === variant.end
                && d.ref === variant.ref
                && d.alt === variant.alt
                && d.type.toLowerCase() === variant.type.toLowerCase()) {
                matchingVariant = d;
            }
        });
        if (!matchingVariant) {
            return;
        }


        // Get the x, y for the variant's position
        var mousex = d3.round(x(matchingVariant.start));
        var mousey = height - ((matchingVariant.adjustedLevel + 1) * (variantHeight + verticalPadding));

        var xpos = 0;
        var ypos = mousey - 2;
        if (variant.type.toUpperCase() == "DEL" || variant.type.toUpperCase() == "COMPLEX") {
            xpos = mousex;
        } else if (variant.type.toUpperCase() == "INS") {
            xpos = mousex - .5;
        } else {
            xpos = mousex + .5;
        }

        var group = svg.select("g.flagged-variants")
            .append("g")
            .attr("class", "flagged-variant")
            .attr("id", key ? key : "")
            .attr("transform", "translate(" + xpos + "," + ypos + ")");


        var flagGroup = group.append("g")
            .attr("transform", "translate(-5,-5)");
        flagGroup.append("rect")
            .attr("x", 1)
            .attr("y", 0)
            .attr("width", 20)
            .attr("height", 20);

        return chart;

    };

    chart.removeFlaggedVariant = function (svg, variant) {
        // Find the matching variant
        var matchingVariant = null;
        svg.selectAll(".variant").each(function (d, i) {
            if (d.start == variant.start
                && d.end == variant.end
                && d.ref == variant.ref
                && d.alt == variant.alt
                && d.type.toLowerCase() == variant.type.toLowerCase()) {
                matchingVariant = d;
            }
        });
        if (!matchingVariant) {
            return;
        }
    };

    chart.margin = function (_) {
        if (!arguments.length) return margin;
        margin = _;
        return chart;
    };

    chart.width = function (_) {
        if (!arguments.length) return width;
        width = _;
        return chart;
    };

    chart.height = function (_) {
        if (!arguments.length) return height;
        height = _;
        return chart;
    };

    chart.widthPercent = function (_) {
        if (!arguments.length) return widthPercent;
        widthPercent = _;
        return chart;
    };

    chart.heightPercent = function (_) {
        if (!arguments.length) return heightPercent;
        heightPercent = _;
        return chart;
    };

    chart.x = function (_) {
        if (!arguments.length) return x;
        x = _;
        return chart;
    };

    chart.y = function (_) {
        if (!arguments.length) return y;
        y = _;
        return chart;
    };

    chart.xAxis = function (_) {
        if (!arguments.length) return xAxis;
        xAxis = _;
        return chart;
    };

    chart.yAxis = function (_) {
        if (!arguments.length) return yAxis;
        yAxis = _;
        return chart;
    };

    chart.variantHeight = function (_) {
        if (!arguments.length) return variantHeight;
        variantHeight = _;
        return chart;
    };

    chart.regionStart = function (_) {
        if (!arguments.length) return regionStart;
        regionStart = _;
        return chart;
    };

    chart.regionEnd = function (_) {
        if (!arguments.length) return regionEnd;
        regionEnd = _;
        return chart;
    };

    chart.showXAxis = function (_) {
        if (!arguments.length) return showXAxis;
        showXAxis = _;
        return chart;
    };

    chart.xTickFormat = function (_) {
        if (!arguments.length) return xTickFormat;
        xTickFormat = _;
        return chart;
    };

    chart.showBrush = function (_) {
        if (!arguments.length) return showBrush;
        showBrush = _;
        return chart;
    };

    chart.verticalLayers = function (_) {
        if (!arguments.length) return verticalLayers;
        verticalLayers = _;
        return chart;
    };

    chart.posVertLayers = function (_) {
        if (!arguments.length) return posVertLayers;
        posVertLayers = _;
        return chart;
    };

    chart.negVertLayers = function (_) {
        if (!arguments.length) return negVertLayers;
        negVertLayers = _;
        return chart;
    };

    chart.levelRange = function (_) {
        if (!arguments.length) return levelRange;
        levelRange = _;
        return chart;
    };

    chart.maxSubLevel = function (_) {
        if (!arguments.length) return maxSubLevel;
        maxSubLevel = _;
        return chart;
    };

    chart.verticalPadding = function (_) {
        if (!arguments.length) return verticalPadding;
        verticalPadding = _;
        return chart;
    };

    chart.showTransition = function (_) {
        if (!arguments.length) return showTransition;
        showTransition = _;
        return chart;
    };

    chart.clazz = function (_) {
        if (!arguments.length) return clazz;
        clazz = _;
        return chart;
    };

    chart.lowestWidth = function (_) {
        if (!arguments.length) return lowestWidth;
        lowestWidth = _;
        return chart;
    };

    chart.dividerLevel = function (_) {
        if (!arguments.length) return dividerLevel;
        dividerLevel = _;
        return chart;
    };

    chart.tooltipHTML = function (_) {
        if (!arguments.length) return tooltipHTML;
        tooltipHTML = _;
        return chart;
    };

    chart.showCircle = function (_) {
        if (!arguments.length) return showCircle;
        showCircle = _;
        return chart;
    };

    chart.hideCircle = function (_) {
        if (!arguments.length) return hideCircle;
        hideCircle = _;
        return chart;
    };

    chart.highlightVariant = function (_) {
        if (!arguments.length) return highlightVariant;
        highlightVariant = _;
        return chart;
    };

    chart.switchColorScheme = function (_) {
        if (!arguments.length) return switchColorScheme;
        switchColorScheme = _;
        return chart;
    };

    chart.filterVariants = function (_) {
        if (!arguments.length) return filterVariants;
        filterVariants = _;
        return chart;
    };

    chart.unfilterVariants = function (_) {
        if (!arguments.length) return unfilterVariants;
        unfilterVariants = _;
        return chart;
    };

    chart.clearVariants = function (_) {
        if (!arguments.length) return clearVariants;
        clearVariants = _;
        return chart;
    };

    chart.displayBrush = function (_) {
        if (!arguments.length) return displayBrush;
        displayBrush = _;
        return chart;
    };

    chart.hideBrush = function (_) {
        if (!arguments.length) return hideBrush;
        hideBrush = _;
        return chart;
    };

    chart.availableVertSpace = function (_) {
        if (!arguments.length) return availableVertSpace;
        availableVertSpace = _;
        return chart;
    };

    chart.checkForSelectedVar = function (_) {
        if (!arguments.length) return checkForSelectedVar;
        checkForSelectedVar = _;
        return chart;
    };

    // This adds the "on" methods to our custom exports
    d3.rebind(chart, dispatch, "on");

    return chart;
}
