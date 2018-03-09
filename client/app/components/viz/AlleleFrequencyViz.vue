<!-- Displays allele frequencies of selected variant -->
<style lang="sass">

.bar-outline
  stroke: #000 !important
  stroke-width: 1px !important
  stroke-opacity: .3 !important

</style>

<template>
  <v-layout class="content" column nowrap>
    <v-flex>
      <v-layout row>
        <v-flex xs4 class="field-label-header">Allele Frequencies</v-flex>
        <v-flex xs8></v-flex>
      </v-layout>
    </v-flex>
    <v-flex>
      <v-layout row>
         <v-flex xs4 class="field-label">1000 Genomes:</v-flex>
         <v-flex xs2 class="field-value">{{ oneKGenomes }}</v-flex>
         <v-flex xs6 id="oneKProgress" class="field-value"></v-flex>
      </v-layout>
    </v-flex>
    <v-flex>
      <v-layout row>
         <v-flex xs4 class="field-label">ExAC:</v-flex>
         <v-flex xs2 class="field-value">{{ exAc }}</v-flex>
         <v-flex xs6 id="exAcProgress" class="field-value"></v-flex>
      </v-layout>
    </v-flex>
    <v-flex>
      <v-layout row>
         <v-flex xs4 class="field-label">Simons VIP:</v-flex>
         <v-flex xs2 class="field-value">{{ simonsVip }}</v-flex>
         <v-flex xs6 id="simonsVipProgress" class="field-value"></v-flex>
      </v-layout>
      <v-layout row>
         <v-flex xs4 class="field-label">Simons Simplex Complex:</v-flex>
         <v-flex xs2 class="field-value">{{ simonsSimplexComplex }}</v-flex>
         <v-flex xs6 id="simonsSimplexProgress" class="field-value"></v-flex>
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
    drawExAcBar: function() {
      var self = this;
      var segmentWidth = 200;

      // Draw bar base
      var svg = d3.select('#exAcProgress')
    		.append('svg')
    		.attr('height', 20)
    		.attr('width', 500)
        .attr('style', 'padding-top: 4px; padding-left: 1px')     // SJG TODO: this needs to work on screens of various sizes
        .attr('class', 'bar-outline');

    	svg.append('rect')
    		.attr('class', 'bg-rect')
    		.attr('rx', 10)
    		.attr('ry', 10)
    		.attr('fill', 'white')
    		.attr('height', 15)
    		.attr('width', function(){
    			return segmentWidth;
    		})
    		.attr('x', 0);
    },
    fillExAcBar() {
      var self = this;
      debugger;

      var states = [33, 66, 100];
      var frequency = self.exAc;
      var colorScale = d3.scale.ordinal()
        .domain(states)
        .range(['green', 'yellow', 'red']);

      var svg = d3.select('exAcProgress');

      var progress = svg.append('rect')
        .attr('class', 'progress-rect')
        .attr('fill', function(){
          return colorScale(frequency * segmentWidth);
        })
        .attr('height', 15)
        .attr('width', 0)
        .attr('rx', 10)
        .attr('ry', 10)
        .attr('x', 0);

      progress.transition()
        .duration(1000)
        .attr('width', function(){
          return (frequency * segmentWidth);
        });
    }
  },
  watch: {
    // SJG TODO: take this out of watch and call it from home
    exAc: function() {
      this.fillExAcBar();
    }
  }
}

</script>
