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
        stroke-width: 2px

        fill: none
        pointer-events: none

    .ibo-variant.circle.emphasize, .ibo-variant .arrow-line.emphasize
        stroke: #6c94b7
        fill: none
        stroke-width: 3px
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
                stroke-width: 7px
                opacity: .8

            line
                stroke: #1574C7
                stroke-width: 5px
                opacity: .8

            g
                fill: #1574C7
                opacity: .8
</style>

<template>
    <div>
        <div class="variant-viz loaded-variant-viz" id="selectionDetailsLine">
            <span class="field-label-header">Selection Details</span>
            <v-chip color="cohortNavy" small outline style="font-size: 12px" v-for="phenotype in phenotypes"
                    :key="phenotype">
                {{phenotype}}
            </v-chip>
        </div>
        <div class="variant-viz" id="sourceFileLine">
            <span class="field-label-header">Analysis sources</span>
            <v-chip color="cohortNavy" small outline style="font-size: 12px" v-for="file in validSourceFiles"
                    :key="file">
                {{file}}
                <v-icon right color="green">check_circle_outline</v-icon>
            </v-chip>
            <template v-for="(file,index) in invalidSourceFiles">
                <v-tooltip bottom>
                    <v-chip color="cohortNavy" small outline style="font-size: 12px; font-family: 'Open Sans'" slot="activator"
                            :key="file">
                        {{file}}
                        <v-icon right color="red">error_outline</v-icon>
                    </v-chip>
                    <span style="color: red">{{getInvalidReason(index)}}</span>
                </v-tooltip>
            </template>
        </div>
        <div style="text-align: center;clear: both;">
            <div v-bind:class="{ hide: !model.inProgress.loadingVariants }"
                 style="display: inline-block;padding-bottom:10px">
                <span class="loader-label">Annotating Variants</span>
                <img src="../../../assets/images/wheel.gif">
            </div>
            <div v-bind:class="{ hide: !model.inProgress.fetchingHubData }"
                 style="display: inline-block;padding-left: 20px; padding-bottom:10px">
                <span class="loader-label">Fetching Data from Hub</span>
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
    </div>
</template>

