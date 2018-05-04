<!-- Displays sample zygosity, affected status, and sample depth histograms -->

<style>
  .bar--positive {
    fill: steelblue;
  }

  .bar--negative {
    fill: darkorange;
  }

  .axis text {
    font: 10px sans-serif;
  }

  .axis path,
  .axis line {
    fill: none;
    stroke: #000;
    shape-rendering: crispEdges;
  }
</style>

<template>
<v-flex xs12>
  <v-layout row>
      <v-flex xs12 class="field-label-header" style="text-align:left">Zygosity Counts</v-flex>
    </v-layout>
    <v-layout row>
      <v-flex xs3 class="summary-field-label">Probands:</v-flex>
      <v-flex xs1 class="summary-field-value">{{blank}}</v-flex>
      <v-flex xs8 id="probandZygBar" style="padding-bottom:5px"></v-flex>
    </v-layout>
    <v-layout row>
      <v-flex xs3 class="summary-field-label">Subsets:</v-flex>
      <v-flex xs1 class="summary-field-value">{{blank}}</v-flex>
      <v-flex xs8 id="subsetZygBar" style="padding-bottom:5px"></v-flex>
    </v-layout>
  </v-flex>
</template>

<script>
export default {
  name: 'bar-feature-viz',
  data() {
    return {
      probandZygChart: {},
      subsetZygChart: {},
      //depthChart: {},
      blank: ''
    }
  },
  props: {
    selectedVariant: {},
    probandZygMap: {},
    subsetZygMap: {},
    statusMap: {},
    depthMap: {},
    affectedProbandCount: {},
    affectedSubsetCount: {},
    totalProbandCount: {},
    totalSubsetCount: {}
  },
  created: function() {},
  mounted: function() {
    this.drawCharts();
  },
  methods: {
    drawCharts() {
      let self = this;

      self.probandZygChart = barChart()
        .parentId('probandZygBar')
        .on('d3rendered', function() {
        });
      self.probandZygChart(self.probandZygMap);

      self.subsetZygChart = barChart()
        .parentId('subsetZygBar')
        .on('d3rendered', function() {
        });
      self.subsetZygChart(self.subsetZygMap);
    },
    fillCharts() {
      let self = this;
      self.probandZygChart.fillChart()(self.probandZygMap);
      self.subsetZygChart.fillChart()(self.subsetZygMap);
      //self.depthChart.fillChart()(self.depthMap);
    },
    clear() {
      let self = this;
      self.probandZygChart.fillChart()();
      self.subsetZygChart.fillChart()();
      //self.depthChart.fillChart()();
    }
  },
  watch: {
    selectedVariant: function() {
      this.fillCharts();
    }
  }
}
</script>
