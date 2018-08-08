<!-- Component populated with variant details on selection.
     SJG updated May2018 -->

<style lang="sass" >
@import ../../../assets/sass/variables
@import ../../../assets/sass/symbols

.summary-viz
  min-height: 100px
  max-height: 600px
  padding-top: 0px
  overflow-x: scroll

  .content
    font-size: 12px
    padding-left: 10px
    margin-bottom: 0px
    float: left
    max-width: 350px
    min-width: 350px

  .field-label
    color: #b4b3b3
    font-style: italic
    padding-left: 6px
    text-align: right

  .summary-field-label
    color: #b4b3b3
    font-style: italic
    font-size: 12px
    padding-left: 2px
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
    text-align: center

  .field-value
    padding-right: 25px
    padding-left: 5px
    word-break: break-word

  .summary-field-value
    // padding-right: 25px
    // padding-left: 5px
    font-size: 12px
    word-break: break-word
    padding-left: 1px
    padding-right: 1px

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
    <v-card-title primary-title style="width: 100%; height: 35px">
      <v-flex lg12 xl4 style="display:inline-block; padding-right: 10px; font-size: 15px">VARIANT SUMMARY</v-flex>
      <v-flex lg12 xl8>
        <div class='form-inline'>
          <div class='form-group'>
            <v-icon medium color="limeGreen" v-bind:class="{hide: variantSelected == false || subsetDelta < 2}">arrow_upward</v-icon>
            <v-icon medium color="slateGray" v-bind:class="{hide: variantSelected == false || (subsetDelta <= 1 || subsetDelta >= 2)}">arrow_upward</v-icon>
            <v-icon medium color="slateGray" v-bind:class="{hide: variantSelected == false || (subsetDelta <= 0.5 || subsetDelta >= 1)}">arrow_downward</v-icon>
            <v-icon medium color="cherryRed" v-bind:class="{hide: variantSelected == false || subsetDelta > 0.5}">arrow_downward</v-icon>
          </div>
          <div class='form-group'>
            <v-chip v-bind:class="{hide: variant == null}" v-bind:style="{margin: 0}" small outline color="cohortDarkBlue"
              @input="summaryCardVariantDeselect()">
               <span style="padding-right: 10px; font-size: 14px; text-align:center;" v-bind:class="{hide: geneName === ''}">{{geneName}}</span>
               <span style="padding-top: 1px; font-size: 12px; padding-right: 4px">{{selectedVariantLocation}}</span>
            </v-chip>
          </div>
        </div>
      </v-flex>
    </v-card-title>
    <v-container fluid grid-list-md>
      <v-layout row wrap>
        <feature-viz id="loaded-feature-viz" class="summary-viz" style="padding-top: 10px"
          ref="summaryFeatureViz"
          :effect="effect"
          :impactText="impactText"
          :impactColor="impactColor"
          :type="variantType"
          :clinVarText="clinVarText"
          :clinVarColor="clinVarColor"
          :siftText="siftText"
          :siftColor="siftColor"
          :polyPhenText="polyPhenText"
          :polyPhenColor="polyPhenColor"
          :foldEnrichmentInfo="foldEnrichmentInfo"
          :variantSelected="variantSelected"
          :loadingExtraAnnotations="loadingExtraAnnotations"
          :loadingExtraClinvarAnnotations="loadingExtraClinvarAnnotations">
        </feature-viz>
        <allele-frequency-viz id="loaded-freq-viz" class="summary-viz" style="padding-top: 10px"
        ref="summaryFrequencyViz"
        :selectedVariant="variant"
        :oneKGenomes="oneKGenomes"
        :exAc="exAc"
        :affectedProbandCount="affectedProbandCount"
        :affectedSubsetCount="affectedSubsetCount"
        :totalProbandCount="totalProbandCount"
        :totalSubsetCount="totalSubsetCount"
        :loadingExtraAnnotations="loadingExtraAnnotations">
        </allele-frequency-viz>
        <bar-feature-viz id="loaded-bar-feature-viz" class="summary-viz" style="padding-top: 10px"
        ref="summaryBarFeatureViz"
        :selectedVariant="variant"
        :probandZygMap="probandZygMap"
        :subsetZygMap="subsetZygMap"
        :affectedProbandCount="affectedProbandCount"
        :affectedSubsetCount="affectedSubsetCount"
        :totalProbandCount="totalProbandCount"
        :totalSubsetCount="totalSubsetCount">
        </bar-feature-viz>
      </v-layout>
    </v-container>
  </v-card>
</template>


