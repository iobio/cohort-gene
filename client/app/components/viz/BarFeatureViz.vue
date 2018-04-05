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
  <v-flex xs12 sm12 md12 lg5>
    <v-layout row>
      <v-flex xs6 class="subtitle-label">Proband Zygosities</v-flex>
      <v-flex xs6 class="subtitle-label">Subset Zygosities</v-flex>
      <!-- <v-flex xs4 class="subtitle-label">Sample Depths</v-flex> -->
    </v-layout>
    <v-layout row style="padding-left: 5%">
      <v-flex xs6 id="probandZygBar"></v-flex>
      <v-flex xs6 id="subsetZygBar"></v-flex>
      <!-- <v-flex xs4 id="depthBar"></v-flex> -->
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
      //depthChart: {}
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
        //.yValueMax(self.totalProbandCount)
        .on('d3rendered', function() {
        });
      self.probandZygChart(self.probandZygMap);

      self.subsetZygChart = barChart()
        .parentId('subsetZygBar')
        //.yValueMax(self.totalSubsetCount)
        .on('d3rendered', function() {
        });
      self.subsetZygChart(self.subsetZygMap);

      // self.depthChart = barChart()
      //   .parentId('depthBar')
      //   .comingSoonFlag(true)
      //   .on('d3rendered', function() {
      //   });
      // self.depthChart(self.depthMap);
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
