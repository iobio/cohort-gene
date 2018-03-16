<!-- Variant Summary card -->

<!-- SJG: Imported styling from TDS -->
<style lang="sass" >
@import ../../../assets/sass/variables
@import ../../../assets/sass/symbols
.summary-viz
  min-height: 100px
  max-height: 200px
  padding-top: 0px
  overflow-x: scroll

  .content
    font-size: 12px
    padding-left: 10px
    margin-bottom: 10px
    float: left
    max-width: 350px
    min-width: 350px

  .field-label
    color: #b4b3b3
    font-style: italic
    padding-left: 6px
    text-align: right

  .field-label-header
    color: #7f7f7f
    font-style: italic
    padding-left: 6px
    text-align: right

  .subtitle-label
    color: #7f7f7f
    font-style: italic
    padding-left: 6px
    text-align: left

  .field-value
    padding-right: 25px
    padding-left: 5px
    word-break: break-word

  #inheritance
    height: 18px

  #coverage-svg
    float: left

    rect
      &.alt-count
        stroke: black !important

      &.ref-count
        stroke: black !important
        fill: none !important

      &.alt-count
        fill: #6A9C2F !important

      &.other-count
        stroke: black !important
        fill: rgb(132,132,132) !important

    text
      font-size: 12px !important

      &.alt-count
        fill: white !important

      &.alt-count-under
        fill: $text-color !important

      &.other-count
        fill: white  !important
        font-style: italic !important

      &.other-count-under
        fill: $text-color  !important
        font-style: italic !important

      &.ref-count
        fill: $text-color  !important

    .header-small
      overflow-wrap: break-word
      text-align: left
      width: 85px
      float: left
      color: $tooltip-label-color
      fill:  $tooltip-label-color

    .allele-count-bar
      text
        font-size: 11px !important
        fill:  $text-color

    #allele-count-legend
      padding-top: 0px


    .affected-symbol
      font-size: 14px
      color: $danger-color !important
      float: right
      padding-right: 2px


    .allele-count-bar
      overflow-wrap: break-word
      float: left
      width: 120px
      min-height: 25px

    .ped-info
      width: 270px
      clear: both
      line-height: 13px !important

    .ped-label
      padding-top: 0px
      vertical-align: top
      text-align: left
      width: 69px
      float: left
      font-size: 12px
      color: $text-color

    .ped-zygosity
      width: 75px
      float: left

    .zygosity
      float: left
      font-size: 9px
      font-weight: normal !important
      padding-top: 1px !important
      padding-bottom: 0px !important
      padding-right: 0px !important
      padding-left: 0px !important
      background-color: #D3D5D8 !important
      margin-right: 2px
      margin-top: 0px !important
      width: 39px !important
      color: black
      border: solid thin rgba(0, 0, 0, 0.22)
      cursor: none
      pointer-events: none

    .zygosity
      &.hom
        background-color: rgba(165, 48, 48, 0.76) !important
        color: white

      &.homref
        background-color: #5D809D !important
        color: rgba(255,255,255,1)

      &.unknown
        background-color: #b9edf3 !important

      &.none
        background-color: transparent !important
        border: solid thin #5D809D !important
</style>

<template>
  <v-card>
    <v-card-title primary-title style="margin-bottom: 8px; width: 100%">
      <span style="display:inline-block">VARIANT SUMMARY</span>
    </v-card-title>
    <v-container fluid grid-list-md>
      <v-layout row wrap>
        <feature-viz id="loaded-feature-viz" class="summary-viz"
          :effect="effect"
          :impactText="impactText"
          :impactColor="impactColor"
          :type="variantType"
          :clinVarText="clinVarText"
          :clinVarColor="clinVarColor"
          :siftText="siftText"
          :siftColor="siftColor"
          :polyPhenText="polyPhenText"
          :polyPhenColor="polyPhenColor">
        </feature-viz>
        <allele-frequency-viz id="loaded-freq-viz" class="summary-viz"
        :selectedVariant="variant"
        :oneKGenomes="oneKGenomes"
        :exAc="exAc"
        :simonsSimplexComplex="simonsSimplexComplex"
        :simonsVip="simonsVip">
        </allele-frequency-viz>
        <!-- <bar-feature-viz id="loaded-bar-feature-viz" class="summary-viz"
        :selectedVariant="variant"
        :zygMap="zygMap"
        :statusMap="statusMap"
        :depthMap="depthMap">
        </bar-feature-viz> -->
      </v-layout>
    </v-container>
  </v-card>
