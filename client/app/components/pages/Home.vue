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
  <!-- SJG TODO: put in flagged variant stuff -->
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
      <!-- TODO: do I need data-sources-loader -->

      <!-- v-bind:class="{ hide: Object.keys(selectedGene).length == 0 || !variantModel }" -->
      <v-layout>
        <v-flex xs12>
          <variant-card
            v-bind:class="{ hide: Object.keys(selectedGene).length == 0 || !variantModel || !dataSet }"
            v-if="(variantModel && dataSet)"
            ref="variantCardRef"
            :dataSetModel="dataSet"
            :annotationScheme="variantModel.annotationScheme"
            :classifyVariantSymbolFunc="variantModel.classifyByImpact"
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
            :displayImpactSwitch="doneLoadingData"
            @dataSetVariantClick="onDataSetVariantClick"
            @dataSetVariantClickEnd="onDataSetVariantClickEnd"
            @dataSetVariantHover="onDataSetVariantHover"
            @dataSetVariantHoverEnd="onDataSetVariantHoverEnd"
            @knownVariantsVizChange="onKnownVariantsVizChange"
            @knownVariantsFilterChange="onKnownVariantsFilterChange"
          ></variant-card>

          <!-- v-bind:class="{ hide: !doneLoadingData }" -->
          <variant-summary-card
            :selectedGene="selectedGene.gene_name"
            :variant="selectedVariant"
            :variantInfo="selectedVariantInfo"
            @summaryCardVariantDeselect="deselectVariant"
            ref="variantSummaryCardRef"
          ></variant-summary-card>
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
import VariantSummaryCard from '../viz/VariantSummaryCard.vue'

// Back-end models
import GeneModel        from '../../models/GeneModel.js'
import FilterModel      from '../../models/FilterModel.js'
import VariantModel     from '../../models/VariantModel.js'

import allGenesData from '../../../data/genes.json'

import simonsIdMap from '../../../data/idmap.json'

