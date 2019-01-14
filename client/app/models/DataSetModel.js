/* Logic relative to a single data set (for example, Sfari data set or local upload data set).
   Has 1:1 relationship with VariantViz component and rendered track.
   SJG updated Nov2018 */
import CohortModel from './CohortModel.js'
import Bam from '../../js/model/bam.iobio.js';

class DataSetModel {
    constructor(theVariantModel) {

        // <editor-fold desc="IDENTITY PROPS">
        this.entryId = null;            // Coordinates with file upload dialog
        this.name = '';                 // Key for variant card
        // </editor-fold>

        // <editor-fold desc="DATA PROPS">
        this.vcfNames = [];             // List of names (or IDs for local) corresponding to vcf urls - matching order as vcfUrls
        this.vcfs = [];                 // List of vcf urls or files
        this.tbis = [];                 // List of tbi urls or files; identical order to vcfs array
        this.bams = [];                 // List of lists of bam urls or files; outer order identical to vcf array
        this.bais = [];                 // List of lists of bai urls or files; outer order identical to vcf array, inner order identical to bam subarrays
        this.bamRefName = null;
        this.vcfEndptHash = {};         // Maps each file to a single vcf.iobio model (key is name of file)
        this.varsInFileHash = {};       // Maps each file to list of variant IDs that exist within the file
        this.bamEndpt = {};             // The bam endpt for this dataset model - only single sample tracks support BAM information for now
        this.genesInProgress = [];
        this.affectedInfo = null;
        this.calledVariants = null;
        this.loadedVariants = null;     // Variants displayed in track
        this.filteredVariants = null;   // Filtered variant display
        this.selectedVariants = null;   // Selected in zoom panel
        this.trackName = '';            // Displays in italics before chips
        this.excludeIds = [];           // Samples from any vcf file to be removed from analysis
        this.getVcfRefName = null;      // The chromosome name for the selected gene
        this.getBamRefName = null;
        this.vcfRefNamesMap = {};       // The map of all chromosomes present in all vcf files for this data set
        this.displayName = '';          // Name displayed in chips for analysis sources & in file loader for local launched files
        this.maxDepth = 0;
        this.coverage = [[]];           // Data displayed in coverage track

        // TODO: these might be depreciated if color scheme is no longer used...
        this.subsetEnrichedVars = {};
        this.probandEnrichedVars = {};
        this.nonEnrichedVars = {};
        this.probandOnlyVars = {};
        this.subsetEnrichmentThreshold = 2.0;
        this.probandEnrichmentThreshold = 0.5;
        this.extraAnnotationsLoaded = false;
        // </editor-fold>

        // <editor-fold desc="STATE PROPS">
        this.isSingleSample = false;        // True if we this model represents a single sample in a single vcf file
        this.vcfUrlsEntered = false;        // True if we have one or more valid vcf urls entered
        this.vcfFilesOpened = false;
        this.bamUrlEntered = false;         // True if we have a valid bam url entered
        this.bamFileOpened = false;
        this.keepVariantsCombined = true;   // True for multiple samples to be displayed on single track
        this.efficiencyMode = true;         // True to only pull back variant locations and not functional impacts
        this.noMatchingSamples = false;     // Flag to display No Matching Variants chip
        this.annotationScheme = 'VEP';
        this.lastGeneLoaded = null;         // Helps determine if we need to reload variants on load from files menu
        this.entryDataChanged = false;      // If true, we need to reload variants on load from files menu
        this.inProgress = {
            'fetchingHubData': false,
            'verifyingVcfUrl': false,
            'loadingVariants': false,
            'drawingVariants': false,
            'loadingCoverage': false
        };
        this.lastVcfAlertify = null;
        this.lastBamAlertify = null;
        // </editor-fold>

        // <editor-fold desc="MODEL PROPS">
        this._variantModel = theVariantModel;
        this._cohorts = [];
        this._cohortMap = {};
        this._samples = [];
        // </editor-fold>

        // <editor-fold desc="MOSAIC PROPS">
        this.invalidVcfNames = [];      // List of names corresponding to invalid vcfs
        this.invalidVcfReasons = [];   // List of reasons corresponding to invalid vcfs - matching order as invalidVcfNames
        // </editor-fold>
    }

    //<editor-fold desc="GETTERS & SETTERS">

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

    getFilterModel() {
        let self = this;
        return self.getVariantModel().filterModel;
    }

    getEndpoint() {
        let self = this;
        return self.getVariantModel().endpoint;
    }

    getCacheHelper() {
        let self = this;
        return self.getVariantModel().cacheHelper;
    }

    getGenomeBuildHelper() {
        let self = this;
        return self.getVariantModel().genomeBuildHelper;
    }

    /* Returns the first vcf in vcfEndptHash. */
    getFirstVcf() {
        let self = this;
        let urlNames = Object.keys(self.vcfEndptHash);
        if (urlNames != null && urlNames.length > 0 && urlNames[0] != null && urlNames[0] !== '') {
            return self.vcfEndptHash[urlNames[0]];
        }
    }

    getAffectedInfo() {
        let self = this;
        return self.affectedInfo;
    }

    getName() {
        let self = this;
        return self.name;
    }

    getProbandIds() {
        let self = this;
        if (self.getProbandCohort() && self.getProbandCohort.sampleIds && self.ProbandCohort.sampleIds.length > 0) {
            return self.getProbandCohort().sampleIds;
        } else {
            return [];
        }
    }

    getSubsetIds() {
        let self = this;
        if (self.getSubsetCohort() && self.getSubsetCohort().sampleIds && self.getSubsetCohort().sampleIds.length > 0) {
            return self.getSubsetCohort().sampleIds;
        } else {
            return [];
        }
    }

    setSubsetIds(theIds) {
        let self = this;
        self.getSubsetCohort().sampleIds = theIds;
    }

    getExcludeIds() {
        let self = this;
        if (self.excludeIds && self.excludeIds.length > 0) {
            return self.excludeIds;
        } else {
            return [];
        }
    }

    setExcludeIds(theIds) {
        let self = this;
        self.excludeIds = theIds;
    }

    setProbandIds(theIds) {
        let self = this;
        self.getProbandCohort().sampleIds = theIds;
    }

    setSelectedSample(theId) {
        let self = this;
        self.getSubsetCohort().sampleIds = [theId];
    }

    getTranslator() {
        let self = this;
        return self.getVariantModel().translator;
    }

    /* Returns gene model from parent variant model. */
    getGeneModel() {
        let self = this;
        return self.getVariantModel().geneModel;
    }

    /* Sets vcfNames field in this model and the phenotypes field in subset cohort model.
    Both properties utilized in EnrichmentVariantViz chips. */
    setDisplayChips(dataSetName) {
        let self = this;

        self.vcfNames = [dataSetName];
        self.getSubsetCohort().setSelectionDetails(self.excludeIds);
    }

    clearDisplayChips() {
        let self = this;
        self.getSubsetCohort().clearChips();
    }

    wipeGeneData() {
        let self = this;
        self.loadedVariants = null;
        self.getSubsetCohort().updateChips();
    }

    markEntryDataChanged() {
        let self = this;
        self.entryDataChanged = true;
    }

    /* Takes in a variant and returns the corresponding one from this dataset.
     * If the variant does not exist in this dataset, returns null. */
    getVariant(varObj) {
        let self = this;
        let matchingVar = null;
        if (self.loadedVariants && self.loadedVariants.features) {
            matchingVar = self.loadedVariants.features.filter((feature) => {
                return feature.id === varObj.id;
            })
        }
        if (matchingVar.length > 1) {
            console.log("WARNING: More than one matching variant!");
        } else if (matchingVar.length > 0) {
            matchingVar = matchingVar[0];
        } else {
            matchingVar = null;
        }
        return matchingVar;
    }

    //</editor-fold>

    //<editor-fold desc="STATUS GETTERS">

    /* Returns true if all cohort data are only alignments. */
    isAlignmentsOnly() {
        return !this.areVcfsReadyToLoad() && this.isBamLoaded();
    }

