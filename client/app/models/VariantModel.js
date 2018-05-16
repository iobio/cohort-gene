/* Encapsulates logic for Variant Card and Variant Summary Card
   SJG & TS updated Apr2018 */

   // SJG_TIMING tag on all timing code

class VariantModel {
  constructor(endpoint, genericAnnotation, translator, geneModel,
    cacheHelper, genomeBuildHelper, hubEndpoint) {
      // SJG TODO: add the following data structures?
      // These would have to be populated in vcf.iobio.js?
      // AllVariantMap - contains every variant pulled over from Hub, with key = ?, some arbitrary, unique ID?
      // ProbandVariants: list of unique IDs corresponding to allvariantmap keys
      // SubsetVariants: list of unique Ids corresponding to allvariantMap keys
      // NonSubsetVariants: (probandvariants - subsetvariants)
      // unaffectedvariants: todo

    // Combined cohort collections
    this.combinedFeatures = {};

    // Data props
    this.dataSet = null;
    this.totalProbandCount = 0;
    this.totalSubsetCount = 0;
    this.affectedProbandCount = 0;
    this.affectedSubsetCount = 0;
    this.probandZygMap = {};
    this.subsetZygMap = {};

    // Single helper classes
    this.endpoint = endpoint;
    this.hubEndpoint = hubEndpoint;
    this.genericAnnotation = genericAnnotation;
    this.translator = translator;
    this.geneModel = geneModel;
    this.cacheHelper = cacheHelper;
    this.genomeBuildHelper = genomeBuildHelper;
    this.filterModel = null;
    this.featureMatrixModel = null;

    // Settings/ state props
    this.annotationScheme = 'vep';
    this.isLoaded = false;
    this.maxAlleleCount = null;
    this.affectedInfo = null;
    this.maxDepth = 0;
    this.keepVariantsCombined = true;       // True for multiple samples to be displayed on single track
    this.inProgress = { 'loadingDataSources': false };
    this.genesInProgress = [];
    this.hubIssue = false;
    this.iobioServicesIssue = false;

    // Hub-specific props
    this.projectId = '';                    // Hub project ID if we're sourcing data from there
    this.phenoFilters = {};                 // Hub filters applied to samples
    this.simonsIdMap = {};                  // Lookup table to convert Hub VCF IDs to Simons IDs

    // Demo data
    this.userVcf = "https://s3.amazonaws.com/iobio/samples/vcf/platinum-exome.vcf.gz";
    this.demoGenes = ['RAI1', 'MYLK2', 'PDHA1', 'PDGFB', 'AIRE'];
  }

