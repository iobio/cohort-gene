<!-- Variant Summary card -->
<style lang="sass"></style>

<template>
  <v-card>
    <v-card-title primary-title style="margin-bottom: 8px">VARIANT SUMMARY</v-card-title>
      <!-- TODO: conditionally display -->
      <!-- TODO: assign ref if need to manipulate w/ methods -->
      <feature-viz id="loaded-feature-viz"
        :effect="effect"
        :impact="impact"
        :clinVar="clinVar"
        :sift="sift"
        :polyPhen="polyPhen">
      </feature-viz>
      <allele-frequency-viz></allele-frequency-viz>
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
    effect: "",
    impact: "",
    clinVar: "",
    sift: "",
    polyPhen: ""
  },
  data() { return {}},
  methods: {},
  filters: {},
  computed: {},
  watch: {},
  mounted: function() {},
  created: function() {}
}

</script>
