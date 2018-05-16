<!-- Main application page holding all cards.
TD & SJG updated Apr2018 -->

<style lang="sass">
@import ../../../assets/sass/variables

.app-card
  margin-bottom: 10px

#data-sources-loader
  margin-top: 20px
  margin-left: auto
  margin-right: auto
  text-align: center

</style>

<template>
<div>
  <navigation
    v-if="variantModel"
    ref="navRef"
    :knownGenes="variantModel.geneModel.allKnownGenes"
    :selectedGeneName="selectedGene.gene_name"
    :selectedChr="selectedGene.chr"
    @input="onGeneSelected"
    @load-demo-data="onLoadDemoData"
    @clear-cache="clearCache"
    @apply-genes="onApplyGenes"
    @on-files-loaded="onFilesLoaded"
  ></navigation>
  <v-content>
    <v-container fluid style="padding-top: 3px">
      <v-layout>
        <v-flex xs9>
          <updated-variant-card
            v-if="variantModel"
            ref="variantCardRef"
            :dataSetModel="variantModel.dataSet"
            :annotationScheme="variantModel.annotationScheme"
            :classifyVariantSymbolFunc="variantModel.classifyByImpactEnrichment"
            :variantTooltip="variantTooltip"
            :selectedGene="selectedGene"
            :selectedTranscript="selectedTranscript"
            :selectedVariant="selectedVariant"
            :regionStart="geneRegionStart"
            :regionEnd="geneRegionEnd"
            :width="cardWidth"
            :showGeneViz="true"
            :showVariantViz="true"
            :geneVizShowXAxis="true"
            :doneLoadingData="doneLoadingData"
            :doubleMode="true"
            @dataSetVariantClick="onDataSetVariantClick"
            @dataSetVariantClickEnd="onDataSetVariantClickEnd"
            @dataSetVariantHover="onDataSetVariantHover"
            @dataSetVariantHoverEnd="onDataSetVariantHoverEnd"
            @knownVariantsVizChange="onKnownVariantsVizChange"
            @knownVariantsFilterChange="onKnownVariantsFilterChange">
          </updated-variant-card>
        </v-flex>
        <v-flex xs3 style="margin-left: 3px">
          <!-- <variant-zoom-card
          style="margin-bottom: 3px; height: 300px"
          :selectedGene="selectedGene.gene_name"
          :selectedVariants="selectedVariant"
          :selectedVariantsInfo="selectedVariantInfo"
          @displayVariantBrush="displayVariantBrush"
          ref="variantZoomCard">
          </variant-zoom-card> -->
          <variant-summary-card
            :selectedGene="selectedGene.gene_name"
            :variant="selectedVariant"
            :variantInfo="selectedVariantInfo"
            @summaryCardVariantDeselect="deselectVariant"
            ref="variantSummaryCardRef">
          </variant-summary-card>
        </v-flex>
      </v-layout>
    </v-container>
  </v-content>
</div>
</template>

<script>
// Vue components
import Navigation from '../partials/Navigation.vue'
import GeneCard from '../viz/GeneCard.vue'
import VariantCard from  '../viz/VariantCard.vue'
import UpdatedVariantCard from '../viz/UpdatedVariantCard.vue'
import VariantSummaryCard from '../viz/VariantSummaryCard.vue'
import VariantZoomCard from '../viz/VariantZoomCard.vue'

// Models
import GeneModel        from '../../models/GeneModel.js'
import FilterModel      from '../../models/FilterModel.js'
import VariantModel     from '../../models/VariantModel.js'

// Static data
import allGenesData from '../../../data/genes.json'
import simonsIdMap from '../../../data/idmap.json'

