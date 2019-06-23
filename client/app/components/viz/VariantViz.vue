<style lang="sass">
    @import ../../../assets/sass/variables

    .variant
        opacity: 1
        stroke: #000
        stroke-width: 1px
        stroke-opacity: .3

        &.current
            stroke: #036DB7 !important
            stroke-width: 1.5px !important
            stroke-opacity: 1 !important

    .ibo-variant
        .reference
            stroke: rgb(150, 150, 150)

        .name
            font-size: 18px
            fill: rgb(120, 120, 120)

        .arrow
            stroke: rgb(150, 150, 150)
            fill: none

        .axis
            path, line
                fill: none
                stroke: lightgrey
                shape-rendering: crispEdges

            font-size: 13px

    .ibo-variant .circle, .ibo-variant .arrow-line
        stroke: #6c94b7
        stroke-width: 2

        fill: none
        pointer-events: none

    .ibo-variant.circle.emphasize, .ibo-variant .arrow-line.emphasize
        stroke: #6c94b7
        fill: none
        stroke-width: 3
        pointer-events: none

    .ibo-variant .arrow, .ibo-variant .arrow.emphasize
        stroke: #6c94b7
        pointer-events: none

    .ibo-variant
        .axis.x
            .tick
                line
                    display: none
                    stroke: rgba(211, 211, 211, 0.84)

    .variant-viz
        .field-label-header
            color: #7f7f7f
            font-style: italic
            padding-left: 6px
            text-align: right

        .flagged-variant
            rect
                fill: none
                stroke: #1574C7
                stroke-width: 7
                opacity: .8

            line
                stroke: #1574C7
                stroke-width: 5
                opacity: .8

            g
                fill: #1574C7
                opacity: .8
        .btn
            height: 26px !important
            padding: 0 !important
            margin: 4px !important
        .btn__content
            padding: 0 12px !important
</style>

<template>
    <div>
        <div class="variant-viz loaded-variant-viz" id="selectionDetailsLine">
            <span class="field-label-header">Selection Details</span>
            <v-chip color="cohortNavy" small outline style="font-size: 12px; pointer-events: none" v-for="phenotype in phenotypes"
                    :key="phenotype">
                {{phenotype}}
            </v-chip>
            <v-chip v-if="numVariants" color="cohortNavy" small outline style="font-size: 12px; pointer-events: none">
                {{numVariants}}
            </v-chip>
            <v-btn v-for="filterChip in filterChips" color="cohortGold" small flat outline round style="font-size: 12px;"
                    :key="filterChip.name" v-on:click="navigateToFilterTab(filterChip.name)">
                {{filterChip.filterLabel}}
            </v-btn>
        </div>
        <div class="variant-viz" id="sourceFileLine">
            <span class="field-label-header">Analysis sources</span>
            <v-chip color="cohortNavy" small outline style="font-size: 12px; pointer-events: none" v-for="file in validSourceFiles"
                    :key="file">
                {{file}}
                <v-icon right color="green">check_circle_outline</v-icon>
            </v-chip>
        </div>
        <div style="text-align: center;clear: both;">
            <div v-bind:class="{ hide: !model.inProgress.loadingVariants }"
                 style="display: inline-block;padding-bottom:10px">
                <span class="loader-label">Annotating Variants</span>
                <img src="../../../assets/images/wheel.gif">
            </div>
            <div v-bind:class="{ hide: !model.inProgress.fetchingHubData }"
                 style="display: inline-block;padding-left: 20px; padding-bottom:10px">
                <span class="loader-label">Fetching Data from Mosaic</span>
                <img src="../../../assets/images/wheel.gif">
            </div>
            <div v-bind:class="{ hide: !model.inProgress.verifyingVcfUrl }"
                 style="display: inline-block;padding-left: 20px; padding-bottom:10px">
                <span class="loader-label">Verifying Variant Data</span>
                <img src="../../../assets/images/wheel.gif">
            </div>
            <div v-bind:class="{ hide: !model.inProgress.drawingVariants }"
                 style="display: inline-block;padding-left: 20px; padding-bottom:10px">
                <span class="loader-label">Rendering Variants</span>
                <img src="../../../assets/images/wheel.gif">
            </div>
        </div>
        <div v-bind:class="{ hide: !noMatchingVariants }"
             style="text-align: center; padding-bottom: 20px; padding-top: 20px">
            <v-chip color="red" small outline style="font-size: 12px">
                No Variants Found
            </v-chip>
        </div>
        <div v-bind:class="{ hide: !noPassingResults }"
             style="text-align: center; padding-bottom: 20px; padding-top: 20px">
            <v-chip color="cohortBlue" small outline style="font-size: 12px">
                No Matching Results
            </v-chip>
        </div>
    </div>
</template>

