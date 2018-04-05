<!-- Displays allele frequencies of selected variant -->
<style lang="sass">

.bar-outline
  stroke: #000 !important
  stroke-width: 1px !important
  stroke-opacity: .3 !important

</style>

<template>
  <v-flex xs12 sm12 md6 lg5>
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
       <v-flex xs2 md1 class="field-value">{{ probandDisplay }}</v-flex>
       <v-flex xs6 md7 id="probandProgress" class="field-value"></v-flex>
    </v-layout>
    <v-layout row>
       <v-flex xs4 class="field-label">Subset Frequency:</v-flex>
       <v-flex xs2 md1 class="field-value">{{ subsetDisplay }}</v-flex>
       <v-flex xs6 md7 id="subsetProgress" class="field-value"></v-flex>
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
      probandBar: {},
      subsetBar: {},
      probandDisplay: '-',
      subsetDisplay: '-'
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
    affectedSubsetCount: {
      default: 0,
      type: Number
    },
    totalProbandCount: {
      default: 0,
      type: Number
    },
    totalSubsetCount: {
      default: 0,
      type: Number
    }
  },
  created: function() {},
  mounted: function() {
    this.drawProgressBars();
  },
  computed: {
    affectedProbandPercentage: function() {
      if (this.totalProbandCount < 1) return "0";
      var freq = (Math.round((this.affectedProbandCount / this.totalProbandCount) * 100));
      if (freq == 0 && this.affectedProbandCount > 0) {
        return "1%";
      }
      return (Math.round((this.affectedProbandCount / this.totalProbandCount) * 100)) + "";
    },
    affectedSubsetPercentage: function() {
      if (this.totalSubsetCount < 1) return "0";
      var freq = (Math.round((this.affectedSubsetCount / this.totalSubsetCount) * 100));
      if (freq == 0 && this.affectedSubsetCount > 0) {
        return "1%";
      }
      return (Math.round((this.affectedSubsetCount / this.totalSubsetCount) * 100)) + "";
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

      self.probandBar = progressBar()
        .parentId('probandProgress')
        .on('d3rendered', function() {
        });
      self.probandBar();

      self.subsetBar = progressBar()
        .parentId('subsetProgress')
        .on('d3rendered', function() {
        });
      self.subsetBar();
    },
    fillProgressBars() {
      let self = this;

      self.oneKBar.moveProgressBar()(self.oneKGenomes);
      self.exAcBar.moveProgressBar()(self.exAc);
      self.probandBar.moveProgressBar()(self.affectedProbandPercentage);
      self.subsetBar.moveProgressBar()(self.affectedSubsetPercentage);
    },
    clear() {
      let self = this;
      self.oneKBar.moveProgressBar()(0);
      self.exAcBar.moveProgressBar()(0);
      self.probandBar.moveProgressBar()(0);
      self.subsetBar.moveProgressBar()(0);
    },
    getProbandDisplay() {
      if (this.selectedVariant == null) return "-";
      else if (this.totalProbandCount == 0) return "0%";
      else {
        var freq = Math.round((this.affectedProbandCount / this.totalProbandCount) * 100);
        if (freq == 0 && this.affectedProbandCount > 0) {
          return "<1%";
        }
        return freq + "%";
      }
    },
    getSubsetDisplay() {
      if (this.selectedVariant == null) return "-";
      else if (this.totalSubsetCount == 0) return "0%";
      else {
        var freq = Math.round((this.affectedSubsetCount / this.totalSubsetCount) * 100);
        if (freq == 0 && this.affectedSubsetCount > 0) {
          return "<1%";
        }
        return freq + "%";
      }
    }
  },
  watch: {
    selectedVariant: function() {
      this.fillProgressBars();
      this.probandDisplay = this.getProbandDisplay();
      this.subsetDisplay = this.getSubsetDisplay();
    }
  }
}

</script>
