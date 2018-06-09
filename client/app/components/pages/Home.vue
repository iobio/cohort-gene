<!-- Main application page holding all cards.
TD & SJG updated Jun2018 -->

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
    <div id="warning-authorize" class="warning-authorize"></div>
    <v-container fluid style="padding-top: 3px">
      <v-layout>
        <v-flex xs9>
          <updated-variant-card
            v-if="variantModel"
            ref="variantCardRef"
            :dataSetModel="variantModel.dataSet"
            :annotationScheme="variantModel.annotationScheme"
            :classifyVariantSymbolFunc="variantModel.classifyByEnrichment"
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
            :doneLoadingExtras="doneLoadingExtras"
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
            :loadingExtraAnnotations="loadingExtraAnnotations"
            :loadingExtraClinvarAnnotations="loadingExtraClinvarAnnotations"
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
      doneLoadingExtras: false,
      loadingExtraAnnotations: false,
      loadingExtraClinvarAnnotations: false,
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

      DEMO_GENE: 'BRCA2'   // SJG TODO: get rid of this outside of demo
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
      // SJG NOTE: not doing anything currently? Not marking stale sessions currently
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

      self.variantModel = new VariantModel(endpoint,
        genericAnnotation,
        translator,
        self.geneModel,
        self.cacheHelper,
        self.genomeBuildHelper);

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
      // TODO: prompt for gene selection
      self.determineSourceAndInit();
    },
    function(error) {
      console.log(error);
      alert("There was a problem contacting our iobio services. Please refresh the application, or contact iobioproject@gmail.com if the problem persists.");
    })
  },
  methods: {
    promiseInitCache: function() {
      let self = this;
      return new Promise(function(resolve, reject) {
        self.cacheHelper = new CacheHelper();
        // self.cacheHelper.on("geneAnalyzed", function(geneName) {
        //   self.$refs.genesCardRef.determineFlaggedGenes();
        //   self.$refs.navRef.onShowFlaggedVariants();
        // })
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
          var options = {'getKnownVariants': self.showClinvarVariants, 'efficiencyMode': true};
          // Load positional information for quick display
          self.variantModel.promiseLoadData(self.selectedGene,
            self.selectedTranscript,
            options)
            .then(function() {
              self.doneLoadingData = true;  // Display variants
              self.variantModel.promiseFurtherAnnotateVariants(self.selectedGene,
              self.selectedTranscript,
              options)
              .then(function(resultMap) {
                let resultVars = resultMap[0]['Proband'].features;  // Unwrap result map
                self.variantModel.combineVariantInfo(resultVars);
                self.updateClasses();
                self.doneLoadingExtras = true;
              })
            })
            .catch(function(error) {
              reject(error);
            })
        } else {
          Promise.resolve();
        }
      })
    },
    updateClasses: function() {
      let self = this;
      $('.variant').each(function(i, v) {
        let impactClass = self.variantModel.getVepImpactClass(v, 'vep');
        $(v).addClass(impactClass);
      })
    },
    promiseLoadAnnotationDetails: function() {
      let self = this;

      return new Promise(function(resolve, reject) {

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
      self.promiseClearCache();   // Force refresh to avoid memory crashes
      self.promiseLoadGene(geneName);
      self.doneLoadingData = false;
      self.doneLoadingExtras = false;
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
        // Circle selected variant
        if (sourceComponent == null || self.$refs.variantCardRef != sourceComponent) {
          self.$refs.variantCardRef.showVariantCircle(variant);
        }
        // Query service for single variant annotation if we don't have details yet
        if (!self.variantModel.extraAnnotationsLoaded) {
          // Turn on flag for summary card loading icons
          self.deselectVariant(true);
          self.loadingExtraAnnotations = true;
          self.loadingExtraClinvarAnnotations = true;

          // Send variant in for annotating
          let cohortModel = self.variantModel.dataSet.getProbandCohort();
          let t0 = performance.now();

          cohortModel.promiseGetVariantExtraAnnotations(self.selectedGene, self.selectedTranscript, variant, 'vcf')
            .then(function(updatedVariantObject) {
              let t1 = performance.now();
              console.log('Getting extra annotation for single variant took ' + (t1 - t0) + ' ms');
              let updatedVariant = updatedVariantObject[0][0];
              // Display variant info once we have it
              self.loadingExtraAnnotations = false;
              self.selectedVariant = self.variantModel.combineVariantInfo([updatedVariant]);

              // Wrap variant with appropriate structure to send into existing clinvar method
              let detailsObj = {};
              detailsObj['loadState'] = {};
              detailsObj['features'] = [updatedVariant];
              let variantObj = {};
              variantObj['Proband'] = detailsObj;
              let cohortObj = {};
              cohortObj[0] = variantObj;

              self.variantModel.promiseAnnotateWithClinvar(cohortObj, self.selectedGene, self.selectedTranscript, false)
                .then(function(variantObj) {
                  let t1 = performance.now();
                  console.log('Getting extra annotation for single variant WITH CLINVAR took ' + (t1 - t0) + ' ms');
                  // Unwrap clinvarVariant structure
                  let clinvarVariant = variantObj[0]['Proband']['features'][0];
                  self.loadingExtraClinvarAnnotations = false;
                  self.selectedVariant = self.variantModel.combineVariantInfo([clinvarVariant]);
                })
            })
        }
        else {
          self.selectedVariant = variant;
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
    deselectVariant: function(keepVariantCircle = false) {
      let self = this;
      self.selectedVariant = null;
      if (!keepVariantCircle && self.$refs.variantCardRef) {
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
    determineSourceAndInit: function() {
      let self = this;
      let source = self.paramSource;
      let projectId = self.paramProjectId;
      let phenoFilters = self.getHubPhenoFilters();

      // If we can't map project id with Vue Router, may be coming from Hub OAuth
      if (projectId === '0') {
        let queryParams = Qs.parse(window.location.search.substring(1)); // if query params before the fragment
        Object.assign(queryParams, self.$route.query);
        source = queryParams.source;
        projectId = queryParams.project_uuid;
        phenoFilters = queryParams.filter;
      }

      // If we have a project ID here, coming from Hub launch
      if (projectId !== '0') {
        let hubEndpoint = new HubEndpoint(source);
        let initialLaunch = !(self.paramProjectId === '0');
        self.variantModel.promiseInitFromHub(hubEndpoint, projectId, phenoFilters, initialLaunch)
          .then(function() {
            self.geneModel.addGeneName(self.DEMO_GENE);
            self.onGeneSelected(self.DEMO_GENE);
          })
      }
      // Otherwise launching stand alone
      else {
        // TODO: initialize file/url loader
        // NOTE: loading demo for now
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
