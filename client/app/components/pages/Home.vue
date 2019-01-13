<!-- Main application page holding all cards.
TD & SJG updated Nov2018 -->

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
                :selectedBuild="genomeBuildHelper.getCurrentSpeciesName() + ' ' + genomeBuildHelper.getCurrentBuildName()"
                :variantModel="variantModel"
                :launchedFromHub="launchedFromHub"
                @input="onGeneSelected"
                @clear-cache="clearCache"
                @apply-genes="onApplyGenes"
                @on-files-loaded="onFilesLoaded"
        ></navigation>
        <v-content>
            <div id="warning-authorize" class="warning-authorize"></div>
            <v-container fluid style="padding-top: 3px">
                <v-layout>
                    <v-flex xs12 v-if="showWelcome">
                        <welcome
                                @load-demo-data="onLoadDemoData"
                                @open-file-selection="openFileSelection">
                        </welcome>
                    </v-flex>
                    <v-flex xs9 v-if="!showWelcome">
                        <div v-for="dataSet in allDataSets" v-if="showVariantCards">
                            <enrichment-variant-card
                                    v-if="!dataSet.isSingleSample"
                                    ref="enrichCardRef"
                                    :key="dataSet.id"
                                    :dataSetModel="dataSet"
                                    :filterModel="filterModel"
                                    :annotationScheme="variantModel.annotationScheme"
                                    :classifyVariantSymbolFunc="variantModel.classifyByImpact"
                                    :classifyZoomSymbolFunc="variantModel.classifyByImpact"
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
                                    @dataSetVariantHover="onDataSetVariantHover"
                                    @dataSetVariantHoverEnd="onDataSetVariantHoverEnd"
                                    @knownVariantsVizChange="onKnownVariantsVizChange"
                                    @knownVariantsFilterChange="onKnownVariantsFilterChange"
                                    @zoomModeStart="startZoomMode">
                            </enrichment-variant-card>
                            <variant-card
                                    v-else
                                    ref="variantCardRef"
                                    :key="dataSet.id"
                                    :dataSetModel="dataSet"
                                    :filterModel="filterModel"
                                    :annotationScheme="variantModel.annotationScheme"
                                    :classifyVariantSymbolFunc="variantModel.classifyByImpact"
                                    :classifyZoomSymbolFunc="variantModel.classifyByImpact"
                                    :variantTooltip="variantTooltip"
                                    :selectedGene="selectedGene"
                                    :selectedTranscript="selectedTranscript"
                                    :selectedVariant="selectedVariant"
                                    :regionStart="geneRegionStart"
                                    :regionEnd="geneRegionEnd"
                                    :width="cardWidth"
                                    :showGeneViz="true"
                                    :showDepthViz="true"
                                    :showVariantViz="true"
                                    :geneVizShowXAxis="true"
                                    :doneLoadingData="doneLoadingData"
                                    :doneLoadingExtras="doneLoadingExtras"
                                    :doubleMode="true"
                                    @dataSetVariantClick="onDataSetVariantClick"
                                    @dataSetVariantHover="onDataSetVariantHover"
                                    @dataSetVariantHoverEnd="onDataSetVariantHoverEnd"
                                    @knownVariantsVizChange="onKnownVariantsVizChange"
                                    @knownVariantsFilterChange="onKnownVariantsFilterChange"
                                    @zoomModeStart="startZoomMode">
                            </variant-card>
                        </div>
                    </v-flex>
                    <v-flex xs3 v-if="!showWelcome">
                        <v-card class="ml-1">
                            <v-tabs centered icons-and-text>
                                <v-tabs-slider color="cohortDarkBlue"></v-tabs-slider>
                                <v-tab href="#summary-tab">
                                    Summary
                                    <v-icon style="margin-bottom: 0px;">bar_chart</v-icon>
                                </v-tab>
                                <v-tab href="#filter-tab">
                                    Filters
                                    <v-icon style="margin-bottom: 0px">bubble_chart</v-icon>
                                </v-tab>
                                <v-tab-item
                                        :key="'summaryTab'"
                                        :id="'summary-tab'">
                                    <v-container>
                                        <variant-summary-card
                                                :selectedGene="selectedGene.gene_name"
                                                :variant="selectedVariant"
                                                :variantInfo="selectedVariantInfo"
                                                :loadingExtraAnnotations="loadingExtraAnnotations"
                                                :loadingExtraClinvarAnnotations="loadingExtraClinvarAnnotations"
                                                @summaryCardVariantDeselect="deselectVariant"
                                                @zyg-bars-mounted="drawZygCharts"
                                                ref="variantSummaryCardRef">
                                        </variant-summary-card>
                                    </v-container>
                                </v-tab-item>
                                <v-tab-item
                                        :key="'filterTab'"
                                        :id="'filter-tab'">
                                    <v-container>
                                        <filter-settings-menu
                                                v-if="filterModel"
                                                ref="filterSettingsMenuRef"
                                                :filterModel="filterModel"
                                                :showCoverageCutoffs="showCoverageCutoffs"
                                                :fullAnnotationComplete="doneLoadingExtras"
                                                @filter-box-toggled="filterBoxToggled"
                                                @filter-cutoff-applied="filterCutoffApplied"
                                                @filter-cutoff-cleared="filterCutoffCleared">
                                        </filter-settings-menu>
                                    </v-container>
                                </v-tab-item>
                            </v-tabs>
                        </v-card>
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
    import VariantCard from '../viz/VariantCard.vue'
    import EnrichmentVariantCard from '../viz/EnrichmentVariantCard.vue'
    import VariantSummaryCard from '../viz/VariantSummaryCard.vue'
    import VariantZoomCard from '../viz/ZoomModalViz.vue'
    import FilterSettingsMenu from '../partials/FilterSettingsMenu.vue'
    import Welcome from '../viz/Welcome.vue'

    // Models
    import GeneModel from '../../models/GeneModel.js'
    import FilterModel from '../../models/FilterModel.js'
    import VariantModel from '../../models/VariantModel.js'

    // Static data
    import allGenesData from '../../../data/genes.json'
    import simonsIdMap from '../../../data/new_id_map.json'

    export default {
        name: 'home',
        components: {
            Navigation,
            GeneCard,
            VariantSummaryCard,
            VariantZoomCard,
            VariantCard,
            EnrichmentVariantCard,
            FilterSettingsMenu,
            Welcome
        },
        props: {
            paramProjectId: {
                default: '0',
                type: String
            },
            paramOldProjectId: {
                default: '0',
                type: String
            },
            paramSource: {
                default: '',
                type: String
            },
            paramGene: {
                default: '',
                type: String
            },
            paramRef: {
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
                selectedTrackId: null,  // Which track has been clicked on
                showVariantCards: false,
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
                launchedFromHub: false,
                firstLaunch: true,
                firstGeneSelection: true,

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
                showCoverageCutoffs: false,
                showWelcome: true,

                probandN: 0,
                subsetN: 0,

                DEMO_GENE: 'BRCA2'
            }
        },
        computed: {
            selectedVariantInfo: function () {
                if (this.selectedVariant) {
                    return utility.formatDisplay(this.selectedVariant, this.variantModel.translator)
                } else {
                    return null;
                }
            },
            allDataSets: function() {
                let self = this;
                if (self.variantModel) {
                    return self.variantModel.getAllDataSets();
                } else {
                    return [];
                }
            }
        },
        created: function() {
            // Quick check so no flashes before splash screen
            // TODO: need to test this w/ hub launch
            if (this.paramProjectId !== '0' || this.paramOldProjectId !== '0') {
                this.showWelcome = false;
            }
        },
        mounted: function () {
            // Initialize models & get data loading
            let self = this;

            // Quick check for initial hub launch to accomodate zyg bars
            if (self.paramProjectId !== '0' || self.paramOldProjectId !== '0') {
                self.launchedFromHub = true;
            }

            self.cardWidth = self.$el.offsetWidth;

            // Initialize with ref from frameshift if provided
            let currRef = 'GRCh38';
            if (self.paramRef != null && self.paramRef !== "") {
                currRef = self.paramRef;
            }
            self.genomeBuildHelper = new GenomeBuildHelper();
            self.genomeBuildHelper.promiseInit({DEFAULT_BUILD: currRef})
                .then(function () {
                    return self.promiseInitCache();
                })
                .then(function () {
                    let glyph = new Glyph();
                    let translator = new Translator(glyph);
                    let genericAnnotation = new GenericAnnotation(glyph);

                    self.geneModel = new GeneModel();
                    self.geneModel.geneSource = siteGeneSource;
                    self.geneModel.genomeBuildHelper = self.genomeBuildHelper;
                    self.geneModel.setAllKnownGenes(self.allGenes);
                    self.allGenes = []; // Free up some space
                    self.geneModel.translator = translator;

                    let endpoint = new EndpointCmd(useSSL,
                        IOBIO,
                        self.cacheHelper.launchTimestamp,
                        self.genomeBuildHelper,
                        utility.getHumanRefNames,
                        vepREVELFile);

                    self.variantModel = new VariantModel(endpoint,
                        genericAnnotation,
                        translator,
                        self.geneModel,
                        self.cacheHelper,
                        self.genomeBuildHelper);

                    self.variantModel.setIdMap(self.simonsIdMap);
                    self.simonsIdMap = {};  // Free up this space
                    self.inProgress = self.variantModel.inProgress;

                    self.variantTooltip = new VariantTooltip(genericAnnotation,
                        glyph,
                        translator,
                        self.variantModel.annotationScheme,
                        self.genomeBuildHelper);
                })
                .then(function () {
                        self.promiseDetermineSourceAndInit();
                    },
                    function (error) {
                        console.log(error);
                        alertify.set('notifier', 'position', 'top-left');
                        alertify.warning("There was a problem contacting our iobio services. Please check your internet connection, or contact iobioproject@gmail.com if the problem persists.");
                    })
        },
        methods: {
            initializeFiltering: function () {
                let self = this;
                let affectedInfo = self.variantModel.mainDataSet.affectedInfo;
                let isBasicMode = true; // Aka not educational mode
                self.filterModel = new FilterModel(affectedInfo, isBasicMode);
                self.variantModel.filterModel = self.filterModel;
            },
            promiseInitCache: function () {
                let self = this;
                return new Promise(function (resolve, reject) {
                    self.cacheHelper = new CacheHelper();
                    self.cacheHelper.on("geneAnalyzed", function(geneName) {
                      //self.$refs.genesCardRef.determineFlaggedGenes();
                      self.$refs.navRef.onShowFlaggedVariants();
                    });
                    globalCacheHelper = self.cacheHelper;
                    self.cacheHelper.promiseInit()
                        .then(function () {
                            self.cacheHelper.isolateSession();
                            resolve();
                        })
                        .catch(function (error) {
                            let msg = "A problem occurred in promiseInitCache(): " + error;
                            console.log(msg);
                            reject(msg);
                        })
                })
            },
            promiseClearCache: function () {
                let self = this;
                return self.cacheHelper._promiseClearCache(self.cacheHelper.launchTimestampToClear);
            },
            onLoadDemoData: function () {
                let self = this;

                self.promiseClearCache()
                    .then(function () {
                        if (self.$refs.navRef) {
                            self.$refs.navRef.closeFileMenu();
                        }
                        self.geneModel.addGeneName(self.variantModel.demoGene);
                        self.geneModel.promiseGetGeneObject(self.variantModel.demoGene)
                            .then(function (theGeneObject) {
                                self.selectedGene = theGeneObject;
                                if (self.$refs.navRef) {
                                    self.$refs.navRef.onAutoLoad();
                                }
                            });
                    });
            },
            promiseLoadData: function () {
                let self = this;
                self.showVariantCards = true;   // Show for local launch

                return new Promise((resolve, reject) => {
                    if (self.variantModel) {
                        // Load positional information for quick display
                        self.variantModel.promiseLoadData(self.selectedGene, self.selectedTranscript)
                            .then((loadedCohortData) => {
                                self.doneLoadingData = true;  // Display variants
                                if (loadedCohortData) {
                                    let nextOptions = {'getKnownVariants': self.showClinvarVariants, 'efficiencyMode': false};
                                    self.variantModel.promiseFullyAnnotateVariants(self.selectedGene,
                                        self.selectedTranscript,
                                        false,  // isBackground
                                        nextOptions)
                                        .then((resultMaps) => {
                                            resultMaps.forEach((map) => {
                                                let unwrappedMap = map[0];
                                                self.variantModel.combineVariantInfo(unwrappedMap);
                                            });
                                            self.updateClasses();
                                            self.doneLoadingExtras = true;
                                            if (self.$refs.enrichCardRef) {
                                                self.$refs.enrichCardRef.forEach((cardRef) => {
                                                    cardRef.refreshVariantColors();
                                                })
                                            }
                                        })
                                } else {
                                    resolve();
                                }
                            })
                            .catch(function (error) {
                                reject(error);
                            })
                    } else {
                        resolve();
                    }
                })
            },
            updateClasses: function () {
                let self = this;

                // TODO: NOTE THIS IS A BANDAID
                // TODO: variants need to be classified by what data set they belong to (add dataset id class?)
                // TODO: and iterate through each dataset - pull variants by 'variant' and 'sN' classes

                $('.variant').each(function (i, v) {
                    let mainDataSetId = 's0';
                    let impactClass = self.variantModel.getDataSet(mainDataSetId).getVepImpactClass(v, 'vep');
                    $(v).addClass(impactClass);
                })
            },
            promiseLoadAnnotationDetails: function () {

            },
            onFilesLoaded: function (probandN, subsetN, cohortVcfDataChanged) {
                let self = this;

                // Store raw values until summary card mounted so we can fetch them
                self.probandN = probandN;
                self.subsetN = subsetN;

                // Draw zygosity charts if we've changed the cohort vcf data (local launch only)
                if (self.$refs.variantSummaryCardRef != null && (self.firstLaunch || cohortVcfDataChanged)) {
                    self.$refs.variantSummaryCardRef.assignBarChartValues(probandN, subsetN);
                }

                self.promiseClearCache()
                    .then(function() {
                        if (self.variantModel.filterModel == null && self.selectedGene != null) {
                            self.initializeFiltering();
                        }
                        if (self.selectedGene && self.selectedGene.gene_name) {
                            self.promiseLoadGene(self.selectedGene.gene_name);
                        } else if (self.geneModel.sortedGeneNames && self.geneModel.sortedGeneNames.length > 0) {
                            self.onGeneSelected(self.geneModel.sortedGeneNames[0]);
                        } else {
                            alertify.set('notifier', 'position', 'top-left');
                            alertify.warning("Please enter a gene name");
                        }
                    });

                self.firstLaunch = false;
            },
            onGeneSelected: function (geneName) {
                let self = this;
                self.deselectVariant();

                // Only want to wipe if not first selection (otherwise conflicts with badge display)
                if (!self.firstGeneSelection) {
                    self.wipeModels();
                }
                self.promiseLoadGene(geneName);
                self.doneLoadingData = false;
                self.doneLoadingExtras = false;
                if (self.$refs.enrichCardRef) {
                    self.$refs.enrichCardRef.forEach((card) => {
                        card.resetZoom();
                    });
                }
                if (self.$refs.filterSettingsMenuRef) {
                    self.$refs.filterSettingsMenuRef.clearFilters();
                }
                self.firstGeneSelection = false;
            },
            wipeModels: function () {
                let self = this;
                if (self.variantModel != null) {
                    self.variantModel.getAllDataSets().forEach((dataSet) => {
                        dataSet.wipeGeneData();
                    })
                }
            },
            promiseLoadGene: function (geneName) {
                let self = this;

                return new Promise(function (resolve, reject) {
                    self.showWelcome = false;
                    if (self.variantModel) {
                        self.variantModel.clearLoadedData(geneName);
                    }
                    self.geneModel.addGeneName(geneName);
                    self.geneModel.promiseGetGeneObject(geneName)
                        .then(function (theGeneObject) {
                            self.geneModel.adjustGeneRegion(theGeneObject);
                            self.geneRegionStart = theGeneObject.start;
                            self.geneRegionEnd = theGeneObject.end;
                            self.selectedGene = theGeneObject;
                            self.selectedTranscript = self.geneModel.getCanonicalTranscript(self.selectedGene);
                            self.promiseLoadData()
                                .then(function () {
                                    resolve();
                                })
                        })
                        .catch(function (error) {
                            reject(error);
                        })
                })
            },
            onTranscriptSelected: function (transcript) {
                var self = this;
                self.selectedTranscript = transcript;
            },
            onGeneSourceSelected: function (theGeneSource) {
                var self = this;
                self.geneModel.geneSource = theGeneSource;
                this.onGeneSelected(this.selectedGene);
            },
            onGeneRegionBufferChange: function (theGeneRegionBuffer) {
                let self = this;

                self.geneRegionBuffer = theGeneRegionBuffer;
                self.promiseClearCache()
                    .then(function () {
                        self.onGeneSelected(self.selectedGene.gene_name);
                    })
            },
            onGeneRegionZoom: function (theStart, theEnd) {
                this.geneRegionStart = theStart;
                this.geneRegionEnd = theEnd;

                this.filterModel.regionStart = this.geneRegionStart;
                this.filterModel.regionEnd = this.geneRegionEnd;
                this.variantModel.setLoadedVariants(this.selectedGene);
            },
            onGeneRegionZoomReset: function () {
                this.geneRegionStart = this.selectedGene.start;
                this.geneRegionEnd = this.selectedGene.end;

                this.filterModel.regionStart = null;
                this.filterModel.regionEnd = null;
                this.variantModel.setLoadedVariants(this.selectedGene);
            },
            onDataSetVariantClick: function (variant, dataSetKey) {
                let self = this;

                if (variant) {
                    // Keep track of which track we've clicked on
                    self.selectedTrackId = dataSetKey;

                    // Circle selected variant
                    if (self.$refs.variantCardRef) {
                        self.$refs.variantCardRef.forEach((cardRef) => {
                            cardRef.hideVariantCircle(true);
                            cardRef.showVariantCircle(variant, true);
                            cardRef.showCoverageCircle(variant, true);
                        });
                    }
                    if (self.$refs.enrichCardRef) {
                        self.$refs.enrichCardRef.forEach((cardRef) => {
                            cardRef.hideVariantCircle(true);
                            cardRef.showVariantCircle(variant, true);
                        });
                    }

                    // Query service for single variant annotation if we don't have details yet
                    if (!self.variantModel.extraAnnotationsLoaded && (dataSetKey === 's0' || dataSetKey === 'Hub')) {
                        // Turn on flag for summary card loading icons
                        self.$refs.variantSummaryCardRef.setCohortFieldsApplicable();
                        self.deselectVariant(true);
                        self.loadingExtraAnnotations = true;
                        self.loadingExtraClinvarAnnotations = true;

                        // Send variant in for annotating
                        let dataSet = self.variantModel.getDataSet(dataSetKey);
                        dataSet.promiseGetVariantExtraAnnotations(self.selectedGene, self.selectedTranscript, variant, 'vcf')
                            .then(function (updatedVariantObject) {
                                let updatedVariant = updatedVariantObject[0][0];
                                // Display variant info once we have it
                                self.loadingExtraAnnotations = false;
                                self.selectedVariant = self.variantModel.combineVariantInfo([updatedVariant]);

                                // Wrap variant with appropriate structure to send into existing clinvar method
                                let detailsObj = {};
                                detailsObj['loadState'] = {};
                                detailsObj['features'] = [updatedVariant];
                                let variantObj = {};
                                variantObj['Subset'] = detailsObj;
                                let cohortObj = {};
                                cohortObj[0] = variantObj;

                                dataSet.promiseAnnotateWithClinvar(cohortObj, self.selectedGene, self.selectedTranscript, false)
                                    .then(function (variantObj) {
                                        // Unwrap clinvarVariant structure
                                        let clinvarVariant = variantObj[0]['Subset']['features'][0];
                                        self.loadingExtraClinvarAnnotations = false;
                                        self.selectedVariant = self.variantModel.combineVariantInfo([clinvarVariant]);
                                    })
                            })
                    }
                    else if (dataSetKey === 's0' || dataSetKey === 'Hub'){
                        // We've selected a variant in cohort track already loaded
                        self.$refs.variantSummaryCardRef.setCohortFieldsApplicable();
                        self.selectedVariant = variant;
                    } else {
                        // We've selected a variant in sample model track - if it exists in cohort, display those details
                        let mainDataSet = self.launchedFromHub ? self.variantModel.getDataSet('Hub') : self.variantModel.getDataSet('s0');
                        let matchingVar = mainDataSet.getVariant(variant);
                        if (matchingVar != null) {
                            self.$refs.variantSummaryCardRef.setCohortFieldsApplicable();
                            self.selectedVariant = matchingVar;
                        } else {
                            self.$refs.variantSummaryCardRef.setCohortFieldsNotApplicable();
                            self.selectedVariant = variant;
                        }
                    }
                }
                else {
                    self.selectedTrackId = null;
                    self.deselectVariant();
                }
            },
            onDataSetVariantHover: function (variant, sourceComponent) {
                let self = this;

                // May only have enrichment card
                if (self.$refs.variantCardRef) {
                    self.$refs.variantCardRef.forEach(function (variantCard) {
                        if (variantCard != sourceComponent) {
                            variantCard.hideVariantCircle(false);
                            variantCard.showVariantCircle(variant, false);
                            variantCard.showCoverageCircle(variant, false);
                        }
                    });
                }
                self.$refs.enrichCardRef.forEach(function (enrichCard) {
                    if (enrichCard != sourceComponent) {
                        enrichCard.hideVariantCircle(false);
                        enrichCard.showVariantCircle(variant, false);
                    }
                });
            },
            onDataSetVariantHoverEnd: function () {
                let self = this;

                // May only have enrichment card
                if (self.$refs.variantCardRef) {
                    self.$refs.variantCardRef.forEach(function (variantCard) {
                        variantCard.hideVariantCircle(false);
                        variantCard.hideCoverageCircle(false);
                    });
                }

                self.$refs.enrichCardRef.forEach(function (enrichCard) {
                    enrichCard.hideVariantCircle(false);
                });
            },
            deselectVariant: function (keepVariantCircle = false) {
                let self = this;
                self.selectedVariant = null;
                if (!keepVariantCircle && self.$refs.variantCardRef) {
                    self.$refs.variantCardRef.forEach((cardRef) => {
                        cardRef.hideVariantCircle(true);
                        cardRef.hideCoverageCircle(true);
                    });
                    if (self.$refs.enrichCardRef) {
                        self.$refs.enrichCardRef.forEach((cardRef) => {
                            cardRef.hideVariantCircle(true);
                        });
                    }
                }
            },
            startZoomMode: function (selectedVarIds) {
                let self = this;

                // Pileup selection
                self.variantModel.getDataSet('s0').setSelectedVariants(self.selectedGene, selectedVarIds);

                // Clear data out of summary card
                if (self.$refs.variantSummaryCardRef) {
                    self.$refs.variantSummaryCardRef.summaryCardVariantDeselect();
                }
            },
            showVariantExtraAnnots: function (sourceComponent, variant, cohortKey) {
                let self = this;

                self.variantModel
                    .getCohort(cohortKey)
                    .promiseGetImpactfulVariantIds(self.selectedGene, self.selectedTranscript, this.cacheHelper)
                    .then(function (annotatedVariants) {
                        // If the clicked variant is in the list of annotated variants, show the
                        // tooltip; otherwise, the callback will get the extra annots for this
                        // specific variant
                        self.showVariantTooltipExtraAnnots(sourceComponent, variant, annotatedVariants, function () {
                            // The clicked variant wasn't annotated in the batch of variants.  Get the
                            // extra annots for this specific variant.
                            self.variantModel
                                .getModel(cohortKey)
                                .promiseGetVariantExtraAnnotations(self.selectedGene, self.selectedTranscript, self.selectedVariant)
                                .then(function (refreshedVariant) {
                                    self.showVariantTooltipExtraAnnots(sourceComponent, variant, [refreshedVariant]);
                                })
                        })
                    });
            },

            showVariantTooltipExtraAnnots: function (sourceComponent, variant, annotatedVariants, callbackNotFound) {
                let self = this;
                var targetVariants = annotatedVariants.filter(function (v) {
                    return variant &&
                        variant.start === v.start &&
                        variant.ref === v.ref &&
                        variant.alt === v.alt;
                });
                if (targetVariants.length > 0) {
                    var annotatedVariant = targetVariants[0];
                    annotatedVariant.screenX = variant.screenX;
                    annotatedVariant.screenY = variant.screenY;
                    annotatedVariant.screenXMatrix = variant.screenXMatrix;
                    annotatedVariant.screenYMatrix = variant.screenYMatrix;

                    variant.extraAnnot = true;
                    variant.vepHGVSc = annotatedVariant.vepHGVSc;
                    variant.vepHGVSp = annotatedVariant.vepHGVSp;
                    variant.vepVariationIds = annotatedVariant.vepVariationIds;

                    sourceComponent.showVariantTooltip(variant, true);
                } else {
                    if (callbackNotFound) {
                        callbackNotFound();
                    }
                }
            },
            onKnownVariantsVizChange: function (viz) {
                let self = this;
                self.showClinvarVariants = viz === 'variants';
                // if (self.showClinvarVariants) {
                //   self.coreModel.promiseLoadKnownVariants(self.selectedGene, self.selectedTranscript);
                // }
            },
            onKnownVariantsFilterChange: function (selectedCategories) {
                let self = this;
                self.filterModel.setModelFilter('known-variants', 'clinvar', selectedCategories);

                self.variantModel.setLoadedVariants(self.selectedGene, 'known-variants');
            },
            onRemoveGene: function (geneName) {
                this.cacheHelper.clearCacheForGene(geneName);
            },
            onAnalyzeAll: function () {
                this.cacheHelper.analyzeAll(this.variantModel);
            },
            clearCache: function () {
                this.cacheHelper.promiseClearCache(this.cacheHelper.launchTimestamp);
            },
            onApplyGenes: function (genesString) {
                this.geneModel.copyPasteGenes(genesString);
            },
            onCopyPasteGenes: function (genesString) {
                this.geneModel.copyPasteGenes(genesString);
            },
            onSortGenes: function (sortBy) {
                this.geneModel.sortGenes(sortBy);
            },
            promiseDetermineSourceAndInit: function () {
                let self = this;

                return new Promise((resolve, reject) => {
                    let source = self.paramSource;
                    let projectId = self.paramProjectId;
                    let selectedGene = self.paramGene;
                    let phenoFilters = self.getHubPhenoFilters();
                    let usingNewApi = true;

                    // If we still don't have a project id, we might be using the old API
                    if (projectId === '0') {
                        projectId = self.paramOldProjectId;
                        usingNewApi = false;
                    }

                    // If we can't map project id with Vue Router, may be coming from Hub OAuth
                    if (projectId === '0') {
                        let queryParams = Qs.parse(window.location.search.substring(1)); // if query params before the fragment
                        Object.assign(queryParams, self.$route.query);
                        source = queryParams.source;
                        projectId = queryParams.project_id !== 0 ? queryParams.project_id : queryParams.project_uuid;
                        if (projectId == null) {
                            projectId = '0';
                        }
                        selectedGene = queryParams.gene;
                        phenoFilters = queryParams.filter;
                        usingNewApi = true;
                    }

                    // If we have a project ID here, coming from Hub launch
                    if (projectId !== '0') {
                        self.firstLaunch = false;       // Mark first launch as complete
                        self.showVariantCards = true;   // Show for hub launch
                        self.launchedFromHub = true;
                        let hubEndpoint = new HubEndpoint(source, usingNewApi);
                        let initialLaunch = !(self.paramProjectId === '0');
                        self.variantModel.promiseInitFromHub(hubEndpoint, projectId, phenoFilters, initialLaunch, usingNewApi)
                            .then(function (idNumList) {
                                let probandN = idNumList[0].length;
                                let subsetN = idNumList[1].length;
                                if (self.$refs.variantSummaryCardRef != null) {
                                    self.$refs.variantSummaryCardRef.assignBarChartValues(probandN, subsetN);
                                }
                                let loadGene = self.DEMO_GENE;
                                if (selectedGene === '' || selectedGene == null) {
                                    alert('Could not obtain selected gene from Hub. Initializing with demo gene.');
                                    selectedGene = loadGene;
                                }
                                self.geneModel.addGeneName(selectedGene);
                                self.onGeneSelected(selectedGene);
                                self.initializeFiltering();
                                resolve();
                            })
                    } else {
                        // Otherwise, wait for user to launch files menu
                        self.showWelcome = true;
                        self.launchedFromHub = false;
                        self.firstLaunch = true;
                        resolve();
                    }
                });
            },
            /* Returns array of phenotype objects {phenotypeName: phenotypeData} */
            getHubPhenoFilters: function () {
                let self = this;
                let params = Qs.parse(self.$route.query);
                let {filter} = params;
                return filter;
            },
            onZoomClick: function(variant) {
                // Work around for vue-js-modal implementation
                let self = this;
                let cohortKey = 's0';   // Hard-coding for now since only cohort track can be zoomed
                self.onDataSetVariantClick(variant, cohortKey);
            },
            drawZygCharts: function() {
                let self = this;
                let firstHubLaunch = self.firstLaunch && self.launchedFromHub;
                if (self.$refs.variantSummaryCardRef != null && !firstHubLaunch) {
                    self.$refs.variantSummaryCardRef.assignBarChartValues(self.probandN, self.subsetN);
                }
            },
            filterBoxToggled: function(filterName, filterState) {
                let self = this;
                let filterInfo = {
                    name: filterName,
                    cohortOnly: false,
                    type: 'checkbox',
                    state: filterState,
                    cutoffValue: null,
                };
                self.onFilterSettingsApplied(filterInfo);
            },
            filterCutoffApplied: function(filterName, filterLogic, cutoffValue) {
                let self = this;

                let translatedFilterName = self.variantModel.translator.getTranslatedFilterName(filterName);

                let filterInfo = {
                    name: translatedFilterName,
                    cohortOnly: false,
                    type: 'cutoff',
                    state: filterLogic,
                    cutoffValue: cutoffValue
                };
                self.onFilterSettingsApplied(filterInfo);
            },
            filterCutoffCleared: function(filterName) {
                let self = this;

                let translatedFilterName = self.variantModel.translator.getTranslatedFilterName(filterName);

                let filterInfo = {
                    name: translatedFilterName,
                    cohortOnly: false,
                    type: 'cutoff',
                    state: false,
                    cutoffValue: null
                };
                self.onFilterSettingsApplied(filterInfo);
            },
            onFilterSettingsApplied: function (filterInfo) {
                let self = this;
                let selectedVarId = null;
                if (self.selectedVariant) {
                    selectedVarId = self.selectedVariant.id;
                }
                self.$refs.enrichCardRef[0].filterVariants(filterInfo, self.selectedTrackId, selectedVarId);

                if (self.$refs.variantCardRef && !filterInfo.cohortOnly) {
                    self.$refs.variantCardRef.forEach((cardRef) => {
                        cardRef.filterVariants(filterInfo, self.selectedTrackId, selectedVarId);
                    });
                }
            },
            openFileSelection: function() {
                let self = this;
                if (self.$refs.navRef) {
                    self.$refs.navRef.openFileSelection();
                }
            }
        }
    }
</script>
