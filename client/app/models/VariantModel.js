/* Encapsulates logic for Variant Card and Variant Summary Card
   SJG & TS updated Apr2018 */

// SJG_TIMING tag on all timing code

class VariantModel {
    constructor(endpoint, genericAnnotation, translator, geneModel,
                cacheHelper, genomeBuildHelper) {

        // Reference lookups used for pre-loading extra variant annotation
        this.subsetEnrichedVars = {};
        this.probandEnrichedVars = {};
        this.nonEnrichedVars = {};
        this.probandOnlyVars = {};

        // Data props
        this.dataSet = null;            // The collection of files for analysis, organized into cohorts
        this.totalProbandCount = 0;
        this.totalSubsetCount = 0;
        this.affectedProbandCount = 0;
        this.affectedSubsetCount = 0;
        this.probandZygMap = {};
        this.subsetZygMap = {};

        // Single helper classes
        this.endpoint = endpoint;
        this.hubEndpoint = {};
        this.genericAnnotation = genericAnnotation;
        this.translator = translator;


        this.geneModel = geneModel;
        //this.cacheHelper = cacheHelper;
        this.genomeBuildHelper = genomeBuildHelper;
        this.filterModel = null;
        this.featureMatrixModel = null;

        // Settings/state props
        this.annotationScheme = 'vep';
        this.isLoaded = false;
        this.maxAlleleCount = null;
        this.maxDepth = 0;
        this.keepVariantsCombined = true;       // True for multiple samples to be displayed on single track
        this.efficiencyMode = true;              // True to only pull back variant locations and not functional impacts
        this.inProgress = {'loadingDataSources': false};
        this.genesInProgress = [];
        this.hubIssue = false;
        this.iobioServicesIssue = false;
        this.subsetEnrichmentThreshold = 2.0;
        this.probandEnrichmentThreshold = 0.5;
        this.extraAnnotationsLoaded = false;

        // Hub-specific props
        this.projectId = '';                    // Hub project ID if we're sourcing data from there
        this.phenoFilters = {};                 // Hub filters applied to samples
        this.simonsIdMap = {};                  // Lookup table to convert Hub VCF IDs to Simons IDs

        // Const data
        this.chrNameMap = ['chr1', 'chr2', 'chr3', 'chr4', 'chr5', 'chr6', 'chr7', 'chr8',
            'chr9', 'chr10', 'chr11', 'chr12', 'chr13', 'chr14', 'chr15', 'chr16',
            'chr17', 'chr18', 'chr19', 'chr20', 'chr21', 'chr22', 'chrX', 'chrY'];
        this.userVcf = "https://s3.amazonaws.com/iobio/samples/vcf/platinum-exome.vcf.gz";
        this.demoGenes = ['RAI1', 'MYLK2', 'PDHA1', 'PDGFB', 'AIRE'];
    }

    /* Setter for simons ID map. */
    setIdMap(idMap) {
        let self = this;
        self.simonsIdMap = idMap;
    }

    setAnnotationStatus(status) {
        let self = this;
        self.extraAnnotationsLoaded = status;
    }

    /* Sets up cohort and data set models, promises to initalize. */
    promiseInitDemo() {
        let self = this;

        // Set status
        self.isLoaded = false;
        self.inProgress.loadingDataSources = true;

        // Initialize demo data set
        let demoDataSet = new DataSetModel();
        demoDataSet.name = 'Demo';
        demoDataSet.vcfUrl = self.userVcf;
        self.dataSet = demoDataSet;

        // Initialize proband model
        let allSampleCohort = new CohortModel(self);
        allSampleCohort.isProbandCohort = true;
        allSampleCohort.trackName = 'Variants for';
        allSampleCohort.subsetIds.push(['NA12877', 'NA12878', 'NA12891', 'NA12892']);
        allSampleCohort.subsetPhenotypes.push('Probands');
        demoDataSet.addCohort(allSampleCohort, PROBAND_ID);

        // Initialize subset model
        let subsetCohort = new CohortModel(self);
        subsetCohort.isSubsetCohort = true;
        //subsetCohort.useUpdatedPileup = true;   // SJG get rid of after design finalization
        subsetCohort.trackName = 'Variants for';
        subsetCohort.subsetIds.push(['NA12878', 'NA12877']);
        subsetCohort.subsetPhenotypes.push(['0 < IQ < 80', '40 < Paternal Age < 50']);
        demoDataSet.addCohort(subsetCohort, SUBSET_ID);

        return self.promiseInit();
    }

