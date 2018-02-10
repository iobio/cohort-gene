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
  <navigation v-on:input="onGeneSelected"></navigation>
  <v-content>
    <v-container fluid>
      <!-- TODO: do I need data-sources-loader -->

      <!-- TODO: bind model w/ summary logic -->
      <variant-summary-card
        :effect="effect"
        :impact="impact"
        :clinVar="clinVar"
        :sift="sift"
        :polyPhen="polyPhen"
      ></variant-summary-card>
      <br>
      <br>
      <variant-card
        ref="variantCardRef"
        v-for="model in dataSetModels"
        :key="model.name"
        v-bind:class="{ hide: Object.keys(selectedGene).length == 0 || !coreModel  || coreModel.inProgress.loadingDataSources }"
        :dataSetModel="model"
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
        @dataSetVariantClick="onDataSetVariantClick"
        @dataSetVariantClickEnd="onDataSetVariantClickEnd"
        @dataSetVariantHover="onDataSetVariantHover"
        @dataSetVariantHoverEnd="onDataSetVariantHoverEnd"
        @knownVariantsVizChange="onKnownVariantsVizChange"
        @knownVariantsFilterChange="onKnownVariantsFilterChange"
      ></variant-card>
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
import CoreModel      from '../../models/CoreModel.js'
import GeneModel        from '../../models/GeneModel.js'
import FilterModel      from '../../models/FilterModel.js'

import allGenesData from '../../../data/genes.json'

