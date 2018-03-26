/* Encapsulates logic for Variant Card and Variant Summary Card */

class VariantModel {
  constructor(endpoint, genericAnnotation, translator, geneModel,
    cacheHelper, genomeBuildHelper, hubEndpoint) {

    this.dataSets = [];
    this.dataSetMap = {};    // Maps a dataset name to the dataset object

    this.endpoint = endpoint;
    this.hubEndpoint = hubEndpoint;
    this.genericAnnotation = genericAnnotation;
    this.translator = translator;
    this.geneModel = geneModel;
    //this.variantExporter = variantExporter;
    this.cacheHelper = cacheHelper;
    this.genomeBuildHelper = genomeBuildHelper;
    //this.freebayesSettings = freebayesSettings;
    this.filterModel = null;
    this.featureMatrixModel = null;

    this.annotationScheme = 'vep';
    this.isLoaded = false;
    this.maxAlleleCount = null;
    this.affectedInfo = null;
    this.maxDepth = 0;

    this.projectId = '';
    this.phenoFilters = {};
    this.keepVariantsCombined = true; // Must be true for cohorts to be displayed on a single track

    this.inProgress = { 'loadingDataSources': false };
    this.genesInProgress = [];

    this.userVcf = "https://s3.amazonaws.com/iobio/samples/vcf/platinum-exome.vcf.gz";
    this.demoGenes = ['RAI1', 'MYLK2', 'PDHA1', 'PDGFB', 'AIRE'];
  }

  getMainCohort() {
    if (Object.keys(this.dataSets).length > 0 && Object.keys(this.dataSets[0]).length > 0)
      return this.dataSets[0].cohorts[0];
    alert("no data sets or cohorts to find in getMainCohort");
  }

  // SJG TODO: could incorporate optional dataSet param here if we need specific ones
  getCohorts() {
    let self = this;
    let theCohorts = [];
    self.dataSets.forEach(function(dataSet) {
      dataSet.cohorts.forEach(function(cohort) {
        theCohorts.push(cohort);
      })
    })
    return theCohorts;
  }

  promiseInitDemo() {
    let self = this;

    var demoDataSet = new DataSetModel();
    demoDataSet.name = 'Platinum Exome';
    demoDataSet.vcfUrl = self.userVcf;

    // Set status
    self.isLoaded = false;
    self.inProgress.loadingDataSources = true;

    var allSampleModel = new CohortModel(self);
    allSampleModel.name = 'demo_all';
    allSampleModel.trackName = 'Variants for';

    // SJG TODO: MUST ADD all sample names for some reason - look into this post April
    allSampleModel.subsetIds.push('NA12877');   // Not looking at this sample for now since not in gene.iobio
    allSampleModel.subsetIds.push('NA12878');
    allSampleModel.subsetIds.push('NA12891');
    allSampleModel.subsetIds.push('NA12892');
    allSampleModel.subsetPhenotypes.push('All Probands');

    demoDataSet.cohorts.push(allSampleModel);
    demoDataSet.cohortMap[allSampleModel.name] = allSampleModel;

    var subsetModel = new CohortModel(self);
    subsetModel.name = 'demo_subset';
    subsetModel.trackName = 'Variants for';
    // Ids for platinum are NA12877, NA12878, NA12891, NA12892
    subsetModel.subsetIds.push('NA12878');
    subsetModel.subsetIds.push('NA12877');
    subsetModel.subsetPhenotypes.push('Paternal Age > 50');
    subsetModel.subsetPhenotypes.push('IQ < 80');

    demoDataSet.cohorts.push(subsetModel);
    demoDataSet.cohortMap[subsetModel.name] = subsetModel;

    self.dataSets.push(demoDataSet);
    self.dataSetMap[demoDataSet.name] = demoDataSet;

    return new Promise(function(resolve, reject) {
      let promises = [];
      demoDataSet.cohorts.forEach(function(cohort) {
        promises.push(self.promiseAddSamples(cohort, demoDataSet.vcfUrl));
      })

      Promise.all(promises)
        .then(function() {
          self.inProgress.loadingDataSources = false;
          self.isLoaded = true;
          resolve();
        })
        .catch(function(error) {
          console.log("There was a problem in variantModel.promiseInitDemo: " + error);
          reject(error);
        })
    });
  }