    /* Sets up cohort and data set models.
       Retrieves urls and sample IDs from Hub, then promises to initialize.
       Assumes a project ID has been mapped and assigned to this model. */
    promiseInitFromHub(hubEndpoint, projectId, phenoFilters, initialLaunch) {
        let self = this;
        // Set status
        self.isLoaded = false;
        self.inProgress.loadingDataSources = true;

        // Initialize hub data set
        let hubDataSet = new DataSetModel();
        hubDataSet.name = 'Hub';
        self.dataSet = hubDataSet;

        // Initialize proband model
        let probandCohort = new CohortModel(self);
        probandCohort.isProbandCohort = true;
        probandCohort.inProgress.fetchingHubData = true;
        probandCohort.trackName = 'Variants for';
        probandCohort.subsetPhenotypes.push('Probands');
        hubDataSet.addCohort(probandCohort, PROBAND_ID);

        // Initialize subset model
        let subsetCohort = new CohortModel(self);
        subsetCohort.isSubsetCohort = true;
        subsetCohort.inProgress.fetchingHubData = true;
        subsetCohort.trackName = 'Cohort Filters';
        hubDataSet.addCohort(subsetCohort, SUBSET_ID);

        // Initialize hub endpoint
        self.hubEndpoint = hubEndpoint;
        self.projectId = projectId;
        self.phenoFilters = phenoFilters;

        return new Promise(function (resolve, reject) {

            // Get URLs from Hub
            self.promiseGetUrlsFromHub(self.projectId, initialLaunch)
                .then(function (urlObj) {
                    if (urlObj == null || urlObj.names == null || urlObj.names.length === 0) {
                        reject('Did not retrieve any matching files for given criteria');
                    }
                    // Store urls in data set model
                    hubDataSet.vcfNames = urlObj.names;
                    hubDataSet.vcfUrls = urlObj.vcfs;
                    hubDataSet.tbiUrls = urlObj.tbis;

                    // Format filter to send to Hub to get all proband IDs (via 'affected status' metric)
                    let probandFilter = self.getProbandPhenoFilter();
                    let filterObj = {'affected_status': probandFilter};

                    // Retrieve proband sample IDs from Hub
                    let promises = [];
                    let probandP = self.promiseGetSampleIdsFromHub(self.projectId, filterObj)
                        .then(function (ids) {
                            // Stop process if we don't have any probands
                            if (ids.length === 0) {
                                reject('No samples found for proband filtering from Hub');
                            }
                            // Coming from SSC data set
                            if (!((ids[0].id).startsWith('SS')) && hubDataSet.vcfNames[0] !== 'all.ssc_hg19.ssc_wes_3.vcf.gz') {
                                probandCohort.subsetIds = self.convertSimonsIds(ids, 'proband');
                            }
                            // Coming from SPARK or other
                            else {
                                probandCohort.subsetIds = self.getRawIds(ids);
                            }
                            probandCohort.subsetPhenotypes.push('n = ' + ids.length);
                        });
                    promises.push(probandP);

                    // Remove unaffected filter if it exists for now
                    if (self.phenoFilters != null) {
                        let affStatusFilter = self.phenoFilters['affected_status'];
                        if (affStatusFilter != null && affStatusFilter.data === 'Unaffected') {
                            // See if unaffected and remove
                            let filteredPhenoFilters = {};
                            Object.keys(self.phenoFilters).forEach(function (filter) {
                                if (filter !== 'affected_status')
                                    filteredPhenoFilters[filter] = self.phenoFilters[filter];
                            });
                            self.phenoFilters = filteredPhenoFilters;
                        }
                    }
                    // Add proband filter to subset filter set
                    self.appendSubsetPhenoFilters(subsetCohort, probandFilter);

                    // Retrieve subset sample IDs from Hub
                    let subsetP = self.promiseGetSampleIdsFromHub(self.projectId, self.phenoFilters)
                        .then(function (ids) {
                            if (ids.length > 0 && !((ids[0].id).startsWith('SS')) && hubDataSet.vcfNames[0] !== 'all.ssc_hg19.ssc_wes_3.vcf.gz') {
                                subsetCohort.subsetIds = self.convertSimonsIds(ids, 'subset');
                            } else {
                                subsetCohort.subsetIds = self.getRawIds(ids);
                            }
                        });
                    promises.push(subsetP);

                    // Start processing data after IDs retrieved
                    Promise.all(promises)
                        .then(function () {
                            // Assign chip display numbers (on left side)
                            subsetCohort.subsetPhenotypes.splice(0, 0, ('Proband n = ' + probandCohort.subsetIds.length));
                            subsetCohort.subsetPhenotypes.splice(1, 0, ('Subset n = ' + subsetCohort.subsetIds.length));
                            // Flip hub flags
                            subsetCohort.inProgress.fetchingHubData = false;
                            probandCohort.inProgress.fetchingHubData = false;
                            // Free up some space
                            self.simonsIdMap = null;
                            // Get variant loading rolling

                            self.promiseInit(hubDataSet.vcfNames)
                                .then(function () {
                                    let idNumList = [];
                                    idNumList.push(probandCohort.subsetIds.length);
                                    idNumList.push(subsetCohort.subsetIds.length);
                                    resolve(idNumList);
                                })
                        })
                })
                .catch(function (error) {
                    console.log("There was a problem obtaining data from Hub.");
                    self.hubIssue = true;
                    reject(error);
                });
        })
    }

    getRawIds(ids) {
        let rawIds = [];
        ids.forEach((idObj) => {
            rawIds.push(idObj.id);
        });
        return rawIds;
    }