  /* Setter for simons ID map. */
  setIdMap(idMap) {
    let self = this;
    self.simonsIdMap = idMap;
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
  promiseInitFromHub() {
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
    //subsetCohort.subsetPhenotypes.push('Subsets');
    hubDataSet.addCohort(subsetCohort, SUBSET_ID);

    // SJG_TIMING
    let t0 = 0;
    let t1 = 0;

    // Retrieve urls from hub
    return new Promise(function(resolve, reject) {
      t0 = performance.now(); // SJG_TIMING

      // Get URLs from Hub
      self.promiseGetUrlsFromHub(self.projectId)
        .then(function(dataSet) {
          t1 = performance.now(); // SJG_TIMING
          console.log('It took ' + (t1-t0) + ' ms to get Hub urls');
          if (dataSet == null) {
            let currCohorts = self.dataSet.getCohorts();
            if (currCohorts != undefined && currCohorts.length > 0) {
                currCohorts.forEach(function(cohort) {
                  cohort.inProgress.fetchingHubData = false;
                })
            }
            self.hubIssue = true;
            reject();
          }
          console.log("Obtained data routing from Hub...");
          hubDataSet.vcfUrl = dataSet.vcfUrl;
          hubDataSet.tbiUrl = dataSet.tbiUrl;

          // Format filter to send to Hub to get all proband IDs
          var probandFilter = self.getProbandPhenoFilter();
          var filterObj = {'abc.total_score' : probandFilter};

          // Retrieve proband sample IDs from Hub
          let promises = [];
          let probandP = self.promiseGetSampleIdsFromHub(self.projectId, filterObj)
              .then(function(ids) {
                if (ids == null || ids.length == 0) {
                  let currCohorts = self.dataSet.getCohorts();
                  if (currCohorts != undefined && currCohorts.length > 0) {
                    currCohorts.forEach(function(cohort) {
                      cohort.inProgress.fetchingHubData = false;
                    })
                    self.hubIssue = true;
                    reject();
                  }
                }
                console.log("Obtained proband IDs from Hub...");
                probandCohort.subsetIds = ids;
                probandCohort.subsetPhenotypes.push('n = ' + ids.length);
              });
            promises.push(probandP);

            // Retrieve subset sample IDs from Hub
            self.assignPhenoFilters(subsetCohort, probandFilter);
            let subsetP = self.promiseGetSampleIdsFromHub(self.projectId, self.phenoFilters)
                  .then(function(ids) {
                    if (ids != null && ids.length > 0) {
                      console.log("Obtained susbset IDs from Hub...");
                      subsetCohort.subsetIds = ids;
                      subsetCohort.subsetPhenotypes.splice(0, 0, ('Proband n = ' + probandCohort.subsetIds.length));
                      subsetCohort.subsetPhenotypes.splice(1, 0, ('Subset n = ' + ids.length));
                    }
                    else {
                      let currCohorts = self.dataSet.getCohorts();
                      if (currCohorts != undefined && currCohorts.length > 0) {
                        currCohorts.forEach(function(cohort) {
                          cohort.inProgress.fetchingHubData = false;
                          self.hubIssue = true;
                          reject();
                        })
                      }
                    }
                  });
            promises.push(subsetP);

            // Start processing data after IDs retrieved
            Promise.all(promises)
              .then(function() {
                self.promiseInit()
                    .then(function() {
                      // Update loading flags
                      let currCohorts = self.dataSet.getCohorts();
                      if (currCohorts != undefined && currCohorts.length > 0) {
                          currCohorts.forEach(function(cohort) {
                            cohort.inProgress.fetchingHubData = false;
                          })
                        }
                      resolve();
                    })
              })
        })
        .catch(function(error) {
          console.log("There was a problem obtaining data from Hub.");
          self.hubIssue = true;
          reject(error);
        })
    });
  }

  /* Wrapper to retrieve vcf & tbi urls from Hub. */
  promiseGetUrlsFromHub(projectId) {
    let self = this;

    return new Promise(function(resolve, reject) {
      var vcfUrl = '',
          tbiUrl = '';
      var vcf = null,
          tbi = null;
      self.hubEndpoint.getFilesForProject(projectId).done(data => {
        vcf = data.data.filter(f => f.type == 'vcf')[0];
        tbi = data.data.filter(f => f.type == 'tbi')[0];
        self.hubEndpoint.getSignedUrlForFile(vcf).done(urlData => {
          vcfUrl = urlData.url;
          if (vcfUrl == null || vcfUrl.length == 0) {
            reject("Empty vcf url returned from hub.");
          }
          self.hubEndpoint.getSignedUrlForFile(tbi).done(urlData => {
            tbiUrl = urlData.url;
            if (tbiUrl == null || tbiUrl.length == 0) {
              reject("Empty tbi url returned from hub.");
            }
            else {
              resolve({'vcfUrl' : vcfUrl, 'tbiUrl' : tbiUrl});
            }
          })
        })
      })
    });
  }

  /* Wrapper to retrieve sample IDs from Hub. */
  promiseGetSampleIdsFromHub(projectId, phenoFilters) {
    let self = this;

    return new Promise(function(resolve, reject) {
      let t0 = performance.now();
      self.hubEndpoint.getSamplesForProject(projectId, phenoFilters)
          .done(data => {
            let t1 = performance.now();
            console.log('Took ' + (t1-t0) + ' ms to get IDs from Hub');
            resolve(data);
          })
    })
  }

  /* Adds properly formatted phenotype filters to the supplied cohort model. */
  assignPhenoFilters(subsetCohort, probandFilter) {
    let self = this;

    // Define if parameter mapping overwrote
    if (self.phenoFilters == null) self.phenoFilters = {};

    // Remove affected/unaffected filter if applied - currently breaks Hub retrieval AND we're only currently dealing w/ affecteds
    if (self.phenoFilters['affection_status'] != null) {
      var filteredPhenoFilters = {};
      Object.keys(self.phenoFilters).forEach(function(filter) {
        if (filter != 'affection_status')
          filteredPhenoFilters[filter] = self.phenoFilters[filter];
      })
      self.phenoFilters = filteredPhenoFilters;
    }

    // Flag to add proband filter
    var hasAbcTotalScore = false;

    // Pull out filter terms passed from Hub and format for display
    if (Object.keys(self.phenoFilters).length > 0) {
      Object.keys(self.phenoFilters).forEach(function(filter) {
        if (self.phenoFilters[filter] != null && self.phenoFilters[filter].data != null) {
          if (filter == 'abc.total_score') hasAbcTotalScore = true;
          subsetCohort.subsetPhenotypes.push(
            self.formatPhenotypeFilterDisplay(filter, self.phenoFilters[filter].data));
        }
      })
    }

    // If we aren't filtering on abc total score already, add a proband filter
    // Add this after setting up subsetPhenotype array to preserve 'Probands' chip displaying first
    if (!hasAbcTotalScore) {
      self.phenoFilters['abc.total_score'] = probandFilter;
    }
  }

  /* Only handles affected pie chart filter, and histogram filters */
  formatPhenotypeFilterDisplay(filter, boundsArr) {
    var self = this;

    // Affected/Unaffected filter
    if (filter == 'affection_status') {
      if (boundsArr[0] == 'Affected') { return 'Affected'; }
      else if (boundsArr[0] == 'Unaffected') { return 'Unaffected'; }
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
      'chartType' : "histogram",
      'data' : ["1", "150"]
    };
    return filterObj;
  }

  /* Returns promise to add samples from the urls assigned to this data set. */
  promiseInit() {
    let self = this;

    return new Promise(function(resolve, reject) {
      let cohorts = self.dataSet.getCohorts();
      cohorts.forEach(function(cohort) {
        self.promiseAddSamples(cohort, self.dataSet.vcfUrl, self.dataSet.tbiUrl)
          .then(function() {
            self.inProgress.loadingDataSources = false;
            self.isLoaded = true;
            resolve();
          })
          .catch(function(error) {
            console.log("There was a problem initializing in VariantModel " + error);
            reject(error);
          })
      })
    });
  }

  /* Finishes setting up cohort models, promises to verify the vcf url. */
  promiseAddSamples(cohortModel, vcfUrl, tbiUrl) {
    let self = this;

    return new Promise(function(resolve,reject) {
      var cm = cohortModel;
      cm.init(self);

      var vcfPromise = null;
      if (cohortModel.vcf) {
        vcfPromise = new Promise(function(vcfResolve, vcfReject) {
          cm.onVcfUrlEntered(vcfUrl, tbiUrl, function() {
            vcfResolve();
          })
        },
        function(error) {
          vcfReject(error);
        });
      } else {
        vcfPromise = Promise.resolve();
      }

      Promise.all([vcfPromise])
      .then(function() {
        resolve();
      })
    })
  }

  /* Promises to load variants for the selected gene.
     Returns a map of annotated variant data. */
  promiseLoadData(theGene, theTranscript, options) {
    let self = this;
    let promises = [];

    return new Promise(function(resolve, reject) {
      if (self.dataSet == null) {
        resolve();
      } else {
        // Load variants
        self.startGeneProgress(theGene.gene_name);
        self.clearLoadedData();

        var dataSetResultMap = null;
        let p1 = self.promiseLoadVariants(theGene, theTranscript, options)
        .then(function(data) {
          dataSetResultMap = data.resultMap;
          self.setLoadedVariants(data.gene);
        })
        promises.push(p1);

        Promise.all(promises)
        .then(function() {
          resolve(dataSetResultMap);
        })
        .catch(function(error) {
          console.log('There was a problem loading the data in VariantModel.')
          reject(error);
        })
      }
    })
  }

  /* Promises to annotate variants and returns a map of annotated variant data. */
  promiseLoadVariants(theGene, theTranscript, options) {
    let self = this;

    return new Promise(function(resolve, reject) {
      self.promiseAnnotateVariants(theGene, theTranscript, false, options)
      .then(function(resultMap) {
        return self.promiseAnnotateInheritance(theGene, theTranscript, resultMap, {isBackground: false, cacheData: true})
      })
      .then(function(data) {
        resolve(data);
      })
      .catch(function(error) {
        reject(error);
      })
    })
  }

  /* Promises to annotate variants in each cohort model.
     Updates cohort loading status as appropriate. */
  promiseAnnotateVariants(theGene, theTranscript, isBackground, options={}) {
    let self = this;

    return new Promise(function(resolve, reject) {
      var annotatePromises = [];
      var resultMapList = [];

    // Annotate variants for cohort models that have specified IDs
      if (self.dataSet.getCohorts().length > 0) {
        self.dataSet.getCohorts().forEach(function(cohortModel) {
          cohortModel.inProgress.loadingVariants = true;

          // Only get variants if we have specific samples to look at
          if (cohortModel.subsetIds.length > 0) {
            var p = cohortModel.promiseAnnotateVariants(theGene,
                theTranscript, [cohortModel],
                false, isBackground, self.keepVariantsCombined)
              .then(function(resultMap) {
                cohortModel.inProgress.loadingVariants = false;
                cohortModel.inProgress.drawingVariants = true;
                resultMapList.push(resultMap);
                })
            annotatePromises.push(p)
          }
          else {
            cohortModel.inProgress.loadingVariants = false;
            cohortModel.noMatchingSamples = true;
          }
        })
      }
      Promise.all(annotatePromises)
        .then(function() {
          let t0 = performance.now(); // SJG_TIMING
          self.annotateDataSetFrequencies(resultMapList);
          let t1 = performance.now(); // SJG_TIMING
          console.log('Took ' + (t1-t0) + ' ms to annotate data set frequencies');  // SJG_TIMING
          if (self.mergeCohortVariants) {
            resultMapList = self.combineCohortVariants(resultMapList);
          }
          resolve(resultMapList);
          // SJG_P3 removing clinvar annotation at first on the whole
          // self.promiseAnnotateWithClinvar(resultMapList, theGene, theTranscript, isBackground)
          // .then(function(data) {
          //   resolve(data);
          // })
        })
        .catch(function(error) {
          console.log("There was a problem in VariantModel promiseAnnotateVariants: " + error);
        })
    });
  }

  promiseAnnotateInheritance(geneObject, theTranscript, resultMap, options={isBackground: false, cacheData: true}) {
    let self = this;

    var resolveIt = function(resolve, resultMap, geneObject, theTranscript, options) {
    // SJG TODO: incorporate assessVariantImpact
      self.promiseCacheCohortVcfData(geneObject, theTranscript, CacheHelper.VCF_DATA, resultMap, options.cacheData)
      .then(function() {
        resolve({'resultMap': resultMap, 'gene': geneObject, 'transcript': theTranscript});
      })
    }

    return new Promise(function(resolve, reject) {
      if (self.isAlignmentsOnly() && !autocall && resultMap == null) {
          resolve({'resultMap': { PROBAND_ID: {features: []}}, 'gene': geneObject, 'transcript': theTranscript});
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
    if (self.dataSet != null) {
      self.dataSet.getCohorts().forEach(function(cohort) {
        cohort.loadedVariants = {loadState: {}, features: [], maxPosLevel: 0, maxNegLevel: 0, maxSubLevel: 0, featureWidth: 0};
        cohort.calledVariants = {loadState: {}, features: [], maxPosLevel: 0, maxNegLevel: 0, maxSubLevel: 0, featureWidth: 0};
        cohort.coverage = [[]];
        cohort.noMatchingSamples = false;
      })
    }
  }

  clearCalledVariants() {
    alert("not implemented yet");
  }

  /* Filters out homozygous ref variants for each cohort. Initializes pileup rendering of variants. */
  setLoadedVariants(gene, name=null) {
    var t0 = 0; // SJG_TIMING
    var t1 = 0; // SJG_TIMING
    let self = this;

    var filterAndPileupVariants = function(model, start, end, target='loaded') {
      var filteredVariants = $.extend({}, model.vcfData);
      filteredVariants.features = model.vcfData.features.filter(function(feature) {

        var isTarget = false;
        if (target == 'loaded' && (!feature.fbCalled || feature.fbCalled != 'Y')) {
          isTarget = true;
        } else if (target == 'called' && feature.fbCalled && feature.fbCalled == 'Y') {
          isTarget = true;
        }

        var isHomRef = feature.zygosity == null
           || feature.zygosity.toUpperCase() == "HOMREF"
           || feature.zygosity.toUpperCase() == "NONE"
           || feature.zygosity == "";

        var inRegion = true;
        if (self.filterModel.regionStart && self.filterModel.regionEnd) {
          inRegion = feature.start >= self.filterModel.regionStart && feature.start <= self.filterModel.regionEnd;
        }
        var passesModelFilter = self.filterModel.passesModelFilter(model.name, feature);

        return isTarget && !isHomRef && inRegion && passesModelFilter;
      });

      // SJG_P2 NOTE change this depending on double mode
      var pileupObject = model._pileupVariants(filteredVariants.features, start, end);
      filteredVariants.maxPosLevel = pileupObject.maxPosLevel;
      filteredVariants.maxNegLevel = pileupObject.maxNegLevel;
      filteredVariants.maxSubLevel = pileupObject.maxSubLevel;
      filteredVariants.featureWidth = pileupObject.featureWidth;

      return filteredVariants;
    }

    self.dataSet.getCohorts().forEach(function(cohort) {
      if (name == null || name == cohort.name) {
        if (cohort.vcfData && cohort.vcfData.features) {
          var start = self.filterModel.regionStart ? self.filterModel.regionStart : gene.start;
          var end   = self.filterModel.regionEnd   ? self.filterModel.regionEnd   : gene.end;

          // SJG_P2 filtering out all non-enriched variants for now TODO: fix when get handle on bidirectional rendering
           // if (cohort.getName() == PROBAND_ID)
           //   cohort.vcfData.features = self.filterProbandsByDelta(cohort.vcfData.features);

          t0 = performance.now(); // SJG_TIMING
          var loadedVariants = filterAndPileupVariants(cohort, start, end, 'loaded');
          t1 = performance.now(); // SJG_TIMING
          //console.log('Took ' + (t1-t0) + ' ms to filter and pileup variants'); // SJG_TIMING
          cohort.loadedVariants = loadedVariants;

          var calledVariants = filterAndPileupVariants(cohort, start, end, 'called');
          cohort.calledVariants = calledVariants;

          if (cohort.getName() == PROBAND_ID) {
            var allVariants = $.extend({}, cohort.loadedVariants);
            allVariants.features = cohort.loadedVariants.features.concat(cohort.calledVariants.features);
            // TODO: incorporate with featureMatrixModel
            //self.featureMatrixModel.promiseRankVariants(allVariants);
          }
        } else {
          cohort.loadedVariants = {loadState: {}, features: []};
          cohort.calledVariants = {loadState: {}, features: []}
        }
      }
    })
  }

  /* Assigns cohort-relative statistics to each variant.
     Used to populate Summary Card graphs when clicking on a variant. */
  annotateDataSetFrequencies(resultMapList) {
    let self = this;
    if (resultMapList == null || resultMapList.length == 0) return;   // Avoid console output on initial lode call

    var probandFeatures = null;
    var subsetFeatures = null;
    try {
      // Pull out features
      let probandId = (resultMapList[0])[PROBAND_ID] == undefined ? 1 : 0;
      let subsetId = probandId == 0 ? 1 : 0;
      probandFeatures = (resultMapList[probandId])[PROBAND_ID].features;
      subsetFeatures = (resultMapList[subsetId])[SUBSET_ID].features;

      // Update features with enrichment info
      self.assignCrossCohortInfo(probandFeatures, subsetFeatures);

      // Do proband only features have subset total numbers? YES
      (resultMapList[probandId])[PROBAND_ID].features = probandFeatures;
      (resultMapList[subsetId])[SUBSET_ID].features = subsetFeatures;
    }
    catch(e) {
      console.log("There was a problem pulling out features from the result map in annotateDataSetFrequencies. Unable to assign enrichment colors.");
    }
  }

  /* Assigns both a delta value representing subset enrichment, and total sample zygosities, to each variant.
     Used to populate Summary Card information when a variant is clicked on, and for visual variant rendering. */
  assignCrossCohortInfo(probandFeatures, subsetFeatures) {
    // Put proband features into a lookup
    let probandLookup = {};
    probandFeatures.forEach(function(feature) {
      probandLookup[feature.id] = feature;
    })

    // Iterate through subset
    subsetFeatures.forEach(function(feature) {
      // Get corresponding proband feature
      let matchingProbandFeature = probandLookup[feature.id];

      // Assign subset metrics to cohort feature
      matchingProbandFeature.totalSubsetCount = feature.totalSubsetCount;
      matchingProbandFeature.affectedSubsetCount = feature.affectedSubsetCount;
      matchingProbandFeature.subsetZygCounts = feature.subsetZygCounts;

      // Assign proband metrics to subset feature
      feature.totalProbandCount = matchingProbandFeature.totalProbandCount;
      feature.affectedProbandCount = matchingProbandFeature.affectedProbandCount;   // SJG TODO: sometimes this is getting assigned to 0 - why?
      feature.probandZygCounts = matchingProbandFeature.probandZygCounts;

      // Compute delta and assign to both
      let subsetPercentage = feature.totalSubsetCount == 0 ? 0 : feature.affectedSubsetCount / feature.totalSubsetCount * 100;  // Can be 0
      let probandPercentage = feature.affectedProbandCount / feature.totalProbandCount * 100; // Can never be 0
      let foldEnrichment = subsetPercentage == 0 ? 1 : subsetPercentage / probandPercentage;
      feature.subsetDelta = foldEnrichment;
      matchingProbandFeature.subsetDelta = foldEnrichment;
    })
  }

  filterProbandsByDelta(features) {
    let filteredProbandFeatures = [];
    features.forEach(function(feature) {
      if (feature.subsetDelta <= 0.5 || feature.subsetDelta >= 2) {
        filteredProbandFeatures.push(feature);
      }
    })
    return filteredProbandFeatures;
  }

  promiseAnnotateWithClinvar(resultMap, geneObject, transcript, isBackground) {
    let self = this;
    var formatClinvarKey = function(variant) {
      var delim = '^^';
      return variant.chrom + delim + variant.ref + delim + variant.alt + delim + variant.start + delim + variant.end;
    }

    var formatClinvarThinVariant = function(key) {
      var delim = '^^';
      var tokens = key.split(delim);
      return {'chrom': tokens[0], 'ref': tokens[1], 'alt': tokens[2], 'start': tokens[3], 'end': tokens[4]};
    }

    var refreshVariantsWithClinvarLookup = function(theVcfData, clinvarLookup) {
      theVcfData.features.forEach(function(variant) {
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

    return new Promise(function(resolve, reject) {
      // Combine the trio variants into one set of variants so that we can access clinvar once
      // instead of on a per sample basis
      var uniqueVariants = {};
      var unionVcfData = {features: []}
      for (var cohort in resultMap) {       // SJG TODO: this is an overly complicated loop that can be simplified if data being pulled back is reformatted
        for (var key in resultMap[cohort]) {
          if (Object.prototype.hasOwnProperty.call(resultMap[cohort], key)) {
            var vcfData = resultMap[cohort][key];
            if (!vcfData.loadState['clinvar'] && cohort != 'known-variants') {
             vcfData.features.forEach(function(feature) {
                uniqueVariants[formatClinvarKey(feature)] = true;
             })
            }
          }
        }
      }
      if (Object.keys(uniqueVariants).length == 0) {
        resolve(resultMap);
      } else {

        for (var key in uniqueVariants) {
          unionVcfData.features.push(formatClinvarThinVariant(key));
        }

        var refreshVariantsFunction = isClinvarOffline || clinvarSource == 'vcf'
          ? self.dataSet.getProbandCohort()._refreshVariantsWithClinvarVCFRecs.bind(self.dataSet.getProbandCohort(), unionVcfData)
          : self.dataSet.getProbandCohort()._refreshVariantsWithClinvarEutils.bind(self.dataSet.getProbandCohort(), unionVcfData);

        self.dataSet.getProbandCohort().vcf.promiseGetClinvarRecords(
            unionVcfData,
            self.dataSet.getProbandCohort()._stripRefName(geneObject.chr),
            geneObject,
            self.geneModel.clinvarGenes,
            refreshVariantsFunction)
        .then(function() {
            // Create a hash lookup of all clinvar variants
            var clinvarLookup = {};
            unionVcfData.features.forEach(function(variant) {
              var clinvarAnnot = {};

              for (var key in self.dataSet.getProbandCohort().vcf.getClinvarAnnots()) {
                  clinvarAnnot[key] = variant[key];
                  clinvarLookup[formatClinvarKey(variant)] = clinvarAnnot;
              }
            })

            var refreshPromises = [];

            // Use the clinvar variant lookup to initialize variants with clinvar annotations
            for (var cohort in resultMap) {
              for (var key in resultMap[cohort]) {
                if (Object.prototype.hasOwnProperty.call(resultMap[cohort], key)) {
                  var vcfData = resultMap[cohort][key];
                  if (!vcfData.loadState['clinvar']) {
                    var p = refreshVariantsWithClinvarLookup(vcfData, clinvarLookup);
                    if (!isBackground) {
                      self.dataSet.getCohort(key).vcfData = vcfData;
                    }
                    //var p = getVariantCard(rel).model._promiseCacheData(vcfData, CacheHelper.VCF_DATA, vcfData.gene.gene_name, vcfData.transcript);
                    refreshPromises.push(p);
                  }
                }
              }
            }

            Promise.all(refreshPromises)
            .then(function() {
              resolve(resultMap);
            })
            .catch(function(error) {
              reject(error);
            })
        })
      }
    })
  }


  promiseCacheCohortVcfData(geneObject, theTranscript, dataKind, resultMap, cacheIt) {
    let self = this;
    return new Promise(function(resolve, reject) {
      // Cache vcf data for trio
      var cachePromise = null;
      if (cacheIt) {
        var cachedPromises = [];
        self.dataSet.getCohorts().forEach(function(cohort) {
          if (resultMap[cohort.getName()]) {
            var p = cohort._promiseCacheData(resultMap[cohort.getName()], dataKind, geneObject.gene_name, theTranscript, self.cacheHelper);
            cachedPromises.push(p);
          }
        })
        Promise.all(cachedPromises).then(function() {
          resolve();
        })
      } else {
        resolve();
      }
    })
  }

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
  classifyByImpactEnrichment(d, annotationScheme, isSubset) {
    let self = this;
    var impacts = "";
    var toggleImpact = "";  // Grouping classes, added & removed based on impact mode
    var colorimpacts = "";  // Color classes, constant
    var effects = "";
    var sift = "";
    var polyphen = "";
    var regulatory = "";
    var enrichment = "";   // Grouping classes, added & removed based on impact mode
    var enrichColor = "";  // Color classes, constant

    var subsetEnrichment = d.subsetDelta;
    var roundedSubset = Math.round(d.subsetDelta * 10) / 10;

    if (roundedSubset >= 2.0 && isSubset) {
      enrichment = "eUP";
      enrichColor = "enrichment_subset_UP";
    }
    else if (subsetEnrichment <= 0.5 && isSubset) {
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
          tokens.forEach( function(token) {
          effects += " " + token;

          });
      } else {
        effects += " " + key;
      }
    }
    var impactList =  (annotationScheme == null || annotationScheme.toLowerCase() == 'snpeff' ? d.impact : d[IMPACT_FIELD_TO_FILTER]);
    for (var key in impactList) {
      impacts += " " + key;
    }
    var colorImpactList =  (annotationScheme == null || annotationScheme.toLowerCase() == 'snpeff' ? d.impact : d[IMPACT_FIELD_TO_COLOR]);
    for (var key in colorImpactList) {
      colorimpacts += " " + 'impact_'+key;
      toggleImpact += " " + 'i' + key;
    }
    if (colorimpacts == "") {
      colorimpacts = "impact_none";
      toggleImpact += "iNONE";
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

    return  'variant ' + d.type.toLowerCase()  + ' ' + d.zygosity.toLowerCase() + ' ' + (d.inheritance ? d.inheritance.toLowerCase() : "")
            + ' ua_' + d.ua + ' '  + sift + ' ' + polyphen + ' ' + regulatory +  ' ' + + ' ' + d.clinvar + ' ' + impacts + ' ' + effects +
            ' ' + d.consensus + ' ' + colorimpacts + ' ' + toggleImpact + ' ' + enrichment + ' ' + enrichColor;
  }

  classifyByClinvar(d) {
    return  'variant ' + d.type.toLowerCase()  +  ' '  + d.clinvar + ' colorby_' + d.clinvar;
  }

  _parseCalledVariants() {
    alert("not implemented yet");
  }
}

export default VariantModel;
