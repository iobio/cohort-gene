<!-- SJG updated Dec2018 -->

<style lang="sass">
    @import ../../../assets/sass/variables

    #gene-viz
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
                        transform: translateY(12px)
                path
                    transform: translateY(-20px)
                    display: none
</style>
<style lang="css">
    .modal-container {
        background-color: #fff;
        border: double 1px;
        box-shadow: 2px 4px rgba(0, 0, 0, .2);
        transition: all .3s ease;
        max-height: 800px;
        /*overflow-y: scroll;*/
    }

    .modal-header {
        padding-top: 0;
        padding-bottom: 0;
        padding-right: 0;
        color: #fff;
        background-color: #95b0c6;
    }

    .modal-title {
        font-family: Quicksand;
        font-size: 18px;
        padding-top: 5px;
        padding-bottom: 5px;
    }

    .modal-sub-title {
        font-size: 14px;
        font-style: italic
    }

    .modal-body {
        overflow-y: scroll !important;
        max-height: 300px;
        min-width: 1500px;
        padding: 0;
    }

    .modal-enter .modal-container,
    .modal-leave-active .modal-container {
        -webkit-transform: scale(1.1);
        transform: scale(1.1);
    }
</style>

<template>
    <div class="modal-container">
        <div class="modal-header">
            <slot name="header">
                <div>
                    <v-layout>
                        <v-flex xs12>
                            <div class="modal-title">
                                <div>Selected Variants</div>
                                <div class="modal-sub-title">
                                    Note: Variants in zoom not displayed according to enrichment along the y-axis
                                </div>
                            </div>
                        </v-flex>
                    </v-layout>
                </div>
            </slot>
        </div>
        <div class="model-body text-center" style="padding-top:20px">
            <div v-bind:class="{ hide: !showZoomLoader }">
                <span style="font-size: 18px">Stacking Zoom Variants</span>
                <img src="../../../assets/images/wheel.gif">
            </div>
        </div>
        <div class="modal-body">
            <slot name="body">
                <div class="selected-variant-viz" style="padding-top: 20px"></div>
                <gene-viz id="gene-viz"
                          :data="[selectedTranscript]"
                          :margin="geneVizMargin"
                          :zoomPadding="modalZoomPadding"
                          :fixedWidth="modalWidth - 9"
                          :yAxisWidth="yAxisLeftPadding"
                          :trackHeight="geneVizTrackHeight"
                          :cdsHeight="geneVizCdsHeight"
                          :regionStart="regionStart"
                          :regionEnd="regionEnd"
                          :showXAxis="true"
                          :showLabel="false"
                          :showBrush="false">
                </gene-viz>
                <!--Padding to get rid of bar overlap-->
                <div style="margin-top: 20px"></div>
            </slot>
        </div>
        <div>
            <slot name="footer">
            </slot>
        </div>
    </div>
</template>


<script>

    import VModal from 'vue-js-modal'
    import GeneViz from './GeneViz.vue'

    export default {
        name: 'zoom-modal-viz',
        components: {
            VModal,
            GeneViz
        },
        props: {
            modalWidth: {
                default: 100,
                type: Number
            },
            modalXStart: {
                default: 0,
                type: Number
            },
            modalYStart: {
                default: 0,
                type: Number
            },
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
                default: 10,
                type: Number
            },
            variantPadding: {
                default: 2,
                type: Number
            },
            margin: {
                type: Object,
                default: function () {
                    return {top: 15, bottom: 10, left: 10, right: 10}
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
            doneLoadingData: {
                type: Boolean,
                default: false
            },
            width: 0,
            selectedTranscript: {}
        },
        data() {
            return {
                selectionVarChart: {},
                geneVizMargin: {
                    top: 0,
                    right: 2,
                    bottom: 18,
                    left: 2
                },
                adjustedGeneVizTrackHeight: 40,
                geneVizTrackHeight: 16,
                geneVizCdsHeight: 12,
                modalZoomPadding: 10,
                yAxisLeftPadding: 3,
                showZoomLoader: true
            }
        },
        methods: {
            closeModal: function () {
                // this.$modal.hide('zoom-modal-viz');
                // this.$emit('closeModal');
            },
            draw: function () {
                let self = this;
                this.selectionVarChart = variantD3()
                    .width(this.modalWidth - 5)
                    .clazz(function (variant) {
                        return self.classifySymbolFunc(variant, self.annotationScheme, self.model.getName());
                    })
                    .margin(this.margin)
                    .showXAxis(this.showXAxis)
                    .xTickFormat(this.xTickFormat)
                    .variantHeight(this.variantHeight)
                    .verticalPadding(this.variantPadding)
                    .showBrush(false)
                    .showTransition(this.showTransition)
                    .tooltipHTML(this.tooltipHTML)
                    .regionStart(this.regionStart)
                    .regionEnd(this.regionEnd)
                    .zoomVersion(true)
                    .on("d3rendered", function () {
                        //self.$emit("trackRendered");
                    })
                    .on('d3click', function (variant) {
                        self.onVariantClick(variant);
                    })
                    .on('d3mouseover', function (variant) {
                        //self.onVariantHover(variant);
                    })
                    .on('d3mouseout', function () {
                        //self.onVariantHoverEnd();
                    });
            },
            update: function () {
                let self = this;
                self.showZoomLoader = false;
                if (self.data) {
                    // Set the vertical layer count so that the height of the chart can be recalculated
                    if (self.data.maxLevel == null) {
                        self.data.maxLevel = d3.max(self.data.features, function (d) {
                            return d.level;
                        });
                    }
                    self.selectionVarChart.verticalLayers(self.data.maxLevel);
                    self.selectionVarChart.lowestWidth(self.data.featureWidth);
                    if (self.data.features == null || self.data.features.length === 0) {
                        self.selectionVarChart.showXAxis(false);
                    } else {
                        self.selectionVarChart.showXAxis(self.showXAxis);
                    }
                    self.selectionVarChart.regionStart(self.regionStart);
                    self.selectionVarChart.regionEnd(self.regionEnd);

                    // Data needs to bind to modal, not root element
                    let selection = d3.select('.selected-variant-viz').datum([self.data]);
                    self.selectionVarChart(selection);
                }
            },
            onVariantClick: function (variant) {
                // SJG NOTE: had to do this horrible code to accommodate draggable vue-js-modal
                // - if modal draggability becomes native to vuetify in future can get rid of this garbage
                if (this.$root && this.$root.$children && this.$root.$children[0] && this.$root.$children[0].$children && this.$root.$children[0].$children[0]
                        && this.$root.$children[0].$children[0].$children && this.$root.$children[0].$children[0].$children[0]
                        && this.$root.$children[0].$children[0].$children[0])
                this.$root.$children[0].$children[0].$children[0].onZoomClick(variant);
                this.showVariantCircle(variant, true);
            },
            showVariantCircle: function (variant, lock) {
                let svg = d3.select(this.$el).select('svg');
                this.selectionVarChart.showCircle()(variant,
                    svg,
                    false,
                    lock);
            },
            hideVariantCircle: function (container) {
                this.selectionVarChart.hideCircle()(container);
            },
            setVariantChart: function () {
                this.$emit('updateVariantChart', this.model);
            }
        },
        mounted: function () {
            let self = this;
            self.draw();
            setTimeout(() => {
                self.update();
            }, 1000);
            //self.update();
        }
    }

</script>