</template>


<script>
// Import viz components
import FeatureViz from "./FeatureViz.vue"
import AlleleFrequencyViz from "./AlleleFrequencyViz.vue"
import BarFeatureViz from "./BarFeatureViz.vue"

export default {
  name: 'variant-summary-card',
  components: {
    FeatureViz,
    AlleleFrequencyViz,
    BarFeatureViz
  },
  props: {
    variant: null,
    variantInfo: null
  },
  data() { return {}},
  methods: {},
  filters: {},
  computed: {
    effect: function() {
      if (this.variantInfo != null)
        return this.variantInfo.vepConsequence;
      return "-";
    },
    impactText: function() {
      if (this.variantInfo != null)
      {
        return this.variantInfo.vepImpact;
      }
      return "-";
    },
    impactColor: function() {
      if (this.variantInfo != null && this.variant.vepImpact != null) {
        var impactLevel = this.variantInfo.vepImpact.toUpperCase();
        return "impact_" + impactLevel;
      }
      return "";
    },
    variantType: function() {
      if (this.variant != null)
        return this.variant.type;
      return "";
    },
    clinVarText: function() {
      if (this.variantInfo != null && this.variantInfo.clinvarSig != null)
        return this.variantInfo.clinvarSig;
      return "";
    },
    clinVarColor: function() {
      if (this.variant != null && this.variant.clinvar != null) {
        var clazz = this.variant.clinvar;
        return "colorby_" + clazz;
      }
      return "";
    },
    siftText: function() {
      if (this.variantInfo != null)
        return this.variantInfo.sift;
      return "";
    },
    siftColor: function() {
      if (this.variantInfo != null && this.variantInfo.sift != null) {
        var clazz = this.variantInfo.sift.replace(" ", "_");
        return "colorby_sift_" + clazz;
      }
      return "";
    },
    polyPhenText: function() {
      if (this.variantInfo != null)
        return this.variantInfo.polyphen;
      return "";
    },
    polyPhenColor: function() {
      if (this.variantInfo != null) {
        var phenText = this.variantInfo.polyphen;
        phenText = phenText.replace(" ", "_");
        return "colorby_polyphen_" + phenText;
      }
      return "";
    },
    oneKGenomes: function() {
      if (this.variant != null && this.variant.af1000G != null)
        return Math.round(this.variant.af1000G * 100) + "%";
      return "-";
    },
    exAc: function() {
      if (this.variant != null && this.variant.afExAC != null)
        return Math.round(this.variant.afExAC * 100) + "%";
      return "-";
    },
    simonsSimplexComplex: function() {
      // TODO: get simons data
      return "-";
    },
    simonsVip: function() {
      // TODO: get simons data
      return "-";
    },
    zygMap: function() {
      var map = {};
      if (this.variant != null && this.variant.genotypes != null) {
        map['HOM'] = 0;
        map['HET'] = 0;
        map['HOMREF'] = 0;
        map['NOCALL'] = 0;
        this.variant.genotypes.forEach(function(gt) {
          if(gt.zygosity == 'HOM') map['HOM']++;
          else if (gt.zygosity == 'HET') map['HET']++;
          else if (gt.zygosity == 'HOMREF') map['HOMREF']++;
          else map['NOCALL']++;
        })
      }
      return map;
    },
    statusMap: function() {
      var map = {};
      var numSamplesAffected, numSamplesUnaffected = 0;
      // SJG TODO: I think this is just the number of samples 0/1 or 1/1 out of number of entries in this.variant.genotypes
      if (this.variant != null && this.variant.genotypes != null) {
        this.variant.genotypes.forEach(function(gt) {
          if (gt.zygosity == 'HOM' || gt.zygosity == 'HET')
            numSamplesAffected++;
          else if (gt.zygosity == 'HOMREF') {
            numSamplesUnffected++;
          }
        })
        map['AFF'] = numSamplesAffected;
        map['UNAFF'] = numSamplesUnffected;
      }
      return map;
    },
    depthMap: function() {
      var map = {};
      // SJG TODO: not sure how to get these numbers - maybe leave this graph out for the demo?
      return map;
    }
  },
  watch: {},
  mounted: function() {},
  created: function() {}
}

</script>
