<!--
Encapsulates Variant card
Updated: SJG 01Feb2018

TODO: refactor this to match new back end - namely get rid of SfariModel refs
-->
<style lang="sass">
#variant-card
  #gene-viz
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
</style>


<template>
  <v-card tile id="variant-card" class="app-card">
    <v-card-title primary-title>VARIANT CARD
      <div style="width:100%">

        <!-- SJG TODO: what is the known-variants-toolbar and do I need it? -->

        <variant-viz id="all-variant-viz"
          v-if="showVariantViz"
          v-for="cohort in cohorts"
          :key="cohort.name"
          ref="variantVizRef"
          :data="cohort.loadedVariants"
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
          @variantClick="onVariantClick"
          @variantHover="onVariantHover"
          @variantHoverEnd="onVariantHoverEnd">
          >
        </variant-viz>

      </div>
    </v-card-title>
  </v-card>
</template>

<script>

import VariantViz from './VariantViz.vue'

export default {
  name: 'variant-card',
  components: {
    VariantViz
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
    showVariantViz: true
  },
  data() {
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
        bottom: 18,
        left: 4
      },
      geneVizTrackHeight: 16,
      geneVizCdsHeight: 12,
      // TODO: if bam stuff, add depthViz margin info
      coveragePoint: null
    }
  },
  methods: {
    depthVizYTickFormat: function(val) {
      if (val == 0) {
        return "";
      } else {
        return val + "x";
      }
    },
    onVariantClick: function(variant) {
      if (this.showVariantViz) {
        this.showVariantCircle(variant);
        this.showVariantTooltip(variant, true);
      }
      this.$emit('variantClick', variant, this);
    },
    onVariantHover: function(variant, showTooltip=true) {
      if (this.selectedVariant == null) {
        if (this.showVariantViz) {
          this.showVariantCircle(variant);
          this.showVariantTooltip(variant, false);
        }
        this.$emit('variantHover', variant, this);
      }
    },
    onVariantHoverEnd: function() {
      if (this.selectedVariant == null) {
        if (this.showVariantViz) {
          this.hideVariantCircle();
          this.hideVariantTooltip(this);
        }
        this.$emit('variantHoverEnd');
      }

    },
    showVariantTooltip: function(variant, lock) {
      let self = this;

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
        lock,
        coord,
        self.sfariModel.name,
        self.sfariModel.getAffectedInfo(),
        self.sfariModel.cohort.mode,
        self.sfariModel.cohort.maxAlleleCount);

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
    unpin(saveClickedVariant, unpinMatrixTooltip) {
      this.$emit("sfariVariantClickEnd", this);

      this.hideVariantTooltip();
      this.hideVariantCircle();
      this.hideCoverageCircle();
    },
    hideVariantTooltip: function() {
      let tooltip = d3.select("#main-tooltip");
      tooltip.transition()
           .duration(500)
           .style("opacity", 0)
           .style("z-index", 0)
           .style("pointer-events", "none");
    },
    showVariantCircle: function(variant) {
      if (this.showVariantViz) {
        var container = d3.select(this.$el).select('#loaded-variant-viz > svg');
        this.$refs.variantVizRef.showVariantCircle(variant, container, false);
      }
    },
    hideVariantCircle: function(variant) {
      if (this.showVariantViz) {
        var container = d3.select(this.$el).select('#loaded-variant-viz > svg');
        this.$refs.variantVizRef.hideVariantCircle(container);
      }
    },
    // TODO: took out fxns related to showDepthViz
    onKnownVariantsVizChange: function(viz) {
      this.$emit("knownVariantsVizChange", viz);
    },
    onKnownVariantsFilterChange: function(selectedCategories) {
      this.$emit("knownVariantsFilterChange", selectedCategories);
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
  },
  mounted: function() {
    this.name = this.dataSetModel.name;

  },
  created: function() {
    this.depthVizYTickFormatFunc = this.depthVizYTickFormat ? this.depthVizYTickFormat : null;
  }
}

</script>
