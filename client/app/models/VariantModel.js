/* Encapsulates logic for Variant Card and Variant Summary Card
   SJG & TS updated Nov2018 */
import DataSetModel from './DataSetModel.js'

class VariantModel {
    constructor(endpoint, genericAnnotation, translator, geneModel,
                cacheHelper, genomeBuildHelper) {

        // <editor-fold desc="DEBUG STATE">
        this.debugMode = true;
        // </editor-fold>

        // <editor-fold desc="DATA PROPERTIES">
        this.mainDataSet = null;            // The main data set
        this.otherDataSets = [];            // Any other data sets being compared to main data set
        this.totalProbandCount = 0;
        this.totalSubsetCount = 0;
        this.affectedProbandCount = 0;
        this.affectedSubsetCount = 0;
        this.probandZygMap = {};
        this.subsetZygMap = {};
        // </editor-fold>

        // <editor-fold desc="STATE & THRESHOLD PROPERTIES">
        this.annotationScheme = 'vep';
        this.maxDepth = 0;
        this.inProgress = {'loadingDataSources': false};
        // </editor-fold>

        // <editor-fold desc="SINGLE HELPER CLASSES">
        this.endpoint = endpoint;
        this.hubEndpoint = {};
        this.genericAnnotation = genericAnnotation;
        this.translator = translator;
        this.geneModel = geneModel;
        this.genomeBuildHelper = genomeBuildHelper;
        this.filterModel = null;
        this.featureMatrixModel = null;
        this.cacheHelper = cacheHelper;
        // </editor-fold>

        // <editor-fold desc="MOSAIC PROPERTIES">
        this.projectId = '';                    // Hub project ID if we're sourcing data from there
        this.phenoFilters = {};                 // Hub filters applied to samples
        this.simonsIdMap = {};                  // Lookup table to convert Hub VCF IDs to Simons IDs
        this.isSimonsProject = false;           // True if cohort is Simons project launched from Mosaic
        this.blacklistedGeneSelected = false;   // True if ACMG blacklisted gene selected (ACMG_blacklist.json)
        // </editor-fold>

        // <editor-fold desc="DEMO DATA">
        this.hubDemoInfo = [{
            'id': 's1',
            'isSampleEntry': true,
            'displayName': 'Platinum Demo',
            'vcfs': ['https://s3.amazonaws.com/iobio/samples/vcf/platinum-exome.vcf.gz'],
            'tbis': null,
            'bams': ['https://s3.amazonaws.com/iobio/samples/bam/NA12878.exome.bam'],
            'bais': null,
            'subsetSampleIds': ['NA12877'],
            'excludeSampleIds': [],
            'selectedSample': 'NA12877'
        }];

        this.demoInfo = [{
            'id': 's0',
            'isSampleEntry': false,
            'displayName': 'Platinum Demo',
            'vcfs': ['https://s3.amazonaws.com/iobio/samples/vcf/platinum-exome.vcf.gz'],
            'tbis': null,
            'bams': [],
            'bais': null,
            'subsetSampleIds': ['NA12877', 'NA12878'],
            'excludeSampleIds': [],
            'selectedSample': null
        }, {
            'id': 's1',
            'isSampleEntry': true,
            'displayName': 'Platinum Patient A',
            'vcfs': ['https://s3.amazonaws.com/iobio/samples/vcf/platinum-exome.vcf.gz'],
            'tbis': null,
            'bams': ['https://s3.amazonaws.com/iobio/samples/bam/NA12891.exome.bam'],
            'bais': null,
            'subsetSampleIds': [],
            'excludeSampleIds': [],
            'selectedSample': 'NA12891'
        }, {
            'id': 's2',
            'isSampleEntry': true,
            'displayName': 'Platinum Patient B',
            'vcfs': ['https://s3.amazonaws.com/iobio/samples/vcf/platinum-exome.vcf.gz'],
            'tbis': null,
            'bams': ['https://s3.amazonaws.com/iobio/samples/bam/NA12892.exome.bam'],
            'bais': null,
            'subsetSampleIds': [],
            'excludeSampleIds': [],
            'selectedSample': 'NA12892'
        }];
        this.demoGene = 'TTN';
        // </editor-fold>
    }


