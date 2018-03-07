<!--
Encapsulates Variant card
Updated: SJG 28Feb2018
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
      <span style="min-width:200px;max-width:200px">VARIANTS</span>

      <div style="width:100%">
        <!-- TODO: <div style="text-align: center;clear: both;">
          <div class="loader vcfloader" v-bind:class="{ hide: !cohort.inProgress.loadingVariants }" style="display: inline-block;padding-bottom:10px">
            <span class="loader-label">Annotating variants</span>
            <img src="../../../assets/images/wheel.gif">
          </div>
          <div class="loader fbloader" v-bind:class="{ hide: !cohort.inProgress.callingVariants }" style="display: inline-block;padding-left: 20px;adding-bottom:10px">
            <span class="loader-label">Calling variants</span>
            <img src="../../../assets/images/wheel.gif">
          </div>
          <div class="loader covloader" v-bind:class="{ hide: !cohort.inProgress.loadingCoverage }" style="display: inline-block;padding-left: 20px;padding-bottom:10px">
            <span class="loader-label">Analyzing gene coverage</span>
            <img src="../../../assets/images/wheel.gif">
          </div>
        </div> -->

        <!-- SJG TODO: tried putting this in to fix circle stuff... -->
        <!-- <variant-viz id="called-variant-viz"
          v-if="showVariantViz"
          ref="calledVariantVizRef"
          :data="cohorts[0].calledVariants"
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
        </variant-viz> -->

        <variant-viz
          v-if="showVariantViz"
          v-for="cohort in cohorts"
          :key="cohort.name"
          ref="variantVizRef"
          :id="cohort.name"
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
          @variantClick="onVariantClick"
          @variantHover="onVariantHover"
          @variantHoverEnd="onVariantHoverEnd">
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
          @feature-selected="showExonTooltip"
          >
        </gene-viz>

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
    geneVizShowXAxis: null
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
      variantSymbolHeight: 8, // SJG TODO: this is where can increase based on frequency
      variantSymbolPadding: 2,  // Increased from 2 SJG

      geneVizMargin: {
        top: 0,
        right: 2,
        bottom: self.geneVizShowXAxis ? 18: 0,
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
    onVariantClick: function(variant, cohortKey) {
      if (this.showVariantViz) {
        this.showVariantCircle(variant);
        this.showVariantTooltip(variant, cohortKey, true);
      }
      this.$emit('dataSetVariantClick', variant, this, cohortKey);
    },
    onVariantHover: function(variant, cohortKey, showTooltip=true) {
      if (this.selectedVariant == null) {
        if (this.showVariantViz) {
          this.showVariantCircle(variant);
          this.showVariantTooltip(variant, cohortKey, false);
        }
        this.$emit('dataSetVariantHover', variant, this);
      }
    },
    onVariantHoverEnd: function() {
      if (this.selectedVariant == null) {
        if (this.showVariantViz) {
          this.hideVariantCircle();
          this.hideVariantTooltip(this);
        }
        this.$emit('dataSetVariantHoverEnd');
      }

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
    unpin(saveClickedVariant, unpinMatrixTooltip) {
      this.$emit("dataSetVariantClickEnd", this);

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
      let self = this;
      if (self.showVariantViz) {
        self.$refs.variantVizRef.forEach(function(variantViz) {
          variantViz.showVariantCircle(variant, self.getVariantSVG(variant, variantViz.name), false);
        })
      }
    },
    hideVariantCircle: function(variant) {
      let self = this;
      if (this.showVariantViz) {
        this.$refs.variantVizRef.forEach(function(variantViz) {
          variantViz.hideVariantCircle(self.getVariantSVG(variant, variantViz.name));
        })
      }
    },
    getVariantSVG: function(variant, vizTrackName) {
      var svg = d3.select(this.$el).select('#' + vizTrackName + ' > svg');
      return svg;
      // return variant.fbCalled && variant.fbCalled == 'Y'
      //     ? d3.select(this.$el).select('#called-variant-viz > svg')
      //     : d3.select(this.$el).select('#loaded-variant-viz > svg');
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
    // TODO: took out fxns related to showDepthViz
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
    showExonTooltip: function(featureObject, feature, lock) {
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

      var coverageRow = function(fieldName, coverageVal, covFields) {
        var row = '<div>';
        row += '<span style="padding-left:10px;width:60px;display:inline-block">' + fieldName   + '</span>';
        row += '<span style="width:40px;display:inline-block">' + d3.round(coverageVal) + '</span>';
        row += '<span class="' + (covFields[fieldName] ? 'danger' : '') + '">' + (covFields[fieldName] ? covFields[fieldName]: '') + '</span>';
        row += "</div>";
        return row;
      }

      var html = '<div>'
               + '<span id="exon-tooltip-title"' + (lock ? 'style="margin-top:8px">' : '>') + (feature.hasOwnProperty("exon_number") ? "Exon " + feature.exon_number : "") + '</span>'
               + (lock ? '<a href="javascript:void(0)" id="exon-tooltip-close">X</a>' : '')
               + '</div>';
      html     += '<div style="clear:both">' + feature.feature_type + ' ' + utility.addCommas(feature.start) + ' - '       + utility.addCommas(feature.end) + '</div>';

      if (feature.geneCoverage && feature.geneCoverage[self.sampleModel.getRelationship()]) {
          var covFields = self.sampleModel.cohort.filterModel.whichLowCoverage(feature.geneCoverage[self.sampleModel.getRelationship()]);
          html += "<div style='margin-top:4px'>" + "Coverage:"
               +  coverageRow('min',    feature.geneCoverage[self.sampleModel.getRelationship()].min, covFields)
               +  coverageRow('median', feature.geneCoverage[self.sampleModel.getRelationship()].median, covFields)
               +  coverageRow('mean',   feature.geneCoverage[self.sampleModel.getRelationship()].mean, covFields)
               +  coverageRow('max',    feature.geneCoverage[self.sampleModel.getRelationship()].max, covFields)
               +  coverageRow('sd',     feature.geneCoverage[self.sampleModel.getRelationship()].sd, covFields)

      }
      if (lock) {
        html += '<div style="text-align:right;margin-top:8px">'
        + '<a href="javascript:void(0)" id="exon-tooltip-thresholds" class="danger" style="float:left"  >Set cutoffs</a>'
        + '</div>'
      }
      tooltip.html(html);
      if (lock) {
        //tooltip.select("#exon-tooltip-thresholds").on("click", function() {
          //$('#filter-track #coverage-thresholds').addClass('attention');
        //})
        tooltip.select("#exon-tooltip-close").on("click", function() {
          self.selectedExon = null;
          self.hideExonTooltip(true);
        })
      }

      var coord = utility.getTooltipCoordinates(featureObject.node(),
        tooltip, self.$el.offsetWidth, $('nav.toolbar').outerHeight());
      tooltip.style("left", coord.x + "px")
             .style("text-align", 'left')
             .style("top", (coord.y-60) + "px");

      tooltip.style("z-index", 1032);
      tooltip.transition()
             .duration(200)
             .style("opacity", .9);
    },
    hideExonTooltip: function(force) {
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