    /* Converts provide list of Hub encoded sample IDs to those found in the Phase 1 Simons VCF. */
    convertSimonsIds(hubIds, cohortName) {
        let self = this;
        if (self.simonsIdMap == null) {
            return hubIds;
        }
        let convertedIds = [];
        let unmappedIds = [];
        hubIds.forEach((idObj) => {
            let simonsId = self.simonsIdMap[idObj.id];
            if (simonsId == null) {
                unmappedIds.push(simonsId);
            } else {
                convertedIds.push(simonsId);
            }
        });
        // TODO: return number of unmappedIds and update chip
        if (unmappedIds.length > 0) {
            alert ('Note: could not find translation for all sample IDs provided, not all samples from the ' + cohortName + ' cohort will be included in the analysis.');
        }
        return convertedIds;
    }

    /* Retrieves all urls from Hub corresponding to the given project ID. Returns an object where keys are chromosome
     * and values are arrays of stably sorted vcf and tbi urls. */
    promiseGetUrlsFromHub(projectId, initialLaunch) {
        let self = this;

        return new Promise(function (resolve, reject) {
            // Stable sorted url lists
            let nameList = [],
                vcfUrlList = [],
                tbiUrlList = [];
            // Files coming back from Hub
            let vcfFiles = null,
                tbiCsiFiles = null;

            // TODO: for now can look in file name to see what build is
            //

            // Retrieve file objects from Hub
            self.hubEndpoint.getFilesForProject(projectId, initialLaunch).done(data => {
                // Stable sort by file type
                vcfFiles = data.data.filter(f => f.type === 'vcf');
                tbiCsiFiles = data.data.filter(f => f.type === 'tbi' || f.type === 'csi');

                // Pull out combined vcfs from individual chromosome ones
                let sortedVcfFiles = [];
                vcfFiles.forEach((file) => {
                    let phaseFile = false;
                    let name = file.name;
                    let namePieces = name.split('.');
                    namePieces.forEach((piece) => {
                        if (piece === 'all' || piece.includes('all')) {
                            phaseFile = true;
                        }
                    });
                    if (phaseFile) {
                        sortedVcfFiles.push(file);
                    }
                });
                let sortedTbiCsiFiles = [];
                tbiCsiFiles.forEach((file) => {
                    let phaseFile = false;
                    let name = file.name;
                    let namePieces = name.split('.');
                    namePieces.forEach((piece) => {
                        if (piece === 'all' || piece.includes('all')) {
                            phaseFile = true;
                        }
                    });
                    if (phaseFile) {
                        sortedTbiCsiFiles.push(file);
                    }
                });

                // Check that we have matching data for all files
                if (sortedVcfFiles.length !== (sortedTbiCsiFiles.length)) {
                    console.log('Did not obtain matching vcf and tbi/csi files from Hub. Data may not be complete.');
                }

                // Get urls for both vcf and tbi
                let urlPromises = [];
                for (let i = 0; i < sortedVcfFiles.length; i++) {
                    let currVcf = sortedVcfFiles[i];
                    let currTbi = sortedTbiCsiFiles[i];
                    let urlP = self.promiseGetSignedUrls(currVcf, currTbi)
                        .then((urlObj) => {
                            nameList.push(urlObj.name);
                            vcfUrlList.push(urlObj.vcf);
                            tbiUrlList.push(urlObj.tbi);
                        });
                    urlPromises.push(urlP);
                }
                // Sort data by chromosome once we have all urls
                Promise.all(urlPromises)
                    .then(() => {
                        resolve({'names': nameList, 'vcfs': vcfUrlList, 'tbis': tbiUrlList});
                    })
                    .catch((error) => {
                        reject('There was a problem retrieving file urls from Hub: ' + error);
                    });
            });
        });
    }

    /* Returns an object with a vcf url corresponding to the given vcf, and a tbi url corresponding to the given tbi.
     * It is assumed that the provided vcf and tbi file correspond to the same data. */
    promiseGetSignedUrls(vcf, tbi) {
        let self = this;
        return new Promise((resolve, reject) => {

            let vcfUrl = '',
                tbiUrl = '';
            let urlPromises = [];

            // Get vcf url
            let vcfP = self.promiseGetSignedUrl(vcf)
                .then((url) => {
                    if (url == null || url.length === 0) {
                        reject('Empty vcf url returned from hub for ' + vcf.name);
                    }
                    else {
                        vcfUrl = url;
                    }
                });
            urlPromises.push(vcfP);

            // Get tbi url
            let tbiP = self.promiseGetSignedUrl(tbi)
                .then((url) => {
                    if (url == null || url.length === 0) {
                        reject('Empty tbi url returned from hub for ' + tbi.name);
                    }
                    else {
                        tbiUrl = url;
                    }
                });
            urlPromises.push(tbiP);

            // Return after we have both to preserve relative ordering
            Promise.all(urlPromises)
                .then(() => {
                    resolve({'name': vcf.name, 'vcf': vcfUrl, 'tbi': tbiUrl});
                })
                .catch((error) => {
                    reject('There was a problem obtaining signed urls from Hub: ' + error);
                })
        });
    }

