<!-- SJG updated Jul2018 -->

<style lang="css">
    .modal-mask {
        position: fixed;
        z-index: 9998;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        /*background-color: rgba(0, 0, 0, .5);*/
        display: table;
        transition: opacity .3s ease;
    }

    .modal-wrapper {
        display: table-cell;
        vertical-align: middle;
    }

    .modal-container {
        background-color: #fff;
        border: double 1px;
        box-shadow: 2px 4px rgba(0, 0, 0, .2);
        transition: all .3s ease;
        max-height: 235px;
        overflow-y: hidden;
        position: relative;
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
        font-size: 16px;
        padding-top: 5px;
    }

    .close-button {
        padding-left: 0;
        padding-right: 0;
        margin-left: 2px;
        margin-right: 2px;
        margin-top: 2px;
        margin-bottom: 2px;
    }

    .modal-body {
        overflow-y: scroll !important;
        max-height: 300px;
        padding: 0;
    }

    .modal-default-button {
        float: right;
    }

    /*
     * The following styles are auto-applied to elements with
     * transition="modal" when their visibility is toggled
     * by Vue.js.
     *
     * You can easily play with the modal transition by editing
     * these styles.
     */

    .modal-enter {
        opacity: 0;
    }

    .modal-leave-active {
        opacity: 0;
    }

    .modal-enter .modal-container,
    .modal-leave-active .modal-container {
        -webkit-transform: scale(1.1);
        transform: scale(1.1);
    }
</style>

<template>
    <transition name="modal">
        <div class="modal-mask">
            <div class="modal-wrapper">
                <div class="modal-container" v-bind:style="{ width: modalWidth + 'px', marginLeft: modalXStart + 'px'}">
                    <div class="modal-header">
                        <slot name="header">
                            <div>
                                <v-layout>
                                    <v-flex xs6>
                                        <div class="modal-title">
                                            Selected Variants
                                        </div>
                                    </v-flex>
                                    <v-flex xs6 text-xs-right>
                                        <v-btn class="close-button" icon
                                               @click="resetModal">
                                            <v-icon color="white">clear</v-icon>
                                        </v-btn>
                                    </v-flex>
                                </v-layout>
                            </div>
                        </slot>
                    </div>
                    <div class="modal-body">
                        <slot name="body">
                            <div class="selected-variant-viz"></div>
                        </slot>
                    </div>
                    <div>
                        <slot name="footer">
                            <!--TODO: how to hide this-->
                        </slot>
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>


<script>
    export default {
        name: 'zoom-modal-viz',
        components: {},
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
            }
        },
        data() {
            return {
                selectionVarChart: {}
            }
        },
        methods: {
            resetModal: function () {
                this.$emit('closeModal');
            },
            draw: function () {
                let self = this;
                this.selectionVarChart = variantD3()
                    .width(this.modalWidth)
                    .clazz(function(variant) {
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
                    .on("d3rendered", function() {
                        //self.$emit("trackRendered");
                    })
                    .on('d3click', function(variant) {
                        self.onVariantClick(variant);
                    })
                    .on('d3mouseover', function(variant) {
                        //self.onVariantHover(variant);
                    })
                    .on('d3mouseout', function() {
                        //self.onVariantHoverEnd();
                    });
            },
            update: function () {
                let self = this;
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
                let self = this;
                let cohortKey = self.name;
                self.$emit("variantClick", variant, cohortKey);
            },
            showVariantCircle: function (variant, container, lock) {
                console.log('getting here');
                this.selectionVarChart.showCircle()(variant,
                    container,
                    variant.fbCalled && variant.fbCalled === 'Y',
                    lock);
            },
            hideVariantCircle: function (container) {
                this.selectionVarChart.hideCircle()(container);
            },
            setVariantChart: function () {
                this.$emit('updateVariantChart', this.model);
            }
        },
        mounted: function() {
            let self = this;
            self.draw();
            self.update();
            // TODO: make draggable
        }
    }

</script>