  promiseInitFromHub() {
    let self = this;

    // Make sure proper parameters have come in
    if (!self.projectId) {
      console.log("Unable to initialize application from hub, no project id provided");
      return;
    }

    // Set status
    self.isLoaded = false;
    self.inProgress.loadingDataSources = true;

    // Setup data set model
    var hubDataSet = new DataSetModel();
    hubDataSet.name = 'Hub_Data';

    // Setup top cohort
    var topLevelCohort = new CohortModel(self);
    topLevelCohort.name = 'Hub Data Top';
    topLevelCohort.trackName = 'Variants for';
    topLevelCohort.subsetPhenotypes = ['Probands'];
    var probandFilter = self.getProbandPhenoFilter();

    // Retrieve url and sample ids from hub
    var hubPromises = [];
    var p = self.promiseGetUrlFromHub(self.projectId)
        .then(function(url) {
          var testString = "Steph"; // SJG TODO: see what this looks like on console, may have double "" going into iobio services
          hubDataSet.vcfUrl = url;
        })
    hubPromises.push(p);

    // Get sample ids for proband track
    p = self.promiseGetSampleIdsFromHub(self.projectId, probandFilter)
        .then(function(ids) {
          topLevelCohort.subsetIds = ids;
          hubDataSet.cohorts.push(topLevelCohort);
          hubDataSet.cohortMap[topLevelCohort.name] = topLevelCohort;
        })
    hubPromises.push(p);

    // Make another track if we have phenotype filters
    if (self.phenoFilters != null) {
        // Setup subset cohort
        var subsetCohort = new CohortModel(self);
        subsetCohort.name = 'Hub Data Subset';
        subsetCohort.trackName = 'Variants for';
        subsetCohort.subsetPhenotypes = Object.keys(self.phenoFilters);

        // Get sample ids for subset track
        p = self.promiseGetSampleIdsFromHub(self.projectId, self.phenoFilters)
                .then(function(ids) {
                  subsetCohort.subsetIds = ids;
                  hubDataSet.cohorts.push(subsetCohort);
                  hubDataSet.cohortMap[subsetCohort.name] = subsetCohort;
                })
        hubPromises.push(p);
    }

    return new Promise(function(resolve, reject) {
      // Add cohorts to data set
      Promise.all(hubPromises)
        .then(function() {
          self.dataSets.push(hubDataSet);
          self.dataSetMap[hubDataSet.name] = hubDataSet;
          self.promiseInit(hubDataSet)
            .then(function() {
              resolve();
            })
        })
    });
  }

  promiseInit(dataSet) {
    let self = this;

    return new Promise(function(resolve, reject) {
      let promises = [];
      dataSet.cohorts.forEach(function(cohort) {
        promises.push(self.promiseAddSamples(cohort, dataSet.vcfUrl));
      })

      Promise.all(promises)
        .then(function() {
          self.inProgress.loadingDataSources = false;
          self.isLoaded = true;
          resolve();
        })
        .catch(function(error) {
          console.log("There was a problem in variantModel.promiseInit: " + error);
          reject(error);
        })
    });
  }

  promiseGetUrlFromHub(projectId) {
    let self = this;

    return new Promise(function(resolve, reject) {
      var url = '';
      var vcf = null;
      self.hubEndpoint.getFilesForProject(projectId).done(data => {
        vcf = data.data.filter(f => f.type == 'vcf')[0];
        self.hubEndpoint.getSignedUrlForFile(vcf).done(urlData => {
          url = urlData.url;
          if (url != null && url.length > 0) {
            resolve(url);
          }
          else {
            reject("Empty url returned from hub.");
          }
        })
      })
    });
  }