<script>
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
    variantInfo: null,
    selectedGene: '',
    loadingExtraAnnotations: false,
    loadingExtraClinvarAnnotations: false
  },
  data() {
    return {}
  },
  computed: {
    totalProbandCount: function() {
      if (this.variant != null)
        return this.variant.totalProbandCount;
      return 0;
    },
    totalSubsetCount: function() {
      if (this.variant != null)
        return this.variant.totalSubsetCount;
      return 0;
    },
    affectedProbandCount: function() {
      if (this.variant != null)
        return this.variant.affectedProbandCount;
      return 0;
    },
    affectedSubsetCount: function() {
      if (this.variant != null)
        return this.variant.affectedSubsetCount;
      return 0;
    },
    subsetDelta: function() {
      if (this.variant != null) {
        let delta = this.variant.subsetDelta;
        let roundedDelta = Math.round(this.variant.subsetDelta * 10) / 10;
        if (delta <= 1.0)
          return delta;
        else
          return roundedDelta;
      }
      return 1;
    },
    foldEnrichmentInfo: function() {
      if (this.variant != null) {
        let delta = this.variant.subsetDelta;
        let adjDelta = this.variant.subsetDelta;
        if (delta < 1 && delta > 0) {
          adjDelta = 1/delta;
        }
        let foldEnrich = Math.round(adjDelta * 10) / 10;


        if (delta > 1) return (foldEnrich + "x" + " IN SUBSETS");
        else if (delta < 1) return (foldEnrich + "x" + " IN PROBANDS");
        else if (this.variant.totalSubsetCount > 0) return ("EQUAL FREQUENCY");
        else return "PROBANDS ONLY";
      }
      return "-";
    },
    enrichTextClass: function() {
      if (this.variant != null) {
        if (this.variant.subsetDelta >= 2) return '.enrichment_subset_UP';
        else if (this.variant.subsetDelta <= 0.5) return '.enrichment_subset_DOWN';
      }
      return "";
    },
    // Currently not using these but could be useful in the future...
    totalCountSelectedTrack: function() {
      if (this.variant != null) {
        if (this.variant.name == "HubProbands")
          return this.totalProbandCount;
        else if (this.variant.name == "HubSubsetProbands")
          return this.totalSubsetCount;
      }
      return 0;
    },
    affectedCountSelectedTrack: function() {
      if (this.variant != null) {
        if (this.variant.name == "HubProbands")
          return this.affectedProbandCount;
        else if (this.variant.name == "HubSubsetProbands")
          return this.affectedSubsetCount;
      }
      return 0;
    },
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
    probandZygMap: function() {
      let map = [];
      if (this.variant != null) {
        let zygArr = this.variant.probandZygCounts;
        map.push({label: "hom ref", value: zygArr[0]})
        map.push({label: "het", value: zygArr[1]})
        map.push({label: "hom alt", value: zygArr[2]})
        map.push({label: "no call", value: zygArr[3]})
      }
      else {
        map.push({label: "hom ref", value: 0})
        map.push({label: "het", value: 0})
        map.push({label: "hom alt", value: 0})
        map.push({label: "no call", value: 0})
      }
      return map;
    },
    subsetZygMap: function() {
      let map = [];
      if (this.variant != null) {
        let zygArr = this.variant.subsetZygCounts;
        map.push({label: "hom ref", value: zygArr[0]})
        map.push({label: "het", value: zygArr[1]})
        map.push({label: "hom alt", value: zygArr[2]})
        map.push({label: "no call", value: zygArr[3]})
      }
      else {
        map.push({label: "hom ref", value: 0})
        map.push({label: "het", value: 0})
        map.push({label: "hom alt", value: 0})
        map.push({label: "no call", value: 0})
      }
      return map;
    },
    statusMap: function() {
      var map = [];
      var affectedCount = 0, unaffectedCount = 0;

      if (this.variant != null && this.variant.genotypes != null) {
        var gtObj = this.variant.genotypes;
        for (var gt in gtObj) {
          if (gtObj.hasOwnProperty(gt)) {
            if (gtObj[gt].zygosity == 'HOM' || gtObj[gt].zygosity == 'HET')
              affectedCount++;
            else if (gtObj[gt].zygosity == 'HOMREF') {
              unaffectedCount++;
            }
          }
        }
      }
      map.push({label: "unaff", value: unaffectedCount});
      map.push({label: "aff", value: affectedCount});
      return map;
    },
    geneName: function() {
      if (this.variant != null && this.selectedGene != null) {
        return this.selectedGene;
      }
      return '';
    },
    selectedVariantLocation: function() {
      if (this.variant != null) {
        return this.variant.chrom + ' ' + this.variant.start.toLocaleString() + ' - ' + this.variant.end.toLocaleString();
      }
      return '';
    },
    variantSelected: function() {
      let self = this;
      return self.variant != null;
    }
  },
  mounted: function() {
    let self = this;
  },
  methods: {
    summaryCardVariantDeselect: function() {
      var self = this;
      self.$refs.summaryFrequencyViz.clear();
      //self.$refs.summaryBarFeatureViz.clear();  SJG NOTE: took out bars for now
      self.$emit("summaryCardVariantDeselect");
    }
  }
}

</script>
