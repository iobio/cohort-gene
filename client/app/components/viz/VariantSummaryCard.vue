<!-- Variant Summary card -->

<!-- SGJ: Imported styling from TDS -->
<style lang="sass" >
@import ../../../assets/sass/variables
.summary-viz
  padding-left: 30px
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
    <v-container>
      <v-layout row wrap>
        <v-flex xs6>
          <feature-viz id="loaded-feature-viz" class="summary-viz"
            :effect="effect"
            :impact="impact"
            :clinVarText="clinVarText"
            :clinVarClazz="clinVarClazz"
            :sift="sift"
            :polyPhen="polyPhen">
          </feature-viz>
        </v-flex>
        <v-flex xs6>
          <allele-frequency-viz id="loaded-freq-viz" class="summary-viz">
          </allele-frequency-viz>
        </v-flex>
    </v-layout>
    </v-container>
  </v-card>
</template>


<script>
// Import viz components
import FeatureViz from "./FeatureViz.vue"
import AlleleFrequencyViz from "./AlleleFrequencyViz.vue"
import HistogramViz from "./HistogramViz.vue"

export default {
  name: 'variant-summary-card',
  components: {
    FeatureViz,
    AlleleFrequencyViz,
    HistogramViz
  },
  props: {
    variant: null
  },
  data() { return {}},
  methods: {},
  filters: {},
  computed: {
    effect: function() {
      if (this.variant != null)
        return this.variant.vepConsequence;
      return "";
    },
    impact: function() {
      if (this.variant != null)
      {
        return this.variant.vepImpact;
      }
      return "";
    },
    clinVarText: function() {
      if (this.variant != null)
        return this.variant.clinvarSig;
      return "";
    },
    clinVarClazz: function() {
      if (this.variant != null)
        return "";
        // SJG TODO plug in clinvarSig into translator?
      return "";
    },
    sift: function() {
      if (this.variant != null)
        return this.variant.sift;
    },
    polyPhen: function() {
      if (this.variant != null)
        return this.variant.polyphen;
      return "";
    }
  },
  watch: {},
  mounted: function() {},
  created: function() {}
}

</script>