    /* Returns a single url given a tbi or vcf file. */
    promiseGetSignedUrl(file) {
        let self = this;
        return new Promise((resolve, reject) => {
            self.hubEndpoint.getSignedUrlForFile(file).done((urlData) => {
                let url = urlData.url;
                if (url == null || url.length === 0) {
                    reject("Empty url returned from hub for " + file.name);
                }
                else {
                    resolve(url);
                }
            })
        })
    }


    /* Initializes global chromosome lookup table. For each chromosome, we'll have an object with a vcf and tbi field,
       containing a stable list of vcf and tbi urls. */
    _initUrlLookup() {
        let self = this;

        // Initialize url lookup to be organized by chromosome
        let chrUrls = {};
        for (let i = 0; i < 24; i++) {
            let urlObj = {};
            urlObj['vcf'] = [];
            urlObj['tbi'] = [];

            // Add to global variable
            chrUrls[self.chrNameMap[i]] = urlObj;
        }
        return chrUrls;
    }

    /* Wrapper to retrieve sample IDs from Hub. */
    promiseGetSampleIdsFromHub(projectId, phenoFilters) {
        let self = this;

        return new Promise(function (resolve, reject) {
            let t0 = performance.now();
            self.hubEndpoint.getSamplesForProject(projectId, phenoFilters)
                .done(data => {
                    let t1 = performance.now();
                    console.log('Took ' + (t1 - t0) + ' ms to get IDs from Hub');
                    resolve(data);
                })
        })
    }

    /* Adds properly formatted phenotype filters to the supplied cohort model. */
    appendSubsetPhenoFilters(subsetCohort, probandFilter) {
        let self = this;

        // Define if parameter mapping overwrote
        if (self.phenoFilters == null) self.phenoFilters = {};

        // Pull out filter terms passed from Hub and format for display
        if (Object.keys(self.phenoFilters).length > 0) {
            Object.keys(self.phenoFilters).forEach(function (filter) {
                if (self.phenoFilters[filter] != null && self.phenoFilters[filter].data != null) {
                    subsetCohort.subsetPhenotypes.push(self.formatPhenotypeFilterDisplay(filter, self.phenoFilters[filter].data));
                }
            })
        }

        // If we aren't filtering on affected status already, add a proband filter
        // Add this after setting up subsetPhenotype array to preserve 'Probands' chip displaying first
        if (self.phenoFilters['affected_status'] == null) {
            self.phenoFilters['affected_status'] = probandFilter;
        }
    }

    /* Only handles affected pie chart filter, and histogram filters */
    formatPhenotypeFilterDisplay(filter, boundsArr) {
        var self = this;

        // Affected/Unaffected filter
        if (filter === 'affected_status') {
            if (boundsArr[0] === 'Affected') {
                return 'Affected';
            }
            else if (boundsArr[0] === 'Unaffected') {
                return 'Unaffected';
            }
        }
        // In general, get rid of _ and . and capitalize things
        else {
            var formattedFilter = filter.replace('.', ' ').replace('_', ' ');
            formattedFilter = _.startCase(formattedFilter);
            return self.formatFilterBounds(formattedFilter, boundsArr);
        }
    }

    /* Formats the applied filter as N < filter_name < N */
    formatFilterBounds(filterName, boundsArr) {
        let start = boundsArr[0] != null ? boundsArr[0] : '';
        let startString = start.length > 0 ? (start + ' < ') : '';
        let end = boundsArr[1] != null ? boundsArr[1] : '';
        let endString = end.length > 0 ? (' < ' + end) : '';
        return startString + filterName + endString;
    }

    /* Returns a properly formatted filter object  to retrieve all probands from Hub */
    getProbandPhenoFilter() {
        let filterObj = {
            'chartType': "pie",
            'data': ["Affected"]
        };
        return filterObj;
    }

    /* Returns promise to check vcf url and finishes initializing cohort models. */
    promiseInit(vcfFileNames) {
        let self = this;

        return new Promise(function (resolve, reject) {
            // Finish initializing cohort models
            let subsetCohort = self.dataSet.getSubsetCohort();
            subsetCohort.inProgress.verifyingVcfUrl = true;
            subsetCohort.init(self, vcfFileNames);

            // Check vcf urls and add samples
            self.promiseAddSamples(subsetCohort, self.dataSet.vcfNames, self.dataSet.vcfUrls, self.dataSet.tbiUrls)
                .then(function () {
                    subsetCohort.inProgress.verifyingVcfUrl = false;
                    self.inProgress.loadingDataSources = false;
                    self.isLoaded = true;
                    resolve();
                })
                .catch(function (error) {
                    console.log("There was a problem initializing in VariantModel " + error);
                    reject(error);
                })
        });
    }

