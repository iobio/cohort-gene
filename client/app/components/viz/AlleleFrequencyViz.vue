<!-- Displays allele frequencies of selected variant -->

<style></style>

<template>
  <!-- TODO: needs to be col 6 on this -->
  <div style="vertical-align:top;margin-top:-5px;margin-left:20px;display:inline-block">
    <div style="margin-bottom: 5px">Allele Frequencies:</div>
    <div>1000 Genomes: {{ oneKGenomes }}</div>
    <div>ExAC: {{ exAc }}</div>
    <div>Simons Simplex Complex: {{ simonsSimplexComplex }}</div>
    <div>Simons VIP: {{ simonsVip }}</div>
  </div>
</template>

<script>

export default {
  name: 'allele-frequency-viz',
  // TODO
  props: {},
  created: function() {},
  mounted: function() {},
  methods: {},
  watch: {}
}

</script>