  promiseGetSampleIdsFromHub(projectId, phenoFilters) {
    let self = this;

    return new Promise(function(resolve, reject) {
      self.hubEndpoint.getSamplesForProject(projectId, phenoFilters)
          .done(data => {
            resolve(data);
          })
    })
  }

  /* Returns object with abc.total_score data between 1-200. Goal of this is to return only probands from Simons combined vcf */
  getProbandPhenoFilter() {
    let scoreObj = {
      'chartType' : "histogram",
      'data' : ["0", "200"]
    };

    let filterObj = {
      'abc.total_score' : scoreObj
    };

    return filterObj;
  }

  promiseAddSamples(cohortModel, vcfUrl) {
    let self = this;

    return new Promise(function(resolve,reject) {
      var cm = cohortModel;
      cm.init(self);

      var vcfPromise = null;
      if (cohortModel.vcf) {
        vcfPromise = new Promise(function(vcfResolve, vcfReject) {
          // SJG TODO: put in tbi here
          cm.onVcfUrlEntered(vcfUrl, null, function() {
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

  promiseAddClinvarSample() {
    alert("not implemented yet");
  }

  // SJG TODO: this is being called by tooltip annotation stuff
  setAffectedInfo() {
    alert("not implemented yet");
  }

  getCohort(cohortName) {
    // TODO: this is brute force and needs to be changed!!!
    // Really TODO super bad code
    var cohort = null;
    this.dataSets.forEach(function(dataSet) {
      if (dataSet.cohortMap[cohortName] != null) {
        cohort = dataSet.cohortMap[cohortName];
      }
    })
    return cohort;
  }

  promiseLoadData(theGene, theTranscript, options) {
    let self = this;
    let promises = [];

    return new Promise(function(resolve, reject) {
      if (Object.keys(self.dataSetMap).length == 0) {
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
            // TODO: what sample needs to go in here?
            // self.promiseSummarizeDanger(theGene, theTranscript, , null)
            // .then(function() {
            //   resolve();
            // })
        })
        .catch(function(error) {
          reject(error);
        })
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

  }

  promiseLoadKnownVariants() {

  }

  promiseLoadVariants(theGene, theTranscript, options) {
    let self = this;

    return new Promise(function(resolve, reject) {
      self.promiseAnnotateVariants(theGene, theTranscript, false, options)
      .then(function(resultMap) {
        // TODO: bookmark stuff
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


  clearLoadedData() {
    let self = this;
    self.dataSets.forEach(function(dataSet) {
      dataSet.cohorts.forEach(function(cohort) {
        cohort.loadedVariants = {loadState: {}, features: [], maxLevel: 1, featureWidth: 0};
        cohort.calledVariants = {loadState: {}, features: [], maxLevel: 1, featureWidth: 0};
        cohort.coverage = [[]];
      })
    });
  }

  clearCalledVariants() {
    alert("not implemented yet");
  }

  setLoadedVariants(gene, name=null) {
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

      var pileupObject = model._pileupVariants(filteredVariants.features, start, end);
      filteredVariants.maxLevel = pileupObject.maxLevel + 1;
      filteredVariants.featureWidth = pileupObject.featureWidth;

      return filteredVariants;
    }

    self.dataSets.forEach(function(dataSet) {
      dataSet.cohorts.forEach(function(cohort) {
        if (name == null || name == cohort.name) {
          if (cohort.vcfData && cohort.vcfData.features) {
            var start = self.filterModel.regionStart ? self.filterModel.regionStart : gene.start;
            var end   = self.filterModel.regionEnd   ? self.filterModel.regionEnd   : gene.end;

            var loadedVariants = filterAndPileupVariants(cohort, start, end, 'loaded');
            cohort.loadedVariants = loadedVariants;

            var calledVariants = filterAndPileupVariants(cohort, start, end, 'called');
            cohort.calledVariants = calledVariants;

            if (cohort.getName() == 'demo_all') {
              var allVariants = $.extend({}, cohort.loadedVariants);
              allVariants.features = cohort.loadedVariants.features.concat(cohort.calledVariants.features);
              // TODO: comment this back in after initializing featureMatrixModel
              //self.featureMatrixModel.promiseRankVariants(allVariants);
            }
          } else {
            cohort.loadedVariants = {loadState: {}, features: []};
            cohort.calledVariants = {loadState: {}, features: []}
          }
        }
      })
    })
  }

  promiseAnnotateVariants(theGene, theTranscript, isBackground, options={}) {
    let self = this;

    return new Promise(function(resolve, reject) {
      var annotatePromises = [];
      var theResultMap = {};

      // Annotate variants for every cohort model
        self.dataSets.forEach(function(dataSet) {
          if (Object.keys(dataSet.cohorts).length > 0) {
            dataSet.cohorts.forEach(function(cohortModel) {
              cohortModel.inProgress.loadingVariants = true;
              var p = cohortModel.promiseAnnotateVariants(theGene,
                  theTranscript, [cohortModel],
                  false, isBackground, self.cacheHelper, self.keepVariantsCombined)  // SJG TODO: made this instance var and pass here - can adjust if necessary
                .then(function(resultMap) {
                  cohortModel.inProgress.loadingVariants = false;
                  theResultMap = resultMap;
                  })
              annotatePromises.push(p)
            })
          }
        })

        if (options.getKnownVariants) {
          self.getModel('known-variants').inProgress.loadingVariants = true;
          p = self.sampleMap['known-variants'].model.promiseAnnotateVariants(theGene, theTranscript, false, isBackground)
          .then(function(resultMap) {
            self.getModel('known-variants').inProgress.loadingVariants = false;
            for (var rel in resultMap) {
              theResultMap[rel] = resultMap[rel];
            }
          })
          annotatePromises.push(p);
        }

        Promise.all(annotatePromises)
          .then(function() {
            self.promiseAnnotateWithClinvar(theResultMap, theGene, theTranscript, isBackground)
            .then(function(data) {
              resolve(data);
            })
          })
          .catch(function(error) {
            console.log("There was a problem in VariantModel promiseAnnotateVariants: " + error);
          })
    });
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
      for (var cohort in resultMap) {
        // SJG TODO: will this work for various numbers of data sets/ cohorts
        var vcfData = resultMap[cohort];
        if (!vcfData.loadState['clinvar'] && cohort != 'known-variants') {
         vcfData.features.forEach(function(feature) {
            uniqueVariants[formatClinvarKey(feature)] = true;
         })
        }
      }
      if (Object.keys(uniqueVariants).length == 0) {
        resolve(resultMap);
      } else {

        for (var key in uniqueVariants) {
          unionVcfData.features.push(formatClinvarThinVariant(key));
        }

        var refreshVariantsFunction = isClinvarOffline || clinvarSource == 'vcf'
          ? self.getMainCohort()._refreshVariantsWithClinvarVCFRecs.bind(self.getMainCohort(), unionVcfData)
          : self.getMainCohort()._refreshVariantsWithClinvarEutils.bind(self.getMainCohort(), unionVcfData);

        self.getMainCohort().vcf.promiseGetClinvarRecords(
            unionVcfData,
            self.getMainCohort()._stripRefName(geneObject.chr),
            geneObject,
            self.geneModel.clinvarGenes,
            refreshVariantsFunction)
        .then(function() {
            // Create a hash lookup of all clinvar variants
            var clinvarLookup = {};
            unionVcfData.features.forEach(function(variant) {
              var clinvarAnnot = {};

              for (var key in self.getMainCohort().vcf.getClinvarAnnots()) {
                  clinvarAnnot[key] = variant[key];
                  clinvarLookup[formatClinvarKey(variant)] = clinvarAnnot;
              }
            })

            var refreshPromises = [];

            // Use the clinvar variant lookup to initialize variants with clinvar annotations
            // TODO: this only has demo_all in it here
            for (var cohort in resultMap) {
              var vcfData = resultMap[cohort];
              if (!vcfData.loadState['clinvar']) {
                var p = refreshVariantsWithClinvarLookup(vcfData, clinvarLookup);
                if (!isBackground) {
                  // SJG2 - this is where vcfData gets set
                  self.getCohort(cohort).vcfData = vcfData;
                }
                //var p = getVariantCard(rel).model._promiseCacheData(vcfData, CacheHelper.VCF_DATA, vcfData.gene.gene_name, vcfData.transcript);
                refreshPromises.push(p);
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

  // TODO: LEFT OFF HERE REFACTORING THIS
  promiseAnnotateInheritance(geneObject, theTranscript, resultMap, options={isBackground: false, cacheData: true}) {
    let self = this;

    var resolveIt = function(resolve, resultMap, geneObject, theTranscript, options) {
    // TODO: incorporate
    // self.dataSets.forEach(function(dataSet) {
    //   dataSet.cohorts.forEach(function(cohort) {
    //     if (resultMap[model.getname()]) {
    //       cohort.assessVariantImpact(resultMap[cohort.getName()], theTranscript);
    //     }
    //   })
    // })

      self.promiseCacheCohortVcfData(geneObject, theTranscript, CacheHelper.VCF_DATA, resultMap, options.cacheData)
      .then(function() {
        resolve({'resultMap': resultMap, 'gene': geneObject, 'transcript': theTranscript});
      })
    }

    // SJG: exchanged 'proband' for 'mainCohort'
    return new Promise(function(resolve, reject) {
      if (self.isAlignmentsOnly() && !autocall && resultMap == null) {
          resolve({'resultMap': {'mainCohort': {features: []}}, 'gene': geneObject, 'transcript': theTranscript});
      } else {
        // TODO: this is considering a 'single' mode at the moment, not a 'trio'
        // May need to incorporate both options like before if importing trios
        resolveIt(resolve, resultMap, geneObject, theTranscript, options);
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
        self.dataSets.forEach(function(dataSet) {
          dataSet.cohorts.forEach(function(cohort) {
            if (resultMap[cohort.getName()]) {
              var p = cohort._promiseCacheData(resultMap[cohort.getName()], dataKind, geneObject.gene_name, theTranscript, self.cacheHelper);
              cachedPromises.push(p);
            }
          })
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
    // TODO: how will I adapt this?
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

  isAlignmentsOnly() {
    var theDataSets = this.dataSets.filter(function(dataSet) {
      return dataSet.isAlignmentsOnly();
    });
    return theDataSets.length == this.dataSets.length;
  }

  classifyByImpact(d, annotationScheme) {
    let self = this;
    var impacts = "";
    var colorimpacts = "";
    var effects = "";
    var sift = "";
    var polyphen = "";
    var regulatory = "";

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
    }
    if (colorimpacts == "") {
      colorimpacts = "impact_none";
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

    return  'variant ' + d.type.toLowerCase()  + ' ' + d.zygosity.toLowerCase() + ' ' + (d.inheritance ? d.inheritance.toLowerCase() : "") + ' ua_' + d.ua + ' '  + sift + ' ' + polyphen + ' ' + regulatory +  ' ' + + ' ' + d.clinvar + ' ' + impacts + ' ' + effects + ' ' + d.consensus + ' ' + colorimpacts;
  }

  classifyByClinvar(d) {
    return  'variant ' + d.type.toLowerCase()  +  ' '  + d.clinvar + ' colorby_' + d.clinvar;
  }

  _parseCalledVariants() {
    alert("not implemented yet");
  }
}

export default VariantModel;