export default {
  name: 'home',
  components: {
    Navigation,
    GeneCard,
    VariantSummaryCard,
    VariantCard
  },
  props: {
    paramGene:             null,
    paramGenes:            null,
    paramSpecies:          null,
    paramBuild:            null,
    paramBatchSize:        null,
    paramGeneSource:       null,
    paramMyGene2:          null,
    paramMode:             null,
    paramAffectedSibs:     null,
    paramUnaffectedSibs:   null,

    paramRelationships:    null,
    paramSamples:          null,
    paramNames:            null,
    paramBams:             null,
    paramBais:             null,
    paramVcfs:             null,
    paramTbis:             null,
    paramAffectedStatuses: null
  },
  data() {
    return {
      greeting: 'cohort-gene.iobio.vue',
      selectedGene: {},
      selectedTranscript: {},
      geneRegionBuffer: 1000,
      geneRegionStart: null,
      geneRegionEnd: null,
      allGenes: allGenesData,

      coreModel: null,
      dataSetModels: [],
      //featureMatrixModel: null,   // TODO: get this working or take it out
      geneModel: null,
      bookmarkModel: null,
      filterModel: null,
      cacheHelper: null,
      genomeBuildHelper: null,
      variantTooltip: null,
      selectedVariant: null,
      inProgress: false,
      cardWidth: 0,
      showClinvarVariants: false,
      activeBookmarksDrawer: null,

      // SJG new additions for variant summary card
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
      var genericAnnotation = new GenericAnnotation(glyph); // This is coming in as undefined

      self.geneModel = new GeneModel();                     // This is throwing an error
      self.geneModel.geneSource = siteGeneSource;
      self.geneModel.genomeBuildHelper = self.genomeBuildHelper;
      self.geneModel.setAllKnownGenes(self.allGenes);
      self.geneModel.translator = translator;

      //self.bookmarkModel = new BookmarkModel();

      // Instantiate helper class than encapsulates IOBIO commands
      let endpoint = new EndpointCmd(useSSL,
        IOBIO,
        self.cacheHelper.launchTimestamp,
        self.genomeBuildHelper,
        utility.getHumanRefNames);

      self.coreModel = new CoreModel(endpoint,
        genericAnnotation,
        translator,
        self.geneModel,
        self.cacheHelper,
        self.genomeBuildHelper);

      self.inProgress = self.coreModel.inProgress;

      //self.featureMatrixModel = new FeatureMatrixModel(self.cohortModel);
      //self.featureMatrixModel.init();

      self.variantTooltip = new VariantTooltip(genericAnnotation,
        glyph,
        translator,
        self.coreModel.annotationScheme,
        self.genomeBuildHelper);
    })
    .then(function() {
      self.dataSetModels = self.coreModel.dataSetModels;
      self.filterModel = new FilterModel(self.dataSetModel.affectedInfo);
      self.dataSetModel.filterModel = self.filterModel;

      self.onLoadDemoData();  // TODO: does this work?
      // TODO: comment back in after demo working - will have to move sfari model assignmebts below as well
      //self.initFromUrl();
    },
    function(error) {
    })
  },
  computed: {},
  watch: {},
  methods: {
    promiseInitCache: function() {
      let self = this;
      return new Promise(function(resolve, reject) {
        self.cacheHelper = new CacheHelper();
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
      self.geneModel.copyPasteGenes(self.coreModel.demoGenes.join(", "));
      self.onGeneSelected(self.coreModel.demoGenes[0]);
      self.coreModel.promiseInitDemo()
      .then(function() {
        self.dataModels = self.coreModel.dataSetModels;
        if (self.selectedGene && Object.keys(self.selectedGene).length > 0) {
          self.promiseLoadData();
        }
      })
    },
    promiseLoadData: function() {
      let self = this;

      return new Promise(function(resolve, reject) {
        if (self.dataModels && self.dataModels.length > 0) {
          //self.featureMatrixModel.inProgress.loadingVariants = true;
          var options = {'getKnownVariants': self.showClinvarVariants};

          self.coreModel.promiseLoadData(self.selectedGene,
            self.selectedTranscript,
            options)
          .then(function(resultMap) {
              //self.featureMatrixModel.inProgress.loadingVariants = false;
              //self.featureMatrixModel.promiseRankVariants(self.cohortModel.sfariSamplesModel.loadedVariants);
              self.filterModel.populateEffectFilters(resultMap);
              self.filterModel.populateRecFilters(resultMap);
              //var bp = me._promiseDetermineVariantBookmarks(vcfData, theGene, theTranscript);
              //bookmarkPromises.push(bp);
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
      self.onGeneSelected(self.selectedGene.gene_name);
    },
    onGeneRegionZoom: function(theStart, theEnd) {
      this.geneRegionStart = theStart;
      this.geneRegionEnd = theEnd;

      //this.featureMatrixModel.setRankedVariants(this.geneRegionStart, this.geneRegionEnd);

      this.filterModel.regionStart = this.geneRegionStart;
      this.filterModel.regionEnd = this.geneRegionEnd;
      this.coreModel.setLoadedVariants(this.selectedGene);

      this.coreModel.setCoverage(this.geneRegionStart, this.geneRegionEnd);
    },
    onGeneRegionZoomReset: function() {
      this.geneRegionStart = this.selectedGene.start;
      this.geneRegionEnd = this.selectedGene.end;

      //this.featureMatrixModel.setRankedVariants();

      this.filterModel.regionStart = null;
      this.filterModel.regionEnd = null;
      this.coreModel.setLoadedVariants(this.selectedGene);
      this.coreModel.setCoverage();
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
      if (self.showClinvarVariants) {
        self.coreModel.promiseLoadKnownVariants(self.selectedGene, self.selectedTranscript);
      }
    },
    onKnownVariantsFilterChange: function(selectedCategories) {
      let self = this;
      self.filterModel.setModelFilter('known-variants', 'clinvar', selectedCategories);

      self.coreModel.setLoadedVariants(self.selectedGene, 'known-variants');
    },
    onRemoveGene: function(geneName) {
      this.cacheHelper.clearCacheForGene(geneName);
    },
    // TODO: this is currently broken
    onAnalyzeAll: function() {
      this.cacheHelper.analyzeAll(this.coreModel);
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

      if ( self.paramMygene2 && self.paramMygene2 != "" ) {
        isMygene2   = self.paramMygene2 == "false" || self.paramMygene2.toUpperCase() == "N" ? false : true;
      }
      if (self.paramMode && self.paramMode != "") {
        isLevelBasic     = self.paramMode == "basic" ? true : false;
        isLevelEdu       = (self.paramMode == "edu" || self.paramMode == "edutour") ? true : false;
      }


      if (self.paramGeneSource) {
        self.geneModel.geneSource = self.paramGeneSource;
      }
      if (self.paramGenes) {
        self.paramGenes.split(",").forEach( function(geneName) {
          self.geneModel.addGeneName(geneName);
        });
      }
      if (self.paramGene) {
        self.geneModel.addGeneName(self.paramGene);
        self.onGeneSelected(self.paramGene);
      }
      if (self.paramSpecies) {
        self.genomeBuildHelper.setCurrentSpecies(self.paramSpecies);
      }
      if (self.paramBuild) {
        self.genomeBuildHelper.setCurrentBuild(self.paramBuild);
      }
      if (self.paramBatchSize) {
        DEFAULT_BATCH_SIZE = self.paramBatchSize;
      }

      var modelInfos = [];
      for (var i = 0; i < self.paramRelationships.length; i++) {
        var rel  = self.paramRelationships[i];
        if (rel) {
          var modelInfo = {'relationship': rel};
          modelInfo.name           = self.paramNames[i];
          modelInfo.vcf            = self.paramVcfs[i];
          modelInfo.tbi            = self.paramTbis[i];
          modelInfo.bam            = self.paramBams[i];
          modelInfo.bai            = self.paramBais[i];
          modelInfo.sample         = self.paramSamples[i];
          modelInfo.affectedStatus = self.paramAffectedStatuses[i];
          modelInfos.push(modelInfo);
        }
      }
      self.coreModel.promiseInit()
        .then(function() {
          self.dataSetModels = self.coreModel.dataSets;
          if (self.selectedGene && Object.keys(self.selectedGene).length > 0) {
            self.promiseLoadData();
          }
        });
    },
    // onBookmarkVariant(variant) {
    //   this.$refs.navRef.onBookmarks();
    //   this.bookmarkModel.addBookmark(variant, this.selectedGene);
    //   this.selectedVariant = null;
    // }
  }
}
</script>
