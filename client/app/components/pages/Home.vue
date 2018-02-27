<!--
Main application page
Updated: SJG 07Feb2018

Note: all CohortModel refs changed to CoreModel
-->
<style lang="sass">
.app-card
  margin-bottom: 10px
</style>

<template>
<div>
  <navigation
    v-if="geneModel"
    ref="navRef"
    :variantModel="variantModel"
    :geneModel="geneModel"
    @input="onGeneSelected">
  </navigation>
  <v-content>
    <v-container fluid>
      <!-- TODO: do I need data-sources-loader -->

      <!-- TODO: would like to get away from passing giant variantModel here-->

      <br/>
      <variant-card
        ref="variantCardRef"
        v-for="dataSet in dataSets"
        :key="dataSet.name"
        v-bind:class="{ hide: Object.keys(selectedGene).length == 0 || !variantModel  || variantModel.inProgress.loadingDataSources }"
        :dataSetModel="dataSet"
        :annotationScheme="variantModel.annotationScheme"
        :variantModel="variantModel"
        :classifyVariantSymbolFunc="dataSet.classifyByImpact"
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
        @dataSetVariantClick="onDataSetVariantClick"
        @dataSetVariantClickEnd="onDataSetVariantClickEnd"
        @dataSetVariantHover="onDataSetVariantHover"
        @dataSetVariantHoverEnd="onDataSetVariantHoverEnd"
        @knownVariantsVizChange="onKnownVariantsVizChange"
        @knownVariantsFilterChange="onKnownVariantsFilterChange"
      ></variant-card>

      <!-- <variant-summary-card
        v-if="showVariantSummary"
        :showVariantSummary="false"
        :variantModel="variantModel"
        :effect="effect"
        :impact="impact"
        :clinVar="clinVar"
        :sift="sift"
        :polyPhen="polyPhen"
      ></variant-summary-card> -->

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
  props: {},
  data() {
    return {
      greeting: 'cohort-gene.iobio.vue',

      // Selection properties
      selectedGene: {},
      selectedTranscript: {},
      selectedVariant: null,

      geneRegionBuffer: 1000,
      geneRegionStart: null,
      geneRegionEnd: null,
      adjustedVariantStart: null,
      adjustedVariantEnd: null,
      genesInProgress: {},

      allGenes: allGenesData,
      dataSets: [],

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

      showVariantSummary: "false",
      effect: null,
      impact: null,
      clinVar: null,
      sift: null,
      polyPhen: null
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

      self.variantModel = new VariantModel(endpoint,
        genericAnnotation,
        translator,
        self.geneModel,
        self.cacheHelper,
        self.genomeBuildHelper);

      self.inProgress = self.variantModel.inProgress;

      //self.featureMatrixModel = new FeatureMatrixModel(self.cohortModel);
      //self.featureMatrixModel.init();

      // self.variantTooltip = new VariantTooltip(genericAnnotation,
      //   glyph,
      //   translator,
      //   self.variantModel.annotationScheme,
      //   self.genomeBuildHelper);
    })
    .then(function() {
      self.dataSets = self.variantModel.dataSets;
      self.filterModel = new FilterModel(self.variantModel.affectedInfo);
      self.variantModel.filterModel = self.filterModel;

      self.initFromUrl();
    },
    function(error) {
    })
  },
  // ONLY REDRAWS IF DEPENDENCY CHANGES (push/pop should do it)
  computed: {
    // TODO: maxDepth
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
        self.dataSets = self.variantModel.dataSets;
        if (self.selectedGene && Object.keys(self.selectedGene).length > 0) {
          self.promiseLoadData();
        }
      })
    },
    promiseLoadData: function() {
      let self = this;

      return new Promise(function(resolve, reject) {
        if (self.dataSets && self.dataSets.length > 0) {
          //self.featureMatrixModel.inProgress.loadingVariants = true;
          var options = {'getKnownVariants': self.showClinvarVariants};

          self.variantModel.promiseLoadData(self.selectedGene,
            self.selectedTranscript,
            self.filterModel,
            options)
          .then(function(resultMap) {
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
    onGeneSelected: function(geneName) {
      var self = this;

      self.deselectVariant();
      self.promiseLoadGene(geneName);
      // SJG TODO: put promiseLoadVariant here?
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

      //this.featureMatrixModel.setRankedVariants(this.geneRegionStart, this.geneRegionEnd);

      this.filterModel.regionStart = this.geneRegionStart;
      this.filterModel.regionEnd = this.geneRegionEnd;
      this.variantModel.setLoadedVariants(this.selectedGene);

      this.coverageModel.setCoverage(this.geneRegionStart, this.geneRegionEnd);
    },
    onGeneRegionZoomReset: function() {
      this.geneRegionStart = this.selectedGene.start;
      this.geneRegionEnd = this.selectedGene.end;

      //this.featureMatrixModel.setRankedVariants();

      this.filterModel.regionStart = null;
      this.filterModel.regionEnd = null;
      this.variantModel.setLoadedVariants(this.selectedGene);
      this.coverageModel.setCoverage();
    },
    onDataSetVariantClick: function(variant, sourceComponent) {
      let self = this;
      self.selectedVariant = variant;
      self.showVariantExtraAnnots(sourceComponent, variant);
      self.$refs.variantCardRef.forEach(function(variantCard) {
        if (variantCard != sourceComponent) {
          variantCard.showVariantCircle(variant);
          variantCard.showCoverageCircle(variant);
        }
      })
    },
    onDataSetVariantClickEnd: function(sourceVariantCard) {
      let self = this;
      self.selectedVariant = null;
      self.$refs.variantCardRef.forEach(function(variantCard) {
        variantCard.hideVariantCircle();
        variantCard.hideCoverageCircle();
      })
    },
    onDataSetVariantHover: function(variant, sourceVariantCard) {
      let self = this;
      if (self.selectedVariant == null) {
        self.$refs.variantCardRef.forEach(function(variantCard) {
          if (variantCard != sourceVariantCard) {
            variantCard.showVariantCircle(variant);
            variantCard.showCoverageCircle(variant);
          }
        })
      }
    },
    onDataSetVariantHoverEnd: function(sourceVariantCard) {
      let self = this;
      if (self.selectedVariant == null && self.$refs.variantCardRef) {
        self.$refs.variantCardRef.forEach(function(variantCard) {
          variantCard.hideVariantCircle();
          variantCard.hideCoverageCircle();
        })
      }
    },
    deselectVariant: function() {
      let self = this;
      self.selectedVariant = null;
      if (self.$refs.variantCardRef) {
        self.$refs.variantCardRef.forEach(function(variantCard) {
          variantCard.hideVariantTooltip();
          variantCard.hideVariantCircle();
          variantCard.hideCoverageCircle();
        })
      }
    },
    // TODO: currently broken / referencing old properties
    // showVariantExtraAnnots: function(sourceComponent, variant) {
    //   let self = this;
    //   if (!isLevelEdu && !isLevelBasic)  {
    //
    //     self.coreModel
    //       // TODO: figure out what this is doing - should I be returning a cohortModel here?
    //       .getModel(sourceComponent.relationship)
    //       .promiseGetImpactfulVariantIds(self.selectedGene, self.selectedTranscript)
    //       .then( function(annotatedVariants) {
    //         // If the clicked variant is in the list of annotated variants, show the
    //         // tooltip; otherwise, the callback will get the extra annots for this
    //         // specific variant
    //         self.showVariantTooltipExtraAnnots(sourceComponent, variant, annotatedVariants, function() {
    //           // The clicked variant wasn't annotated in the batch of variants.  Get the
    //           // extra annots for this specific variant.
    //           self.coreModel
    //             .getModel(sourceComponent.relationship)
    //             .promiseGetVariantExtraAnnotations(self.selectedGene, self.selectedTranscript, self.selectedVariant)
    //             .then( function(refreshedVariant) {
    //               self.showVariantTooltipExtraAnnots(sourceComponent, variant, [refreshedVariant]);
    //             })
    //         })
    //       });
    //
    //   }
    // },

    // TODO: incorporate tool tip stuff
    // showVariantTooltipExtraAnnots: function(sourceComponent, variant, annotatedVariants, callbackNotFound) {
    //   let self = this;
    //   var targetVariants = annotatedVariants.filter(function(v) {
    //     return variant &&
    //            variant.start == v.start &&
    //            variant.ref   == v.ref &&
    //            variant.alt   == v.alt;
    //   });
    //   if (targetVariants.length > 0) {
    //     var annotatedVariant = targetVariants[0];
    //     annotatedVariant.screenX = variant.screenX;
    //     annotatedVariant.screenY = variant.screenY;
    //     annotatedVariant.screenXMatrix = variant.screenXMatrix;
    //     annotatedVariant.screenYMatrix = variant.screenYMatrix;
    //
    //     variant.extraAnnot      = true;
    //     variant.vepHGVSc        = annotatedVariant.vepHGVSc;
    //     variant.vepHGVSp        = annotatedVariant.vepHGVSp;
    //     variant.vepVariationIds = annotatedVariant.vepVariationIds;
    //
    //     sourceComponent.showVariantTooltip(variant, true);
    //   } else {
    //     if (callbackNotFound) {
    //       callbackNotFound();
    //     }
    //   }
    // },
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
    onCopyPasteGenes: function(genesString) {
      this.geneModel.copyPasteGenes(genesString);
    },
    onSortGenes: function(sortBy) {
      this.geneModel.sortGenes(sortBy);
    },
    initFromUrl: function() {
      let self = this;

      self.geneModel.addGeneName('AIRE');
      self.onGeneSelected('AIRE');
      self.variantModel.promiseInitDemo()
        .then(function() {
          self.dataSets = self.variantModel.dataSets;
          if (self.selectedGene && Object.keys(self.selectedGene).length > 0) {
            self.promiseLoadData();
          }
          else {
            console.log("failed to load data because selected gene length is 0");
          }
        })
    }
    // onBookmarkVariant(variant) {
    //   this.$refs.navRef.onBookmarks();
    //   this.bookmarkModel.addBookmark(variant, this.selectedGene);
    //   this.selectedVariant = null;
    // }
  }
}
</script>
