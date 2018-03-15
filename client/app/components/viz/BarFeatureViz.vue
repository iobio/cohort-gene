<!-- Displays sample zygosity, affected status, and sample depth histograms -->

<style>
</style>

<template>
  <v-layout class="content" column nowrap>
    <v-flex>
      <v-layout row>
        <v-flex xs4 class="subtitle-label">Sample Zygosities</v-flex>
        <v-flex xs4 class="subtitle-label">Affected Status</v-flex>
        <v-flex xs4 class="subtitle-label">Sample Depths</v-flex>
      </v-layout>
      <v-layout row>
        <v-flex xs4 id="zygosityBar"></v-flex>
        <v-flex xs4 id="affectedBar"></v-flex>
        <v-flex xs4 id="depthBar"></v-flex>
      </v-layout>
    </v-flex>
  </v-layout>
</template>

<script>
export default {
  name: 'allele-frequency-viz',
  data() {
    return {
      oneKBar: {},
      exAcBar: {},
      simonsSimplexBar: {},
      simonsVipBar: {}
    }
  },
  props: {
    selectedVariant: {},
    zygHom: {
      default: 0,
      type: Number
    },
    zygHet: {
      default: 0,
      type: Number
    },
    zygHomRef: {
      default: 0,
      type: Number
    },
    zygNoCall: {
      default: 0,
      type: Number
    },
    statusAffected: {
      default: 0,
      type: Number
    },
    statusUnaffected: {
      default: 0,
      type: Number
    },
    sampleDepths: {}
  },
  created: function() {},
  mounted: function() {
    this.drawBars();
  },
  methods: {
    drawBars() {
      let self = this;

      self.oneKBar = progressBar()
        .parentId('oneKProgress')
        .on('d3rendered', function() {
        });
      self.oneKBar();

      self.exAcBar = progressBar()
        .parentId('exAcProgress')
        .on('d3rendered', function() {
        });
      self.exAcBar();

      self.simonsSimplexBar = progressBar()
        .parentId('simonsSimplexProgress')
        .on('d3rendered', function() {
        });
      self.simonsSimplexBar();

      self.simonsVipBar = progressBar()
        .parentId('simonsVipProgress')
        .on('d3rendered', function() {
        });
      self.simonsVipBar();
    },
    fillProgressBars() {
      let self = this;

      self.oneKBar.moveProgressBar(self.oneKGenomes, 'oneKProgress');
      self.exAcBar.moveProgressBar(self.exAc, 'exAcProgress');
      self.simonsSimplexBar.moveProgressBar(self.simonsSimplex, 'simonsSimplexProgress');
      self.simonsVipBar.moveProgressBar(self.simonsVip, 'simonsVipProgress');
    }
  },
  watch: {
    selectedVariant: function() {
      this.fillProgressBars();
    }
  }
}
</script>
