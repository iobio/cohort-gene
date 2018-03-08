<!-- Displays allele frequencies of selected variant -->
<style lang="sass">
@import ../../../assets/sass/variables
#loaded-frequency-viz
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

  .field-value
    padding-right: 25px
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
  <v-layout class="content" column nowrap>
    <v-flex>
      <v-layout row>
        <v-flex xs4 class="field-label-header">Allele Frequencies</v-flex>
        <v-flex xs8></v-flex>
      </v-layout>
      <v-layout row>
         <v-flex xs4 class="field-label">1000 Genomes:</v-flex>
         <v-flex xs8 class="field-value">{{ oneKGenomes }}</v-flex>
      </v-layout>
      <v-layout row>
         <v-flex xs4 class="field-label">ExAC:</v-flex>
         <v-flex xs8 class="field-value">{{ exAc }}</v-flex>
      </v-layout>
      <v-layout row>
         <v-flex xs4 class="field-label">Simons VIP:</v-flex>
         <v-flex xs8 class="field-value">{{ simonsVip }}</v-flex>
      </v-layout>
      <v-layout row>
         <v-flex xs4 class="field-label">Simons Simplex Complex:</v-flex>
         <v-flex xs8 class="field-value">{{ simonsSimplexComplex }}</v-flex>
      </v-layout>
    </v-flex>
  </v-layout>
</template>

<script>

export default {
  name: 'allele-frequency-viz',
  props: {
    oneKGenomes: {
      default: "",
      type: String
    },
    exAc: {
      default: "",
      type: String
    },
    simonsSimplexComplex: {
      default: "",
      type: String
    },
    simonsVip: {
      default: "",
      type: String
    }
  },
  created: function() {},
  mounted: function() {},
  methods: {},
  watch: {}
}

</script>