    /* Promises to verify the vcf url and adds samples to vcf object - used when launching from Hub */
    promiseAddSamples(subsetCohort, urlNames, vcfUrls, tbiUrls) {
        let self = this;
        if ((Object.keys(subsetCohort.vcfEndptHash)).length > 0) {    // TODO: probably a more robust check to do here
            return new Promise(function (resolve, reject) {
                subsetCohort.onVcfUrlEntered(urlNames, vcfUrls, tbiUrls)
                    .then((updatedListObj) => {
                        if (updatedListObj != null) {
                            // Assign updated, stably-sorted lists to data set model
                            self.dataSet.vcfNames = updatedListObj['names'];
                            self.dataSet.vcfUrls = updatedListObj['vcfs'];
                            self.dataSet.tbiUrls = updatedListObj['tbis'];
                            self.dataSet.invalidVcfNames = updatedListObj['invalidNames'];
                            self.dataSet.invalidVcfReasons = updatedListObj['invalidReasons'];
                            resolve();
                        }
                        else {
                            reject('There was a problem checking vcf/tbi urls and adding samples.');
                        }
                    });
            });
        } else {
            return Promise.reject('No vcf data to open in promiseAddSamples');
        }
    }

    /* Adds a cohort based on model info input obtained from files menu */
    // TODO: left off refactoring here!

    promiseAddCohort(modelInfo) {
        let self = this;
        return new Promise(function (resolve, reject) {
            let vm = new CohortModel();
            vm.init(self);
            vm.id = modelInfo.id;
            vm.displayName = modelInfo.displayName;
            // TODO: add ids and other necessary info here - figure out what that is

            let vcfPromise = null;
            if (modelInfo.vcf) {
                vcfPromise = new Promise(function (vcfResolve, vcfReject) {
                        // TODO: make sure we don't need to set selected sample field for model here...
                        vm.onVcfUrlEntered(modelInfo.vcf, modelInfo.tbi, function () {
                            if (modelInfo.displayName && modelInfo.displayName !== '') {
                                vm.setDisplayName(modelInfo.displayName);
                            } else if (modelInfo.selectedSample != null) {
                                vm.setDisplayName(modelInfo.selectedSample);
                            } else {
                                vm.setDisplayName(modelInfo.id);
                            }
                            vcfResolve();
                        })
                    },
                    function (error) {
                        vcfReject(error);
                    });
            } else {
                vm.selectedSample = null;
                vcfPromise = Promise.resolve();
            }

            // TODO: incorporate bam coverage
            let bamPromise = null;
            if (modelInfo.bam) {
                bamPromise = new Promise(function (bamResolve, bamReject) {
                        vm.onBamUrlEntered(modelInfo.bam, modelInfo.bai, function () {
                            bamResolve();
                        })
                    },
                    function (error) {
                        bamReject(error);
                    });
            } else {
                vm.bam = null;
                bamPromise = Promise.resolve();
            }

            Promise.all([vcfPromise, bamPromise])
                .then(function () {
                    let theModel = {'model': vm};
                    if (destIndex >= 0) {
                        self.sampleModels[destIndex] = vm;
                    } else {
                        self.sampleModels.push(vm);
                    }
                    self.sampleMap[modelInfo.id] = theModel;
                    resolve(vm);
                });
        })
    }

