/* Logic relative to a single data set (for example, Sfari data set). Organized into cohort objects.
   SJG updated Aug2018 */
class DataSetModel {
    constructor(theVariantModel) {
        // Public props
        this.entryId = null;            // Coordinates with file upload dialog
        this.name = '';                 // Key for variant card
        this.vcfNames = [];             // List of names (or IDs for local) corresponding to vcf urls - matching order as vcfUrls

        // Sources for data set
        this.vcfUrls = [];
        this.vcfFiles = [];
        this.tbiUrls = [];
        this.tbiFiles = [];
        this.bamUrls = [];
        this.bamFiles = [];
        this.baiUrls = [];
        this.baiFiles = [];

        // For Hub launch issues
        this.invalidVcfNames = [];      // List of names corresponding to invalid vcfs
        this.invalidVcfReasons = [];   // List of reasons corresponding to invalid vcfs - matching order as invalidVcfNames
        this.annotationScheme = 'VEP';
        this.affectedInfo = null;

        // Psuedo-private props
        this._variantModel = theVariantModel;
        this._cohorts = [];
        this._cohortMap = {};

        // Reference lookups used for pre-loading extra variant annotation
        this.subsetEnrichedVars = {};
        this.probandEnrichedVars = {};
        this.nonEnrichedVars = {};
        this.probandOnlyVars = {};
    }

    //<editor-fold desc="GETTERS">

    getVariantModel() {
        let self = this;
        return self._variantModel;
    }

    /* Returns all cohorts in the dataset. */
    getCohorts() {
        let self = this;
        return self._cohorts;
    }

    /* Convenience method that returns cohort given a valid ID. */
    getCohort(id) {
        let self = this;
        return self._cohortMap[id];
    }

    /* Returns proband cohort or undefined if it does not exist. */
    getProbandCohort() {
        let self = this;
        return self._cohortMap[PROBAND_ID];
    }

    /* Returns subset cohort or undefined if it does not exist. */
    getSubsetCohort() {
        let self = this;
        return self._cohortMap[SUBSET_ID];
    }

    /* Returns unaffected cohort or undefined if it does not exist. */
    getUnaffectedCohort() {
        let self = this;
        return self._cohortMap[UNAFFECTED_ID];
    }

    getAnnotationScheme() {
        let self = this;
        return self.annotationScheme;
    }

    //</editor-fold>

    //<editor-fold desc="STATUS GETTERS">

    /* Returns true if all cohort data are only alignments. */
    isAlignmentsOnly() {
        let self = this;
        let theCohorts = self._cohorts.filter(function (cohort) {
            return cohort.isAlignmentsOnly();
        });
        return theCohorts.length === self._cohorts.length;
    }

    isLoaded() {
        return this.vcf != null && this.vcfData != null;
    }

    isReadyToLoad() {
        return this.isVcfReadyToLoad() || this.isBamReadyToLoad();
    }

    isBamReadyToLoad() {
        return this.bam != null && (this.bamUrlEntered || this.bamFileOpened);
    }

    isVcfReadyToLoad() {
        return this.vcf != null && (this.vcfUrlEntered || this.vcfFileOpened);
    }

    isBamLoaded() {
        return this.bam && (this.bamUrlEntered || (this.bamFileOpened && this.getBamRefName));
    }

    isVcfLoaded() {
        return this.vcf && (this.vcfUrlEntered || this.vcfFileOpened);
    }

    //</editor-fold>

    /* Initializes proband, subset, unaffected cohorts. */
    initCohorts() {
        let self = this;

        let probandCohort = new CohortModel();
        probandCohort.isProbandCohort = true;
        probandCohort.inProgress.fetchingHubData = true;
        //probandCohort.trackName = 'Variants for';
        probandCohort.subsetPhenotypes.push('Probands');
        self.addCohort(probandCohort, PROBAND_ID);

        let subsetCohort = new CohortModel();
        subsetCohort.isSubsetCohort = true;
        subsetCohort.inProgress.fetchingHubData = true;
        //subsetCohort.trackName = 'Cohort Filters';
        self.addCohort(subsetCohort, SUBSET_ID);

        let unaffectedCohort = new CohortModel();
        unaffectedCohort.isUnaffectedCohort = true;
        unaffectedCohort.inProgress.fetchingHubData = true;
        self.addCohort(unaffectedCohort, UNAFFECTED_ID);
    }