    isReadyToLoad() {
        return this.areVcfsReadyToLoad() && this.isBamReadyToLoad() && this.getSubsetIds().length > 0;
    }

    // Bam not required but if it's there, must be valid
    isBamReadyToLoad() {
        if (this.bams.length === 0) {
            return true;
        } else {
            return this.bamUrlEntered || this.bamFileOpened;
        }
    }

    isBamLoaded() {
        return this.bams.length > 0 && (this.bamUrlEntered || this.bamFileOpened);
    }

    areVcfsReadyToLoad() {
        return this.vcfs.length > 0 && Object.keys(this.vcfEndptHash).length > 0 && (this.vcfUrlsEntered || this.vcfFilesOpened);
    }

    //</editor-fold>

    // <editor-fold desc="ADD & INITIALIZE">

    /* Initializes proband, subset, unaffected cohorts. */
    initCohorts() {
        let self = this;

        let probandCohort = new CohortModel(self);
        probandCohort.isProbandCohort = true;
        self.addCohort(probandCohort, PROBAND_ID);

        let subsetCohort = new CohortModel(self);
        subsetCohort.isSubsetCohort = true;
        self.addCohort(subsetCohort, SUBSET_ID);

        let unaffectedCohort = new CohortModel(self);
        unaffectedCohort.isUnaffectedCohort = true;
        self.addCohort(unaffectedCohort, UNAFFECTED_ID);
    }

    /* Initializes a single cohort model representing a single sample track, rather than multiple cohorts. */
    initSample() {
        let self = this;

        let subsetCohort = new CohortModel(self);
        subsetCohort.isSubsetCohort = true;
        self.addCohort(subsetCohort, SUBSET_ID);
    }

    /* Adds the cohort to the dataset. Places cohort in lookup by ID. */
    addCohort(cohort, id) {
        let self = this;
        self._cohorts.push(cohort);
        self._cohortMap[id] = cohort;
    }


    /* Adds an individual vcf.iobio model for each of the files within this dataset.
     * Returns promise to begin file checking process. */
    promiseInitFromHub() {
        let self = this;

        self.inProgress.verifyingVcfUrl = true;
        return new Promise(function (resolve, reject) {

            // Set up individual endpoint per file
            self.vcfNames.forEach((name) => {
                self.addVcfEndpoint(name);
            });

            // Check vcf urls and add samples
            self.promiseAddVcfs(self.vcfNames, self.vcfs, self.tbis)
                .then(function () {
                    self.inProgress.verifyingVcfUrl = false;
                    self.inProgress.loadingDataSources = false;

                    let retObj = {};
                    retObj['numProbandIds'] = self.getProbandCohort().sampleIds;
                    retObj['numSubsetIds'] = self.getSubsetCohort().sampleIds;
                    resolve(retObj);
                })
                .catch(function (error) {
                    console.log("There was a problem initializing in VariantModel " + error);
                    reject(error);
                })
        });
    }

    /* Creates & initializes a vcf.iobio model and adds it to this dataset's hash with the given key. */
    addVcfEndpoint(endptKey) {
        let self = this;

        self.vcfEndptHash[endptKey] = vcfiobio();
        let theEndpt = self.vcfEndptHash[endptKey];
        let varModel = self.getVariantModel();
        theEndpt.setEndpoint(varModel.endpoint);
        theEndpt.setGenericAnnotation(varModel.genericAnnotation);
        theEndpt.setGenomeBuildHelper(varModel.genomeBuildHelper);
    }

    /* Promises to verify the vcf url and adds samples to vcf object - utilized in HUB launch */
    promiseAddVcfs(entryNames, vcfs, tbis) {
        let self = this;
        if ((Object.keys(self.vcfEndptHash)).length > 0) {
            return new Promise(function (resolve, reject) {
                self.onVcfUrlEntered(entryNames, vcfs, tbis)
                    .then((updatedListObj) => {
                        if (updatedListObj != null) {
                            // Assign updated, stably-sorted lists to data set model
                            self.vcfNames = updatedListObj['names'];
                            self.vcfs = updatedListObj['vcfs'];
                            self.tbis = updatedListObj['tbis'];
                            self.invalidVcfNames = updatedListObj['invalidNames'];
                            self.invalidVcfReasons = updatedListObj['invalidReasons'];
                            resolve();
                        }
                        else {
                            reject('There was a problem checking vcf/tbi urls and adding samples.');
                        }
                    });
            });
        } else {
            return Promise.reject('No vcf data to open in promiseAddVcfs');
        }
    }

    // </editor-fold>

    // <editor-fold desc="LOAD & ANNOTATE">

    /* Promises to load variants for the selected gene. */
    promiseLoadData(theGene, theTranscript) {
        let self = this;

        return new Promise(function (resolve, reject) {
            // Set status flags
            self.inProgress.loadingVariants = true;
            let promises = [];

            // Load variants
            self.startGeneProgress(theGene['gene_name']);
            self.clearLoadedData();
            let vcfP = self.promiseLoadVariants(theGene, theTranscript)
                .then(function (data) {
                    self.setLoadedVariants(data.gene);
                })
                .catch(function (error) {
                    console.log('There was a problem loading the data in DataSetModel.');
                    reject(error);
                });
            promises.push(vcfP);
            let bamP = null;

            if (self.isSingleSample && self.bams.length > 0) {
                bamP = self.promiseLoadCoverage(theGene, theTranscript)
                    .then(function() {
                        self.setCoverage();
                    })
                    .catch((error) => {
                        console.log('There was a problem loading coverage in DataSetModel');
                        reject(error);
                    });
            } else {
                bamP = Promise.resolve();
            }
            promises.push(bamP);

            Promise.all(promises)
                .then(function() {
                    self.entryDataChanged = false;
                    resolve();
                })
        });
    }

    /* Promises to annotate variants and returns a map of annotated variant data. */
    promiseLoadVariants(theGene, theTranscript, options) {
        let self = this;

        return new Promise(function (resolve, reject) {
            if (self.isSingleSample) {
                options = {'getKnownVariants': self.showClinvarVariants, 'efficiencyMode': false, 'singleMode': true};
                self.promiseFullyAnnotateVariants(theGene, theTranscript, false, options)
                    .then(function(wrappedMap) {
                        let resultMap = wrappedMap[[0]];
                        let data = Object.values(resultMap)[0];

                        // Flip status flags
                        self.inProgress.loadingVariants = false;
                        self.inProgress.drawingVariants = true;
                        resolve(data);
                    })
                    .catch(function(error) {
                        reject(error);
                    })
            } else {
                self.promiseAnnotateEnrichment(theGene, theTranscript, false, options)
                    .then(function (resultMap) {
                        let annotatedDataObj = {'resultMap': resultMap, 'gene': theGene, 'transcript': theTranscript};
                        resolve(annotatedDataObj);
                    })
                    .catch(function (error) {
                        reject(error);
                    })
            }

        })
    }

