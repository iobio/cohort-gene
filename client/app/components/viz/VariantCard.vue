<!--
Encapsulates Variant card
Updated: SJG Mar2018
-->
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
      <v-layout row style="padding-left: 15px; padding-right: 15px">
        <v-flex xs6>
          <span style="min-width: 200px; max-width: 200px; font-size: 16px; padding-bottom: 10px">VARIANTS</span>
        </v-flex>
        <v-flex xs6>
          <v-container fluid style="padding-left: 70%;" id="impactModeSwitch" v-bind:class="{hide: !displayImpactSwitch}">
            <v-switch :label="`Impact Mode: ${impactModeDisplay(impactMode)}`" v-model="impactMode" hide-details></v-switch>
            <!-- <span id="enrichmentColorLegend" v-bind:class="{hide: impactMode}"></span> -->
          </v-container>
        </v-flex>
      </v-layout>
      <div style="width:100%">
        <variant-viz
          v-if="showVariantViz"
          v-for="cohort in cohorts"
          :key="cohort.name"
          ref="variantVizRef"
          :id="cohort.name"
          :model="cohort"
          :data="cohort.loadedVariants"
          :title="cohort.trackName"
          :phenotypes="cohort.subsetPhenotypes"
          :name="cohort.name"
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
          :doneLoadingData="displayImpactSwitch"
          @variantClick="onVariantClick"
          @variantHover="onVariantHover"
          @variantHoverEnd="onVariantHoverEnd"
          @trackRendered="switchColorScheme"
          >
        </variant-viz>
        <gene-viz id="gene-viz"
          v-bind:class="{ hide: !showGeneViz }"
          :data="[selectedTranscript]"
          :margin="geneVizMargin"
          :width="width"
          :height="40"
          :trackHeight="geneVizTrackHeight"
          :cdsHeight="geneVizCdsHeight"
          :regionStart="regionStart"
          :regionEnd="regionEnd"
          :showXAxis="geneVizShowXAxis"
          :showBrush="false"
          :featureClass="getExonClass"
          >
        </gene-viz>
        <!--SJG TODO: took this out of gene-viz card above @feature-selected="showExonTooltip" -->
      </div>
    </v-card-title>
  </v-card>