    /* Adds the cohort to the dataset. Places cohort in lookup by ID. */
    addCohort(cohort, id) {
        let self = this;
        self._cohorts.push(cohort);
        self._cohortMap[id] = cohort;
    }

    promiseInit(vcfFileNames) {
        return new Promise(function (resolve, reject) {
            // Finish initializing cohort models
            let subsetCohort = self.mainDataSet.getSubsetCohort();
            subsetCohort.inProgress.verifyingVcfUrl = true;
            subsetCohort.init(self, vcfFileNames);

            // Check vcf urls and add samples
            self.promiseAddSamples(subsetCohort, self.mainDataSet.vcfNames, self.mainDataSet.vcfUrls, self.mainDataSet.tbiUrls)
                .then(function () {
                    subsetCohort.inProgress.verifyingVcfUrl = false;
                    self.inProgress.loadingDataSources = false;
                    self.isLoaded = true;
                    resolve();  // TODO: have to return an object w/ number of proband ids and number of subset ids (numProbandIds, numSubsetIds)
                })
                .catch(function (error) {
                    console.log("There was a problem initializing in VariantModel " + error);
                    reject(error);
                })
        });
    }

    /* Promises to load variants for the selected gene.
      Returns a map of annotated variant data. */
    promiseLoadData(theGene, theTranscript, options) {
        let self = this;
        let promises = [];

        return new Promise(function (resolve, reject) {
            if (self.mainDataSet == null) {
                resolve();
            } else {
                // Load variants
                self.startGeneProgress(theGene.gene_name);
                self.clearLoadedData();

                let dataSetResultMap = null;
                let p1 = self.promiseLoadVariants(theGene, theTranscript, options)
                    .then(function (data) {
                        dataSetResultMap = data.resultMap;
                        self.setLoadedVariants(data.gene);
                    });
                promises.push(p1);

                Promise.all(promises)
                    .then(function () {
                        resolve(dataSetResultMap);
                    })
                    .catch(function (error) {
                        console.log('There was a problem loading the data in VariantModel.');
                        reject(error);
                    })
            }
        })
    }

    /* Promises to annotate variants and returns a map of annotated variant data. */
    promiseLoadVariants(theGene, theTranscript, options) {
        let self = this;

        return new Promise(function (resolve, reject) {
            self.promiseAnnotateVariants(theGene, theTranscript, false, options)
                .then(function (resultMap) {
                    return self.promiseAnnotateInheritance(theGene, theTranscript, resultMap, {
                        isBackground: false,
                        cacheData: false
                    })
                })
                .then(function (data) {
                    resolve(data);
                })
                .catch(function (error) {
                    reject(error);
                })
        })
    }

    /* Promises to annotate variants in each cohort model.
       Updates cohort loading status as appropriate. */
    promiseAnnotateVariants(theGene, theTranscript, isBackground, options = {}) {
        let self = this;

        return new Promise(function (resolve, reject) {
            let annotatePromises = [];
            let subsetResults = null;
            let probandCounts = null;

            // Annotate variants for cohort models that have specified IDs
            if (self.mainDataSet.getSubsetCohort() != null) {
                let cohortModel = self.mainDataSet.getSubsetCohort();
                cohortModel.inProgress.loadingVariants = true;
                let p = cohortModel.promiseAnnotateVariantEnrichment(theGene,
                    theTranscript, [cohortModel],
                    false, isBackground, self.keepVariantsCombined, true)
                    .then(function (resultMap) {
                        cohortModel.inProgress.loadingVariants = false;
                        cohortModel.inProgress.drawingVariants = true;
                        if (cohortModel.isSubsetCohort) {
                            subsetResults = resultMap;
                        }
                        else {
                            probandCounts = resultMap;
                        }
                        let unwrappedFeatures = resultMap['Subset'].features;
                        self.promiseAssignCohortsToEnrichmentGroups(unwrappedFeatures);
                    })
                    .catch((error) => {
                        console.log('Problem in promiseAnnotateVars ' + error);
                    });
                annotatePromises.push(p);
            }
            Promise.all(annotatePromises)
                .then(function () {
                    let quickLoad = options.efficiencyMode === true;
                    if (!quickLoad) {
                        self.promiseAnnotateWithClinvar(subsetResults, theGene, theTranscript, isBackground)
                            .then(function (data) {
                                resolve(data);
                            })
                    }
                    else {
                        resolve(subsetResults);
                    }
                })
                .catch(function (error) {
                    console.log("There was a problem in VariantModel promiseAnnotateVariants: " + error);
                })
        });
    }

