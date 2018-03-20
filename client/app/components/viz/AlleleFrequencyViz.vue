<!-- Displays allele frequencies of selected variant -->
<style lang="sass">

.bar-outline
  stroke: #000 !important
  stroke-width: 1px !important
  stroke-opacity: .3 !important

</style>

<template>
  <v-flex xs12 sm12 md6 lg4>
    <v-layout row>
      <v-flex xs4 class="field-label-header">Allele Frequencies</v-flex>
      <v-flex xs8></v-flex>
    </v-layout>
    <v-layout row>
       <v-flex xs4 class="field-label">1000 Genomes:</v-flex>
       <v-flex xs2 md1 class="field-value">{{ oneKGenomes }}</v-flex>
       <v-flex xs6 md7 id="oneKProgress" class="field-value"></v-flex>
    </v-layout>
    <v-layout row>
       <v-flex xs4 class="field-label">ExAC:</v-flex>
       <v-flex xs2 md1 class="field-value">{{ exAc }}</v-flex>
       <v-flex xs6 md7 id="exAcProgress" class="field-value"></v-flex>
    </v-layout>
    <v-layout row>
       <v-flex xs4 class="field-label">Simons VIP:</v-flex>
       <v-flex xs2 md1 class="field-value">{{ simonsVip }}</v-flex>
       <v-flex xs6 md7 id="simonsVipProgress" class="field-value"></v-flex>
    </v-layout>
    <v-layout row>
       <v-flex xs4 class="field-label">Simons Simplex Complex:</v-flex>
       <v-flex xs2 md1 class="field-value">{{ simonsSimplexComplex }}</v-flex>
       <v-flex xs6 md7 id="simonsSimplexProgress" class="field-value"></v-flex>
    </v-layout>
  </v-flex>
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
  mounted: function() {
    this.drawProgressBars();
  },
  methods: {
    drawProgressBars() {
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

      self.oneKBar.moveProgressBar()(self.oneKGenomes);
      self.exAcBar.moveProgressBar()(self.exAc);
      self.simonsSimplexBar.moveProgressBar()(self.simonsSimplex);
      self.simonsVipBar.moveProgressBar()(self.simonsVip);
    },
    clear() {
      let self = this;

      self.oneKGenomes = "-";
      self.exAc = "-";
      self.simonsSimplexComplex = "-";
      self.simonsVip = "-";

      self.oneKBar.moveProgressBar()(0);
      self.exAcBar.moveProgressBar()(0);
      self.simonsSimplexBar.moveProgressBar()(0);
      self.simonsVipBar.moveProgressBar()(0);
    }
  },
  watch: {
    selectedVariant: function() {
      this.fillProgressBars();
    }
  }
}

</script>