    /* Promises to load variants for the selected gene.
       Returns a map of annotated variant data. */
    promiseLoadData(theGene, theTranscript, options) {
        let self = this;
        let promises = [];

        return new Promise(function (resolve, reject) {
            if (self.dataSet == null) {
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
            if (self.dataSet.getSubsetCohort() != null) {
                let cohortModel = self.dataSet.getSubsetCohort();
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
            let subsetCohort = self.dataSet.getSubsetCohort();
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

    /* Takes in a list of fully annotated variants, and appends existing, relative positional information from subset variants to them.
       Reassigns loadedVariants in subset CohortModel.
       Sets extraAnnotationsLoaded to true. */
    combineVariantInfo(variantInfo) {
        let self = this;
        let fileNames = Object.keys(variantInfo);
        let updatedVarLookup = {};
        let subsetModel = self.dataSet.getSubsetCohort();
        let existingVariants = [];

        // If we have multiple variants to combine
        if (Object.keys(variantInfo).length > 1) {
            for (let i = 0; i < fileNames.length; i++) {
                let currVars = variantInfo[fileNames[i]].features;
                currVars.forEach((variant) => {
                    updatedVarLookup[variant.id] = variant;
                })
            }
            existingVariants = subsetModel.loadedVariants.features;
        }
        // If we have one variant to combine
        else {
            // Pull out reference to single variant
            let singleVar = variantInfo[0];
            updatedVarLookup[singleVar.id] = singleVar;
            existingVariants = subsetModel.loadedVariants.features.filter(feature => feature.id === singleVar.id);
        }

        // Iterate through existing variants, find matching updated variant, transfer info
        existingVariants.forEach(function (existingVar) {
            let matchingVar = updatedVarLookup[existingVar.id];
            if (matchingVar != null) {
                // Copy counts and subset delta info
                existingVar.af = matchingVar.af;
                existingVar.af1000G = matchingVar.af1000G;
                existingVar.afExAC = matchingVar.afExAC;
                existingVar.afgnomAD = matchingVar.afgnomAD;

                existingVar.effect = matchingVar.effect;
                existingVar.impact = matchingVar.impact;

                existingVar.vepConsequence = matchingVar.vepConsequence;
                existingVar.vepImpact = matchingVar.vepImpact;
                existingVar.vepExon = matchingVar.vepExon;
                existingVar.vepSIFT = matchingVar.vepSIFT;
                existingVar.sift = matchingVar.sift;
                existingVar.vepPolyPhen = matchingVar.vepPolyPhen;
                existingVar.polyphen = matchingVar.polyphen;
                existingVar.vepAf = matchingVar.vepAf;

                existingVar.highestImpactSnpeff = matchingVar.highestImpactSnpeff;
                existingVar.highestImpactVep = matchingVar.highestImpactVep;
                existingVar.highestSIFT = matchingVar.highestSIFT;
                existingVar.highestPolyphen = matchingVar.highestPolyphen;
            }
        });

        if (Object.keys(updatedVarLookup).length > 1) {
            self.extraAnnotationsLoaded = true;
        }
        else {
            return existingVariants[0];
        }
    }

    /* Takes in a list of ClinVar annotated variants, and appends their clinvar fields to the existing, currently displayed enriched variants.
     * The list of annotated variants may be longer or shorter than the currently displayed enriched variants.
     * Returns the first variant in the updated list. */
    combineClinVarInfo(annotatedVars) {
        let self = this;

        if (annotatedVars.length === 0) {
            console.log('Did not retreive any variants from clinvar call.');
            return;
        }

        // Populate hash of clinvar variant(s)
        let clinVarLookup = {};
        annotatedVars.forEach((variant) => {
            clinVarLookup[variant.id] = variant;
        });

        // Retrieve currently displayed variants, or singly clicked on variant
        let subsetModel = self.dataSet.getSubsetCohort();
        let existingVariants = [];
        if (annotatedVars.length > 1) {
            existingVariants = subsetModel.loadedVariants.features;
        }
        else {
            let singleVar = annotatedVars[0];
            existingVariants = subsetModel.loadedVariants.features.filter(feature => feature.id === singleVar.id);
        }

        // Iterate through existing variants, find matching updated variant, transfer info
        existingVariants.forEach(function (existingVar) {
            let matchingVar = clinVarLookup[existingVar.id];
            if (matchingVar != null) {
                // Copy all clinvar fields
                existingVar.clinVarClinicalSignificance = matchingVar.clinVarClinicalSignificance;
                existingVar.clinvar = matchingVar.clinvar;
                existingVar.clinVarAccession = matchingVar.clinVarAccession;
                existingVar.clinVarPhenotype = matchingVar.clinVarPhenotype;
                existingVar.clinvarRank = matchingVar.clinvarRank;
                existingVar.clinvarSubmissions = matchingVar.clinvarSubmissions;
            }
        });

        // Return singly clicked on variant
        return existingVariants[0];
    }

    promiseAnnotateInheritance(geneObject, theTranscript, resultMap, options = {
        isBackground: false,
        cacheData: true
    }) {
        let self = this;

        let resolveIt = function (resolve, resultMap, geneObject, theTranscript, options) {
            // SJG don't want to cache anything for now
            // self.promiseCacheCohortVcfData(geneObject, theTranscript, CacheHelper.VCF_DATA, resultMap, options.cacheData)
            // .then(function() {
            resolve({'resultMap': resultMap, 'gene': geneObject, 'transcript': theTranscript});
            //})
        }

        return new Promise(function (resolve, reject) {
            if (self.isAlignmentsOnly() && !autocall && resultMap == null) {
                resolve({
                    'resultMap': {PROBAND_ID: {features: []}},
                    'gene': geneObject,
                    'transcript': theTranscript
                });
            } else {
                resolveIt(resolve, resultMap, geneObject, theTranscript, options);
            }
        })
    }

    startGeneProgress(geneName) {
        var idx = this.genesInProgress.indexOf(geneName);
        if (idx < 0) {
            this.genesInProgress.push(geneName);
        }
    }

    endGeneProgress() {
        // TODO: implement this? Called by cache helper...
        alert("endGeneProgress in VariantModel not implemented yet");
    }

    promiseLoadKnownVariants() {
        // TODO: implement this? Called by Home.Vue...
        alert("promiseLoadKnownVariants in VariantModel not implemented yet");
    }

    /* Clears the variant data for each cohort. Falsifies flags used for chip display. */
    clearLoadedData() {
        let self = this;

        self.extraAnnotationsLoaded = false;
        if (self.dataSet != null) {
            self.dataSet.getCohorts().forEach(function (cohort) {
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

    clearCalledVariants() {
        alert("not implemented yet");
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

        let cohort = self.dataSet.getSubsetCohort();
        if (name == null || name === cohort.name) {
            if (cohort.vcfData && cohort.vcfData.features) {
                let start = self.filterModel.regionStart ? self.filterModel.regionStart : gene.start;
                let end = self.filterModel.regionEnd ? self.filterModel.regionEnd : gene.end;
                cohort.loadedVariants = filterAndPileupVariants(cohort, start, end, 'loaded');
            }
        }
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

        let cohort = self.dataSet.getSubsetCohort();
        if (cohort != null) {
            if (cohort.vcfData && cohort.vcfData.features) {
                let start = self.filterModel.regionStart ? self.filterModel.regionStart : gene.start;
                let end = self.filterModel.regionEnd ? self.filterModel.regionEnd : gene.end;
                cohort.selectedVariants = filterAndPileupVariants(cohort, start, end, 'selected');
            }
        }
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

    /* Returns array of enrichment group variants to which the given variant is apart of.
       The returned enrichment group will contain the given variant first,
       followed by variants ordered by decreasing subset delta. */
    getOrderedEnrichmentGroup(variant) {
        let self = this;

        let enrichGroup = null;
        if (self.subsetEnrichedVars[variant.id] != null) {
            enrichGroup = self.subsetEnrichedVars;
        }
        else if (self.probandEnrichedVars[variant.id] != null) {
            enrichGroup = self.probandEnrichedVars;
        }
        else if (self.nonEnrichedVars[variant.id] != null) {
            enrichGroup = self.nonEnrichedVars;
        }
        else {
            enrichGroup = self.probandOnlyVars;
        }

        // Transform into an array of values ordered by subset delta (desc)
        let clickedVar = variant.id;
        let enrichArr = Object.values(enrichGroup);
        enrichArr.sort(function (a, b) {
            return b.subsetDelta - a.subsetDelta;
        })

        // Put selected variant first in list (rest of list is ordered spatially)
        let i = enrichArr.map(function (e) {
            return e.id
        }).indexOf(variant.id);
        enrichArr.splice(i, 1);
        enrichArr.splice(0, 0, variant);

        return enrichArr;
    }

    /* Filters out proband only features and returns array of filtered features. */
    filterProbandsByDelta(probandFeatures) {
        let self = this;

        let filteredProbandFeatures = [];
        probandFeatures.forEach(function (feature) {
            if (feature.affectedSubsetCount > 0) {
                filteredProbandFeatures.push(feature);
            }
        })
        return filteredProbandFeatures;
    }

    promiseAnnotateWithClinvar(resultMap, geneObject, transcript, isBackground) {
        let self = this;
        var formatClinvarKey = function (variant) {
            var delim = '^^';
            return variant.chrom + delim + variant.ref + delim + variant.alt + delim + variant.start + delim + variant.end;
        }

        var formatClinvarThinVariant = function (key) {
            var delim = '^^';
            var tokens = key.split(delim);
            return {'chrom': tokens[0], 'ref': tokens[1], 'alt': tokens[2], 'start': tokens[3], 'end': tokens[4]};
        }

        var refreshVariantsWithClinvarLookup = function (theVcfData, clinvarLookup) {
            theVcfData.features.forEach(function (variant) {
                var clinvarAnnot = clinvarLookup[formatClinvarKey(variant)];
                if (clinvarAnnot) {
                    for (var key in clinvarAnnot) {
                        variant[key] = clinvarAnnot[key];
                    }
                }
            })
            if (theVcfData.loadState == null) {
                theVcfData.loadState = {};
            }
            theVcfData.loadState['clinvar'] = true;
        }

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
                    ? self.dataSet.getSubsetCohort()._refreshVariantsWithClinvarVCFRecs.bind(self.dataSet.getSubsetCohort(), unionVcfData)
                    : self.dataSet.getSubsetCohort()._refreshVariantsWithClinvarEutils.bind(self.dataSet.getSubsetCohort(), unionVcfData);

                self.dataSet.getSubsetCohort().getFirstVcf().promiseGetClinvarRecords(
                    unionVcfData,
                    self.dataSet.getSubsetCohort()._stripRefName(geneObject.chr),
                    geneObject,
                    self.geneModel.clinvarGenes,
                    refreshVariantsFunction)
                    .then(function () {
                        // Create a hash lookup of all clinvar variants
                        var clinvarLookup = {};
                        unionVcfData.features.forEach(function (variant) {
                            var clinvarAnnot = {};

                            for (var key in self.dataSet.getSubsetCohort().getFirstVcf().getClinvarAnnots()) {
                                clinvarAnnot[key] = variant[key];
                                clinvarLookup[formatClinvarKey(variant)] = clinvarAnnot;
                            }
                        })

                        let refreshPromises = [];

                        // Use the clinvar variant lookup to initialize variants with clinvar annotations
                        for (let j = 0; j < fileNames.length; j++) {
                            let updatedData = fileMap[fileNames[j]];
                            if (!updatedData.loadState['clinvar']) {
                                let p = refreshVariantsWithClinvarLookup(updatedData, clinvarLookup);
                                if (!isBackground) {
                                    self.combineClinVarInfo(updatedData.features);
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


// promiseCacheCohortVcfData(geneObject, theTranscript, dataKind, resultMap, cacheIt) {
//     let self = this;
//     return new Promise(function (resolve, reject) {
//         // Cache vcf data for trio
//         var cachePromise = null;
//         if (cacheIt) {
//             var cachedPromises = [];
//             self.dataSet.getCohorts().forEach(function (cohort) {
//                 if (resultMap[cohort.getName()]) {
//                     var p = cohort._promiseCacheData(resultMap[cohort.getName()], dataKind, geneObject.gene_name, theTranscript, self.cacheHelper);
//                     cachedPromises.push(p);
//                 }
//             })
//             Promise.all(cachedPromises).then(function () {
//                 resolve();
//             })
//         } else {
//             resolve();
//         }
//     })
// }

    promiseSummarizeError() {
        alert("not implemented yet");
    }

    promiseSummarizeDanger() {
        alert("not implemented yet");
    }

    getCurrentTrioVcfData() {
        alert("not implemented yet");
        // SJG TODO: how will I adapt this?
    }

    promiseJointCallVariants() {
        alert("not implemented yet");
    }

    promiseHasCalledVariants() {
        alert("not implemented yet");
    }

    promiseHasCachedCalledVariants() {
        alert("not implemented yet");
    }

    /* Returns true if all cohorts within the data set are alignments only. */
    isAlignmentsOnly() {
        let self = this;
        return self.dataSet.isAlignmentsOnly();
    }

    /* Assigns classes to each variant to control visual display in the DOM. */
    classifyByEnrichment(d, annotationScheme) {
        var impacts = "";
        // var toggleImpact = "";  // Grouping classes, added & removed based on impact mode
        // var colorimpacts = "";  // Color classes, constant
        var effects = "";
        var sift = "";
        var polyphen = "";
        var regulatory = "";
        var enrichment = "";   // Grouping classes, added & removed based on impact mode
        var enrichColor = "";  // Color classes, constant

        /* Still want to keep color scheme based on subset delta fold frequency for now*/
        var subsetEnrichment = d.subsetDelta;
        var roundedSubset = Math.round(d.subsetDelta * 10) / 10;

        if (roundedSubset >= 2.0) {
            enrichment = "eUP";
            enrichColor = "enrichment_subset_UP";
        }
        else if (subsetEnrichment <= 0.5) {
            enrichment = "eDOWN";
            enrichColor = "enrichment_subset_DOWN";
        }
        else if (d.totalSubsetCount > 0) {
            enrichment = "eLOW";
            enrichColor = "enrichment_LOW";
        }
        else {
            enrichment = "eNA";
            enrichColor = "enrichment_NA";
        }

        var effectList = (annotationScheme == null || annotationScheme.toLowerCase() == 'snpeff' ? d.effect : d.vepConsequence);
        for (var key in effectList) {
            if (annotationScheme.toLowerCase() == 'vep' && key.indexOf("&") > 0) {
                var tokens = key.split("&");
                tokens.forEach(function (token) {
                    effects += " " + token;

                });
            } else {
                effects += " " + key;
            }
        }
        for (var key in d.sift) {
            sift += " " + key;
        }
        for (var key in d.polyphen) {
            polyphen += " " + key;
        }
        for (var key in d.regulatory) {
            regulatory += " " + key;
        }

        return 'variant ' + d.type.toLowerCase() + ' ' + d.zygosity.toLowerCase() + ' ' + (d.inheritance ? d.inheritance.toLowerCase() : "")
            + ' ua_' + d.ua + ' ' + sift + ' ' + polyphen + ' ' + regulatory + ' ' + +' ' + d.clinvar + ' ' + impacts + ' ' + effects +
            ' ' + d.consensus + ' ' + enrichment + ' ' + enrichColor;
    }

    classifyByImpact(d, annotationScheme) {
        let impacts = "";
        let colorimpacts = "";
        let effects = "";
        let sift = "";
        let polyphen = "";
        let regulatory = "";

        let effectList = (annotationScheme == null || annotationScheme.toLowerCase() === 'snpeff' ? d.effect : d.vepConsequence);
        for (let key in effectList) {
            if (annotationScheme.toLowerCase() === 'vep' && key.indexOf("&") > 0) {
                let tokens = key.split("&");
                tokens.forEach(function (token) {
                    effects += " " + token;

                });
            } else {
                effects += " " + key;
            }
        }
        let impactList = (annotationScheme == null || annotationScheme.toLowerCase() === 'snpeff' ? d.impact : d[IMPACT_FIELD_TO_FILTER]);
        for (let key in impactList) {
            impacts += " " + key;
        }
        let colorImpactList = (annotationScheme == null || annotationScheme.toLowerCase() === 'snpeff' ? d.impact : d[IMPACT_FIELD_TO_FILTER]);
        for (let key in colorImpactList) {
            colorimpacts += " " + 'impact_' + key;
        }
        if (colorimpacts === "") {
            colorimpacts = "impact_none";
        }
        for (let key in d.sift) {
            sift += " " + key;
        }
        for (let key in d.polyphen) {
            polyphen += " " + key;
        }
        for (let key in d.regulatory) {
            regulatory += " " + key;
        }

        return 'variant ' + d.type.toLowerCase() + ' ' + d.zygosity.toLowerCase() + ' ' + (d.inheritance ? d.inheritance.toLowerCase() : "") + ' ua_' + d.ua + ' ' + sift + ' ' + polyphen + ' ' + regulatory + ' ' + +' ' + d.clinvar + ' ' + impacts + ' ' + effects + ' ' + d.consensus + ' ' + colorimpacts;
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

    classifyByClinvar(d) {
        return 'variant ' + d.type.toLowerCase() + ' ' + d.clinvar + ' colorby_' + d.clinvar;
    }

    _parseCalledVariants() {
        alert("not implemented yet");
    }
}

export default VariantModel;