export default {
  name: 'home',
  components: {
    Navigation,
    GeneCard,
    VariantSummaryCard,
    VariantZoomCard,
    VariantCard,
    UpdatedVariantCard
    // SJG TODO: add FeatureMatrixCard, GenesCard
  },
  props: {
    paramProjectId: {
      default: '0',
      type: String
    },
    paramTokenType: {
      default: '',
      type: String
    },
    paramToken: {
      default: '',
      type: String
    },
    paramSource: {
      default: '',
      type: String
    }
  },
  data() {
    return {
      greeting: 'cohort-gene.iobio.vue',

      selectedGene: {},
      selectedTranscript: {},
      selectedVariant: null,
      doneLoadingData: false,
      doneInit: false,
      geneRegionStart: null,
      geneRegionEnd: null,
      adjustedVariantStart: null,
      adjustedVariantEnd: null,
      inProgress: {},
      genesInProgress: {},

      allGenes: allGenesData,
      simonsIdMap: simonsIdMap,

      variantModel: null,
      geneModel: null,
      bookmarkModel: null,
      filterModel: null,
      cacheHelper: null,
      genomeBuildHelper: null,

      variantTooltip: null,
      cardWidth: 0,
      showClinvarVariants: false,
      activeBookmarksDrawer: null,

      DEMO_GENE: 'POGZ'   // SJG TODO: get rid of this outside of demo
    }
  },
  computed: {
    selectedVariantInfo: function() {
      if (this.selectedVariant) {
        return utility.formatDisplay(this.selectedVariant, this.variantModel.translator)
      } else {
        return null;
      }
    }
  },
  mounted: function() {
    // Initialize models & get data loading
    let self = this;
    self.cardWidth = self.$el.offsetWidth;

    self.genomeBuildHelper = new GenomeBuildHelper();
    self.genomeBuildHelper.promiseInit({DEFAULT_BUILD: 'GRCh37'})
    .then(function() {
      return self.promiseInitCache();
    })
    .then(function() {
      return self.cacheHelper.promiseClearStaleCache();
    })
    .then(function() {
      var glyph = new Glyph();
      var translator = new Translator(glyph);
      var genericAnnotation = new GenericAnnotation(glyph);

      self.geneModel = new GeneModel();
      self.geneModel.geneSource = siteGeneSource;
      self.geneModel.genomeBuildHelper = self.genomeBuildHelper;
      self.geneModel.setAllKnownGenes(self.allGenes);
      self.geneModel.translator = translator;

      let endpoint = new EndpointCmd(useSSL,
        IOBIO,
        self.cacheHelper.launchTimestamp,
        self.genomeBuildHelper,
        utility.getHumanRefNames);

      let hubEndpoint = new HubEndpoint(self.paramSource);

      self.variantModel = new VariantModel(endpoint,
        genericAnnotation,
        translator,
        self.geneModel,
        self.cacheHelper,
        self.genomeBuildHelper,
        hubEndpoint);

      self.variantModel.setIdMap(self.simonsIdMap);
      self.inProgress = self.variantModel.inProgress;

      self.variantTooltip = new VariantTooltip(genericAnnotation,
        glyph,
        translator,
        self.variantModel.annotationScheme,
        self.genomeBuildHelper);
    })
    .then(function() {
      self.filterModel = new FilterModel(self.variantModel.affectedInfo);
      self.variantModel.filterModel = self.filterModel;

      self.initFromUrl();
    },
    function(error) {
      alert("There was a problem contacting our iobio services. Please refresh the application, or contact iobioproject@gmail.com if the problem persists.");
    })
  },
  methods: {
    promiseInitCache: function() {
      let self = this;
      return new Promise(function(resolve, reject) {
        self.cacheHelper = new CacheHelper();
        self.cacheHelper.on("geneAnalyzed", function(geneName) {
          self.$refs.genesCardRef.determineFlaggedGenes();
          self.$refs.navRef.onShowFlaggedVariants();
        })
        globalCacheHelper = self.cacheHelper;
        self.cacheHelper.promiseInit()
         .then(function() {
          self.cacheHelper.isolateSession();
          resolve();
         })
         .catch(function(error) {
          var msg = "A problem occurred in promiseInitCache(): " + error;
          console.log(msg);
          reject(msg);
         })
      })
    },
    promiseClearCache: function() {
      let self = this;
      return self.cacheHelper._promiseClearCache(self.cacheHelper.launchTimestampToClear);
    },
    onLoadDemoData: function() {
      let self = this;
      self.geneModel.copyPasteGenes(self.variantModel.demoGenes.join(", "));
      self.onGeneSelected(self.DEMO_GENE);
      self.variantModel.promiseInitDemo()
      .then(function() {
        if (self.selectedGene && Object.keys(self.selectedGene).length > 0) {
          self.promiseLoadData();
        }
      })
    },
    promiseLoadData: function() {
      let self = this;

      return new Promise(function(resolve, reject) {
        if (self.variantModel.dataSet) {
          var options = {'getKnownVariants': self.showClinvarVariants};

          self.variantModel.promiseLoadData(self.selectedGene,
            self.selectedTranscript,
            self.filterModel,
            options)
          .then(function(resultMap) {
            self.doneLoadingData = true;
            self.doneInit = true;
            resolve();
          })
          .catch(function(error) {
            reject(error);
          })
        } else {
          Promise.resolve();
        }
      })
    },
    onFilesLoaded: function() {
      let self = this;
      self.promiseClearCache()
      .then(function() {
        if (self.selectedGene && self.selectedGene.gene_name) {
          self.promiseLoadGene(self.selectedGene.gene_name);
        } else if (self.geneModel.sortedGeneNames && self.geneModel.sortedGeneNames.length > 0) {
          self.onGeneSelected(self.geneModel.sortedGeneNames[0]);
        } else {
          alertify.set('notifier','position', 'top-left');
          alertify.warning("Please enter a gene name");
        }
      })
    },
    onGeneSelected: function(geneName) {
      var self = this;
      self.deselectVariant();
      self.promiseLoadGene(geneName);
      self.doneLoadingData = false;
    },
    promiseLoadGene: function(geneName) {
      let self = this;

      return new Promise(function(resolve, reject) {
        if (self.variantModel) {
          self.variantModel.clearLoadedData();
        }
        if (self.featureMatrixModel) {
          self.featureMatrixModel.clearRankedVariants();
        }

        self.geneModel.addGeneName(geneName);
        self.geneModel.promiseGetGeneObject(geneName)
        .then(function(theGeneObject) {
          self.geneModel.adjustGeneRegion(theGeneObject);
          self.geneRegionStart = theGeneObject.start;
          self.geneRegionEnd   = theGeneObject.end;
          self.selectedGene = theGeneObject;
          self.selectedTranscript = self.geneModel.getCanonicalTranscript(self.selectedGene);
          self.promiseLoadData()
          .then(function() {
            self.doneLoadingData = true;
            resolve();
          })
        })
        .catch(function(error) {
          reject(error);
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
      let self = this;

      self.geneRegionBuffer = theGeneRegionBuffer;
      self.promiseClearCache()
      .then(function() {
        self.onGeneSelected(self.selectedGene.gene_name);
      })
    },
    onGeneRegionZoom: function(theStart, theEnd) {
      this.geneRegionStart = theStart;
      this.geneRegionEnd = theEnd;

      this.filterModel.regionStart = this.geneRegionStart;
      this.filterModel.regionEnd = this.geneRegionEnd;
      this.variantModel.setLoadedVariants(this.selectedGene);
    },
    onGeneRegionZoomReset: function() {
      this.geneRegionStart = this.selectedGene.start;
      this.geneRegionEnd = this.selectedGene.end;

      this.filterModel.regionStart = null;
      this.filterModel.regionEnd = null;
      this.variantModel.setLoadedVariants(this.selectedGene);
    },
    onDataSetVariantClick: function(variant, sourceComponent, cohortKey) {
      let self = this;
      if (variant) {
        // SJG TODO: take out after debugging
        let foldEnrich = Math.round(variant.subsetDelta * 10) / 10;
        console.log(variant.subsetDelta + ', ' + foldEnrich);

        self.selectedVariant = variant;
        if (sourceComponent == null || self.$refs.variantCardRef != sourceComponent) {
          self.$refs.variantCardRef.showVariantCircle(variant);
        }
      }
      else {
          self.deselectVariant();
      }
    },
    onDataSetVariantClickEnd: function(sourceComponent) {
      let self = this;
      self.$refs.variantCardRef.hideVariantCircle();
    },
    onDataSetVariantHover: function(variant, sourceComponent) {
      let self = this;
        if (self.$refs.variantCardRef != sourceComponent) {
          self.$refs.variantCardRef.showVariantCircle(variant);
        }
    },
    onDataSetVariantHoverEnd: function(sourceVariantCard) {
      let self = this;
      if (self.$refs.variantCardRef) {
        self.$refs.variantCardRef.hideVariantCircle();
      }
    },
    deselectVariant: function() {
      let self = this;
      self.selectedVariant = null;
      if (self.$refs.variantCardRef) {
        self.$refs.variantCardRef.hideVariantCircle();
      }
    },
    showVariantExtraAnnots: function(sourceComponent, variant, cohortKey) {
      let self = this;

      self.variantModel
        .getCohort(cohortKey)
        .promiseGetImpactfulVariantIds(self.selectedGene, self.selectedTranscript, this.cacheHelper)
        .then(function(annotatedVariants) {
          // If the clicked variant is in the list of annotated variants, show the
          // tooltip; otherwise, the callback will get the extra annots for this
          // specific variant
          self.showVariantTooltipExtraAnnots(sourceComponent, variant, annotatedVariants, function() {
            // The clicked variant wasn't annotated in the batch of variants.  Get the
            // extra annots for this specific variant.
            self.variantModel
              .getModel(cohortKey)
              .promiseGetVariantExtraAnnotations(self.selectedGene, self.selectedTranscript, self.selectedVariant)
              .then( function(refreshedVariant) {
                self.showVariantTooltipExtraAnnots(sourceComponent, variant, [refreshedVariant]);
              })
          })
        });
    },

    showVariantTooltipExtraAnnots: function(sourceComponent, variant, annotatedVariants, callbackNotFound) {
      let self = this;
      var targetVariants = annotatedVariants.filter(function(v) {
        return variant &&
               variant.start == v.start &&
               variant.ref   == v.ref &&
               variant.alt   == v.alt;
      });
      if (targetVariants.length > 0) {
        var annotatedVariant = targetVariants[0];
        annotatedVariant.screenX = variant.screenX;
        annotatedVariant.screenY = variant.screenY;
        annotatedVariant.screenXMatrix = variant.screenXMatrix;
        annotatedVariant.screenYMatrix = variant.screenYMatrix;

        variant.extraAnnot      = true;
        variant.vepHGVSc        = annotatedVariant.vepHGVSc;
        variant.vepHGVSp        = annotatedVariant.vepHGVSp;
        variant.vepVariationIds = annotatedVariant.vepVariationIds;

        sourceComponent.showVariantTooltip(variant, true);
      } else {
        if (callbackNotFound) {
          callbackNotFound();
        }
      }
    },
    onKnownVariantsVizChange: function(viz) {
      let self = this;
      self.showClinvarVariants = viz == 'variants';
      // if (self.showClinvarVariants) {
      //   self.coreModel.promiseLoadKnownVariants(self.selectedGene, self.selectedTranscript);
      // }
    },
    onKnownVariantsFilterChange: function(selectedCategories) {
      let self = this;
      self.filterModel.setModelFilter('known-variants', 'clinvar', selectedCategories);

      self.variantModel.setLoadedVariants(self.selectedGene, 'known-variants');
    },
    onRemoveGene: function(geneName) {
      this.cacheHelper.clearCacheForGene(geneName);
    },
    onAnalyzeAll: function() {
      this.cacheHelper.analyzeAll(this.variantModel);
    },
    clearCache: function() {
      this.cacheHelper.promiseClearCache(this.cacheHelper.launchTimestamp);
    },
    onApplyGenes: function(genesString) {
      this.geneModel.copyPasteGenes(genesString);
    },
    onCopyPasteGenes: function(genesString) {
      this.geneModel.copyPasteGenes(genesString);
    },
    displayVariantBrush: function(){
      let self = this;
      if (this.doneLoadingData == true) {
        self.$refs.variantCardRef.displayVariantBrush();
      }
    },
    onSortGenes: function(sortBy) {
      this.geneModel.sortGenes(sortBy);
    },
    initFromUrl: function() {
      let self = this;

      // Launching from hub if we have a project ID
      if (self.paramProjectId) {
        localStorage.setItem('hub-iobio-tkn', self.paramTokenType + ' ' + self.paramToken);
        self.variantModel.phenoFilters = self.getHubPhenoFilters();
        self.variantModel.projectId = self.paramProjectId;
        self.variantModel.promiseInitFromHub()
            .then(function() {
              self.geneModel.addGeneName(self.DEMO_GENE);
              self.onGeneSelected(self.DEMO_GENE);
          })
          .catch(function() {
            alert("Problem talking to Hub...");
          })
      }
      // Otherwise launching oustide of Hub
      // SJG TODO: incorporate stand-alone loading - right now just loading platinum demo
      else {
        self.geneModel.addGeneName(self.DEMO_GENE);
        self.onGeneSelected(self.DEMO_GENE);
        self.variantModel.promiseInitDemo()
            .then(function() {
              if (self.selectedGene && Object.keys(self.selectedGene).length > 0) {
                self.promiseLoadData();
              }
              else {
                console.log("Failed to load data because no gene selected");
              }
            })
      }
    },
    /* Returns array of phenotype objects {phenotypeName: phenotypeData} */
    getHubPhenoFilters: function() {
      let self = this;
      let params = Qs.parse(self.$route.query);
      let { filter } = params;
      return filter;
    }
  }
}
</script>