</template>
<script>
import VariantViz from './VariantViz.vue'
import GeneViz from './GeneViz.vue'
export default {
  name: 'variant-card',
  components: {
    VariantViz,
    GeneViz
    // TODO: if I add knownVariantsToolbar, add that component
  },
  props: {
    dataSetModel: null,
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
    geneVizShowXAxis: null,
    displayImpactSwitch: false
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
      variantSymbolHeight: 8,
      variantSymbolPadding: 2,
      geneVizMargin: {
        top: 0,
        right: 2,
        bottom: self.geneVizShowXAxis ? 18: 0,
        left: 4
      },
      geneVizTrackHeight: 16,
      geneVizCdsHeight: 12,
      coveragePoint: null,
      impactMode: false,
      enrichmentColorLegend: {}
    }
  },
  methods: {
    drawColorLegend: function() {
      this.enrichmentColorLegend = colorLegend()
        .numberSegments(4)
        .on('d3rendered', function() {
        });
      this.enrichmentColorLegend();
    },
    impactModeDisplay: function(mode) {
      if (mode) return 'ON';
      else return 'OFF';
    },
    depthVizYTickFormat: function(val) {
      if (val == 0) {
        return "";
      } else {
        return val + "x";
      }
    },
    onVariantClick: function(variant, cohortKey) {
      //this.hideVariantTooltip();

      if (this.showVariantViz) {
        this.hideVariantCircle();
        this.showVariantCircle(variant);
      }
      this.$emit('dataSetVariantClick', variant, this, cohortKey);
    },
    onVariantHover: function(variant, cohortKey, showTooltip=true) {
      if (this.selectedVariant == null) {
        if (this.showVariantViz) {
          this.showVariantCircle(variant);
          //this.showVariantTooltip(variant, cohortKey, false);
        }
        this.$emit('dataSetVariantHover', variant, this);
      }
    },
    onVariantHoverEnd: function() {
      if (this.showVariantViz) {
        this.hideVariantCircle();
        this.hideVariantTooltip(this);
      }
      this.$emit('dataSetVariantHoverEnd');
    },
    showVariantTooltip: function(variant, cohortKey, lock) {
      let self = this;
      if (cohortKey == null || cohortKey == '') {
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
      var coord = {'x':                  x,
                   'y':                  y,
                   'height':             33,
                   'parentWidth':        self.$el.offsetWidth,
                   'preferredPositions': [ {top:    ['center', 'right','left'  ]},
                                           {right:  ['middle', 'top',  'bottom']},
                                           {left:   ['middle', 'top',  'bottom']},
                                           {bottom: ['center', 'right','left'  ]} ] };
      self.variantTooltip.fillAndPositionTooltip(tooltip,
        variant,
        self.selectedGene,
        self.selectedTranscript,
        lock,
        coord,
        self.dataSetModel.cohortMap[cohortKey].name,
        self.dataSetModel.cohortMap[cohortKey].getAffectedInfo(),
        "",     // SJG TODO: put mode in here later if necessary
        0);     // SJG TODO put max allele count in here
      tooltip.selectAll("#unpin").on('click', function() {
        self.unpin(null, true);
      });
      tooltip.selectAll("#tooltip-scroll-up").on('click', function() {
        self.tooltipScroll("up");
      });
      tooltip.selectAll("#tooltip-scroll-down").on('click', function() {
        self.tooltipScroll("down");
      });
    },
    tooltipScroll(direction) {
      this.variantTooltip.scroll(direction, "#main-tooltip");
    },
    // unpin(saveClickedVariant, unpinMatrixTooltip) {
    //   this.$emit("dataSetVariantClickEnd", this);
    //   //this.hideVariantTooltip();
    //   this.hideVariantCircle();
    //   this.hideCoverageCircle();
    // },
    hideVariantTooltip: function() {
      let tooltip = d3.select("#main-tooltip");
      tooltip.transition()
           .duration(500)
           .style("opacity", 0)
           .style("z-index", 0)
           .style("pointer-events", "none");
    },
    showVariantCircle: function(variant) {
      let self = this;
      if (self.showVariantViz) {
        self.$refs.variantVizRef.forEach(function(variantViz) {
          variantViz.showVariantCircle(variant, self.getVariantSVG(variantViz.name), true);
        })
      }
    },
    hideVariantCircle: function(variant) {
      let self = this;
      if (this.showVariantViz) {
        this.$refs.variantVizRef.forEach(function(variantViz) {
          variantViz.hideVariantCircle(self.getVariantSVG(variantViz.name));
        })
      }
    },
    getVariantSVG: function(vizTrackName) {
      var svg = d3.select(this.$el).select('#' + vizTrackName + ' > svg');
      return svg;
    },
    hideCoverageCircle: function() {
      if (this.showDepthViz) {
        this.$refs.depthVizRef.hideCurrentPoint();
      }
    },
    showCoverageCircle: function(variant) {
      let self = this;
      if (self.showDepthViz && self.sampleModel.coverage != null) {
        let theDepth = null;
        if (variant.bamDepth != null && variant.bamDepth != '') {
          theDepth = variant.bamDepth;
        } else {
          var matchingVariants = self.sampleModel.loadedVariants.features.filter(function(v) {
            return v.start == variant.start && v.alt == variant.alt && v.ref == variant.ref;
          })
          if (matchingVariants.length > 0) {
            theDepth = matchingVariants[0].bamDepth;
            // If samtools mpileup didn't return coverage for this position, use the variant's depth
            // field.
            if (theDepth == null || theDepth == '') {
              theDepth = matchingVariants[0].genotypeDepth;
            }
          }
        }
        if (theDepth) {
          self.$refs.depthVizRef.showCurrentPoint({pos: variant.start, depth: theDepth});
        }
      }
    },
    onKnownVariantsVizChange: function(viz) {
      this.$emit("knownVariantsVizChange", viz);
    },
    onKnownVariantsFilterChange: function(selectedCategories) {
      this.$emit("knownVariantsFilterChange", selectedCategories);
    },
    getExonClass: function(exon, i) {
      if (this.showDepthViz && exon.danger) {
        return exon.feature_type.toLowerCase() + (exon.danger[this.sampleModel.relationship] ? " danger" : "");
      } else {
        return exon.feature_type.toLowerCase();
      }
    },
    switchColorScheme: function() {
      let self = this;
      self.$refs.variantVizRef.forEach(function(variantViz) {
        variantViz.changeVariantColorScheme(!self.impactMode, self.getVariantSVG(variantViz.name));
      })
    }
  },
  filters: {
  },
  computed: {
    depthVizHeight: function() {
      this.showDepthViz ? 0 : 60;
    },
    cohorts: function() {
      return this.dataSetModel.cohorts;
    }
  },
  watch: {
    impactMode: function() {
      let self = this;
      self.switchColorScheme();
    },
    selectedGene: function() {
      let self = this;
      self.impactMode = false;
      self.doneLoadingData = false;
    }
  },
  mounted: function() {
    this.name = this.dataSetModel.name;
    //this.drawColorLegend();
  },
  created: function() {
    this.depthVizYTickFormatFunc = this.depthVizYTickFormat ? this.depthVizYTickFormat : null;
  }
}
</script>