<script>


    export default {
        name: 'variant-viz',
        props: {
            data: {},
            model: {},
            annotationScheme: {
                default: 'vep',
                type: String
            },
            regionStart: {
                default: 0,
                type: Number
            },
            regionEnd: {
                default: 0,
                type: Number
            },
            variantHeight: {
                default: 8,
                type: Number
            },
            variantPadding: {
                default: 2,
                type: Number
            },
            margin: {
                type: Object,
                default: function () {
                    return {top: 10, bottom: 10, left: 10, right: 10}
                }
            },
            showXAxis: {
                type: Boolean,
                default: true
            },
            showTransition: {
                type: Boolean,
                default: false
            },
            showBrush: {
                type: Boolean,
                default: false
            },
            width: {
                type: Number,
                default: 0
            },
            xTickFormat: {
                type: Function,
                default: function (d, i) {
                    return "";
                }
            },
            tooltipHTML: {
                type: Function,
                default: function (d, i) {
                    return "";
                }
            },
            classifySymbolFunc: null,
            title: {
                default: '',
                type: String
            },
            phenotypes: {
                type: Array,
                default: () => []
            },
            numVariants: {
                type: String,
                default: null
            },
            validSourceFiles: {
                type: Array,
                default: () => []
            },
            impactMode: {
                type: Boolean,
                default: false
            },
            doneLoadingData: {
                type: Boolean,
                default: false
            }
        },
        data() {
            return {
                variantChart: {},
                name: '',
                excludeFilters: [],     // List of filter classes; if variant contains any one of these, it will be hidden
                cutoffFilters: {},       // Hash of arrays {filterName: [filterName, logic, cutoffVal]}; if variant does not pass any of these, it will be hidden
                noPassingResults: false,
                filterChips: []
            }
        },
        computed: {
            noMatchingVariants: function () {
                let self = this;
                if (self.data == null) return false;
                if (self.data.features == null) return false;
                if (self.data.features.length === 0) {
                    let loading = self.model.inProgress.loadingVariants || self.model.inProgress.drawingVariants || self.model.inProgress.fetchingHubData;
                    if (!loading && self.doneLoadingData) return true;
                }
                return false;
            }
        },
        watch: {
            data: function () {
                let self = this;
                self.update();
                console.log("Drawing variants...");
            }
        },
        mounted: function () {
            let self = this;
            self.name = self.model.getName();
            self.draw();
        },
        methods: {
            draw: function () {
                var self = this;
                this.variantChart = variantD3()
                    .width(this.width)
                    .clazz(function (variant) {
                        return self.classifySymbolFunc(variant, self.annotationScheme, false, false);
                    })
                    .margin(this.margin)
                    .showXAxis(this.showXAxis)
                    .xTickFormat(this.xTickFormat)
                    .variantHeight(this.variantHeight)
                    .verticalPadding(this.variantPadding)
                    .showBrush(this.showBrush)
                    .showTransition(this.showTransition)
                    .tooltipHTML(this.tooltipHTML)
                    .regionStart(this.regionStart)
                    .regionEnd(this.regionEnd)
                    .on("d3rendered", function () {
                        self.$emit("trackRendered");
                    })
                    .on('d3click', function (variant) {
                        self.onVariantClick(variant);
                    })
                    .on('d3outsideclick', function () {
                        self.onVariantClick(null);
                    })
                    .on('d3mouseover', function (variant) {
                        self.onVariantHover(variant);
                    })
                    .on('d3mouseout', function () {
                        self.onVariantHoverEnd();
                    });

                this.setVariantChart();
            },
            update: function () {
                let self = this;
                self.model.inProgress.drawingVariants = false;

                // Reset filters
                self.excludeFilters = [];
                self.cutoffFilters = {};
                self.filterChips = [];
                self.noPassingResults = false;

                if (self.data) {
                    // Set the vertical layer count so that the height of the chart can be recalculated
                    if (self.data.maxPosLevel == null) {
                        self.data.maxPosLevel = d3.max(self.data.features, function (d) {
                            return d.level;
                        });
                    }
                    self.variantChart.verticalLayers(self.data.maxPosLevel + 1);
                    self.variantChart.lowestWidth(self.data.featureWidth);
                    if (self.data.features == null || self.data.features.length === 0) {
                        self.variantChart.showXAxis(false);
                    } else {
                        self.variantChart.showXAxis(self.showXAxis);
                    }

                    self.variantChart.regionStart(self.regionStart);
                    self.variantChart.regionEnd(self.regionEnd);

                    let selection = d3.select(self.$el).datum([self.data]);
                    self.variantChart(selection);
                } else {
                    let selection = d3.select(self.$el).datum([self.data]);
                    self.variantChart(selection);
                }
            },
            onVariantClick: function (variant) {
                let self = this;
                var dataSetKey = self.name;
                self.$emit("variantClick", variant, dataSetKey);
            },
            onVariantHover: function (variant) {
                let self = this;
                self.$emit("variantHover", variant);
            },
            onVariantHoverEnd: function (variant) {
                let self = this;
                self.$emit("variantHoverEnd", variant);
            },
            showVariantCircle: function (variant, container, pinned) {
                if (variant == null) {
                    this.hideVariantCircle(container, pinned);
                } else {
                    if (pinned) {
                        this.variantChart.hideCircle()(container, pinned);
                    }
                    this.variantChart.showCircle()(variant,
                        container,
                        true,
                        pinned);
                }
            },
            hideVariantCircle: function (container, pinned) {
                this.variantChart.hideCircle()(container, pinned);
            },
            setVariantChart: function () {
                this.$emit('updateVariantChart', this.model);
            },
            showFlaggedVariant: function (variant, container) {
                this.variantChart.showFlaggedVariant(container, variant);
            },
            changeVariantColorScheme: function (enrichmentMode, svg) {
                let self = this;
                self.variantChart.switchColorScheme()(enrichmentMode, svg);
            },
            filterVariants: function(filterInfo, svg, checkForSelectedVar, selectedVarId) {
                let self = this;

                // TODO: somehow get number of variants that are filtered

                // Set chip indicators
                let filterLabel = '';
                // Turning checkbox ON
                if (filterInfo.type === 'checkbox' && filterInfo.state === false) {
                    filterLabel = 'No ' + filterInfo.displayName;
                    // if (filterInfo.state === false) {
                    let filterObj = {name: filterInfo.name, filterLabel: filterLabel};
                    self.filterChips.push(filterObj);

                // Turning cutoff ON
                } else if (filterInfo.type === 'cutoff' && filterInfo.turnOff === false) {
                    filterLabel = filterInfo.displayName + ' ' + filterInfo.state + ' ' + filterInfo.cutoffValue;

                    // Replace label if this filter already active at different value
                    let matchingFilters = self.filterChips.filter((obj) => {
                        return obj.name === filterInfo.name
                    });
                    if (matchingFilters && matchingFilters[0]) {
                        matchingFilters[0].filterLabel = filterLabel;

                        // Otherwise add fresh
                    } else {
                        let filterObj = {name: filterInfo.name, filterLabel: filterLabel};
                        self.filterChips.push(filterObj);
                    }
                // Turning either type OFF
                } else {
                    self.filterChips = self.filterChips.filter((obj) => {
                        return obj.name !== filterInfo.name;
                    })
                }

                // Reset no vars
                let noPassingVars = false;
                self.noPassingResults = false;

                // Apply checkbox filter
                if (filterInfo.state === true && filterInfo.type === 'checkbox') {

                    // Remove from active filter state
                    self.excludeFilters.splice(self.excludeFilters.indexOf('.' + filterInfo.name), 1);

                    // Re-apply active filters in case of multiple filters
                    noPassingVars = self.variantChart.filterVariants()(self.excludeFilters, self.cutoffFilters, svg);

                // Removing checkbox filter
                } else if (filterInfo.state === false && filterInfo.type === 'checkbox') {
                    // Hide variants with that class
                    let filterClass = '.' + filterInfo.name;
                    self.excludeFilters.push(filterClass);
                    noPassingVars = self.variantChart.filterVariants()(self.excludeFilters, self.cutoffFilters, svg);

                    // Check to make sure we haven't hidden the selected variant
                    if (checkForSelectedVar) {
                        let selectedVarStillVisible = self.variantChart.checkForSelectedVar()(selectedVarId, svg);
                        // If we have, send deselect message
                        if (!selectedVarStillVisible) {
                            self.$emit("variantClick", null, null);
                        }
                    }
                // Apply cutoff filter
                } else if (filterInfo.state != null && filterInfo.type === 'cutoff') {

                    // Remove any previous logic for this filter
                    if (self.cutoffFilters[filterInfo.name]) {
                        delete self.cutoffFilters[filterInfo.name];
                    }

                    // Add new logic
                    self.cutoffFilters[filterInfo.name] = [filterInfo.name, filterInfo.state, filterInfo.cutoffValue];

                    // Hide variants that do not meet given condition
                    noPassingVars = self.variantChart.filterVariants()(self.excludeFilters, self.cutoffFilters, svg);

                // Remove cutoff filter
                } else {
                    // Remove from list
                    delete self.cutoffFilters[filterInfo.name];

                    // Re-apply active filters in case of multiple filters
                    noPassingVars = self.variantChart.filterVariants()(self.excludeFilters, self.cutoffFilters, svg)
                }

                if (checkForSelectedVar) {
                    let selectedVarStillVisible = self.variantChart.checkForSelectedVar()(selectedVarId, svg);
                    // If we have, send deselect message
                    if (!selectedVarStillVisible) {
                        self.$emit("variantClick", null, null);
                    }
                }

                if (noPassingVars) {
                    self.noPassingResults = true;
                }
            },
            navigateToFilterTab: function(selectedFilter) {
                let self = this;
                self.$emit('navFilterTab', selectedFilter);
            }
        }
    }
</script>