    //<editor-fold desc="DATASET GETTERS">

    /* Returns data set based on provided ID. If data set with ID DNE, returns null. */
    getDataSet(id) {
        let self = this;

        if (id === 's0' || id === 'Hub') {
            return self.mainDataSet;
        } else {
            self.otherDataSets.forEach((dataSet) => {
                if (dataSet.entryId === id) {
                    return dataSet;
                }
            })
        }
        return null;
    }

    /* Returns all data sets that do not represent a single sample. */
    getAllCohortDataSets() {
        let self = this;

        let dataSets = [];
        if (self.mainDataSet) {
            dataSets.push(self.mainDataSet);
        }
        self.otherDataSets.forEach((dataSet) => {
            if (!dataSet.isSingleSample) {
                dataSets.push(dataSet);
            }
        })
        return dataSets;
    }

    getAllDataSets() {
        let self = this;

        let dataSets = [];
        if (self.mainDataSet) {
            dataSets.push(self.mainDataSet);
        }
        self.otherDataSets.forEach((dataSet) => {
            dataSets.push(dataSet);
        });
        return dataSets;
    }

    //</editor-fold>

    //<editor-fold desc="SIMONS ID MAPPING">

    /* Setter for simons ID map. */
    setIdMap(idMap) {
        let self = this;
        self.simonsIdMap = idMap;
    }