export default {
  name: 'home',
  components: {
    Navigation,
    GeneCard,
    VariantSummaryCard,
    VariantCard
    //FeatureMatrixCard, TODO
    //GenesCard, TODO
  },
  props: {
    paramProjectId:         null,
    paramPhenoFilters:      null,
    parmTokenType:          null,
    paramToken:             null
  },
  data() {
    return {
      greeting: 'cohort-gene.iobio.vue',

      // Selection properties
      selectedGene: {},
      selectedTranscript: {},
      selectedVariant: null,

      geneRegionStart: null,
      geneRegionEnd: null,
      adjustedVariantStart: null,
      adjustedVariantEnd: null,
      genesInProgress: {},

      allGenes: allGenesData,
      simonsIdMap: simonsIdMap,
      dataSet: {},

      // Models
      variantModel: null,
      geneModel: null,
      bookmarkModel: null,
      filterModel: null,
      cacheHelper: null,
      genomeBuildHelper: null,

      // Things to incorporate later on
      variantTooltip: null,
      inProgress: {},
      cardWidth: 0,
      showClinvarVariants: false,
      activeBookmarksDrawer: null,
      doneLoadingData: false
    }
  },

  created: function() {
    // Nada
  },

  mounted: function() {
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

      // Instantiate helper class than encapsulates IOBIO commands
      let endpoint = new EndpointCmd(useSSL,
        IOBIO,
        self.cacheHelper.launchTimestamp,
        self.genomeBuildHelper,
        utility.getHumanRefNames);

      let mode = 'development';
      let hubEndpoint = new HubEndpoint(mode);

      self.variantModel = new VariantModel(endpoint,
        genericAnnotation,
        translator,
        self.geneModel,
        self.cacheHelper,
        self.genomeBuildHelper,
        hubEndpoint);

      self.variantModel.setIdMap(self.simonsIdMap);
      self.inProgress = self.variantModel.inProgress;

      //self.featureMatrixModel = new FeatureMatrixModel(self.cohortModel);
      //self.featureMatrixModel.init();

      self.variantTooltip = new VariantTooltip(genericAnnotation,
        glyph,
        translator,
        self.variantModel.annotationScheme,
        self.genomeBuildHelper);
    })
    .then(function() {
      self.dataSet = self.variantModel.dataSet;
      self.filterModel = new FilterModel(self.variantModel.affectedInfo);
      self.variantModel.filterModel = self.filterModel;

      self.initFromUrl();
    },
    function(error) {
      alert("There was a problem contacting our iobio services. Please refresh the application, or contact iobioproject@gmail.com if the problem persists.");
    })
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
  watch: {},
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
      self.onGeneSelected('AIRE');
      self.variantModel.promiseInitDemo()
      .then(function() {
        self.dataSet = self.variantModel.dataSet;
        if (self.selectedGene && Object.keys(self.selectedGene).length > 0) {
          self.promiseLoadData();
        }
      })
    },
    promiseLoadData: function() {
      let self = this;

      return new Promise(function(resolve, reject) {
        if (self.dataSet) {
          //self.featureMatrixModel.inProgress.loadingVariants = true;
          var options = {'getKnownVariants': self.showClinvarVariants};

          self.variantModel.promiseLoadData(self.selectedGene,
            self.selectedTranscript,
            self.filterModel,
            options)
          .then(function(resultMap) {
            self.doneLoadingData = true;
            // self.filterModel.populateEffectFilters(resultMap);
            // self.filterModel.populateRecFilters(resultMap);

            // self.variantModel.promiseMarkCodingRegions(self.selectedGene, self.selectedTranscript)
            // .then(function(data) {
            //   self.analyzedTranscript = data.transcript;
            //   self.coverageDangerRegions = data.dangerRegions;
            //   resolve();
            // })
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
    // TODO: incorporate GenesCard and this
    // callVariants: function(theGene) {
    //   let self = this;
    //   if (theGene == null) {
    //     self.cacheHelper.analyzeAll(self.variantModel, true);
    //   } else {
    //     self.variantModel.promiseJointCallVariants(self.selectedGene,
    //       self.selectedTranscript,
    //       self.variantModel.getCurrentTrioVcfData(),
    //       {checkCache: false, isBackground: false})
    //     .then(function() {
    //     })
    //   }
    // },
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

      //this.featureMatrixModel.setRankedVariants(this.geneRegionStart, this.geneRegionEnd);

      this.filterModel.regionStart = this.geneRegionStart;
      this.filterModel.regionEnd = this.geneRegionEnd;
      this.variantModel.setLoadedVariants(this.selectedGene);

      //this.coverageModel.setCoverage(this.geneRegionStart, this.geneRegionEnd);
    },
    onGeneRegionZoomReset: function() {
      this.geneRegionStart = this.selectedGene.start;
      this.geneRegionEnd = this.selectedGene.end;

      //this.featureMatrixModel.setRankedVariants();

      this.filterModel.regionStart = null;
      this.filterModel.regionEnd = null;
      this.variantModel.setLoadedVariants(this.selectedGene);
      //this.coverageModel.setCoverage();
    },
    onDataSetVariantClick: function(variant, sourceComponent, cohortKey) {
      let self = this;
      if (variant) {
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
    // TODO: this is currently broken
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
    onSortGenes: function(sortBy) {
      this.geneModel.sortGenes(sortBy);
    },
    initFromUrl: function() {
      let self = this;

      // If we have a project id, we're launching from hub
      if (self.paramProjectId) {
        self.geneModel.addGeneName('AIRE');
        self.onGeneSelected('AIRE');

        localStorage.setItem('hub-iobio-tkn', self.parmTokenType + ' ' + self.paramToken);
        self.variantModel.phenoFilters = self.getHubPhenoFilters();
        self.variantModel.projectId = self.paramProjectId;
        self.variantModel.promiseInitFromHub()
            .then(function() {
              self.dataSet = self.variantModel.dataSet;
              if (self.selectedGene && Object.keys(self.selectedGene).length > 0) {
                self.promiseLoadData();
              }
              else {
                console.log("failed to load data because selected gene length is 0");
              }
            })
      }
      // Otherwise launching stand alone
      else {
        self.variantModel.userVcf = getUserVcf(); // SJG TODO: pull this from file upload menu
        self.geneModel.addGeneName('AIRE');
        self.onGeneSelected('AIRE');
        self.variantModel.promiseInitDemo()
            .then(function() {
              self.dataSet = self.variantModel.dataSet;
              if (self.selectedGene && Object.keys(self.selectedGene).length > 0) {
                self.promiseLoadData();
              }
              else {
                console.log("failed to load data because selected gene length is 0");
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
    // onBookmarkVariant(variant) {
    //   this.$refs.navRef.onBookmarks();
    //   this.bookmarkModel.addBookmark(variant, this.selectedGene);
    //   this.selectedVariant = null;
    // }
  }
}
</script>
