<!-- Displays variant impact classification from various sources -->
<style >
</style>

<template>
  <div style="margin-top:-7px;margin-left:20px;display:inline-block;width:150px">
    <div>Effect: {{ effect }}</div>
    <div>Impact: {{ impact }}</div>
    <div>ClinVar: {{ clinVar }}</div>
    <div>Sift: {{ sift }}</div>
    <div>PolyPhen: {{ polyPhen }}</div>
  </div>
</template>

<script>

export default {
  name: 'feature-viz',
  props: {
    effect: {
      default: "",
      type: String
    },
    impact: {
      default: "",
      type: String
    },
    clinVar: {
      default: "",
      type: String
    },
    sift: {
      default: "",
      type: String
    },
    polyPhen: {
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
