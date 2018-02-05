<!--
Main application page
Updated: SJG 01Feb2018
-->
<style lang="sass">
.app-card
  margin-bottom: 10px
</style>

<template>
<div>
  <navigation v-on:input="onGeneSelected"></navigation>
  <v-content>
    <v-container fluid>
      <sfari-variant-card
        ref="sfariVariantCardRef"
        :key="model.name"
        v-bind:class="{ hide: Object.keys(selectedGene).length == 0 || !sfariModel  || sfariModel.allInProgress.loadingDataSources }"
        :sfariModel="model"
        :classifyVariantSymbolFunc="model.classifyByImpact"
        :variantTooltip="variantTooltip"
        :selectedGene="selectedGene"
        :selectedTranscript="selectedTranscript"
        :selectedVariant="selectedVariant"
        :regionStart="geneRegionStart"
        :regionEnd="geneRegionEnd"
        :width="cardWidth"
        :showGeneViz="true"
        :showVariantViz="true"
        @sfariVariantClick="onSfariVariantClick"
        @sfariVariantClickEnd="onSfariVariantClickEnd"
        @sfariVariantHover="onSfariVariantHover"
        @sfariVariantHoverEnd="onSfariVariantHoverEnd"
        @knownVariantsVizChange="onKnownVariantsVizChange"
        @knownVariantsFilterChange="onKnownVariantsFilterChange"
      ></sfari-variant-card>
      <!-- TODO: bind model w/ summary logic -->
      <variant-summary-card
        :effect="effect",
        :impact="impact",
        :clinVar="clinVar",
        :sift="sift",
        :polyPhen="polyPhen"
      ></variant-summary-card>
    </v-container>
  </v-content>
</div>
</template>

<script>
// Vue components
import Navigation from '../partials/Navigation.vue'
import GeneCard from '../viz/GeneCard.vue'
import VariantCard from  '../viz/VariantCard.vue'
import VariantSummaryCard from '../viz/VariantSummaryCard.vue'

// Back-end models
import GeneModel from '../../models/GeneModel.js'
import SfariModel    from  '../../models/SfariModel.js'
import FilterModel    from  '../../models/FilterModel.js'

export default {
  name: 'home',
  components: {
    Navigation,
    VariantCard,
    GeneCard,
    VariantSummaryCard
  },
  props: [],
  data() {
    return {
      greeting: 'cohort-gene.iobio.vue',
      selectedGene: {},
      selectedTranscript: {},
      geneRegionBuffer: 1000,
      geneRegionStart: null,
      geneRegionEnd: null,
      sfariModel: null,
      model: null,
      geneModel: null,
      filterModel: null,
      inProgress: false,
      cardWidth: 0,
      showClinvarVariants: false,

      // SJG new additions for variant summary card
      effect: null,
      inpact: null,
      clinVar: null,
      sift: null,
      polyPhen: null
    }
  },

  created: function() {
    // Purposely blank
  },

  mounted: function() {
    let self = this;
    self.cardWidth = self.$el.offsetWidth;

    // Performs ajax call to pull in build data
    genomeBuildHelper.promiseInit({
        DEFAULT_BUILD: 'GRCh37'
      })
      // Opens up communication w/ db
      .then(function() {
        return self.promiseInitCache();
      })
      // Clears any data in "gene.iobio.stale"
      .then(function() {
        return cacheHelper.promiseClearStaleCache();
      })
      // Instantiate helper class than encapsulates IOBIO commands
      .then(function() {
        endpoint = new EndpointCmd(useSSL, IOBIO, cacheHelper.launchTimestamp, genomeBuildHelper, utility.getHumanRefNames);
      })
      // Construct back end gene model
      .then(function() {
        self.geneModel = new GeneModel();
        self.geneModel.geneSource = siteGeneSource;

        // Construct back end sfari model
        self.sfariModel = new SfariModel(self.geneModel);
        return self.cohortModel.promiseInitDemo();
      })
      // Construct back end filter model
      .then(function() {
          self.models = self.cohortModel.sampleModels;
          self.filterModel = new FilterModel(self.cohortModel.affectedInfo);
        },
        function(error) {})
  },
  computed: {},
  watch: {
    sfariModel: function() {
      if (this.sfariModel) {
        this.models = this.sfariModel.sampleModels;
      }
    }
  },
  methods: {
    promiseInitCache: function() {
      return new Promise(function(resolve, reject) {
        cacheHelper.promiseInit()
          .then(function() {
            cacheHelper.isolateSession();
            resolve();
          })
          .catch(function(error) {
            var msg = "A problem occurred in promiseInitCache(): " + error;
            console.log(msg);
            reject(msg);
          })
      })
    },

    promiseLoadData: function() {
      let self = this;
      self.inProgress = true;

      return new Promise(function(resolve, reject) {
        self.sfariModel.promiseLoadData(self.selectedGene,
            self.selectedTranscript,
            self.filterModel, {
              getKnownVariants: self.showClinvarVariants
            })
          .then(function(resultMap) {
            self.filterModel.populateEffectFilters(resultMap);
            self.filterModel.populateRecFilters(resultMap);
            //var bp = me._promiseDetermineVariantBookmarks(vcfData, theGene, theTranscript);
            //bookmarkPromises.push(bp);
            self.inProgress = false;
            resolve();
          })
          .catch(function(error) {
            reject(error);
          })
      })
    },

    onGeneSelected: function(geneObject) {
      var self = this;

      self.geneModel.addGeneName(geneObject.gene_name);
      self.geneModel.promiseGetGeneObject(geneObject.gene_name)
        .then(function(theGeneObject) {
          self.geneModel.adjustGeneRegion(theGeneObject, parseInt(self.geneRegionBuffer));
          self.selectedGene = theGeneObject;
          self.geneRegionStart = self.selectedGene.start;
          self.geneRegionEnd = self.selectedGene.end;
          self.selectedTranscript = self.geneModel.getCanonicalTranscript(self.selectedGene);
          self.promiseLoadData()
            .then(function() {
              // SJG why is this blank?
            })
        })
    },
    onTranscriptSelected: function(transcript) {
      var self = this;
      self.selectedTranscript = transcript;
    },
    onGeneSourceSelected: function(theGeneSource) {
      var self = this;
      self.geneModel.geneSource = theGeneSource;
      this.onGeneSelected(this.selectedGene);
    },
    onGeneRegionBufferChange: function(theGeneRegionBuffer) {
      this.geneRegionBuffer = theGeneRegionBuffer;
      this.onGeneSelected(this.selectedGene);
    },
    onGeneRegionZoom: function(theStart, theEnd) {
      this.geneRegionStart = theStart;
      this.geneRegionEnd = theEnd;
      this.sfariModel.setLoadedVariants(this.selectedGene, this.geneRegionStart, this.geneRegionEnd);
      console.log("gene region zoom = " + this.geneRegionStart + '-' + this.geneRegionEnd);
    },
    onGeneRegionZoomReset: function() {
      this.geneRegionStart = this.selectedGene.start;
      this.geneRegionEnd = this.selectedGene.end;
      this.sfariModel.setLoadedVariants(this.selectedGene);
      console.log("gene region zoom reset");
    }
  }
}
</script>
