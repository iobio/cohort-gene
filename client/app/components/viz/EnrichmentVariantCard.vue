<!--
Encapsulates Variant card
Updated: SJG Jan2019
-->
<style lang="sass">
    @import ../../../assets/sass/variables
    #variant-card
        .info-title
            font-family: Poppins !important
            font-size: 18px !important
            padding-bottom: 0
        .info-button
            margin: 0
            padding: 0
            width: 25px
            height: 26px
        .zoom-loader
            padding-top: 4px
            padding-right: 7px
            max-width: 30px
            img
                width: 22px !important
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
            <v-flex xs6>
                <v-layout align-left>
                    <v-icon>people</v-icon>
                    <span style="font-size: 16px; padding-bottom: 0; padding-right: 3px">COHORT VARIANTS</span>
                    <div>
                        <v-menu open-on-hover offset-x transition="slide-x-transition" max-width="400px">
                            <v-btn flat icon small color="cohortBlue" slot="activator" class="info-button">
                                <v-icon small>info_outline</v-icon>
                            </v-btn>
                            <v-card>
                                <v-card-title style="font-family: Poppins; font-size: 18px; font-weight: 500; padding-top: 2px">
                                    <v-icon>people</v-icon>
                                    Cohort Track Details
                                </v-card-title>
                                <v-divider></v-divider>
                                <v-card-text style="padding-top: 0">
                                    Variants displayed within the cohort track are arranged according to how enriched they are within the selected subset cohort relative to the
                                    entire proband group: specifically, the higher the variant is along the y-axis, the more enriched it is.
                                    Enrichment is determined using a Cochran-Armitage Trend Test to calculate a p-value, and that p-value is log<sub>10</sub>-transformed and negated to determine
                                    the y-coordinate akin to a Manhattan Plot. To display cohort variants in a non-overlapping fashion, use the zoom tool.
                                </v-card-text>
                            </v-card>
                        </v-menu>
                    </div>
                </v-layout>
            </v-flex>
            <v-flex xs6>
                <v-layout>
                    <v-flex xl9 md7>
                        <!--spacing-->
                    </v-flex>
                    <div class="zoom-loader" id="zoomLoaderDiv">
                        <img src="../../../assets/images/wheel.gif">
                    </div>
                    <v-flex xl3 md4>
                        <v-switch label="Zoom Mode"
                                  hide-details
                                  color="cohortNavy"
                                  v-model="zoomMode"
                                  v-bind:disabled="!doneLoadingExtras || displayBlacklistWarning">
                        </v-switch>
                    </v-flex>
                </v-layout>
            </v-flex>
            <div style="width:100%">
                <div v-if="displayBlacklistWarning"
                     style="text-align: center; padding-bottom: 20px; padding-top: 20px">
                    <v-chip id="sfari-chip" class="red red--text" small outline style="font-size: 12px">
                        Unauthorized SFARI Gene
                        <v-menu id="sfari-menu" open-on-hover transition="slide-x-transition" max-width="400px">
                            <v-btn flat icon small slot="activator">
                                <v-icon small color="red">info_outline</v-icon>
                            </v-btn>
                            <div class="text-xs-center" style="padding: 5px">
                                The SFARI program does not authorize this gene to be viewed or analyzed. Please select another gene.
                            </div>
                        </v-menu>
                    </v-chip>
                </div>
                <enrichment-variant-viz
                        v-else-if="dataSetModel && dataSetModel.getSubsetCohort()"
                        ref="subsetVizRef"
                        :id="dataSetModel.getName()"
                        :model="dataSetModel"
                        :data="dataSetModel.loadedVariants"
                        :title="dataSetModel.getName()"
                        :phenotypes="dataSetModel.getSubsetCohort().phenotypes"
                        :numVariants="dataSetModel.getSubsetCohort().numVariants"
                        :validSourceFiles="formattedValidFiles"
                        :invalidSourceFiles="formattedInvalidFiles"
                        :invalidSourceReasons="formattedInvalidReasons"
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
                        @navFilterTab="navigateToFilterTab"
                        @variantClick="onVariantClick"
                        @refreshVariantClick="onRefreshVariantClick"
                        @variantZoom="onVariantZoom"
                        @variantHover="onVariantHover"
                        @variantHoverEnd="onVariantHoverEnd"
                        @trackRendered="switchColorScheme"
                        @clearVariants="clearVariants"
                        @refreshSummaryClick="refreshSummaryClick">
                </enrichment-variant-viz>
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
    import EnrichmentVariantViz from './EnrichmentVariantViz.vue'
    import VariantViz from './VariantViz.vue'
    import GeneViz from './GeneViz.vue'
    import ZoomModalViz from './ZoomModalViz.vue'
    import FilterSettingsMenu from '../partials/FilterSettingsMenu.vue'
    export default {
        name: 'enrichment-variant-card',
        components: {
            VariantViz,
            EnrichmentVariantViz,
            GeneViz,
            ZoomModalViz,
            FilterSettingsMenu
        },
        props: {
            dataSetModel: null,
            filterModel: null,
            annotationScheme: null,
            classifyVariantSymbolFunc: null,
            classifyZoomSymbolFunc: null,
            variantTooltip: null,
            selectedGene: {},
            selectedTranscript: {},
            selectedVariant: null,
            regionStart: 0,
            regionEnd: 0,
            width: 0,
            showVariantViz: true,
            showGeneViz: true,
            geneVizShowXAxis: null,
            doneLoadingData: false,
            doneLoadingExtras: false,
            showCoverageCutoffs: false,
            displayBlacklistWarning: false
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
                geneVizTrackHeight: 16,
                geneVizCdsHeight: 12,
                coveragePoint: null,
                impactMode: false,
                zoomMode: false,
                showZoomModal: false,
                zoomWidth: +100,
                zoomX: 0,
                zoomY: 0,
                zoomDrawUp: false,
                enrichmentColorLegend: {},
                formattedValidFiles: [],
                formattedInvalidFiles: [],
                formattedInvalidReasons: [],
                showFilterMenu: false
            }
        },
        computed: {
            probandCohort: function () {
                let self = this;
                if (self.dataSetModel)
                    return self.dataSetModel.getProbandCohort();
            },
            subsetCohort: function () {
                let self = this;
                if (self.dataSetModel)
                    return self.dataSetModel.getSubsetCohort();
            },
            displayModeText: function () {
                if (this.impactMode) return 'Switch to Enrichment Mode';
                else return 'Switch to Impact Mode';
            },
            zoomModeText: function () {
                if (this.zoomMode) return 'Exit Zoom';
                else return 'Zoom';
            },
            validSourceFiles: function () {
                let self = this;
                let files = [];
                if (self.dataSetModel != null) {
                    files = self.dataSetModel.vcfNames;
                }
                self.formattedValidFiles = self.formatAndSortPhaseFiles(files);
            },
            invalidSourceFiles: function () {
                let self = this;
                let files = [];
                if (self.dataSetModel != null) {
                    files = self.dataSetModel.invalidVcfNames;
                }
                self.formattedInvalidFiles = self.formatAndSortPhaseFiles(files);
            },
            invalidSourceReasons: function () {
                let self = this;
                let reasons = [];
                if (self.dataSetModel != null) {
                    reasons = self.dataSetModel.invalidVcfReasons;
                }
                self.formattedInvalidReasons = reasons;
            }
        },
        watch: {
            impactMode: function () {
                let self = this;
                self.switchColorScheme();
            },
            selectedGene: function () {
                let self = this;
                self.impactMode = false;
                //self.doneLoadingData = false;
            },
            validSourceFiles: function () {
                let self = this;
                // Sort valid files
                self.formattedValidFiles = self.formatAndSortPhaseFiles(self.validSourceFiles);
            },
            invalidSourceFiles: function () {
                let self = this;
                self.formattedInvalidFiles = self.formatAndSortPhaseFiles(self.invalidSourceFiles);
            },
            invalidSourceReasons: function () {
                let self = this;
                let sortedInvalidReasons = [];
                let sortedInvalidFiles = self.invalidSourceFiles.sort();
                sortedInvalidFiles.forEach((file) => {
                    let prevIndex = self.invalidSourceFiles.indexOf(file);
                    sortedInvalidReasons.push(self.invalidSourceReasons[prevIndex]);
                });
                self.formattedInvalidReasons = sortedInvalidReasons;
            },
            zoomMode: function () {
                if (this.zoomMode) {
                    this.displayVariantBrush();
                }
                else {
                    this.hideVariantBrush();
                }
            },
            doneLoadingExtras: function() {
                // NOTE: had to use jquery here, couldn't get flex styling to position loader
                // where I wanted it
                if (this.doneLoadingExtras === true || this.displayBlacklistWarning === true) {
                    $('#zoomLoaderDiv').hide();
                }
                else {
                    $('#zoomLoaderDiv').show();
                }
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
            toggleDisplayMode: function () {
                this.impactMode = !this.impactMode;
            },
            toggleZoomMode: function () {
                this.zoomMode = !this.zoomMode;
                if (this.zoomMode) {
                    this.displayVariantBrush();
                }
                else {
                    this.hideVariantBrush();
                }
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
                        this.showCoverageCircle(variant);
                    }
                }
                if (this.showVariantViz) {
                    if (variant) {
                        this.showVariantCircle(variant, true);
                    }
                }
                this.$emit('dataSetVariantClick', variant, dataSetKey);
            },
            onVariantZoom: function (selectedVarIds, xStart, yStart, drawBelow, graphWidth) {
                let self = this;
                // Start pileup of selected variants
                self.$emit('zoomModeStart', selectedVarIds);
                self.$modal.show(ZoomModalViz, {
                        model: self.subsetCohort,
                        data: self.subsetCohort.selectedVariants,
                        regionStart: self.regionStart,
                        regionEnd: self.regionEnd,
                        annotationScheme: self.annotationScheme,
                        margin: self.variantVizMargin,
                        variantHeight: self.variantSymbolHeight,
                        variantPadding: self.variantSymbolPadding,
                        showXAxis: true,
                        classifySymbolFunc: self.classifyZoomSymbolFunc,
                        doneLoadingData: self.doneLoadingData,
                        modalWidth: graphWidth,
                        width: self.zoomWidth,
                        selectedTranscript: self.selectedTranscript
                    },
                    {
                        draggable: '.modal-header',
                        width: graphWidth + 'px',
                        height: 'auto',
                        scrollable: true,
                        transition: 'modal',
                        pivotX: 0.10
                    });
                self.hideVariantCircle();
            },
            resetZoom: function () {
                this.hideVariantBrush();
                if (this.$refs.subsetVizRef) {
                    this.$refs.subsetVizRef.resetPreAnnotateColor();
                }
                this.zoomMode = false;
            },
            onVariantHover: function (variant, showTooltip = true) {
                if (this.selectedVariant == null) {
                    if (this.showVariantViz) {
                        this.showVariantCircle(variant);
                    }
                    this.$emit('dataSetVariantHover', variant, this);
                }
            },
            onVariantHoverEnd: function () {
                if (this.showVariantViz) {
                    this.hideVariantCircle(false);
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
                    "",     // Mode
                    0);     // Max allele count
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
                if (self.$refs.zoomVizRef != null) {
                    self.$refs.zoomVizRef.showVariantCircle(variant, self.getZoomSVG(), lock);
                }
            },
            onRefreshVariantClick: function(variantId) {
                let self = this;
                let lock = true;
                if (self.showVariantViz && self.$refs.subsetVizRef != null) {
                    self.$refs.subsetVizRef.showVariantCircle(null, self.getVariantSVG(self.$refs.subsetVizRef.name), lock, variantId);
                }
            },
            refreshSummaryClick: function(variant) {
                let self = this;
                self.$emit('refreshSummaryClick', variant);
            },
            hideVariantCircle: function (lock) {
                let self = this;
                if (self.showVariantViz && self.$refs.subsetVizRef != null) {
                    self.$refs.subsetVizRef.hideVariantCircle(self.getVariantSVG(self.$refs.subsetVizRef.name), lock);
                }
            },
            getZoomSVG: function () {
                let parentId = d3.select(this.$refs.zoomVizRef.$el).node().id;
                let svg = d3.select('#' + parentId).select('svg');
                return svg;
            },
            getVariantSVG: function (vizTrackName) {
                var svg = d3.select(this.$el).select('#' + vizTrackName + ' > svg');
                return svg;
            },
            hideCoverageCircle: function () {
                if (this.showDepthViz) {
                    this.$refs.depthVizRef.hideCurrentPoint();
                }
            },
            showCoverageCircle: function (variant) {
                let self = this;
                if (self.showDepthViz && self.sampleModel.coverage != null) {
                    let theDepth = null;
                    if (variant.bamDepth != null && variant.bamDepth !== '') {
                        theDepth = variant.bamDepth;
                    } else {
                        var matchingVariants = self.dataSetModel.loadedVariants.features.filter(function (v) {
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
                    }
                    if (theDepth) {
                        self.$refs.depthVizRef.showCurrentPoint({pos: variant.start, depth: theDepth});
                    }
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
                    return exon.feature_type.toLowerCase() + (exon.danger[this.sampleModel.relationship] ? " danger" : "");
                } else {
                    return exon.feature_type.toLowerCase();
                }
            },
            switchColorScheme: function () {
                let self = this;
                if (self.$refs.subsetVizRef != null) {
                    self.$refs.subsetVizRef.changeVariantColorScheme(!self.impactMode, self.getVariantSVG(self.$refs.subsetVizRef.name));
                }
            },
            clearVariants: function () {
                let self = this;
                if (self.$refs.subsetVizRef != null) {
                    self.$refs.subsetVizRef.clearVariants(self.getVariantSVG(self.$refs.subsetVizRef.name));
                }
            },
            displayVariantBrush: function () {
                let self = this;
                if (self.$refs.subsetVizRef != null) {
                    self.$refs.subsetVizRef.displayVariantBrush(self.impactMode);
                }
            },
            hideVariantBrush: function () {
                let self = this;
                if (self.$refs.subsetVizRef != null) {
                    self.$refs.subsetVizRef.hideVariantBrush(self.impactMode);
                }
            },
            closeModal: function () {
                let self = this;
                self.showZoomModal = false;
            },
            refreshVariantColors: function () {
                let self = this;
                if (self.$refs.subsetVizRef) {
                    self.$refs.subsetVizRef.refreshVariantColors(self.getVariantSVG(self.$refs.subsetVizRef.name));
                }
                if (self.zoomMode) {
                    self.zoomMode = true;
                }
            },
            filterVariants: function (filterInfo, selectedTrackId, selectedVariantId, parentFilterName, parentFilterState) {
                let self = this;
                let checkForSelectedVariant = false;
                if (self.dataSetModel.getName() === selectedTrackId && selectedVariantId) {
                    checkForSelectedVariant = true;
                }
                if (self.$refs.subsetVizRef) {
                    self.$refs.subsetVizRef.filterVariants(filterInfo, self.getVariantSVG(self.$refs.subsetVizRef.name), checkForSelectedVariant, selectedVariantId,
                        parentFilterName, parentFilterState);
                }
            },
            navigateToFilterTab: function(selectedFilter) {
                let self = this;
                self.$emit('navFilterTab', selectedFilter);
            },
            hideZoomSpinner: function() {
                let self = this;
                if (self.$refs.subsetVizRef) {
                    self.$refs.subsetVizRef.toggleZoomLoader(false);
                }
            }
        }
    }
</script>
