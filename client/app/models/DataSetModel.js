/* Logic relative to a single data set (for example, Sfari data set or local upload data set).
   Has 1:1 relationship with VariantViz component and rendered track.
   SJG updated Nov2018 */
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
        this.genesInProgress = [];
        this.affectedInfo = null;       // TODO: what is this?
        this.calledVariants = null;
        this.loadedVariants = null;
        this.selectedVariants = null;   // Selected in zoom panel
        this.majorityBuild = '';        // Represents the build found in most uploaded files to the application (i.e., GRCh37 or GRCh38)
        this.trackName = '';            // Displays in italics before chips

        // TODO: these might be depreciated if color scheme is no longer used...
        this.subsetEnrichedVars = {};
        this.probandEnrichedVars = {};
        this.nonEnrichedVars = {};
        this.probandOnlyVars = {};
        // </editor-fold>

        // <editor-fold desc="STATE PROPS">
        this.vcfUrlsEntered = false;
        this.vcfFilesOpened = false;
        this.bamUrlsEntered = false;
        this.bamFilesOpened = false;
        this.keepVariantsCombined = true;           // True for multiple samples to be displayed on single track
        this.efficiencyMode = true;                 // True to only pull back variant locations and not functional impacts
        this.noMatchingSamples = false; // Flag to display No Matching Variants chip
        this.annotationScheme = 'VEP';
        this.inProgress = {
            'fetchingHubData': false,
            'verifyingVcfUrl': false,
            'loadingVariants': false,
            'drawingVariants': false
        };
        // </editor-fold>

        // <editor-fold desc="MODEL PROPS">
        this._variantModel = theVariantModel;
        this._cohorts = [];
        this._cohortMap = {};
        // </editor-fold>

        // <editor-fold desc="MOSAIC PROPS">
        this.invalidVcfNames = [];      // List of names corresponding to invalid vcfs
        this.invalidVcfReasons = [];   // List of reasons corresponding to invalid vcfs - matching order as invalidVcfNames
        // </editor-fold>

        // Moved from cohort model TODO: classify these into groups
        this.getVcfRefName = null;
        this.getBamRefName = null;
        this.vcfRefNamesMap = {};
        this.lastVcfAlertify = null;
        this.lastBamAlertify = null;
        this.coverage = [[]];
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

    getFilterModel() {
        let self = this;
        return self.getVariantModel().filterModel;
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

    isReadyToLoad() {
        return this.areVcfsReadyToLoad() || this.areBamsReadyToLoad();
    }

    areBamsReadyToLoad() {
        return this.bams.length > 0 && (this.bamUrlsEntered || this.bamFilesOpened);
    }

    areVcfsReadyToLoad() {
        return this.vcfs.length > 0 && (this.vcfUrlsEntered || this.vcfFilesOpened);
    }

    isBamLoaded() {
        return this.bams.length > 0 && (this.bamUrlsEntered || (this.bamFilesOpened && this.bamRefName));
    }

    isVcfLoaded() {
        return this.vcf && (this.vcfUrlsEntered || this.vcfFilesOpened);
    }

    //</editor-fold>

    // <editor-fold desc="ADD & INITIALIZE">

    /* Initializes proband, subset, unaffected cohorts. */
    initCohorts() {
        let self = this;

        let parentVarModel = self.getVariantModel();
        let probandCohort = new CohortModel(self, parentVarModel);
        probandCohort.isProbandCohort = true;
        self.addCohort(probandCohort, PROBAND_ID);

        let subsetCohort = new CohortModel(self, parentVarModel);
        subsetCohort.isSubsetCohort = true;
        self.addCohort(subsetCohort, SUBSET_ID);

        let unaffectedCohort = new CohortModel(self, parentVarModel);
        unaffectedCohort.isUnaffectedCohort = true;
        self.addCohort(unaffectedCohort, UNAFFECTED_ID);
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
    promiseLoadData(theGene, theTranscript, options) {
        let self = this;

        return new Promise(function (resolve, reject) {
            // Load variants
            self.startGeneProgress(theGene['gene_name']);
            self.clearLoadedData();
            self.promiseLoadVariants(theGene, theTranscript, options)
                .then(function (data) {
                    self.setLoadedVariants(data.gene);
                    resolve();
                })
                .catch(function (error) {
                    console.log('There was a problem loading the data in VariantModel.');
                    reject(error);
                });
        });
    }

    /* Promises to annotate variants and returns a map of annotated variant data. */
    promiseLoadVariants(theGene, theTranscript, options) {
        let self = this;

        return new Promise(function (resolve, reject) {
            self.promiseAnnotateVariants(theGene, theTranscript, false, options)
                .then(function (resultMap) {
                    let annotatedDataObj = {'resultMap': resultMap, 'gene': theGene, 'transcript': theTranscript};
                    resolve(annotatedDataObj);
                })
                .catch(function (error) {
                    reject(error);
                })
        })
    }

    /* Promises to annotate variants in each cohort model. Updates cohort loading status as appropriate. */
    promiseAnnotateVariants(theGene, theTranscript, isBackground, options = {}) {
        let self = this;

        return new Promise(function (resolve, reject) {
            let annotatePromises = [];
            let subsetResults = null;
            let probandCounts = null;

            // Annotate variants for cohort models that have specified IDs
            if (self.getSubsetCohort() != null) {
                let cohortModel = self.getSubsetCohort();
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
                    reject("There was a problem in DataSetModel promiseAnnotateVariants: " + error);
                })
        });
    }

    /* Further annotates variants that have been through a single round of minimal annotation. */
    promiseFurtherAnnotateVariants(theGene, theTranscript, isBackground, options = {}) {
        let self = this;

        return new Promise(function (resolve, reject) {
            // Annotate all variants in both proband and subset groups
            let subsetCohort = self.getSubsetCohort();
            subsetCohort.promiseAnnotateVariants(theGene, theTranscript, [subsetCohort], false, isBackground, self.keepVariantsCombined, false)
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



    // TODO: delete after testing
    // promiseAnnotateInheritance(geneObject, theTranscript, resultMap, options = {
    //     isBackground: false,
    //     cacheData: true
    // }) {
    //     let self = this;
    //
    //     let resolveIt = function (resolve, resultMap, geneObject, theTranscript, options) {
    //         resolve({'resultMap': resultMap, 'gene': geneObject, 'transcript': theTranscript});
    //     };
    //
    //     return new Promise(function (resolve, reject) {
    //         if (self.isAlignmentsOnly() && !autocall && resultMap == null) {
    //             resolve({
    //                 'resultMap': {PROBAND_ID: {features: []}},
    //                 'gene': geneObject,
    //                 'transcript': theTranscript
    //             });
    //         } else {
    //             resolveIt(resolve, resultMap, geneObject, theTranscript, options);
    //         }
    //     })
    // }

    // </editor-fold>

    // <editor-fold desc="VCF">

    /* Checks vcfs to ensure they are found and can be successfully opened. Also retrieves build information
    * for each vcf provided.
    *
    * Takes in three stably sorted lists of file names, vcf urls, and tbi urls.
    *
    * Returns three stable sorted lists of vcf names, urls, tbi urls, and array of sample names within file.
    * Each list only contains information relative to vcf files that may be found, successfully opened,
    * and were aligned with the majority reference build found in all of the provided files (i.e. GRCh38).
    *
    * Notifies the user of any vcfs that 1) may not be opened, 2) have indeterminate reference builds, or 3) do not
    * have the majority reference build.
    */
    onVcfUrlEntered(urlNames, vcfUrls, tbiUrls) {
        let me = this;
        me.vcfData = null;
        me.sampleName = null;

        return new Promise((resolve, reject) => {
            // For each vcf url, open and get sample names
            if (vcfUrls == null || vcfUrls.length === 0) {
                me.vcfUrlEntered = false;
                reject();
            } else {
                me.vcfUrlEntered = true;
                me.vcfFileOpened = false;
                me.getVcfRefName = null;
                me.isMultiSample = true;
                let individualRefBuilds = {};
                let openErrorFiles = [];
                let sampleNames = [];       // Array of sample name arrays, in same order as vcfs

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
                                // Get the sample names from the vcf header
                                currVcfEndpt.getSampleNames(function (names) {
                                    me.isMultiSample = !!(names && names.length > 1);
                                    sampleNames.push(names);
                                });

                                // Get build version from vcf chromosome notation if can't get from header
                                if (hdrBuildResult === '') {
                                    // Look at chrom notation if we couldn't determine here
                                    currVcfEndpt.getChromosomesFromVcf(currVcf, currTbi, function (success, errorMsg, chrBuildResult) {
                                        if (success) {
                                            individualRefBuilds[currFileName] = chrBuildResult;
                                        }
                                    })
                                } else {
                                    individualRefBuilds[currFileName] = hdrBuildResult;
                                }
                            } else {
                                openErrorFiles.push(currFileName);
                                console.log('Could not open either: ' + vcfUrls[i] + 'or ' + tbiUrls[i] + ' - ' + errorMsg);
                            }
                            resolve();
                        });
                    });
                    openPromises.push(p);
                }
                Promise.all(openPromises)
                    .then(() => {
                        let errorMsg = '';
                        let updatedListObj = {};
                        // Initialize return object w/ all files
                        updatedListObj['names'] = urlNames;
                        updatedListObj['vcfs'] = vcfUrls;
                        updatedListObj['tbis'] = tbiUrls;
                        updatedListObj['samples'] = sampleNames;
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
                            let updatedListObj = me.removeEntriesFromLists(openErrorFiles, urlNames, vcfUrls, tbiUrls, sampleNames);
                            urlNames = updatedListObj['names'];
                            vcfUrls = updatedListObj['vcfs'];
                            tbiUrls = updatedListObj['tbis'];
                            sampleNames = updatedListObj['samples'];

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
                            updatedListObj = me.removeEntriesFromLists(unfoundRefFiles, urlNames, vcfUrls, tbiUrls, sampleNames);
                            urlNames = updatedListObj['names'];
                            vcfUrls = updatedListObj['vcfs'];
                            tbiUrls = updatedListObj['tbis'];
                            sampleNames = updatedListObj['samples'];

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
                            updatedListObj = me.removeEntriesFromLists(minorityRefKeyNames, urlNames, vcfUrls, tbiUrls, sampleNames);
                            urlNames = updatedListObj['names'];
                            vcfUrls = updatedListObj['vcfs'];
                            tbiUrls = updatedListObj['tbis'];
                            sampleNames = updatedListObj['samples'];
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
                        // TODO: not getting reassinged in data set model
                        updatedListObj['invalidNames'] = invalidVcfNames;
                        updatedListObj['invalidReasons'] = invalidVcfReasons;
                        resolve(updatedListObj);
                    });
            }
        });
    }

    // TODO: refactor this for cohort (sample name, etc)
    promiseVcfFilesSelected(event) {
        let me = this;

        return new Promise( function(resolve, reject) {
            me.sampleName = null;
            me.vcfData = null;
            me.vcf.openVcfFile( event,
                function(success, message) {
                    if (me.lastVcfAlertify) {
                        me.lastVcfAlertify.dismiss();
                    }
                    if (success) {
                        me.vcfFileOpened = true;
                        me.vcfUrlEntered = false;
                        me.getVcfRefName = null;
                        me.isMultiSample = false;

                        // Get the sample names from the vcf header
                        me.vcf.getSampleNames( function(sampleNames) {
                            me.isMultiSample = sampleNames && sampleNames.length > 1 ? true : false;
                            resolve({'fileName': me.vcf.getVcfFile().name, 'sampleNames': sampleNames});
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

    // TODO: not sure exactly what this does - get reference vcf was built against?
    _promiseVcfRefName(ref) {
        let me = this;
        let theRef = ref != null ? ref : window.gene.chr;
        return new Promise(function (resolve, reject) {

            if (me.getVcfRefName != null) {
                // If we can't find the ref name in the lookup map, show a warning.
                if (me.vcfRefNamesMap[me.getVcfRefName(theRef)] == null) {
                    reject();
                } else {
                    resolve();
                }
            } else {
                me.vcfRefNamesMap = {};
                let firstVcfEndpt = me.getDataSetModel().getFirstVcf();

                firstVcfEndpt.getReferenceLengths(function (refData) {
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
                            let theRefName = me.getVcfRefName(refName);
                            me.vcfRefNamesMap[theRefName] = refName;
                        });
                        resolve();
                    } else {
                        // If we didn't find the matching ref name, show a warning.
                        reject();
                    }
                });
            }
        });
    }

    // </editor-fold>

    // <editor-fold desc="BAM">

    onBamUrlEntered(bamUrl, baiUrl, callback) {
        var me = this;
        this.bamData = null;
        this.fbData = null;

        if (bamUrl == null || bamUrl.trim() == "") {
            this.bamUrlEntered = false;
            this.bam = null;
        } else {
            this.bamUrlEntered = true;
            this.bam = new Bam(this.cohort.endpoint, bamUrl, baiUrl);
            this.bam.checkBamUrl(bamUrl, baiUrl, function(success, errorMsg) {
                if (me.lastBamAlertify) {
                    me.lastBamAlertify.dismiss();
                }
                if (!success) {
                    this.bamUrlEntered = false;
                    this.bam = null;
                    var msg = "<span style='font-size:18px'>" + errorMsg + "</span><br><span style='font-size:12px'>" + bamUrl + "</span>";
                    alertify.set('notifier','position', 'top-right');
                    me.lastBamAlertify = alertify.error(msg, 15);
                }
                if(callback) {
                    callback(success);
                }
            });
        }
        this.bamRefName = this._stripRefName;
    }

    promiseBamFilesSelected(event) {
        var me = this;
        return new Promise(function(resolve, reject) {
            me.bamData = null;
            me.fbData = null;
            me.bam = new Bam();
            me.bam.openBamFile(event, function(success, message) {
                if (me.lastBamAlertify) {
                    me.lastBamAlertify.dismiss();
                }
                if (success) {
                    me.bamFileOpened = true;
                    me.getBamRefName = me._stripRefName;
                    resolve(me.bam.bamFile.name);
                } else {
                    if (me.lastBamAlertify) {
                        me.lastBamAlertify.dismiss();
                    }
                    var msg = "<span style='font-size:18px'>" + message + "</span>";
                    alertify.set('notifier','position', 'top-right');
                    me.lastBamAlertify = alertify.error(msg, 15);

                    reject(message);
                }
            });
        });
    }

    promiseGetGeneCoverage(geneObject, transcript) {
        let self = this;

        return new Promise(function (resolve, reject) {
                if (transcript.features == null || transcript.features.length === 0) {
                    resolve({model: me, gene: geneObject, transcript: transcript, 'geneCoverage': []});
                } else {
                    self.bam.getGeneCoverage(geneObject,
                        transcript,
                        [self.bam],
                        function (theData, trRefName, theGeneObject, theTranscript) {
                            let geneCoverageObjects = self._parseGeneCoverage(theData);
                            if (geneCoverageObjects.length > 0) {
                                me._setGeneCoverageExonNumbers(transcript, geneCoverageObjects);
                                me.setGeneCoverageForGene(geneCoverageObjects, theGeneObject, theTranscript);
                                resolve({
                                    model: me,
                                    gene: theGeneObject,
                                    transcript: theTranscript,
                                    'geneCoverage': geneCoverageObjects
                                });
                            } else {
                                console.log("Cannot get gene coverage for gene " + theGeneObject.gene_name);
                                resolve({model: me, gene: theGeneObject, transcript: theTranscript, 'geneCoverage': []});
                            }
                        }
                    );
                }

            },
            function (error) {
                reject(error);
            });
    }

    _setGeneCoverageExonNumbers(transcript, geneCoverageObjects) {
        var me = this;
        transcript.features.forEach(function (feature) {
            var gc = null;
            var matchingFeatureCoverage = geneCoverageObjects.filter(function (gc) {
                return feature.start == gc.start && feature.end == gc.end;
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
        var geneCoverageObjects = [];
        if (theData && theData.length > 0) {
            var fieldNames = [];
            theData.split("\n").forEach(function (rec) {
                if (rec.indexOf("#") == 0 && fieldNames.length == 0) {
                    rec.split("\t").forEach(function (field) {
                        if (field.indexOf("#") == 0) {
                            field = field.substring(1);
                        }
                        fieldNames.push(field);
                    })
                } else {
                    var fields = rec.split("\t");
                    if (fields.length == fieldNames.length) {
                        var gc = {};
                        for (var i = 0; i < fieldNames.length; i++) {
                            gc[fieldNames[i]] = fields[i];
                            if (fieldNames[i] == 'region') {
                                if (fields[i] != "NA") {
                                    var parts = fields[i].split(":");
                                    gc.chrom = parts[0];
                                    var region = parts[1].split("-");
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

        let cohort = self.getSubsetCohort();
        let filterModel = self.getFilterModel();
        if (name == null || name === cohort.name) {
            if (cohort.vcfData && cohort.vcfData.features) {
                let start = filterModel.regionStart ? filterModel.regionStart : gene.start;
                let end = filterModel.regionEnd ? filterModel.regionEnd : gene.end;
                cohort.loadedVariants = filterAndPileupVariants(cohort, start, end, 'loaded');
            }
        }
    }

    /* Clears the variant data for each cohort. Falsifies flags used for chip display. */
    clearLoadedData() {
        let self = this;

        self.extraAnnotationsLoaded = false;
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

    // TODO: not sure what the difference is conceptually between selected and loaded variants - is this a flag function?
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

        let cohort = self.getSubsetCohort();
        if (cohort != null) {
            if (cohort.vcfData && cohort.vcfData.features) {
                let start = self.filterModel.regionStart ? self.filterModel.regionStart : gene.start;
                let end = self.filterModel.regionEnd ? self.filterModel.regionEnd : gene.end;
                cohort.selectedVariants = filterAndPileupVariants(cohort, start, end, 'selected');
            }
        }
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
    removeEntriesFromLists(fileNames, nameList, vcfList, tbiList, sampleNameList) {
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
        });

        listObj['names'] = nameList;
        listObj['vcfs'] = vcfList;
        listObj['tbis'] = tbiList;
        listObj['samples'] = sampleNameList;
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
        var tokens = refName.split("chr");
        var strippedName = refName;
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
