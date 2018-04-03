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
       <v-flex xs4 class="field-label">Proband Frequency:</v-flex>
       <v-flex xs2 md1 class="field-value">{{ affectedProbandPercentageDisplay }}</v-flex>
       <v-flex xs6 md7 id="sampleProgress" class="field-value"></v-flex>
    </v-layout>
    <v-layout row>
       <v-flex xs4 class="field-label">Subset Frequency:</v-flex>
       <v-flex xs2 md1 class="field-value">{{ enrichmentPercentage }}</v-flex>
       <v-flex xs6 md7 id="enrichmentProgress" class="field-value"></v-flex>
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
      enrichmentBar: {},
      sampleBar: {}
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
    affectedProbandCount: {
      default: 0,
      type: Number
    },
    totalSampleCount: {
      default: 0,
      type: Number
    },
    enrichmentPercentage: {
      default: "",
      type: String
    }
  },
  created: function() {},
  mounted: function() {
    this.drawProgressBars();
  },
  computed: {
    affectedProbandPercentageDisplay: function() {
      if (this.totalSampleCount == 0) return "-";

      var freq = Math.round((this.affectedProbandCount / this.totalSampleCount) * 100);
      if (freq == 0 && this.affectedProbandCount > 0) {
        return "<1%";
      }
      return freq + "%";
    },
    affectedProbandPercentage: function() {
      if (this.totalSampleCount == 0) return "0";
      var freq = (Math.round((this.affectedProbandCount / this.totalSampleCount) * 100));
      if (freq == 0 && this.affectedProbandCount > 0) {
        return "1%";
      }
      return (Math.round((this.affectedProbandCount / this.totalSampleCount) * 100)) + "";
    }
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

      self.enrichmentBar = progressBar()
        .parentId('enrichmentProgress')
        .on('d3rendered', function() {
        });
      self.enrichmentBar();

      self.sampleBar = progressBar()
        .parentId('sampleProgress')
        .on('d3rendered', function() {
        });
      self.sampleBar();
    },
    fillProgressBars() {
      let self = this;

      self.oneKBar.moveProgressBar()(self.oneKGenomes);
      self.exAcBar.moveProgressBar()(self.exAc);
      self.sampleBar.moveProgressBar()(self.affectedProbandPercentage);
      self.enrichmentBar.moveProgressBar()(self.enrichmentPercentage);
    },
    clear() {
      let self = this;

      self.oneKBar.moveProgressBar()(0);
      self.exAcBar.moveProgressBar()(0);
      self.sampleBar.moveProgressBar()(0);
      self.enrichmentBar.moveProgressBar()(0);
    }
  },
  watch: {
    selectedVariant: function() {
      this.fillProgressBars();
    }
  }
}

</script>