    /* Used in cohort-gene to further annotate variants that have already come back
       from a single positional annotation round. Options may be used to determine which outside
       database annotations are called. */
    promiseFurtherAnnotateVariants(theGene, theTranscript, isBackground, options = {}) {
        let self = this;

        return new Promise(function (resolve, reject) {
            // Annotate all variants in both proband and subset groups
            let subsetCohort = self.mainDataSet.getSubsetCohort();
            subsetCohort.promiseAnnotateVariants(theGene,
                theTranscript, [subsetCohort],
                false, isBackground, self.keepVariantsCombined, false)
                .then(function (resultMap) {
                    // Wrap result to play nice with clinvar function
                    let wrappedResultMap = [];
                    wrappedResultMap[0] = resultMap;
                    self.promiseAnnotateWithClinvar(wrappedResultMap, theGene, theTranscript, isBackground)
                        .then(function (data) {
                            resolve(data);
                        })
                })
                .catch(function (error) {
                    console.log("There was a problem with VariantModel promiseFurtherAnnotateVariants: " + error);
                    reject();
                })
        })
    }

    setSelectedVariants(gene, selectedVarIds) {
        let self = this;

        // Populate lookup
        let selectedVarLookup = {};
        selectedVarIds.forEach((varId) => {
            selectedVarLookup[varId] = true;
        });

        let filterAndPileupVariants = function (model, start, end, target = 'selected') {
            let filteredVariants = $.extend({}, model.vcfData);
            filteredVariants.features = model.vcfData.features.filter(function (feature) {
                return selectedVarLookup[feature.id];
            });

            let pileupObject = model._pileupVariants(filteredVariants.features, start, end);
            filteredVariants.maxLevel = pileupObject.maxLevel + 1;
            filteredVariants.featureWidth = pileupObject.featureWidth;

            return filteredVariants;
        };

        let cohort = self.mainDataSet.getSubsetCohort();
        if (cohort != null) {
            if (cohort.vcfData && cohort.vcfData.features) {
                let start = self.filterModel.regionStart ? self.filterModel.regionStart : gene.start;
                let end = self.filterModel.regionEnd ? self.filterModel.regionEnd : gene.end;
                cohort.selectedVariants = filterAndPileupVariants(cohort, start, end, 'selected');
            }
        }
    }

