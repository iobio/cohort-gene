<!-- Component housing variant track display and main visualization.
TD & SJG updated Apr2018 -->

<style lang="sass">
    @import ../../../assets/sass/variables

    #variant-card
        #gene-viz, #gene-viz-zoom
            .current
                outline: none
            .axis
                padding-left: 0px
                padding-right: 0px
                margin-top: -10px
                margin-bottom: 0px
                padding-bottom: 0px
                text
                    font-size: 11px
                    fill: rgb(120, 120, 120)
                line, path
                    fill: none
                    stroke: lightgrey
                    shape-rendering: crispEdges
                    stroke-width: 1px
                &.x
                    .tick
                        line
                            transform: translateY(-14px)
                        text
                            transform: translateY(6px)
                    path
                        transform: translateY(-20px)
                        display: none
        #gene-viz-zoom
            .current
                outline: none
            .cds, .exon, .utr
                fill: rgba(159, 159, 159, 0.63)
                stroke: rgb(159, 159, 159)
        .clinvar-switch, .zoom-switch
            margin-left: 25px
            label
                padding-left: 7px
                line-height: 18px
                font-size: 12px
                font-weight: bold
                padding-top: 2px
                color: $text-color
        .badge
            padding: 0px 5px 0px 0px
            padding: 3px 7px
            background-color: white !important
            color: $text-color !important
            &.called
                .badge__badge
                    background-color: $called-variant-color !important
            &.loaded
                .badge__badge
                    background-color: $loaded-variant-progress-color !important
            .badge__badge
                font-size: 11px
                font-weight: bold
                width: 24px
                top: -3px
</style>
<style lang="css">
</style>
<template>
    <v-card tile id="variant-card" class="app-card">
        <v-card-title primary-title>
            <v-layout align-left>
                <v-icon>person</v-icon>
                <span style="min-width: 200px; max-width: 200px; font-size: 16px;">SINGLE SAMPLE VARIANTS</span>
                <div>
                    <v-menu open-on-hover offset-x transition="slide-x-transition" max-width="400px">
                        <v-btn flat icon small color="cohortBlue" slot="activator" class="info-button">
                            <v-icon small>info_outline</v-icon>
                        </v-btn>
                        <v-card>
                            <v-card-title style="font-family: Poppins; font-size: 18px; font-weight: 500; padding-top: 2px">
                                <v-icon>person</v-icon>
                                Single Sample Track Details
                            </v-card-title>
                            <v-divider></v-divider>
                            <v-card-text style="padding-top: 0">
                                Variants displayed within the single sample track are arranged in a non-overlapping pileup view along the y-axis, not according to enrichment.
                            </v-card-text>
                        </v-card>
                    </v-menu>
                </div>
            </v-layout>
            <div style="width:100%">
                <variant-viz
                        v-if="dataSetModel && dataSetModel.getSubsetCohort()"
                        ref="subsetVizRef"
                        :id="dataSetModel.getName()"
                        :model="dataSetModel"
                        :data="dataSetModel.loadedVariants"
                        :title="dataSetModel.getName()"
                        :phenotypes="dataSetModel.getSubsetCohort().phenotypes"
                        :validSourceFiles="formattedValidFiles"
                        :regionStart="regionStart"
                        :regionEnd="regionEnd"
                        :annotationScheme="annotationScheme"
                        :width="width"
                        :margin="variantVizMargin"
                        :variantHeight="variantSymbolHeight"
                        :variantPadding="variantSymbolPadding"
                        :showBrush="false"
                        :showXAxis="true"
                        :classifySymbolFunc="classifyVariantSymbolFunc"
                        :impactMode="impactMode"
                        :doneLoadingData="doneLoadingData"
                        :frequencyDisplayMode="true"
                        @variantClick="onVariantClick"
                        @variantHover="onVariantHover"
                        @variantHoverEnd="onVariantHoverEnd"
                        @clearVariants="clearVariants"
                        @navFilterTab="navigateToFilterTab"
                        @filterRemovedFromTrack="removeFilter">
                </variant-viz>
                <div id="bam-track">
                    <depth-viz
                            v-if="showDepthViz"
                            ref="depthVizRef"
                            :data="subsetCohort.coverage"
                            :coverageMedian="dataSetModel.getFilterModel().geneCoverageMedian"
                            :coverageDangerRegions="coverageDangerRegions"
                            :currentPoint="coveragePoint"
                            :maxDepth="dataSetModel.maxDepth"
                            :regionStart="regionStart"
                            :regionEnd="regionEnd"
                            :width="width"
                            :margin="depthVizMargin"
                            :height="60"
                            :showTooltip="false"
                            :showXAxis="false"
                            :inProgress="dataSetModel.inProgress"
                            :regionGlyph="depthVizRegionGlyph"
                            @region-selected="showExonTooltip"
                    >
                    </depth-viz>
                </div>
                <gene-viz id="gene-viz"
                          v-bind:class="{ hide: !showGeneViz }"
                          :data="[selectedTranscript]"
                          :margin="geneVizMargin"
                          :zoomPadding="0"
                          :width="width"
                          :yAxisWidth="39"
                          :height="40"
                          :trackHeight="geneVizTrackHeight"
                          :cdsHeight="geneVizCdsHeight"
                          :regionStart="regionStart"
                          :regionEnd="regionEnd"
                          :showXAxis="geneVizShowXAxis"
                          :showBrush="false"
                          :featureClass="getExonClass">
                </gene-viz>
            </div>
        </v-card-title>
    </v-card>