    promiseAnnotateEnrichment(theGene, theTranscript, isBackground, options = {}) {
        let me = this;
        return new Promise(function (resolve, reject) {
            me._promiseVcfRefName(theGene.chr)
                .then(function () {
                    let urlNames = Object.keys(me.vcfEndptHash);
                    let enrichResults = {};
                    let enrichPromises = [];
                    for (let i = 0; i < urlNames.length; i++) {
                        let currFileName = urlNames[i];
                        let currVcfEndpt = me.vcfEndptHash[currFileName];
                        if (currVcfEndpt != null) {
                            let ref = me.getVcfRefName(theGene.chr, currVcfEndpt);
                            let enrichP = currVcfEndpt.promiseGetVariants(
                                ref,
                                theGene,
                                theTranscript,
                                null,       // regions
                                false,      // isMultiSample
                                me.getSubsetCohort().sampleIds,
                                me.getProbandCohort().sampleIds,
                                me.getName() === 'known-variants' ? 'none' : me.getAnnotationScheme().toLowerCase(),
                                me.getTranslator().clinvarMap,
                                me.getGeneModel().geneSource === 'refseq',
                                false,      // hgvs notation
                                false,      // rsid
                                false,      // vep af
                                null,
                                me.keepVariantsCombined,
                                true)       // enrichmentMode
                                .then((results) => {
                                    // Add variant ids to map correlated with file
                                    me.varsInFileHash[currFileName] = results.features.map((feature) => {
                                        return feature.id;
                                    });
                                    // Add results to return object
                                    enrichResults[urlNames[i]] = results;
                                });
                            enrichPromises.push(enrichP);
                        }
                        else {
                            console.log('Problem in CohortModel promoiseAnnotateVariants: Could not retrieve endpoint for the file: ' + urlNames[i]);
                        }
                    }
                    Promise.all(enrichPromises)
                        .then(() => {
                            // Combine data and assign cumulative to subset cohort
                            let destCohort = me.getSubsetCohort();
                            let combinedResults = destCohort._combineEnrichmentCounts(enrichResults);
                            if (combinedResults.features.length > destCohort.TOTAL_VAR_CUTOFF) {
                                combinedResults.features = destCohort.filterVarsOnPVal(combinedResults.features);
                            }
                            // Add variant number to chips
                            me.getSubsetCohort().phenotypes.push(combinedResults.features.length + ' variants');

                            // Assign data parameter
                            if (combinedResults) {
                                let theGeneObject = me.getGeneModel().geneObjects[combinedResults.gene];
                                if (theGeneObject) {
                                    let resultMap = {};

                                    let theVcfData = combinedResults;
                                    if (theVcfData == null) {
                                        if (callback) {
                                            callback();
                                        }
                                        return;
                                    }
                                    theVcfData.gene = theGeneObject;
                                    let entryName = me.getName();
                                    resultMap[entryName] = theVcfData;

                                    // Assign each variant to enrichment groups
                                    me.promiseAssignCohortsToEnrichmentGroups(theVcfData.features);

                                    // Flip status flags
                                    me.inProgress.loadingVariants = false;
                                    me.inProgress.drawingVariants = true;

                                    if (!isBackground) {
                                        destCohort.vcfData = theVcfData;
                                    }
                                    resolve(resultMap);
                                } else {
                                    let error = "ERROR - cannot locate gene object to match with vcf data " + data.ref + " " + data.start + "-" + data.end;
                                    console.log(error);
                                    reject(error);
                                }
                            } else {
                                let error = "ERROR - empty vcf results for " + theGene.gene_name;
                                console.log(error);
                                reject(error);
                            }
                        })
                        .catch((error) => {
                            console.log('Problem in cohort model ' + error);
                        });
                })
        });
    }