    /* Filters out homozygous ref variants for each cohort. Initializes pileup rendering of variants. */
    setLoadedVariants(gene, name = null) {
        let self = this;

        let filterAndPileupVariants = function (model, start, end, target = 'loaded') {
            let filteredVariants = $.extend({}, model.vcfData);
            filteredVariants.features = model.vcfData.features.filter(function (feature) {
                let isTarget = false;
                if (target === 'loaded' && (!feature.fbCalled || feature.fbCalled !== 'Y')) {
                    isTarget = true;
                } else if (target === 'called' && feature.fbCalled && feature.fbCalled === 'Y') {
                    isTarget = true;
                }

                let isHomRef = feature.zygosity == null
                    || feature.zygosity.toUpperCase() === "HOMREF"
                    || feature.zygosity.toUpperCase() === "NONE"
                    || feature.zygosity === "";

                let inRegion = true;
                if (self.filterModel.regionStart && self.filterModel.regionEnd) {
                    inRegion = feature.start >= self.filterModel.regionStart && feature.start <= self.filterModel.regionEnd;
                }
                let passesModelFilter = self.filterModel.passesModelFilter(model.name, feature);

                return isTarget && !isHomRef && inRegion && passesModelFilter;
            });

            let pileupObject = model._enrichmentPileupVariants(filteredVariants.features, start, end);
            filteredVariants.maxPosLevel = pileupObject.maxPosLevel;
            filteredVariants.maxNegLevel = pileupObject.maxNegLevel;
            filteredVariants.maxSubLevel = pileupObject.maxSubLevel;
            filteredVariants.featureWidth = pileupObject.featureWidth;

            return filteredVariants;
        };

        let cohort = self.mainDataSet.getSubsetCohort();
        if (name == null || name === cohort.name) {
            if (cohort.vcfData && cohort.vcfData.features) {
                let start = self.filterModel.regionStart ? self.filterModel.regionStart : gene.start;
                let end = self.filterModel.regionEnd ? self.filterModel.regionEnd : gene.end;
                cohort.loadedVariants = filterAndPileupVariants(cohort, start, end, 'loaded');
            }
        }
    }


    /* Clears the variant data for each cohort. Falsifies flags used for chip display. */
    clearLoadedData() {
        let self = this;

        self.extraAnnotationsLoaded = false;
        if (self.mainDataSet != null) {
            self.mainDataSet.getCohorts().forEach(function (cohort) {
                cohort.loadedVariants = {
                    loadState: {},
                    features: [],
                    maxPosLevel: 0,
                    maxNegLevel: 0,
                    maxSubLevel: 0,
                    featureWidth: 0
                };
                cohort.calledVariants = {
                    loadState: {},
                    features: [],
                    maxPosLevel: 0,
                    maxNegLevel: 0,
                    maxSubLevel: 0,
                    featureWidth: 0
                };
                cohort.coverage = [[]];
                cohort.noMatchingSamples = false;
            })
        }
    }


    getVepImpactClass(domVar) {
        // Pull variant out of lookup
        let self = this;
        let varId = domVar.id;
        let variant = self.subsetEnrichedVars[varId];
        if (variant == null) variant = self.probandEnrichedVars[varId];
        if (variant == null) variant = self.nonEnrichedVars[varId];
        if (variant == null) variant = self.probandOnlyVars[varId];
        if (variant == null) return '';

        let toggleImpact = "";  // Grouping classes, added & removed based on impact mode
        let impactObj = variant.vepImpact;
        let vepImpact = '';
        if (impactObj['LOW'] != null) vepImpact = 'LOW';
        if (impactObj['MODIFIER'] != null) vepImpact = 'MODIFIER';
        if (impactObj['MODERATE'] != null) vepImpact = 'MODERATE';
        if (impactObj['HIGH'] != null) vepImpact = 'HIGH';
        if (vepImpact !== '') {
            toggleImpact += " " + 'i' + vepImpact;
        }
        else {
            toggleImpact += "iNONE";
        }
        return toggleImpact;
    }


    /* Reference assigns all features in provided parameter to enrichment groups. */
    // TODO: change this to assign to enrichment groups based on p-value
    // TODO: this is a dataset level thing - group of variants belonging to certain dataset
    promiseAssignCohortsToEnrichmentGroups(variants) {
        let self = this;
        return new Promise((resolve, reject) => {
            if (variants == null || variants.length === 0) {
                reject('No variants to assign to enrichment groups');
            }
            variants.forEach(function (variant) {
                if (variant.subsetDelta >= self.subsetEnrichmentThreshold) {
                    self.subsetEnrichedVars[variant.id] = variant;
                }
                else if (variant.subsetDelta <= self.probandEnrichmentThreshold) {
                    self.probandEnrichedVars[variant.id] = variant;
                }
                else if (variant.affectedSubsetCount > 0) {
                    self.nonEnrichedVars[variant.id] = variant;
                }
                else {
                    self.probandOnlyVars[variant.id] = variant;
                }
            });
            resolve();
        });
    }
}