</template>
<script>
    import VariantViz from './VariantViz.vue'
    import GeneViz from './GeneViz.vue'
    import DepthViz from './DepthViz.vue'
    import FilterSettingsMenu from '../partials/FilterSettingsMenu.vue'

    export default {
        name: 'variant-card',
        components: {
            VariantViz,
            GeneViz,
            DepthViz,
            FilterSettingsMenu
        },
        props: {
            dataSetModel: null,
            filterModel: null,
            annotationScheme: null,
            classifyVariantSymbolFunc: null,
            variantTooltip: null,
            selectedGene: {},
            selectedTranscript: {},
            selectedVariant: null,
            regionStart: 0,
            regionEnd: 0,
            width: 0,
            showVariantViz: true,
            showGeneViz: true,
            showDepthViz: true,
            geneVizShowXAxis: null,
            doneLoadingData: false,
            doneLoadingExtras: false,
            showCoverageCutoffs: false
        },
        data() {
            let self = this;
            return {
                margin: {
                    top: 20,
                    right: 2,
                    bottom: 18,
                    left: 4
                },
                variantVizMargin: {
                    top: 0,
                    right: 2,
                    bottom: 5,
                    left: 4
                },
                variantSymbolHeight: 10,
                variantSymbolPadding: 2,
                variantChartWidth: 0,
                variantChartX: 0,
                variantChartY: 0,
                geneVizMargin: {
                    top: 0,
                    right: 2,
                    bottom: self.geneVizShowXAxis ? 18 : 0,
                    left: 2
                },
                depthVizMargin: {
                    top: 22,
                    right: self.isBasicMode || self.isEduMode ? 7 : 2,
                    bottom: 0,
                    left: self.isBasicMode || self.isEduMode ? 9 : 4
                },
                geneVizTrackHeight: 16,
                geneVizCdsHeight: 12,
                coveragePoint: null,
                impactMode: false,
                enrichmentColorLegend: {},
                // formattedValidFiles: [],
                showFilterMenu: false
            }
        },
        computed: {
            subsetCohort: function () {
                let self = this;
                if (self.dataSetModel)
                    return self.dataSetModel.getSubsetCohort();
            },
            formattedValidFiles: function () {
                let self = this;
                let files = [];
                if (self.dataSetModel != null) {
                    files = self.dataSetModel.vcfNames;
                }
                return files;
            },
            coverageDangerRegions: function () {
                let self = this;
                return [];
                // TODO: fix this
                // if (self.selectedTranscript.features) {
                //     let regions = [];
                //     self.selectedTranscript.features
                //         .filter(function (feature) {
                //             return feature.feature_type === 'CDS' || feature.feature_type === 'UTR';
                //         })
                //         .forEach(function (feature) {
                //             if (feature.danger[self.dataSetModel.entryId]) {
                //                 regions.push(feature);
                //             }
                //         });
                //     return regions;
                // } else {
                //     return [];
                // }
            }
        },
        watch: {
            selectedGene: function () {
                let self = this;
                self.impactMode = true;
                //self.doneLoadingData = false;
            }
        },
        created: function () {
            this.depthVizYTickFormatFunc = this.depthVizYTickFormat ? this.depthVizYTickFormat : null;
        },
        methods: {
            /* Formats the file name provided if it is a known phase file. NOTE: this is based on names
             * and ideally will be changed to a db field. */
            formatAndSortPhaseFiles: function (files) {
                let formattedFileNames = [];
                files.forEach((fileName) => {
                    if (fileName === '2018-03-18_all.vcf.gz') {
                        formattedFileNames.push('SSC WGS Phase 1');
                    }
                    else if (fileName === 'phase2.all.vcf.gz') {
                        formattedFileNames.push('SSC WGS Phase 2');
                    }
                    else if (fileName === 'phase3_1.all.vcf.gz') {
                        formattedFileNames.push('SSC WGS Phase 3-1');
                    }
                    else if (fileName === 'phase3_2.all.vcf.gz') {
                        formattedFileNames.push('SSC WGS Phase 3-2');
                    }
                    else if (fileName === 'phase4.all.vcf.gz') {
                        formattedFileNames.push('SSC WGS Phase 4');
                    }
                    else if (fileName === 'ssc_wes.vcf.gz') {
                        formattedFileNames.push('SSC WES All Phases')
                    }
                    else {
                        formattedFileNames.push(fileName);
                    }
                });
                // Return alphanumerically sorted
                return formattedFileNames.sort();
            },
            drawColorLegend: function () {
                this.enrichmentColorLegend = colorLegend()
                    .numberSegments(4)
                    .on('d3rendered', function () {
                    });
                this.enrichmentColorLegend();
            },
            depthVizYTickFormat: function (val) {
                if (val === 0) {
                    return "";
                } else {
                    return val + "x";
                }
            },
            onVariantClick: function (variant, dataSetKey) {
                if (this.showDepthViz) {
                    if (variant) {
                        this.showCoverageCircle(variant, true);
                    }
                }
                if (this.showVariantViz) {
                    if (variant) {
                        this.showVariantCircle(variant, true);
                    }
                }
                this.$emit('dataSetVariantClick', variant, dataSetKey);
            },
            onVariantHover: function (variant, showTooltip = true) {
                if (this.selectedVariant == null) {
                    if (this.showDepthViz) {
                        this.showCoverageCircle(variant, false);
                    }
                    if (this.showVariantViz) {
                        this.showVariantCircle(variant);
                    }
                    this.$emit('dataSetVariantHover', variant, this);
                }
            },
            onVariantHoverEnd: function () {
                if (this.showDepthViz) {
                    this.hideCoverageCircle(false);
                }
                if (this.showVariantViz) {
                    this.hideVariantCircle();
                    this.hideVariantTooltip(this);
                }
                this.$emit('dataSetVariantHoverEnd');
            },
            showVariantTooltip: function (variant, cohortKey, lock) {
                let self = this;
                if (cohortKey == null || cohortKey === '') {
                    console.log("error in showVariantTooltip: cohort key is blank");
                    return;
                }
                let tooltip = d3.select("#main-tooltip");
                if (lock) {
                    tooltip.style("pointer-events", "all");
                } else {
                    tooltip.style("pointer-events", "none");
                }
                var x = variant.screenX;
                var y = variant.screenY;
                var coord = {
                    'x': x,
                    'y': y,
                    'height': 33,
                    'parentWidth': self.$el.offsetWidth,
                    'preferredPositions': [{top: ['center', 'right', 'left']},
                        {right: ['middle', 'top', 'bottom']},
                        {left: ['middle', 'top', 'bottom']},
                        {bottom: ['center', 'right', 'left']}]
                };
                self.variantTooltip.fillAndPositionTooltip(tooltip,
                    variant,
                    self.selectedGene,
                    self.selectedTranscript,
                    lock,
                    coord,
                    self.dataSetModel.cohortMap[cohortKey].getName(),
                    self.dataSetModel.cohortMap[cohortKey].getAffectedInfo(),
                    "",     // SJG TODO: put mode in here later if necessary
                    0);     // SJG TODO put max allele count in here
                tooltip.selectAll("#unpin").on('click', function () {
                    self.unpin(null, true);
                });
                tooltip.selectAll("#tooltip-scroll-up").on('click', function () {
                    self.tooltipScroll("up");
                });
                tooltip.selectAll("#tooltip-scroll-down").on('click', function () {
                    self.tooltipScroll("down");
                });
            },
            tooltipScroll(direction) {
                this.variantTooltip.scroll(direction, "#main-tooltip");
            },

            hideVariantTooltip: function () {
                let tooltip = d3.select("#main-tooltip");
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0)
                    .style("z-index", 0)
                    .style("pointer-events", "none");
            },
            showVariantCircle: function (variant, lock) {
                let self = this;
                if (self.showVariantViz && self.$refs.subsetVizRef != null) {
                    self.$refs.subsetVizRef.showVariantCircle(variant, self.getVariantSVG(self.$refs.subsetVizRef.name), lock);
                }
            },
            hideVariantCircle: function (lock) {
                let self = this;
                if (self.showVariantViz && self.$refs.subsetVizRef != null) {
                    self.$refs.subsetVizRef.hideVariantCircle(self.getVariantSVG(self.$refs.subsetVizRef.name), lock);
                }
            },
            getVariantSVG: function (vizTrackName) {
                var svg = d3.select(this.$el).select('#' + vizTrackName + ' > svg');
                return svg;
            },
            hideCoverageCircle: function (lock) {
                if (this.showDepthViz) {
                    this.$refs.depthVizRef.hideCurrentPoint(lock);
                }
            },
            showCoverageCircle: function(variant, lock) {
                let self = this;

                if (self.showDepthViz && self.dataSetModel.coverage && self.dataSetModel.loadedVariants
                    && self.dataSetModel.loadedVariants.features) {
                    let theDepth = null;
                    let matchingVariants = self.dataSetModel.loadedVariants.features.filter(function (v) {
                        return v.start === variant.start && v.alt === variant.alt && v.ref === variant.ref;
                    });

                    if (matchingVariants.length > 0) {
                        theDepth = matchingVariants[0].bamDepth;
                        // If samtools mpileup didn't return coverage for this position, use the variant's depth
                        // field.
                        if (theDepth == null || theDepth === '') {
                            theDepth = matchingVariants[0].genotypeDepth;
                        }
                    }

                    // If we have the exact depth for this variant, show it.  Otherwise, we will show
                    // the calculated (binned, averaged) depth at this position.
                    self.$refs.depthVizRef.showCurrentPoint({pos: variant.start, depth: theDepth}, lock);
                }
            },
            onKnownVariantsVizChange: function (viz) {
                this.$emit("knownVariantsVizChange", viz);
            },
            onKnownVariantsFilterChange: function (selectedCategories) {
                this.$emit("knownVariantsFilterChange", selectedCategories);
            },
            getExonClass: function (exon, i) {
                if (this.showDepthViz && exon.danger) {
                    return exon.feature_type.toLowerCase() + (exon.danger[this.dataSetModel.entryId] ? " danger" : "");
                } else {
                    return exon.feature_type.toLowerCase();
                }
            },
            showExonTooltip: function (featureObject, feature, lock) {
                let self = this;
                let tooltip = d3.select("#exon-tooltip");

                if (featureObject == null) {
                    self.hideExonTooltip();
                    return;
                }

                if (self.selectedExon) {
                    return;
                }

                if (lock) {
                    self.selectedExon = feature;
                    tooltip.style("pointer-events", "all");
                    tooltip.classed("locked", true);
                } else {
                    tooltip.style("pointer-events", "none");
                    tooltip.classed("locked", false);
                }

                let coverageRow = function (fieldName, coverageVal, covFields) {
                    let row = '<div>';
                    row += '<span style="padding-left:10px;width:60px;display:inline-block">' + fieldName + '</span>';
                    row += '<span style="width:40px;display:inline-block">' + d3.round(coverageVal) + '</span>';
                    row += '<span class="' + (covFields[fieldName] ? 'danger' : '') + '">' + (covFields[fieldName] ? covFields[fieldName] : '') + '</span>';
                    row += "</div>";
                    return row;
                };

                let html = '<div>'
                    + '<span id="exon-tooltip-title"' + (lock ? 'style="margin-top:8px">' : '>') + (feature.hasOwnProperty("exon_number") ? "Exon " + feature.exon_number : "") + '</span>'
                    + (lock ? '<a href="javascript:void(0)" id="exon-tooltip-close">X</a>' : '')
                    + '</div>';
                html += '<div style="clear:both">' + feature.feature_type + ' ' + self.globalAppProp.utility.addCommas(feature.start) + ' - ' + self.globalAppProp.utility.addCommas(feature.end) + '</div>';

                if (feature.geneCoverage && feature.geneCoverage[self.sampleModel.getId()]) {
                    let covFields = self.dataSetModel.getFilterModel().whichLowCoverage(feature.geneCoverage[self.dataSetModel.entryId]);
                    html += "<div style='margin-top:4px'>" + "Coverage:"
                        + coverageRow('min', feature.geneCoverage[self.dataSetModel.entryId].min, covFields)
                        + coverageRow('median', feature.geneCoverage[self.dataSetModel.entryId].median, covFields)
                        + coverageRow('mean', feature.geneCoverage[self.dataSetModel.entryId].mean, covFields)
                        + coverageRow('max', feature.geneCoverage[self.dataSetModel.entryId].max, covFields)
                        + coverageRow('sd', feature.geneCoverage[self.dataSetModel.entryId].sd, covFields)

                }
                if (lock) {
                    html += '<div style="text-align:right;margin-top:8px">'
                        + '<a href="javascript:void(0)" id="exon-tooltip-thresholds" class="danger" style="float:left"  >Set cutoffs</a>'
                        + '</div>'
                }
                tooltip.html(html);
                if (lock) {
                    tooltip.select("#exon-tooltip-thresholds").on("click", function () {
                        self.$emit("show-coverage-cutoffs");
                    });
                    tooltip.select("#exon-tooltip-close").on("click", function () {
                        self.selectedExon = null;
                        self.hideExonTooltip(true);
                    })
                }

                // TODO: get this working
                let coord = self.globalAppProp.utility.getTooltipCoordinates(featureObject.node(),
                    tooltip, self.$el.offsetWidth, $('nav.toolbar').outerHeight());
                tooltip.style("left", coord.x + "px")
                    .style("text-align", 'left')
                    .style("top", (coord.y - 60) + "px");

                tooltip.style("z-index", 1032);
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
            },
            hideExonTooltip: function (force) {
                let self = this;
                let tooltip = d3.select("#exon-tooltip");
                if (force || !self.selectedExon) {
                    tooltip.classed("locked", false);
                    tooltip.classed("black-arrow-left", false);
                    tooltip.classed("black-arrow-right", false);
                    tooltip.style("pointer-events", "none");
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                }
            },
            clearVariants: function () {
                let self = this;
                if (self.$refs.subsetVizRef != null) {
                    self.$refs.subsetVizRef.clearVariants(self.getVariantSVG(self.$refs.subsetVizRef.name));
                }
            },
            depthVizRegionGlyph: function (exon, regionGroup, regionX) {
                let exonId = 'exon' + exon.exon_number.replace("/", "-");
                if (regionGroup.select("g#" + exonId).empty()) {
                    regionGroup.append('g')
                        .attr("id", exonId)
                        .attr('class', 'region-glyph coverage-problem-glyph')
                        .attr('transform', 'translate(' + (regionX - 12) + ',-16)')
                        .data([exon])
                        .append('use')
                        .attr('height', '22')
                        .attr('width', '22')
                        .attr('href', '#long-arrow-down-symbol')
                        .attr('xlink', 'http://www.w3.org/1999/xlink')
                        .data([exon]);
                }
            },
            filterVariants: function(filterInfo, selectedTrackId, selectedVariantId) {
                let self = this;

                let checkForSelectedVariant = false;
                if (self.dataSetModel.getName() === selectedTrackId && selectedVariantId) {
                    checkForSelectedVariant = true;
                }
                if (self.$refs.subsetVizRef) {
                    self.$refs.subsetVizRef.filterVariants(filterInfo, self.getVariantSVG(self.$refs.subsetVizRef.name), checkForSelectedVariant, selectedVariantId);
                }
            },
            navigateToFilterTab: function(selectedFilter) {
                let self = this;
                self.$emit('navFilterTab', selectedFilter);
            },
            removeFilter: function(filterObj, trackId) {
                let self = this;
                self.$emit("filterRemovedFromTrack", filterObj, trackId);
            }
        }
    }
</script>