    /* Further annotates variants that have been through a single round of minimal annotation. */
    promiseFullyAnnotateVariants(theGene, theTranscript, isBackground, options = {}) {
        let self = this;

        return new Promise(function (resolve, reject) {
            // Annotate all variants in both proband and subset groups
            self.promiseAnnotateVariants(theGene, theTranscript, isBackground, options)
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
                    console.log("There was a problem with DataSetModel promiseFullyAnnotateVariants: " + error);
                    reject();
                })
        })
    }

    /* Promises to annotate variants in each cohort model. Updates cohort loading status as appropriate. */
    promiseAnnotateVariants(theGene, theTranscript, isBackground, options = {}) {
        let self = this;

        return new Promise(function (resolve, reject) {
            self._promiseVcfRefName(theGene.chr)
                .then(function() {
                    // Annotate variants for cohort models that have specified IDs
                    let urlNames = Object.keys(self.vcfEndptHash);
                    let annotationResults = {};
                    let annotationPromises = [];
                    let enrichMode = options.efficiencyMode;
                    let singleMode = options.singleMode;
                    let probandIds = [];
                    if (enrichMode) {
                        probandIds = self.getProbandCohort().sampleIds;
                    }
                    for (let i = 0; i < urlNames.length; i++) {
                        let currFileName = urlNames[i];
                        let currVcfEndpt = self.vcfEndptHash[currFileName];
                        if (currVcfEndpt != null) {
                            let annoP = currVcfEndpt.promiseGetVariants(
                                self.getVcfRefName(theGene.chr, currVcfEndpt),
                                theGene,
                                theTranscript,
                                null,       // regions
                                false, // isMultiSample
                                self.getSubsetCohort().sampleIds,
                                probandIds,
                                self.getName() === 'known-variants' ? 'none' : self.getAnnotationScheme().toLowerCase(),
                                self.getTranslator().clinvarMap,
                                self.getGeneModel().geneSource === 'refseq',
                                false,      // hgvs notation
                                false,      // rsid
                                true,       // vep af
                                null,
                                self.keepVariantsCombined,
                                enrichMode,
                                singleMode)
                                .then((results) => {
                                    annotationResults[currFileName] = results;
                                    if (self.isSingleSample) {
                                        // Unwrap feature array if we're coming from remote call
                                        if (self.vcfUrlsEntered) {
                                            results.features = results.features[0];
                                        }
                                        // Assign cohort model data
                                        let destCohort = self.getSubsetCohort();
                                        // Add variant number to chips
                                        destCohort.phenotypes.push(results.features.length + ' variants');
                                        results.gene = theGene;
                                        destCohort.vcfData = results;
                                    }
                                });
                            annotationPromises.push(annoP);
                        } else {
                            console.log('Problem in CohortModel promoiseAnnotateVariants: Could not retrieve endpoint for the file: ' + urlNames[i]);
                        }
                    }
                    Promise.all(annotationPromises)
                        .then(function () {
                            resolve(annotationResults);
                        })
                        .catch(function (error) {
                            reject("There was a problem in DataSetModel promiseAnnotateVariants: " + error);
                        })
                });
        });
    }

    // TODO: keeping for backend refactor
    /* Promises to obtain enrichment values for all variants within all urls within the provided cohort model. */
    // promiseAnnotateVariantEnrichment(theGene, theTranscript, isBackground, options = {}) {
    //     let self = this;
    //     return new Promise(function (resolve, reject) {
    //
    //         theGene,
    //             //             //     theTranscript, [cohortModel],
    //             //             //     false, isBackground, self.keepVariantsCombined, true)
    //
    //         self._promiseVcfRefName(theGene.chr)
    //             .then(function () {
    //                 let urlNames = Object.keys(self.vcfEndptHash);
    //                 let enrichResults = {};
    //                 let enrichCmds = [];
    //                 let fileNames = []; // Stable sorted to enrichCmds
    //                 let enrichCmdPromises = [];
    //                 for (let i = 0; i < urlNames.length; i++) {
    //                     let currFileName = urlNames[i];
    //                     let currVcfEndpt = self.vcfEndptHash[currFileName];
    //                     if (currVcfEndpt != null) {
    //                         let enrichCmdP = currVcfEndpt.promiseGetEnrichCmd(
    //                             self.getVcfRefName(theGene.chr),
    //                             theGene,
    //                             theTranscript,
    //                             null,       // regions
    //                             true,       // isMultiSample
    //                             self.getSubsetCohort().sampleIds,
    //                             self.getProbandCohort().sampleIds)
    //                             .then((cmd) => {
    //                                 enrichCmds.push(cmd);
    //                                 fileNames.push(currFileName);
    //                             });
    //
    //                         // TODO: move this below once we get results
    //                         // .then((results) => {
    //                         //     // Add variant ids to map correlated with file
    //                         //     me.varsInFileHash[currFileName] = results.features.map((feature) => {
    //                         //         return feature.id;
    //                         //     });
    //                         //     // Add results to return object
    //                         //     enrichResults[urlNames[i]] = results;
    //                         // });
    //                         enrichCmdPromises.push(enrichCmdP);
    //                         //enrichPromises.push(enrichP);
    //                     }
    //                     else {
    //                         console.log('Problem in CohortModel promoiseAnnotateVariants: Could not retrieve endpoint for the file: ' + urlNames[i]);
    //                     }
    //                 }
    //                 Promise.all(enrichCmdPromises)
    //                     .then(() => {
    //                         // TODO: send enrich commands into combiner here - write separate method that interacts w/ endpoint directly
    //                         let combinedResults = self._getCombinedResults(enrichCmds, fileNames, theGene, theTranscript);
    //
    //                         // TODO: then will have combined results already
    //
    //                         //let combinedResults = me._combineEnrichmentCounts(enrichResults);
    //                         if (combinedResults.features.length > self.TOTAL_VAR_CUTOFF) {
    //                             combinedResults.features = self.filterVarsOnPVal(combinedResults.features);
    //                         }
    //                         // Add variant number to chips
    //                         self.phenotypes.push(combinedResults.features.length + ' variants');
    //
    //                         // Assign data parameter
    //                         if (combinedResults) {
    //                             let theGeneObject = self.getGeneModel().geneObjects[combinedResults.gene];
    //                             if (theGeneObject) {
    //                                 let resultMap = {};
    //                                 // let model = cohortModels[0]; TODO: verify this is proband model
    //                                 let theVcfData = combinedResults;
    //                                 if (theVcfData == null) {
    //                                     if (callback) {
    //                                         callback();
    //                                     }
    //                                     return;
    //                                 }
    //                                 theVcfData.gene = theGeneObject;
    //                                 let entryName = self.getName();
    //                                 resultMap[entryName] = theVcfData;
    //
    //                                 if (!isBackground) {
    //                                     self.getProbandCohort().vcfData = theVcfData;
    //                                 }
    //                                 resolve(resultMap);
    //                             } else {
    //                                 let error = "ERROR - cannot locate gene object to match with vcf data " + data.ref + " " + data.start + "-" + data.end;
    //                                 console.log(error);
    //                                 reject(error);
    //                             }
    //                         } else {
    //                             let error = "ERROR - empty vcf results for " + theGene.gene_name;
    //                             console.log(error);
    //                             reject(error);
    //                         }
    //                     })
    //                     .catch((error) => {
    //                         console.log('Problem in cohort model ' + error);
    //                     });
    //             })
    //     });
    // }

    promiseAnnotateWithClinvar(resultMap, geneObject, transcript, isBackground) {
        let self = this;
        var formatClinvarKey = function (variant) {
            let delim = '^^';
            return variant.chrom + delim + variant.ref + delim + variant.alt + delim + variant.start + delim + variant.end;
        };

        var formatClinvarThinVariant = function (key) {
            let delim = '^^';
            let tokens = key.split(delim);
            return {'chrom': tokens[0], 'ref': tokens[1], 'alt': tokens[2], 'start': tokens[3], 'end': tokens[4]};
        };

        var refreshVariantsWithClinvarLookup = function (theVcfData, clinvarLookup) {
            theVcfData.features.forEach(function (variant) {
                let clinvarAnnot = clinvarLookup[formatClinvarKey(variant)];
                if (clinvarAnnot) {
                    for (var key in clinvarAnnot) {
                        variant[key] = clinvarAnnot[key];
                    }
                }
            });
            if (theVcfData.loadState == null) {
                theVcfData.loadState = {};
            }
            theVcfData.loadState['clinvar'] = true;
        };

        return new Promise(function (resolve, reject) {
            // Combine the variants from multiple files into one set of variants so that we can access clinvar once
            // instead of on a per phase file basis
            let uniqueVariants = {};
            let unionVcfData = {features: []};
            let fileMap = resultMap[0];
            let fileNames = Object.keys(fileMap);
            for (let i = 0; i < fileNames.length; i++) {
                let vcfData = fileMap[fileNames[i]];
                if (!vcfData.loadState['clinvar'] && fileNames[i] !== 'known-variants') {
                    vcfData.features.forEach(function (feature) {
                        uniqueVariants[formatClinvarKey(feature)] = true;
                    })
                }

            }
            if (Object.keys(uniqueVariants).length === 0) {
                resolve(resultMap);
            } else {

                for (let key in uniqueVariants) {
                    unionVcfData.features.push(formatClinvarThinVariant(key));
                }

                let refreshVariantsFunction = isClinvarOffline || clinvarSource === 'vcf'
                    ? self.getSubsetCohort()._refreshVariantsWithClinvarVCFRecs.bind(self.getSubsetCohort(), unionVcfData)
                    : self.getSubsetCohort()._refreshVariantsWithClinvarEutils.bind(self.getSubsetCohort(), unionVcfData);

                self.getFirstVcf().promiseGetClinvarRecords(
                    unionVcfData,
                    self._stripRefName(geneObject.chr),
                    geneObject,
                    self.getVariantModel().geneModel.clinvarGenes,
                    refreshVariantsFunction)
                    .then(function () {
                        // Create a hash lookup of all clinvar variants
                        var clinvarLookup = {};
                        unionVcfData.features.forEach(function (variant) {
                            var clinvarAnnot = {};

                            for (var key in self.getFirstVcf().getClinvarAnnots()) {
                                clinvarAnnot[key] = variant[key];
                                clinvarLookup[formatClinvarKey(variant)] = clinvarAnnot;
                            }
                        });

                        let refreshPromises = [];

                        // Use the clinvar variant lookup to initialize variants with clinvar annotations
                        for (let j = 0; j < fileNames.length; j++) {
                            let updatedData = fileMap[fileNames[j]];
                            if (!updatedData.loadState['clinvar']) {
                                let p = refreshVariantsWithClinvarLookup(updatedData, clinvarLookup);
                                if (!isBackground) {
                                    self.getVariantModel().combineClinVarInfo(updatedData.features);
                                }
                                refreshPromises.push(p);
                            }
                        }
                        Promise.all(refreshPromises)
                            .then(function () {
                                resolve(resultMap);
                            })
                            .catch(function (error) {
                                reject(error);
                            })
                    })
            }
        })
    }

    // Take in single variant, navigate to variant in vcf, annotate, return variant result
    promiseGetVariantExtraAnnotations(theGene, theTranscript, variant, format, getHeader = false, sampleNames) {
        let me = this;

        return new Promise(function (resolve, reject) {
            // Create a gene object with start and end reduced to the variants coordinates.
            let fakeGeneObject = $().extend({}, theGene);
            fakeGeneObject.start = variant.start;
            fakeGeneObject.end = variant.end;

            if ((variant.fbCalled === 'Y' || variant.extraAnnot) && format !== "vcf") {
                // We already have the hgvs and rsid for this variant, so there is
                // no need to call the services again.  Just return the
                // variant.  However, if we are returning raw vcf records, the
                // services need to be called so that the info field is formatted
                // with all of the annotations.
                if (format && format === 'csv') {
                    // Exporting data requires additional data to be returned to link
                    // the extra annotations back to the original bookmarked entries.
                    resolve([variant, variant, ""]);
                } else {
                    resolve(variant);
                }
            } else {
                let containingVcf = me.getContainingVcf(variant.id);
                me._promiseVcfRefName(theGene.chr)
                    .then(function () {
                        let probandIds = me.getProbandCohort() ? me.getProbandCohort().sampleIds : [];
                        containingVcf.promiseGetVariants(
                            me.getVcfRefName(theGene.chr, containingVcf),
                            fakeGeneObject,
                            theTranscript,
                            null,   // regions
                            false,   //isMultiSample
                            me.getSubsetCohort().sampleIds,
                            probandIds,
                            me.getName() === 'known-variants' ? 'none' : me.getAnnotationScheme().toLowerCase(),
                            me.getTranslator().clinvarMap,
                            me.getGeneModel().geneSource === 'refseq',
                            false,      // hgvs notation
                            false,      // rsid
                            true,       // vep af
                            null,
                            true,      // keepVariantsCombined
                            false       // enrichment mode (aka subset delta calculations only - no annotation)
                        )
                            .then(function (singleVarData) {
                                // TODO: need to test this when variant overlap
                                if (singleVarData != null && singleVarData.features != null) {
                                    let matchingVariants = [];
                                    let featureList = [];
                                    // If we have multiple variants at site
                                    if (singleVarData.features.length > 0) {
                                        featureList = singleVarData.features;
                                    }
                                    // If only one variant, format in list
                                    else {
                                        featureList.push(singleVarData.features);
                                    }

                                    // Pull out features matching position
                                    let matchingVar = featureList.filter(function (aVariant) {
                                        let matches =
                                            (variant.start === aVariant.start &&
                                                variant.alt === aVariant.alt &&
                                                variant.ref === aVariant.ref);
                                        return matches;
                                    });
                                    if (matchingVar.length > 0)
                                        matchingVariants.push(matchingVar);

                                    // Return matching features
                                    if (matchingVariants.length > 0) {
                                        let v = matchingVariants[0];
                                        if (format && format === 'csv') {
                                            resolve([v, variant]);
                                        } else if (format && format === 'vcf') {
                                            resolve([v, variant]);
                                        } else {
                                            me._promiseGetData(CacheHelper.VCF_DATA, theGene.gene_name, theTranscript, cacheHelper)
                                                .then(function (cachedVcfData) {
                                                    if (cachedVcfData) {
                                                        let theVariants = cachedVcfData.features.filter(function (d) {
                                                            if (d.start === v.start &&
                                                                d.alt === v.alt &&
                                                                d.ref === v.ref) {
                                                                return true;
                                                            } else {
                                                                return false;
                                                            }
                                                        });
                                                        if (theVariants && theVariants.length > 0) {
                                                            let theVariant = theVariants[0];

                                                            // set the hgvs and rsid on the existing variant
                                                            theVariant.extraAnnot = true;
                                                            theVariant.vepHGVSc = v.vepHGVSc;
                                                            theVariant.vepHGVSp = v.vepHGVSp;
                                                            theVariant.vepVariationIds = v.vepVariationIds;
                                                        } else {
                                                            let msg = "Cannot find corresponding variant to update HGVS notation for variant " + v.chrom + " " + v.start + " " + v.ref + "->" + v.alt;
                                                            console.log(msg);
                                                            reject(msg);
                                                        }
                                                    } else {
                                                        let msg = "Unable to update gene vcfData cache with updated HGVS notation for variant " + v.chrom + " " + v.start + " " + v.ref + "->" + v.alt;
                                                        console.log(msg);
                                                        reject(msg);
                                                    }
                                                })
                                        }
                                    } else {
                                        reject('Cannot find vcf record for variant ' + theGene.gene_name + " " + variant.start + " " + variant.ref + "->" + variant.alt);
                                    }
                                } else {
                                    var msg = "Empty results returned from DataSetModel.promiseGetVariantExtraAnnotations() for variant " + variant.chrom + " " + variant.start + " " + variant.ref + "->" + variant.alt;
                                    console.log(msg);
                                    if (format === 'csv' || format === 'vcf') {
                                        resolve([variant, variant, []]);
                                    }
                                    reject(msg);
                                }
                            });
                    });
            }
        });
    }

    // </editor-fold>

    // <editor-fold desc="VCF">

    /* Checks vcfs to ensure they are found and can be successfully opened. Also retrieves build information
    * for each vcf provided.
    *
    * Takes in three stably sorted lists of file names, vcf urls, and tbi urls. Optionally takes in
    * list of file display names (for use with local file upload).
    *
    * Returns three stable sorted lists of vcf names, urls, tbi urls, and array of sample names within file.
    * Each list only contains information relative to vcf files that may be found, successfully opened,
    * and were aligned with the majority reference build found in all of the provided files (i.e. GRCh38).
    *
    * Notifies the user of any vcfs that 1) may not be opened, 2) have indeterminate reference builds, or 3) do not
    * have the majority reference build.
    */
    onVcfUrlEntered(urlNames, vcfUrls, tbiUrls, displayNames = []) {
        let me = this;
        me.vcfData = null;
        me.sampleName = null;

        return new Promise((resolve, reject) => {
            // For each vcf url, open and get sample names
            if (vcfUrls == null || vcfUrls.length === 0 || vcfUrls[0] === '') {
                me.vcfUrlsEntered = false;
                reject('No vcf to check');
            } else {
                me.getVcfRefName = null;
                me.isMultiSample = true;
                let individualRefBuilds = {};
                let openErrorFiles = [];
                let sampleNames = [];       // Array of sample name arrays, in same order as vcfs
                let noBuildInfo = false;

                let openPromises = [];
                for (let i = 0; i < vcfUrls.length; i++) {
                    let p = new Promise((resolve, reject) => {
                        let currFileName = urlNames[i];
                        let currVcfEndpt = me.vcfEndptHash[currFileName];
                        let currVcf = vcfUrls[i];
                        let currTbi = null;
                        if (tbiUrls) {
                            currTbi = tbiUrls[i];
                        }
                        currVcfEndpt.openVcfUrl(currVcf, currTbi, function (success, errorMsg, hdrBuildResult) {
                            if (success) {
                                me.vcfUrlsEntered = true;
                                me.vcfFilesOpened = false;
                                if (hdrBuildResult !== '' && hdrBuildResult !== me.getGenomeBuildHelper().currentBuild.name) {
                                    let hdrObj = {};
                                    hdrObj['mismatchBuild'] = true;
                                    hdrObj['fileBuild'] = hdrBuildResult;
                                    reject(hdrObj);
                                } else if (hdrBuildResult === '') {
                                    // If we couldn't obtain build info from header, try to look at chromosome annotation
                                    currVcfEndpt.getChromosomesFromVcf(currVcf, currTbi, function(success, errorMsg, hdrBuildResult) {
                                        if (success) {
                                            if (hdrBuildResult !== '' && hdrBuildResult !== me.getGenomeBuildHelper().currentBuild.name) {
                                                let hdrObj = {};
                                                hdrObj['mismatchBuild'] = true;
                                                hdrObj['fileBuild'] = hdrBuildResult;
                                                reject(hdrObj);
                                            } else if (hdrBuildResult === '') {
                                                noBuildInfo = true;
                                            }
                                        }
                                    })
                                }
                                me.vcfs.push(currVcf);
                                if (currTbi) {
                                    me.tbis.push(currTbi);
                                }
                                // Get the sample names from the vcf header
                                currVcfEndpt.getSampleNames(function (names) {
                                    me.isMultiSample = !!(names && names.length > 1);
                                    sampleNames.push(names);
                                    resolve();
                                });
                            } else {
                                me.vcfUrlsEntered = false;
                                let errObj = {};
                                openErrorFiles.push(currFileName);
                                console.log('Could not open: ' + vcfUrls[i] + ' or its index - ' + errorMsg);
                                errObj.badFile = vcfUrls[i];
                                errObj.isBadFile = true;
                                reject(errObj);
                            }
                        });
                    });
                    openPromises.push(p);
                }
                Promise.all(openPromises)
                    .then(() => {
                        let errorMsg = '';
                        let updatedListObj = {};
                        updatedListObj['noBuildInfo'] = noBuildInfo;

                        // Initialize return object w/ all files
                        updatedListObj['names'] = urlNames;
                        updatedListObj['vcfs'] = vcfUrls;
                        updatedListObj['tbis'] = tbiUrls;
                        updatedListObj['samples'] = sampleNames;
                        updatedListObj['displayNames'] = displayNames;
                        let invalidVcfNames = [];
                        let invalidVcfReasons = []; // Must be in identical order as invalidVcfNames

                        // Remove files that that could not be found or opened
                        if (openErrorFiles.length === urlNames.length) {
                            me.vcfUrlEntered = false;
                            let subObj = {};
                            openErrorFiles.forEach((file) => {
                                subObj[file] = 'File could not be found or opened';
                            });
                            updatedListObj['invalidObj'] = subObj;
                            errorMsg = 'None of the provided files could be found or opened. If launching from Mosaic, please contact a Frameshift representative.';
                            alert(errorMsg);
                            reject();
                        }
                        else if (openErrorFiles.length > 0) {
                            errorMsg += 'The following files could not be found and will not be included in the analysis: ' + openErrorFiles.join(',');
                            me.removeEntriesFromHash(openErrorFiles);
                            let updatedListObj = me.removeEntriesFromLists(openErrorFiles, urlNames, vcfUrls, tbiUrls, sampleNames, displayNames);
                            urlNames = updatedListObj['names'];
                            vcfUrls = updatedListObj['vcfs'];
                            tbiUrls = updatedListObj['tbis'];
                            sampleNames = updatedListObj['samples'];
                            displayNames = updatedListObj['displayNames'];

                            openErrorFiles.forEach((file) => {
                                invalidVcfNames.push(file);
                                invalidVcfReasons.push('File could not be found or opened');
                            });
                        }

                        // Create object with unique build refs as keys and file name lists as values
                        let refMap = {};
                        let unfoundRefFiles = [];
                        for (let i = 0; i < urlNames.length; i++) {
                            let currFileName = urlNames[i];
                            let currFileRef = individualRefBuilds[currFileName];
                            if (currFileRef === '') {
                                unfoundRefFiles.add(currFileName);
                            } else if (refMap[currFileRef] == null) {
                                refMap[currFileRef] = [];
                                refMap[currFileRef].push(currFileName);
                            } else {
                                refMap[currFileRef].push(currFileName);
                            }
                        }

                        // If we couldn't find a reference from any file, notify and return
                        if (unfoundRefFiles.length === urlNames.length) {
                            me.vcfUrlEntered = false;
                            updatedListObj['invalids'].push(unfoundRefFiles.join(','));
                            errorMsg = 'None of the provided files could be loaded because their reference build could not be determined. If launching from Mosaic, please contact a Frameshift representative.';
                            reject();
                        }
                        // If we have some files we couldn't find a reference for, remove from lists
                        else if (unfoundRefFiles.length > 0) {
                            me.removeEntriesFromHash(unfoundRefFiles);
                            updatedListObj = me.removeEntriesFromLists(unfoundRefFiles, urlNames, vcfUrls, tbiUrls, sampleNames, displayNames);
                            urlNames = updatedListObj['names'];
                            vcfUrls = updatedListObj['vcfs'];
                            tbiUrls = updatedListObj['tbis'];
                            sampleNames = updatedListObj['samples'];
                            displayNames = updatedListObj['displayNames'];

                            unfoundRefFiles.forEach((fileName) => {
                                invalidVcfNames.push(fileName);
                                invalidVcfReasons.push('Could not find reference build used to align file');
                            });
                            errorMsg += ' The following files will not be included in the analysis because their reference build could not be determined: ' + unfoundRefFiles.join(',');
                        }

                        // If we have multiple references found, remove files with non-majority reference
                        if (Object.keys(refMap).length > 1) {
                            let refKeys = Object.keys(refMap);
                            let majorityRefCount = 1;   // Initialize to min value possible
                            let majorityRef = '';
                            let minorityRefKeyNames = [];

                            // Find the majority count and add minority indices to list
                            for (let i = 0; i < refKeys.length; i++) {
                                let currName = refKeys[i];
                                let currRef = refMap[currName];
                                if (currRef.length > majorityRefCount) {
                                    majorityRefCount = currRef.length;
                                    majorityRef = refMap[currName];
                                }
                                else {
                                    minorityRefKeyNames.push((refMap[currName].split()));
                                }
                            }
                            // If all counts are at 1, pop off last one to keep
                            if (majorityRefCount === 1) {
                                minorityRefKeyNames.pop();
                            }
                            // Remove files with minority ref builds
                            me.removeEntriesFromHash(minorityRefKeyNames);
                            updatedListObj = me.removeEntriesFromLists(minorityRefKeyNames, urlNames, vcfUrls, tbiUrls, sampleNames, displayNames);
                            urlNames = updatedListObj['names'];
                            vcfUrls = updatedListObj['vcfs'];
                            tbiUrls = updatedListObj['tbis'];
                            sampleNames = updatedListObj['samples'];
                            displayNames = updatedListObj['displayNames'];
                            minorityRefKeyNames.forEach((fileName) => {
                                invalidVcfNames.push(fileName);
                                invalidVcfReasons.push('File aligned to different reference build than others');
                            });
                            errorMsg += ' The following files will not be included in the analysis because their reference build differed than the majority of files: ' + unfoundRefFiles.join(',');
                        }

                        // Set flags and display error message as appropriate
                        if (errorMsg !== '') {
                            alert(errorMsg);
                        }
                        me.vcfUrlEntered = true;
                        me.vcfFileOpened = false;
                        me.getVcfRefName = null;

                        // Turn array of arrays into a single list after we've verified files
                        let combinedSamples = [];
                        sampleNames.forEach((nameArr) => {
                            nameArr.forEach((name) => {
                                combinedSamples.push(name);
                            });
                        });
                        updatedListObj['samples'] = combinedSamples;
                        updatedListObj['invalidNames'] = invalidVcfNames;
                        updatedListObj['invalidReasons'] = invalidVcfReasons;
                        updatedListObj['displayNames'] = displayNames;
                        resolve(updatedListObj);
                    })
                    .catch((errObj) => {
                        reject(errObj);
                    });
            }
        });
    }

    promiseVcfFilesSelected(event) {
        let me = this;

        return new Promise( function(resolve, reject) {
            me.sampleName = null;
            me.vcfData = null;
            me.getFirstVcf().openVcfFile(event,
                function(success, vcfIndex, tbiIndex, message) {
                    if (me.lastVcfAlertify) {
                        me.lastVcfAlertify.dismiss();
                    }
                    if (success) {
                        me.vcfs.push(event.files[vcfIndex].name);
                        me.tbis.push(event.files[tbiIndex].name);
                        me.vcfFilesOpened = true;
                        me.vcfUrlsEntered = false;
                        me.getVcfRefName = null;
                        me.isMultiSample = false;

                        // Get the sample names from the vcf header
                        me.getFirstVcf().getSampleNames(function(sampleNames) {
                            me.isMultiSample = sampleNames && sampleNames.length > 1 ? true : false;
                            resolve({'fileName': me.getFirstVcf().getVcfFile().name, 'sampleNames': sampleNames});
                        });
                    } else {
                        let msg = "<span style='font-size:18px'>" + message + "</span>";
                        alertify.set('notifier','position', 'top-right');
                        me.lastVcfAlertify = alertify.error(msg, 15);
                        reject(message);
                    }
                }
            );
        });
    }

    /* Ensures the given chromosome has a reference within the vcf files for this data set.
       Populates reference chromosome table if first call. */
    _promiseVcfRefName(ref, vcfEndpt) {
        let me = this;
        let theRef = ref != null ? ref : window.gene.chr;
        return new Promise(function (resolve, reject) {

            if (me.getVcfRefName != null) {
                // If we can't find the ref name in the lookup map, show a warning.
                if (me.vcfRefNamesMap[me.getVcfRefName(theRef, vcfEndpt)] == null) {
                    reject();
                } else {
                    resolve();
                }
            } else {
                me.vcfRefNamesMap = {};
                Object.values(me.vcfEndptHash).forEach((endpt) => {
                    endpt.getReferenceLengths(function (refData) {
                        let foundRef = false;
                        refData.forEach(function (refObject) {
                            let refName = refObject.name;
                            if (refName === theRef) {
                                me.getVcfRefName = me._getRefName;
                                foundRef = true;
                            } else if (refName === me._stripRefName(theRef)) {
                                me.getVcfRefName = me._stripRefName;
                                foundRef = true;
                            }

                        });
                        // Load up a lookup table.  We will use me for validation when
                        // a new gene is loaded to make sure the ref exists.
                        if (foundRef) {
                            refData.forEach(function (refObject) {
                                let refName = refObject.name;
                                let theRefName = me.getVcfRefName(refName, vcfEndpt);
                                // TODO: think the keys here need to concat w/ file id/name - or this needs to be a 2d array
                                me.vcfRefNamesMap[theRefName] = refName;
                            });
                            resolve();
                        } else {
                            // If we didn't find the matching ref name, show a warning.
                            reject();
                        }
                    });
                });
            }
        });
    }

    _getCombinedResults(gtenricherCmds, fileNames, theGene, theTranscript) {
        let self = this;

        let aVcf = self.getFirstVcf();
        return aVcf.combineCalcEnrichment(
            gtenricherCmds,
            fileNames,
            self.getVcfRefName(theGene.chr, aVcf),
            theGene,
            theTranscript,
            null,   // regions
            false,   //isMultiSample
            self.getSubsetCohort().sampleIds,
            self.getProbandCohort().sampleIds,
            self.getName() === 'known-variants' ? 'none' : self.getAnnotationScheme().toLowerCase(),
            self.getTranslator().clinvarMap,
            self.getGeneModel().geneSource === 'refseq',
            false,      // hgvs notation
            false,      // rsid
            true,       // vep af
            null,
            true,       // keepVariantsCombined
            true);      // enrichment mode (aka subset delta calculations only - no annotation)
    }

    applyVariantFilter(filterInfo) {
    }

    // </editor-fold>

    // <editor-fold desc="BAM">

    // Only accepts on bam url at a time since app currently configured to only show coverage for single sample tracks
    // Supports only one BAM per data set model, but can modify in future if desired akin to onVcfUrlEntered
    onBamUrlEntered(bamUrl, baiUrl, callback) {
        let self = this;
        self.bamData = null;
        self.fbData = null;

        if (bamUrl == null || bamUrl.trim() === "") {
            self.bamUrlEntered = false;
            self.bams = [];
            if (callback) {
                callback(false);
            }
        } else {
            self.bams.push(bamUrl);
            self.bamEndpt = new Bam(self.getEndpoint(), bamUrl, baiUrl);
            if (baiUrl != null) {
                self.bais.push(baiUrl);
            }
            self.bamEndpt.checkBamUrl(bamUrl, baiUrl, function(success, errorMsg) {
                if (self.lastBamAlertify) {
                    self.lastBamAlertify.dismiss();
                }
                if (!success) {
                    self.bamUrlEntered = false;
                    self.bams[0] = null;
                    self.bais[0] = null;
                    self.bamsEndpt = null;
                    let msg = "<span style='font-size:18px'>" + errorMsg + "</span><br><span style='font-size:12px'>" + bamUrl + "</span>";
                    alertify.set('notifier','position', 'top-right');
                    self.lastBamAlertify = alertify.error(msg, 15);
                } else {
                    self.bamUrlEntered = true;
                    self.bamFileOpened = false;
                }
                if(callback) {
                    callback(success);
                }
            });
        }
        self.getBamRefName = self._stripRefName;
    }

    promiseBamFilesSelected(event) {
        let me = this;
        return new Promise(function(resolve, reject) {
            me.bamData = null;
            me.fbData = null;
            me.bamEndpt = new Bam(me.getEndpoint());
            me.bamEndpt.openBamFile(event, function(success, bamIndex, baiIndex, message) {
                if (me.lastBamAlertify) {
                    me.lastBamAlertify.dismiss();
                }
                if (success) {
                    me.bamFileOpened = true;
                    me.bamUrlEntered = false;
                    me.getBamRefName = me._stripRefName;
                    me.bamRefName = me._stripRefName;
                    me.bams.push(event.files[bamIndex].name);
                    me.bais.push(event.files[baiIndex].name);
                    resolve(me.bamEndpt.bamFile.name);
                } else {
                    if (me.lastBamAlertify) {
                        me.lastBamAlertify.dismiss();
                    }
                    let msg = "<span style='font-size:18px'>" + message + "</span>";
                    alertify.set('notifier','position', 'top-right');
                    me.lastBamAlertify = alertify.error(msg, 15);

                    reject(message);
                }
            });
        });
    }

    promiseLoadCoverage(theGene, theTranscript) {
        let self = this;

        return new Promise(function (resolve, reject) {
            self.promiseGetCachedGeneCoverage(theGene, theTranscript, true)
                .then(function (data) {
                    return self.promiseLoadBamDepth(theGene, theTranscript);
                })
                .then(function (data) {
                    resolve(data);
                })
                .catch(function (error) {
                    reject(error);
                })
        })

    }

    setCoverage(regionStart, regionEnd) {
        let self = this;
        let model = self.getSubsetCohort();
        if (model.bamData) {
            if (regionStart && regionEnd) {
                model.coverage = model.bamData.coverage.filter(function (depth) {
                    return depth[0] >= regionStart && depth[0] <= regionEnd;
                })
            } else {
                model.coverage = model.bamData.coverage;
            }

            if (model.coverage) {
                let max = d3.max(model.coverage, function (d, i) {
                    return d[1]
                });
                if (max > self.maxDepth) {
                    self.maxDepth = max;
                }
            }
        }
    }

    promiseGetCachedGeneCoverage(geneObject, transcript, showProgress = false) {
        let self = this;
        return new Promise(function (resolve, reject) {
            let geneCoverageAll = {gene: geneObject, transcript: transcript, geneCoverage: {}};

            if (self.isBamLoaded()) {
                self.promiseGetGeneCoverage(geneObject, transcript)
                    .then(function (data) {
                        let gc = data.geneCoverage;
                        geneCoverageAll.geneCoverage[self.entryId] = gc;
                        resolve(geneCoverageAll);
                    })
                    .catch(function (error) {
                        reject(error);
                    });
            } else {
                resolve();
            }
        })
    }

    promiseGetGeneCoverage(geneObject, transcript) {
        let self = this;

        return new Promise(function (resolve, reject) {
                if (transcript.features == null || transcript.features.length === 0) {
                    resolve({model: self, gene: geneObject, transcript: transcript, 'geneCoverage': []});
                } else {
                    self.bamEndpt.getGeneCoverage(geneObject,
                        transcript,
                        [self.bamEndpt],
                        function (theData, trRefName, theGeneObject, theTranscript) {
                            let geneCoverageObjects = self._parseGeneCoverage(theData);
                            if (geneCoverageObjects.length > 0) {
                                self._setGeneCoverageExonNumbers(transcript, geneCoverageObjects);
                                self.setGeneCoverageForGene(geneCoverageObjects, theGeneObject, theTranscript);
                                resolve({
                                    model: self,
                                    gene: theGeneObject,
                                    transcript: theTranscript,
                                    'geneCoverage': geneCoverageObjects
                                });
                            } else {
                                console.log("Cannot get gene coverage for gene " + theGeneObject.gene_name);
                                resolve({model: self, gene: theGeneObject, transcript: theTranscript, 'geneCoverage': []});
                            }
                        }
                    );
                }

            },
            function (error) {
                reject(error);
            });
    }

    setGeneCoverageForGene(geneCoverage, geneObject, transcript) {
        geneObject = geneObject ? geneObject : window.gene;
        transcript = transcript ? transcript : window.selectedTranscript;
        this._promiseCacheData(geneCoverage, CacheHelper.GENE_COVERAGE_DATA, geneObject.gene_name, transcript);
    }

    _setGeneCoverageExonNumbers(transcript, geneCoverageObjects) {
        transcript.features.forEach(function (feature) {
            let gc = null;
            let matchingFeatureCoverage = geneCoverageObjects.filter(function (gc) {
                return feature.start === gc.start && feature.end === gc.end;
            });
            if (matchingFeatureCoverage.length > 0) {
                gc = matchingFeatureCoverage[0];
            }
            if (gc) {
                gc.exon_number = feature.exon_number;
            }
        });
    }

    _parseGeneCoverage(theData) {
        let geneCoverageObjects = [];
        if (theData && theData.length > 0) {
            let fieldNames = [];
            theData.split("\n").forEach(function (rec) {
                if (rec.indexOf("#") === 0 && fieldNames.length === 0) {
                    rec.split("\t").forEach(function (field) {
                        if (field.indexOf("#") === 0) {
                            field = field.substring(1);
                        }
                        fieldNames.push(field);
                    })
                } else {
                    let fields = rec.split("\t");
                    if (fields.length === fieldNames.length) {
                        let gc = {};
                        for (let i = 0; i < fieldNames.length; i++) {
                            gc[fieldNames[i]] = fields[i];
                            if (fieldNames[i] === 'region') {
                                if (fields[i] !== "NA") {
                                    let parts = fields[i].split(":");
                                    gc.chrom = parts[0];
                                    let region = parts[1].split("-");
                                    gc.start = region[0];
                                    gc.end = region[1];
                                }
                            }
                        }
                        geneCoverageObjects.push(gc);
                    }
                }
            })
        }
        return geneCoverageObjects;
    }

    promiseLoadBamDepth(theGene, theTranscript) {
        let self = this;

        return new Promise(function (resolve, reject) {
            let theResultMap = {};
            let model = self.getSubsetCohort();
            if (self.isBamLoaded()) {
                self.inProgress.loadingCoverage = true;
                model.getBamDepth(theGene, theTranscript, self.isBamLoaded(), function (coverageData) {
                    self.inProgress.loadingCoverage = false;
                    theResultMap[self.entryId] = coverageData;
                    resolve(theResultMap);
                });
            }
        });
    }

    // </editor-fold>

    // <editor-fold desc="SET & CLEAR">

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
                let filterModel = self.getFilterModel();
                if (filterModel.regionStart && filterModel.regionEnd) {
                    inRegion = feature.start >= filterModel.regionStart && feature.start <= filterModel.regionEnd;
                }
                let passesModelFilter = filterModel.passesModelFilter(model.name, feature);

                return isTarget && !isHomRef && inRegion && passesModelFilter;
            });

            let pileupObject = null;
            if (self.isSingleSample) {
                pileupObject = model._pileupVariants(filteredVariants.features, start, end);
            } else {
                pileupObject = model._enrichmentPileupVariants(filteredVariants.features, start, end);
            }
            filteredVariants.maxPosLevel = pileupObject.maxPosLevel;
            filteredVariants.maxNegLevel = pileupObject.maxNegLevel ? pileupObject.maxNegLevel : 0;
            filteredVariants.maxSubLevel = pileupObject.maxSubLevel ? pileupObject.maxSubLevel : 1;
            filteredVariants.featureWidth = pileupObject.featureWidth;

            return filteredVariants;
        };

        let cohort = self.getSubsetCohort();
        let filterModel = self.getFilterModel();
        if (name == null || name === cohort.name) {
            if (cohort.vcfData && cohort.vcfData.features) {
                let start = (filterModel && filterModel.regionStart) ? filterModel.regionStart : gene.start;
                let end = (filterModel && filterModel.regionEnd) ? filterModel.regionEnd : gene.end;
                self.loadedVariants = filterAndPileupVariants(cohort, start, end, 'loaded');
            }
        }
    }

    /* Clears the variant data for each cohort if the last gene analyzed for this data set is different than the one provided.
     * This coordinates display with loading new tracks once some tracks have already been analyzed.
     * Falsifies flags used for chip display. */
    clearLoadedData(geneName) {
        let self = this;

        self.extraAnnotationsLoaded = false;
        if (self.lastGeneLoaded === geneName) {
            return;
        } else {
            self.getCohorts().forEach(function (cohort) {
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

    // Used in zoom functionality
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
            filteredVariants.maxPosLevel = pileupObject.maxPosLevel + 1;
            filteredVariants.featureWidth = pileupObject.featureWidth;

            return filteredVariants;
        };

        let cohort = self.getSubsetCohort();
        if (cohort != null) {
            if (cohort.vcfData && cohort.vcfData.features) {
                let start = (self.filterModel && self.filterModel.regionStart) ? self.filterModel.regionStart : gene.start;
                let end = (self.filter && self.filterModel.regionEnd) ? self.filterModel.regionEnd : gene.end;
                cohort.selectedVariants = filterAndPileupVariants(cohort, start, end, 'selected');
            }
        }
    }

    // </editor-fold>

    // <editor-fold desc="CACHING">

    _promiseCacheData(data, dataKind, geneName, transcript) {
        let me = this;
        return new Promise(function (resolve, reject) {
            let key = me._getCacheKey(dataKind, geneName.toUpperCase(), transcript);

            // In order to avoid circular references that cause vcfData.features
            // to have null elements, we just blank out the 'features' property
            // on every variant
            if (dataKind === 'vcfData' || dataKind === 'fbData') {
                if (data.features) {
                    data.features.forEach(function (f) {
                        delete f.features;
                    })
                }
            }

            me.getCacheHelper().promiseCacheData(key, data)
                .then(function () {
                        resolve();
                    },
                    function (error) {
                        CacheHelper.showError(key, error);
                        alertify.set('notifier', 'position', 'top-right');
                        alertify.error("Error occurred when compressing analyzed data before caching.", 15);
                        reject(error);
                    })
        })
    }

    _getCacheKey(dataKind, geneName, transcript) {
        let self = this;
        let selectedSample = self.getSubsetCohort().sampleIds;

        return self.getCacheHelper().getCacheKey(
            {
                id: self.entryId,
                sample: (selectedSample != null ? selectedSample : "null"),
                gene: (geneName != null ? geneName : gene.gene_name),
                transcript: (transcript != null ? transcript.transcript_id : "null"),
                annotationScheme: (self.getAnnotationScheme().toLowerCase()),
                dataKind: dataKind
            }
        );

    }

    // </editor-fold>

    // <editor-fold desc="HELPERS">

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

    startGeneProgress(geneName) {
        let idx = this.genesInProgress.indexOf(geneName);
        if (idx < 0) {
            this.genesInProgress.push(geneName);
        }
    }

    /* Takes in a list of file names and removes them from the subsequent three provided lists.
     * If a file name is provided that is not within nameList, vcfList, and/or tbiList, nothing is affected
     * Returns nameList, vcfList, and tbiList in a combined object. */
    removeEntriesFromLists(fileNames, nameList, vcfList, tbiList, sampleNameList, displayNameList) {
        let self = this;

        // Create return object
        let listObj = {};

        fileNames.forEach((fileName) => {
            // Get index of file relative to all lists
            let fileIndex = nameList.indexOf(fileName);
            nameList.splice(fileIndex, 1);
            vcfList.splice(fileIndex, 1);
            tbiList.splice(fileIndex, 1);
            sampleNameList.splice(fileIndex, 1);
            displayNameList.splice(fileIndex, 1);
        });

        listObj['names'] = nameList;
        listObj['vcfs'] = vcfList;
        listObj['tbis'] = tbiList;
        listObj['samples'] = sampleNameList;
        listObj['displayNames'] = displayNameList;
        return listObj;
    }

    /* Removes the object-key pair from this cohort's vcf endpoint hash. */
    removeEntriesFromHash(fileNames) {
        let self = this;
        fileNames.forEach((fileName) => {
            self.vcfEndptHash = _.omit(self.vcfEndptHash, fileName);
        })
    }

    /* Returns the vcf model corresponding to the vcf file which the provided variant exists in. If multiple vcf files
     * contain the variant, the first one alphanumerically is returned. */
    getContainingVcf(variantId) {
        let self = this;
        let containingFileName = '';
        let fileNames = Object.keys(self.vcfEndptHash);
        for (let i = 0; i < fileNames.length; i++) {
            let fileVarList = self.varsInFileHash[fileNames[i]];
            if (fileVarList.includes(variantId)) {
                containingFileName = fileNames[i];
                break;
            }
        }
        return self.vcfEndptHash[containingFileName];
    }

    _getRefName(refName) {
        return refName;
    }

    _stripRefName(refName) {
        let tokens = refName.split("chr");
        let strippedName = refName;
        if (tokens.length > 1) {
            strippedName = tokens[1];
        } else {
            tokens = refName.split("ch");
            if (tokens.length > 1) {
                strippedName = tokens[1];
            }
        }
        return strippedName;
    }

    // </editor-fold>
}
export default DataSetModel