    getRawIds(ids, usingNewApi) {
        let rawIds = [];
        let sampleObjsMissingVcfs = [];
        if (usingNewApi) {
            ids.forEach((idObj) => {
                let vcf = idObj.files.filter((file) => {
                    return file.type === 'vcf';
                });
                if (vcf != null && vcf[0] != null) {
                    rawIds.push(vcf[0].vcf_sample_name);
                } else {
                    sampleObjsMissingVcfs.push(idObj.id);
                }
            });
        } else {
            ids.forEach((idObj) => {
                rawIds.push(idObj.id);
            });
        }
        if (sampleObjsMissingVcfs.length > 0) {
            console.log('The following sample objects do not have vcf files associated with them: ' + sampleObjsMissingVcfs.join());
        }

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
            alert('Note: could not find translation for all sample IDs provided, not all samples from the ' + cohortName + ' cohort will be included in the analysis.');
        }
        return convertedIds;
    }

    //</editor-fold>

    //<editor-fold desc="MOSAIC LAUNCH">

    /* Returns true if launched from Mosaic. */
    launchedFromMosaic() {
        let self = this;
        if (self.projectId && self.projectId !== '') {
            return true;
        } else {
            return false;
        }
    }

    /* Sets up cohort and data set models.
       Retrieves urls and sample IDs from Hub, then promises to initialize.
       Assumes a project ID has been mapped and assigned to this model. */
    promiseInitFromHub(hubEndpoint, projectId, phenoFilters, initialLaunch, usingNewApi = true) {
        let self = this;
        // Set status
        self.inProgress.loadingDataSources = true;

        // Initialize hub data set
        let hubDataSet = new DataSetModel(self);
        hubDataSet.name = 'Hub';
        hubDataSet.entryId = 's0';
        hubDataSet.isSingleSample = false;
        self.mainDataSet = hubDataSet;
        hubDataSet.inProgress.fetchingHubData = true;
        hubDataSet.initCohorts();
        let probandCohort = hubDataSet.getProbandCohort();
        let subsetCohort = hubDataSet.getSubsetCohort();

        // Initialize hub endpoint
        self.hubEndpoint = hubEndpoint;
        self.projectId = projectId;
        self.phenoFilters = phenoFilters;

        return new Promise(function (resolve, reject) {
            // Get URLs from Hub
            self.promiseGetUrlsFromHub(projectId, initialLaunch)
                .then(function (urlObj) {
                    if (urlObj == null || urlObj.names == null || urlObj.names.length === 0) {
                        reject('Did not retrieve any matching files for given criteria');
                    }
                    // Store urls in data set model
                    hubDataSet.vcfNames = urlObj.names;
                    hubDataSet.vcfs = urlObj.vcfs;
                    hubDataSet.tbis = urlObj.tbis;

                    // Check to see if we're pulling a Simons project so that we can check blacklist genes
                    self.promiseGetProjectFromHub(self.projectId)
                        .then(function (projectObj) {
                            if (projectObj && (projectObj.name === 'SSC GRCh37 WGS' || projectObj.name === 'SSC GRCh38 WGS' || projectObj.name === 'ssc_wes.vcf.gz')) {
                                self.isSimonsProject = true;
                            }
                        });

                    // Format filter to send to Hub to get all proband IDs (via 'affected status' metric)
                    // NOTE: removed this for Utah Mosaic functionality July2020
                    // let probandFilter = self.getProbandPhenoFilter();
                    // let filterObj = {'affected_status': probandFilter};

                    // Retrieve proband sample IDs from Hub
                    let promises = [];
                    let probandP = self.promiseGetSampleIdsFromHub(self.projectId)
                        .then(function (sampleObjs) {
                            // Stop process if we don't have any probands
                            if (sampleObjs.length === 0) {
                                reject('No samples found for proband filtering from Hub');
                            }

                            // Use correct method for extracting id list
                            if (!usingNewApi && !((sampleObjs[0].id).startsWith('SS')) && hubDataSet.vcfNames[0] !== 'all.ssc_hg19.ssc_wes_3.vcf.gz') {
                                probandCohort.sampleIds = self.convertSimonsIds(sampleObjs, 'proband');
                            } else {
                                probandCohort.sampleIds = self.getRawIds(sampleObjs, usingNewApi);
                                let nonNullSampleIds = probandCohort.sampleIds.filter((id) => {
                                    return id != null;
                                });


                                // Debugging missing samples due to db updates
                                if (self.debugMode) {
                                    if (sampleObjs.length > probandCohort.sampleIds) {
                                        alert('The selected samples will not all be included in the analysis due to database updates.');
                                    }

                                    let nullSampleIds = [];
                                    sampleObjs.forEach((obj) => {
                                        let currVcf = obj.files.filter((file) => {
                                            return file.type === 'vcf';
                                        });
                                        if (currVcf.length > 0 && currVcf[0].vcf_sample_name == null) {
                                            nullSampleIds.push(currVcf[0].sample_id);
                                        }
                                    });
                                    console.log('null sample ids: ' + nullSampleIds.join('\t'));
                                }

                                if (nonNullSampleIds.length < probandCohort.sampleIds.length) {
                                    alert('The selected samples will not all be included in the analysis due to database updates.');
                                    probandCohort.sampleIds = nonNullSampleIds;
                                }
                            }
                            probandCohort.phenotypes.push('n = ' + sampleObjs.length);
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
                    // TODO: may want to put a better solution here for Utah Mosaic
                    if (!self.launchedFromMosaic()) {
                        self.appendSubsetPhenoFilters(subsetCohort);
                    }

                    // Retrieve subset sample IDs from Hub
                    let subsetP = self.promiseGetSampleIdsFromHub(self.projectId, self.phenoFilters)
                        .then(function (sampleObjs) {
                            if (sampleObjs.length > 0 && !usingNewApi && !((sampleObjs[0].id).startsWith('SS')) && hubDataSet.vcfNames[0] !== 'all.ssc_hg19.ssc_wes_3.vcf.gz') {
                                subsetCohort.sampleIds = self.convertSimonsIds(sampleObjs, 'subset', usingNewApi);
                            } else {
                                subsetCohort.sampleIds = self.getRawIds(sampleObjs, usingNewApi);
                                let nonNullSampleIds = subsetCohort.sampleIds.filter((id) => {
                                    return id != null;
                                });
                                if (nonNullSampleIds.length < subsetCohort.sampleIds.length) {
                                    subsetCohort.sampleIds = nonNullSampleIds;
                                }
                            }
                        });
                    promises.push(subsetP);

                    // Start processing data after IDs retrieved
                    Promise.all(promises)
                        .then(function () {
                            // Assign chip display numbers (on left side)
                            const descriptor = self.launchedFromMosaic() ? 'Cohort' : 'Proband';
                            subsetCohort.phenotypes.splice(0, 0, (descriptor + ' n = ' + probandCohort.sampleIds.length));
                            if (!self.launchedFromMosaic()) {
                                subsetCohort.phenotypes.splice(1, 0, ('Subset n = ' + subsetCohort.sampleIds.length));
                            }
                            hubDataSet.inProgress.fetchingHubData = false;
                            self.simonsIdMap = null;

                            // Get variant loading rolling
                            self.mainDataSet.promiseInitFromHub()
                                .then(function (idLengthObj) {
                                    let idNumList = [];
                                    idNumList.push(idLengthObj.numProbandIds);
                                    idNumList.push(idLengthObj.numSubsetIds);
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

    /* Retrieves all urls from Hub corresponding to the given project ID. Returns an object where keys are chromosome
     * and values are arrays of stably sorted vcf and tbi urls. */
    promiseGetUrlsFromHub(projectId, initialLaunch) {
        const self = this;

        return new Promise(function (resolve, reject) {
            // Stable sorted url lists
            let nameList = [],
                vcfUrlList = [],
                tbiUrlList = [];
            // Files coming back from Hub
            let vcfFiles = null,
                tbiCsiFiles = null;

            // Retrieve file objects from Hub
            self.hubEndpoint.getFilesForProject(projectId, initialLaunch).done(data => {
                // Stable sort by file type
                vcfFiles = data.data.filter(f => f.type === 'vcf');
                tbiCsiFiles = data.data.filter(f => f.type === 'tbi' || f.type === 'csi');

                // Check that we have matching data for all files
                if (vcfFiles.length !== (tbiCsiFiles.length)) {
                    reject('Did not obtain matching vcf and tbi/csi files from Hub. Data may not be complete.');
                }

                // Get urls for both vcf and tbi
                let urlPromises = [];
                for (let i = 0; i < vcfFiles.length; i++) {
                    let currVcf = vcfFiles[i];
                    let currTbi = tbiCsiFiles[i];
                    let urlP = self.promiseGetSignedUrls(currVcf, currTbi, projectId)
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
    promiseGetSignedUrls(vcf, tbi, projectId) {
        let self = this;
        return new Promise((resolve, reject) => {

            let vcfUrl = '',
                tbiUrl = '';

            let urlPromises = [];

            // Get vcf url
            let vcfP = self.promiseGetSignedUrl(projectId, vcf.id)
                .then((url) => {
                    if (url == null || url.length === 0) {
                        reject('Empty vcf url returned from hub for ' + vcf.name);
                    } else {
                        vcfUrl = url;
                    }
                });
            urlPromises.push(vcfP);

            // Get tbi url
            let tbiP = self.promiseGetSignedUrl(projectId, tbi.id)
                .then((url) => {
                    if (url == null || url.length === 0) {
                        reject('Empty tbi url returned from hub for ' + tbi.name);
                    } else {
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
    promiseGetSignedUrl(projectId, fileId) {
        let self = this;
        return new Promise((resolve, reject) => {
            self.hubEndpoint.getSignedUrlForFile(projectId, fileId).done((urlData) => {
                let url = urlData.url;
                if (url == null || url.length === 0) {
                    reject("Empty url returned from hub for " + file.name);
                } else {
                    resolve(url);
                }
            })
        })
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

    /* Wrapper to get project details from Hub.
       Used to determine if Simons project for blacklisting purposes. */
    promiseGetProjectFromHub(projectId) {
        let self = this;

        return new Promise(function (resolve, reject) {
            let t0 = performance.now();
            self.hubEndpoint.getProject(projectId)
                .done(data => {
                    let t1 = performance.now();
                    console.log('Took ' + (t1 - t0) + ' ms to get IDs from Hub');
                    resolve(data);
                })
        })
    }

    /* Adds properly formatted phenotype filters to the supplied cohort model. */
    appendSubsetPhenoFilters(subsetCohort) {
        let self = this;

        // Define if parameter mapping overwrote
        if (self.phenoFilters == null) self.phenoFilters = {};

        // Pull out filter terms passed from Hub and format for display
        if (Object.keys(self.phenoFilters).length > 0) {
            Object.keys(self.phenoFilters).forEach(function (filter) {
                if (self.phenoFilters[filter] != null && self.phenoFilters[filter].data != null) {
                    subsetCohort.phenotypes.push(self.formatPhenotypeFilterDisplay(filter, self.phenoFilters[filter].data));
                }
            })
        }

        // NOTE: removed this for Utah Mosaic functionality July2020
        // If we aren't filtering on affected status already, add a proband filter
        // Add this after setting up cohortPhenotype array to preserve 'Probands' chip displaying first
        // if (self.phenoFilters['affected_status'] == null) {
        //     self.phenoFilters['affected_status'] = probandFilter;
        // }
    }

    /* Only handles affected pie chart filter, and histogram filters */
    formatPhenotypeFilterDisplay(filter, boundsArr) {
        var self = this;

        // Affected/Unaffected filter
        if (filter === 'affected_status') {
            if (boundsArr[0] === 'Affected') {
                return 'Affected';
            } else if (boundsArr[0] === 'Unaffected') {
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

    //</editor-fold>

    //<editor-fold desc="LOCAL LAUNCH">

    /* Adds data set model and cohort models to represent a single entry in file menu. */
    promiseAddEntry(modelInfo, isSampleEntry) {
        let self = this;

        return new Promise((resolve, reject) => {
            // Set status
            self.inProgress.loadingDataSources = true;

            // Initialize local data set
            let localDataSet = new DataSetModel(self);
            localDataSet.entryId = modelInfo.id;
            localDataSet.name = modelInfo.id;
            if (modelInfo.id === 's0') {
                self.mainDataSet = localDataSet;
            } else {
                self.otherDataSets.push(localDataSet);
            }

            if (isSampleEntry) {
                localDataSet.isSingleSample = true;
                localDataSet.initSample();
            } else {
                localDataSet.isSingleSample = false;
                localDataSet.initCohorts();
                localDataSet.setExcludeIds(modelInfo.excludeSampleIds);
                localDataSet.setSubsetIds(modelInfo.subsetSampleIds);
            }
            localDataSet.addVcfEndpoint(modelInfo.id);
            resolve(localDataSet);
        });
    }

    promiseInitCustomFile(customFile) {
        return new Promise((resolve, reject) => {
            let modelInfos = [];
            const reader = new FileReader();
            reader.onload = (fileObj) => {
                let infoObj = null;
                let fileText = fileObj.target.result;
                try {
                    infoObj = JSON.parse(fileText);
                } catch (error) {
                    console.log(error);
                    resolve(null);
                }
                let entries = infoObj['entries'];
                let refBuild = infoObj['refBuild'];
                entries.forEach((entry) => {
                    let currInfo = {};
                    currInfo.id = entry.id;
                    currInfo.displayName = entry.displayName;
                    currInfo['vcfs'] = entry.vcfs;
                    currInfo['tbis'] = entry.tbis;
                    currInfo['bams'] = entry.bams;
                    currInfo['bais'] = entry.bais;
                    currInfo['samples'] = entry.samples;
                    currInfo['subsetSampleIds'] = entry.subsetSampleIds;
                    currInfo['excludeSampleIds'] = entry.excludeSampleIds;
                    currInfo['selectedSample'] = entry.selectedSample;
                    currInfo['isSampleEntry'] = entry.isSampleEntry;
                    modelInfos.push(currInfo);
                });
                let returnObj = {"infos": modelInfos, "refBuild": refBuild};
                resolve(returnObj);
            };
            reader.readAsText(customFile);
        })
    }


    /* Removes data set model and cohort models associated with the given ID from the optional other data set list. */
    removeEntry(id) {
        let self = this;

        if (self.otherDataSets.length > 0) {
            let removeIndex = -1;
            for (let i = 0; i < self.otherDataSets.length; i++) {
                if (self.otherDataSets[i].entryId === id) {
                    removeIndex = i;
                    break;
                }
            }
            self.otherDataSets.splice(removeIndex, 1);
        }
    }

    /* Removes any data set models from the optional other data set list with IDs other than the ones on the provided list. */
    removeExtraneousDataSets(validIdList) {
        let self = this;

        let removeIndices = [];
        for (let i = 0; i < self.otherDataSets.length; i++) {
            let currDataSet = self.otherDataSets[i];
            if (!validIdList.includes(currDataSet.id)) {
                removeIndices.push(i);
            }
        }
        removeIndices.forEach((index) => {
            self.otherDataSets.splice(index, 1);
        });
    }


    //</editor-fold>

    // <editor-fold desc="ALL LAUNCH">

    /* Promises to being loading process for each data set. */
    promiseLoadData(theGene, theTranscript) {
        let self = this;
        let loadedCohortVars = true;

        if (self.otherDataSets.length === 0) {
            if (self.mainDataSet.lastGeneLoaded === theGene.gene_name && self.mainDataSet.loadedVariants != null && !self.mainDataSet.entryDataChanged) {
                loadedCohortVars = false;
                return Promise.resolve(loadedCohortVars);
            } else {
                self.mainDataSet.lastGeneLoaded = theGene.gene_name;

                // Don't load Simons cohort track if gene blacklisted
                if (self.blacklistedGeneSelected && self.isSimonsProject) {
                    return Promise.resolve();
                } else {
                    return new Promise((resolve, reject) => {
                        self.mainDataSet.promiseLoadData(theGene, theTranscript)
                            .then(() => {
                                resolve(loadedCohortVars);
                            });
                    });
                }
            }
        } else {
            return new Promise((resolve, reject) => {
                let loadPromises = [];
                if (self.mainDataSet.lastGeneLoaded !== theGene.gene_name || self.mainDataSet.loadedVariants == null || self.mainDataSet.entryDataChanged
                    && !(self.blacklistedGeneSelected && self.isSimonsProject)) {
                    self.mainDataSet.lastGeneLoaded = theGene.gene_name;
                    loadPromises.push(self.mainDataSet.promiseLoadData(theGene, theTranscript));
                } else {
                    loadedCohortVars = false;
                }
                self.otherDataSets.forEach((dataSet) => {
                    if (dataSet.lastGeneLoaded !== theGene.gene_name || dataSet.loadedVariants == null || dataSet.entryDataChanged) {
                        dataSet.lastGeneLoaded = theGene.gene_name;
                        loadPromises.push(dataSet.promiseLoadData(theGene, theTranscript));
                    }
                });

                Promise.all(loadPromises)
                    .then(() => {
                        resolve(loadedCohortVars);
                    })
                    .catch((error) => {
                        reject("Error in promiseLoadData in VariantModel: " + error);
                    })
            });
        }
    }

    /* Promises to completely annotate variants for each data set. */
    promiseFullyAnnotateVariants(theGene, theTranscript, isBackground, options = {}) {
        let self = this;

        return new Promise((resolve, reject) => {
            let promises = [];
            let mapList = [];
            self.getAllCohortDataSets().forEach((dataSet) => {
                let p = dataSet.promiseFullyAnnotateVariants(theGene, theTranscript, isBackground, options)
                    .then((resultMap) => {
                        mapList.push(resultMap);
                    });
                promises.push(p);
            });
            Promise.all(promises)
                .then(() => {
                    resolve(mapList);
                })
                .catch((error) => {
                    reject(error);
                })
        });
    }

    /* Promises to identify unique variants within a single cohort or variant track. */
    promiseAnnotateUniqueVariants() {
        const self = this;

        return new Promise((resolve, reject) => {
            // Make sure we have multiple tracks
            if (self.otherDataSets.length === 0) {
                resolve();
            }

            // Determine unique variants within single sample tracks
            const mainSetIds = self.mainDataSet.loadedVarIdHash;
            self.otherDataSets.forEach((singleDataset) => {
                if (singleDataset.loadedVariants) {
                    singleDataset.loadedVariants.features.forEach((feat) => {
                        if (mainSetIds[feat.id] == null) {
                            feat.uniqueClass = 'singleUnq';
                        }
                    });
                } else {
                    reject('Could not find any variants to assign uniqueness to');
                }
            });

            // Determine unique variants within cohort sample tracks
            const allSampleSetIds = self.otherDataSets[0].loadedVarIdHash;
            for (let i = 1; i < self.otherDataSets.length; i++) {
                Object.assign(allSampleSetIds, self.otherDataSets[i].loadedVarIdHash);
            }
            if (self.mainDataSet.loadedVariants) {
                self.mainDataSet.loadedVariants.features.forEach((feat) => {
                    if (allSampleSetIds[feat.id] == null) {
                        feat.uniqueClass = 'cohUnq';
                    }
                });
            } else {
                reject('Could not find any variants to assign uniqueness to');
            }
            resolve();
        });
    }

    /* Clears any data in existing datasets. */
    clearLoadedData(geneName) {
        let self = this;
        self.getAllDataSets().forEach((dataSet) => {
            dataSet.clearLoadedData(geneName);
        })
    }


    // </editor-fold>

    //<editor-fold desc="CLINVAR">

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
        let subsetModel = self.mainDataSet.getSubsetCohort();
        let existingVariants = [];
        if (annotatedVars.length > 1) {
            existingVariants = subsetModel.loadedVariants.features;
        } else {
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

    //</editor-fold>

    //<editor-fold desc="VARIANT CLASSIFICATION & FILTERING">

    /* Assigns classes to each variant to control visual display in the DOM. */
    // classifyByEnrichment(d, annotationScheme) {
    //     var impacts = "";
    //     // var toggleImpact = "";  // Grouping classes, added & removed based on impact mode
    //     // var colorimpacts = "";  // Color classes, constant
    //     var effects = "";
    //     var sift = "";
    //     var polyphen = "";
    //     var regulatory = "";
    //     var enrichment = "";   // Grouping classes, added & removed based on impact mode
    //     var enrichColor = "";  // Color classes, constant
    //
    //     /* Still want to keep color scheme based on subset delta fold frequency for now*/
    //     var subsetEnrichment = d.subsetDelta;
    //     var roundedSubset = Math.round(d.subsetDelta * 10) / 10;
    //
    //     if (roundedSubset >= 2.0) {
    //         enrichment = "eUP";
    //         enrichColor = "enrichment_subset_UP";
    //     }
    //     else if (subsetEnrichment <= 0.5) {
    //         enrichment = "eDOWN";
    //         enrichColor = "enrichment_subset_DOWN";
    //     }
    //     else if (d.totalSubsetCount > 0) {
    //         enrichment = "eLOW";
    //         enrichColor = "enrichment_LOW";
    //     }
    //     else {
    //         enrichment = "eNA";
    //         enrichColor = "enrichment_NA";
    //     }
    //
    //     var effectList = (annotationScheme == null || annotationScheme.toLowerCase() == 'snpeff' ? d.effect : d.vepConsequence);
    //     for (var key in effectList) {
    //         if (annotationScheme.toLowerCase() == 'vep' && key.indexOf("&") > 0) {
    //             var tokens = key.split("&");
    //             tokens.forEach(function (token) {
    //                 effects += " " + token;
    //
    //             });
    //         } else {
    //             effects += " " + key;
    //         }
    //     }
    //     for (var key in d.sift) {
    //         sift += " " + key;
    //     }
    //     for (var key in d.polyphen) {
    //         polyphen += " " + key;
    //     }
    //     for (var key in d.regulatory) {
    //         regulatory += " " + key;
    //     }
    //
    //     return 'variant ' + d.type.toLowerCase() + ' ' + d.zygosity.toLowerCase() + ' ' + (d.inheritance ? d.inheritance.toLowerCase() : "")
    //         + ' ua_' + d.ua + ' ' + sift + ' ' + polyphen + ' ' + regulatory + ' ' + +' ' + d.clinvar + ' ' + impacts + ' ' + effects +
    //         ' ' + d.consensus + ' ' + enrichment + ' ' + enrichColor;
    // }

    classifyByImpact(d, annotationScheme, isEnrichmentTrack, extraAnnotationsLoaded) {
        let emptyImpact = 'impact_none';
        if (!extraAnnotationsLoaded && isEnrichmentTrack) {
            emptyImpact = 'impact_TBD';
        }

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
            colorimpacts = emptyImpact;
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

        return 'variant ' + d.type.toLowerCase() + ' ' + d.zygosity.toLowerCase() + ' '
            + (d.inheritance ? d.inheritance.toLowerCase() : "") + ' ua_' + d.ua + ' '
            + sift + ' ' + polyphen + ' ' + regulatory + ' ' + +' ' + d.clinvar + ' '
            + impacts + ' ' + effects + ' ' + d.consensus + ' ' + colorimpacts;
    }

    //</editor-fold>

    // <editor-fold desc="HELPERS">

    getDemoInfo(launchedFromHub) {
        let self = this;
        if (launchedFromHub) {
            return self.hubDemoInfo;
        } else {
            return self.demoInfo;
        }
    }

    /* Returns true if all cohorts within the data set are alignments only. */
    isAlignmentsOnly() {
        let self = this;
        return self.mainDataSet.isAlignmentsOnly();
    }

    // </editor-fold>


    //<editor-fold desc="TO BE DEPRECIATED">
    // TODO: back end will eliminate need to combine variant infos
    /* Takes in fully annotated variants, and appends existing, relative positional information from subset variants to them. Returns the first combined variant.

        Can be called by second annotation round for multiple variants coming from a single file, or multiple files. In either instance, fileList
        is a object map of file names to vcf backend models that feature lists can be extracted from.

        Can also be called by a single click on a variant prior to full annotation returning. In this case fileList is a misleading parameter name,
        as it in this case represents a single variant object. Click mode = true indicates if this is the case.

        Reassigns loadedVariants in subset CohortModel.
        Sets extraAnnotationsLoaded to true.
    */
    combineVariantInfo(fileList, clickMode) {
        let self = this;

        let fileNames = Object.keys(fileList);
        let firstInfo = Object.values(fileList)[0];
        let updatedVarLookup = {};
        let existingVariants = [];

        // If we have a single variant sent in for annotating from a pre-annotation click
        if (clickMode) {
            let varInfo = fileList[0];   // If we're combining single variant, fileList is actually a single variant info obj
            updatedVarLookup[varInfo.id] = varInfo;
            existingVariants = self.mainDataSet.loadedVariants.features.filter(feature => feature.id === varInfo.id);
        }
        // If we have multiple feature lists to combine for full variant list update
        else if (fileNames.length > 1 || (firstInfo.features && firstInfo.features.length > 1)) {
            for (let i = 0; i < fileNames.length; i++) {
                let currVars = fileList[fileNames[i]].features;
                currVars.forEach((variant) => {
                    updatedVarLookup[variant.id] = variant;
                })
            }
            if (self.mainDataSet && self.mainDataSet.loadedVariants) {
                existingVariants = self.mainDataSet.loadedVariants.features;
            } else {
                existingVariants = [];
            }
        }
        // If we have one feature list to combine for full variant list update
        else if (fileNames.length > 0) {
            // Pull out reference to single variant
            let singleVar = firstInfo.features[0];
            updatedVarLookup[singleVar.id] = singleVar;
            existingVariants = self.mainDataSet.loadedVariants.features.filter(feature => feature.id === singleVar.id);
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
                existingVar.vepREVEL = matchingVar.vepREVEL;
                existingVar.vepAf = matchingVar.vepAf;

                existingVar.highestImpactSnpeff = matchingVar.highestImpactSnpeff;
                existingVar.highestImpactVep = matchingVar.highestImpactVep;
                existingVar.highestSIFT = matchingVar.highestSIFT;
                existingVar.highestPolyphen = matchingVar.highestPolyphen;
            }
        });

        if (!clickMode) {
            self.extraAnnotationsLoaded = true;
        } else {
            return existingVariants[0];
        }
    }

    //</editor-fold>

}

export default VariantModel;