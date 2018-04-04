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
  <v-flex xs12 sm12 md12 lg6>
    <v-layout row>
      <v-flex xs4 class="subtitle-label">Sample Zygosities</v-flex>
      <v-flex xs4 class="subtitle-label">Affected Status</v-flex>
      <v-flex xs4 class="subtitle-label">Sample Depths</v-flex>
    </v-layout>
    <v-layout row>
      <v-flex xs4 id="zygBar"></v-flex>
      <v-flex xs4 id="statusBar"></v-flex>
      <v-flex xs4 id="depthBar"></v-flex>
    </v-layout>
  </v-flex>
</template>

<script>
export default {
  name: 'bar-feature-viz',
  data() {
    return {
      zygChart: {},
      statusChart: {},
      depthChart: {}
    }
  },
  props: {
    selectedVariant: {},
    zygMap: {},
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

      self.zygChart = barChart()
        .parentId('zygBar')
        .on('d3rendered', function() {
        });
      self.zygChart(self.zygMap);

      self.statusChart = barChart()
        .parentId('statusBar')
        .on('d3rendered', function() {
        });
      self.statusChart(self.statusMap);

      self.depthChart = barChart()
        .parentId('depthBar')
        .comingSoonFlag(true)
        .on('d3rendered', function() {
        });
      self.depthChart(self.depthMap);
    },
    fillCharts() {
      let self = this;
      // SJG TODO: get this working
      //self.zygChart.redrawYAxis()(self.totalSampleCount);
      self.zygChart.fillChart()(self.zygMap);
      self.statusChart.fillChart()(self.statusMap);
      self.depthChart.fillChart()(self.depthMap);
    },
    clear() {
      let self = this;
      self.zygChart.fillChart()();
      self.statusChart.fillChart()();
      self.depthChart.fillChart()();
    }
  },
  watch: {
    selectedVariant: function() {
      this.fillCharts();
    }
  }
}
</script>