<script>


    export default {
        name: 'updated-variant-viz',
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
            validSourceFiles: {
                type: Array,
                default: () => []
            },
            invalidSourceFiles: {
                type: Array,
                default: () => []
            },
            invalidSourceReasons: {
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
            },
            frequencyDisplayMode: { // Controls what type of layout we have here
                type: Boolean,
                default: false
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
        data() {
            return {
                variantChart: {},
                name: ''
            }
        },
        mounted: function () {
            let self = this;
            self.name = self.model.getName();
            self.draw();
        },
        methods: {
            getInvalidReason: function(index) {
                let self = this;
                return self.invalidSourceReasons[index];
            },
            draw: function () {
                let self = this;

                this.variantChart = scaledVariantD3()
                    .width(this.width)
                    .clazz(function (variant) {
                        return self.classifySymbolFunc(variant, self.annotationScheme, self.model.isSubsetCohort);
                    })
                    .margin(self.margin)
                    .showXAxis(self.showXAxis)
                    .xTickFormat(self.xTickFormat)
                    .variantHeight(self.variantHeight)
                    .verticalPadding(self.variantPadding)
                    .showBrush(self.showBrush)
                    .showTransition(self.showTransition)
                    .tooltipHTML(self.tooltipHTML)
                    .regionStart(self.regionStart)
                    .regionEnd(self.regionEnd)
                    .on('d3rendered', function () {
                        self.$emit('trackRendered');
                    })
                    .on('d3click', function (variant) {
                        self.onVariantClick(variant);
                    })
                    .on('d3mouseover', function (variant) {
                        self.onVariantHover(variant);
                    })
                    .on('d3mouseout', function () {
                        self.onVariantHoverEnd();
                    })
                    .on('d3variantsselected', function (selectedVarIds, xStart, yStart, drawBelow, graphWidth) {
                        self.onVariantZoomSelected(selectedVarIds, xStart, yStart, drawBelow, graphWidth);
                    });
            },
            update: function () {
                let self = this;
                self.model.inProgress.drawingVariants = false;

                if (self.data) {
                    // Get available veertical space to send into scaled variant d3
                    let bottomSourceCoord = 0;
                    let rect = $('#sourceFileLine').offset();
                    if (rect != null) {
                        let sourceHeight = $('#sourceFileLine').height();
                        bottomSourceCoord = rect.top + sourceHeight;
                    }
                    let availableSpace = $(document).height() - bottomSourceCoord + 64; // 64 = height of navigation bar

                    // Set the vertical layer count so that the height of the chart can be recalculated
                    if (self.data.maxPosLevel == null || self.data.maxPosLevel == null) {
                        self.data.maxPosLevel = d3.max(self.data.features, function (d) {
                            return d.level;
                        });
                    }
                    if (self.data.maxNegLevel == null || self.data.maxNegLevel == null) {
                        self.data.maxNegLevel = d3.min(self.data.features, function (d) {
                            return d.level;
                        });
                    }
                    if (self.data.maxSubLevel == null || self.data.maxSubLevel == null) {
                        self.data.maxSubLevel = d3.max(self.data.features, function (d) {
                            return d.subLevel;
                        });
                    }
                    self.variantChart.posVertLayers(self.data.maxPosLevel);
                    self.variantChart.negVertLayers(self.data.maxNegLevel);
                    self.variantChart.maxSubLevel(self.data.maxSubLevel);
                    self.variantChart.lowestWidth(self.data.featureWidth);
                    self.variantChart.availableVertSpace(availableSpace);
                    if (self.data.features == null || self.data.features.length === 0) {
                        self.variantChart.showXAxis(false);
                    } else {
                        self.variantChart.showXAxis(self.showXAxis);
                    }

                    self.variantChart.regionStart(self.regionStart);
                    self.variantChart.regionEnd(self.regionEnd);

                    let selection = d3.select(self.$el).datum([self.data]);
                    self.variantChart(selection);
                }
            },
            onVariantClick: function (variant) {
                let self = this;
                let cohortKey = self.name;
                self.$emit("variantClick", variant, cohortKey);
            },
            onVariantZoomSelected: function (selectedVarIds, xStart, yStart, drawBelow, graphWidth) {
                let self = this;
                self.$emit('variantZoom', selectedVarIds, xStart, yStart, drawBelow, graphWidth);
            },
            onVariantHover: function (variant) {
                let self = this;
                //var cohortKey = self.name;
                //self.$emit("variantHover", variant, cohortKey);
            },
            onVariantHoverEnd: function (variant) {
                let self = this;
                //self.$emit("variantHoverEnd", variant);
            },
            showVariantCircle: function (variant, container, lock) {
                this.variantChart.showCircle()(variant,
                    container,
                    variant.fbCalled && variant.fbCalled === 'Y',
                    lock);
            },
            hideVariantCircle: function (container) {
                this.variantChart.hideCircle()(container);
            },
            setVariantChart: function () {
                this.$emit('updateVariantChart', this.model);
            },
            showFlaggedVariant: function (variant, container) {
                this.variantChart.showFlaggedVariant(container, variant);
            },
            changeVariantColorScheme: function (enrichmentMode, svg) {
                this.variantChart.switchColorScheme()(enrichmentMode, svg);
            },
            displayVariantBrush: function () {
                this.variantChart.displayBrush()();
            },
            hideVariantBrush: function () {
                this.variantChart.hideBrush()();
            },
            clearVariants: function (svg) {
                this.variantChart.clearVariants()(svg);
            }
        },
        watch: {
            data: function () {
                let self = this;
                self.$emit('clearVariants');
                self.update();

                console.log("Drawing variants...");
            }
        }
    }
</script>
