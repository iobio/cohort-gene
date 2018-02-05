/* Encapsulates back-end functionality relative to Sfari data */

class SfariModel {
  constructor(endpoint, genericAnnotation, translator, geneModel, cacheHelper, genomeBuildHelper) {
    this.endpoint = endpoint;                     // Enpoint for coordinating tool calls
    this.genericAnnotation = genericAnnotation;   // TODO: what is this
    this.translator = translator;                 // TODO: what is this
    this.geneModel = geneModel;                   // Encapuslates selected gene info
    this.cacheHelper = cacheHelper;               // Coordinates cache management
    this.genomeBuildHelper = genomeBuildHelper;   // TODO: what is this
    this.annotationScheme = 'vep';                // TODO: what is this

    this.sampleModels = [];                       // List of models, one per sample (2k+)
    this.sampleMap = {};                          // Lookup table mapping sample name to model; use to pull out subset models
    this.combinedModel = null;                    // A single sample model representing combined data of all sfari isSampleSelected
    this.subsetModel = null;                      // A single sample model representing the combined data of phenotypically filtered data sfari samples

    this.maxAlleleCount = null;                   // TODO: what is this
    this.affectedInfo = null;                     // TODO: what is this
    this.maxDepth = 0;                            // TODO: what is this
    this.havePhenoSubset = true;                  // Returns true if we have a subset cohort
    this.maxAlleleCount = null;
    this.affectedInfo = null;
    this.maxDepth = 0;
    // TODO: put dummy info in to test

    this.allInProgress = {
      'loadingVariants': false,
      'callingVariants': false,
      'loadingCoverage': false
    };
    this.subsetInProgress = {
      'loadingVariants': false,
      'callingVariants': false,
      'loadingCoverage': false
    };

  }

  /*** GETTERS ***/
  getModelByName(name) {
    return this.sampleMap[name].model;
  }

  getFirstModel() {
    if (this.sampleModels.length > 0) {
      return this.sampleModels[0];
    }
    return new SampleModel();
  }

  getCombinedModel() {
    return combinedModel;
  }

  getSubsetModel() {
    return subsetModel;
  }

  /*** SETTERS ***/
  /* Retrieves variant information and sets in backing models */
  setLoadedVariants(theGene, regionStart, regionEnd) {
    let self = this;
    self.sampleModels.forEach(function(model) {
      if (model.vcfData && model.vcfData.features) {
        var loadedVariants = $.extend({}, model.vcfData);
        loadedVariants.features = model.vcfData.features.filter( function(feature) {
          var loaded = feature.fbCalled == null;
          var inRegion = true;
          if (regionStart && regionEnd) {
            inRegion = feature.start >= regionStart && feature.start <= regionEnd;
          }
          return loaded && inRegion;
        });
        var pileupObject = model._pileupVariants(loadedVariants.features, theGene.start, theGene.end);
        loadedVariants.maxLevel = pileupObject.maxLevel + 1;
        loadedVariants.featureWidth = pileupObject.featureWidth;
        model.loadedVariants = loadedVariants;
      } else {
        model.loadedVariants = {loadState: {}, features: []};
      }
    })
  }

  /* Retrieves coverage information and sets in backing models */
  setCoverage() {
    let self = this;
    self.getCanonicalModels().forEach(function(model) {
      if (model.bamData) {
        model.coverage = model.bamData.coverage;
        if (model.coverage) {
          var max = d3.max(model.coverage, function(d,i) { return d[1]});
          if (max > self.maxDepth) {
            self.maxDepth = max;
          }
        }
      }
    })
  }

  /*** Whole Data Retrieval ***/
  /* Promises to load in demo data from 1000g */
  promiseInitDemo() {
    let self = this;
    // var modelInfos = [
    //   {relationship: 'proband', 'sample': 'NA12878', 'vcf': self.demoVcf, 'bam': self.demoBams['proband'] },
    //   {relationship: 'mother',  'sample': 'NA12892', 'vcf': self.demoVcf, 'bam': self.demoBams['mother'] },
    //   {relationship: 'father',  'sample': 'NA12891', 'vcf': self.demoVcf, 'bam': self.demoBams['father'] },
    // ];
    // TODO: plug in 20-ish samples from 1000g - look up API for interacting w/ this data
    // TODO: don't think I need relationship field in map
    return self.promiseInit(modelInfos);
  }

  /* Promises to load all sample info in the provided modelInfos map */
  promiseInit(modelInfos) {
    let self = this;

    // Return promise object
    return new Promise(function(resolve, reject) {
      self.isLoaded = false;
      self.inProgress.loadingDataSources = true;
      self.sampleModels = [];
      self.mode = modelInfos.length > 1 ? 'trio': 'single';

      // For each model info passed in (here pro, mom, dad), promise to add it
      let promises = [];
      modelInfos.forEach(function(modelInfo) {
        promises.push(self.promiseAddSample(modelInfo));
      })
      // TODO: Do I need to add clinVar sample?
      //promises.push(self.promiseAddClinvarSample());

      // Returns a single promise when all promises in parameter resolved or when first sub-promise is rejected
      Promise.all(promises)
      .then(function() {
        self.setAffectedInfo();
        self.inProgress.loadingDataSources = false;
        self.isLoaded = true;
        // Don't need to sort sample models because they'll all be combined into a single track display
        //self.sortSampleModels();
        resolve();
      })
      .catch(function(error) {
        reject(error);
      })
    })
  }

  /* Loads each sample's vcf/bam info via SampleModel.js, and adds model to this list */
  promiseAddSample(modelInfo) {
    let self = this;

    return new Promise(function(resolve,reject) {

      // Create new model and set shared properties
      var vm = new SampleModel();
      vm.init(self);
      vm.setRelationship(modelInfo.relationship);

      // Asks sample model to load vcf if there's data in vcf field
      var vcfPromise = null;
      if (modelInfo.vcf) {
        vcfPromise = new Promise(function(vcfResolve, vcfReject) {
          vm.onVcfUrlEntered(modelInfo.vcf, modelInfo.tbi, function() {
            vm.setSampleName(modelInfo.sample);
            vm.setName(modelInfo.relationship + " " + modelInfo.sample)
            vcfResolve();
          })
        },
        function(error) {
          vcfReject(error);
        });
      } else {
        vcfPromise = Promise.resolve();
      }

      // Asks sample model to load bam if there's data in bam field
      var bamPromise = null;
      if (modelInfo.bam) {
        bamPromise = new Promise(function(bamResolve, bamReject) {
          vm.onBamUrlEntered(modelInfo.bam, modelInfo.bai, function() {
            bamResolve();
          })
        },
        function(error) {
          bamReject(error);
        });
      } else {
        bamPromise = Promise.resolve();
      }

      // Resolves vcf and bam promises and adds sampleModel to object list of sampleModels
      Promise.all([vcfPromise, bamPromise])
      .then(function() {
        var theModel = {'relationship': modelInfo.relationship, 'model': vm};
        self.sampleModels.push(vm);
        self.sampleMap[modelInfo.relationship] = theModel;
        resolve();
      })
    })
  }

  /*** Filtering Methods called from Home.vue ***/
  /* Coordinates annotation, coverage, & danger promises  */
  promiseLoadData(theGene, theTranscript, filterModel, options) {
    let self = this;
    let promises = [];

    return new Promise(function(resolve, reject) {
      if (Object.keys(self.sampleMap).length == 0) {
        resolve();
      } else {

        // Load variants
        self.clearLoadedData();
        let cohortResultMap = null;
        let p1 = self.promiseLoadVariants(theGene, theTranscript, filterModel, options)
        .then(function(data) {
          cohortResultMap = data.resultMap;
          self.setLoadedVariants(data.gene, filterModel);
        })
        promises.push(p1);

        // Load coverage
        let p2 = self.promiseLoadCoverage(theGene, theTranscript)
        .then(function() {
          self.setCoverage();
        })
        promises.push(p2);

        Promise.all(promises)
        .then(function() {
          // TODO: confirm do not need to summarize danger here
          resolve();
        })
        .catch(function(error) {
          reject(error);
        })
      }
    })
  }

  /* Coordinates annotating variants */
  promiseLoadVariants(theGene, theTranscript, filterModel, options) {
    let self = this;
    return new Promise(function(resolve, reject) {
      self.promiseAnnotateVariants(theGene, theTranscript, true, false, options)
      .then(function(resultMap) {
        resolve(resultMap);
      })
      .catch(function(error) {
        reject(error);
      })
    })
  }

  /* Coordinates annotating each model with clinVar */
  promiseAnnotateVariants(theGene, theTranscript, isBackground, options) {
    let self = this;
    return new Promise(function(resolve, reject) {
      var annotatePromises = [];
      var theResultMap = {};

      // Annotate variants for each sample
      for (var sample in self.sampleMap) {
        var model = self.sampleMap[sample].model;
        model.inProgress.loadingVariants = true;   // TODO: does it make sense to have this label here when mutiple models will contribute to single track display
        if (model.isVcfReadyToLoad() || vc.model.isLoaded()) {
            var p = model.promiseAnnotateVariants(theGene, theTranscript, [model], isBackground)
                  .then(function(resultMap) {
                    self.getModel(id).inProgress.loadingVariants = false;
                    for (var id in resultMap) {
                      theResultMap[id] = resultMap[id];
                    }
          })
          annotatePromises.push(p);
        }
      }
      // TODO: do I need known-variant functionality?
      // if (options.getKnownVariants) {
      //   self.getModel('known-variants').inProgress.loadingVariants = true;
      //   let p = self.sampleMap['known-variants'].model.promiseAnnotateVariants(theGene, theTranscript, [self.sampleMap['known-variants'].model], false, isBackground)
      //   .then(function(resultMap) {
      //     self.getModel('known-variants').inProgress.loadingVariants = false;
      //     for (var rel in resultMap) {
      //       theResultMap[rel] = resultMap[rel];
      //     }
      //   })
      //   annotatePromises.push(p);
      // }
      Promise.all(annotatePromises)
      .then(function() {
        self.promiseAnnotateWithClinvar(theResultMap, theGene, theTranscript, isBackground)
        .then(function(data) {
          resolve(data)
        })
      });
    })
  }

  /* Talks to vcf.iobio.js to pull in data
     TODO: this method is pretty confusing - need to get away from using proband as basis for clinvar lookup */
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
      // TODO: Combine the sfari samples into one set of variants so that we can access clinvar once
      // instead of on a per sample basis?
      var uniqueVariants = {};
      var unionVcfData = {features: []}

      for (var samp in resultMap) {
        var vcfData = resultMap[samp];
        if (!vcfData.loadState['clinvar'] /*&& samp != 'known-variants'*/) {
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

        // TODO: ensure replacing proband with first model in dictionary is appropriate here
        var firstModel = self.getFirstModel();
        var refreshVariantsFunction = isClinvarOffline || clinvarSource == 'vcf'
          ? firstModel._refreshVariantsWithClinvarVCFRecs.bind(self.firstModel, unionVcfData)
          : firstModel._refreshVariantsWithClinvarEutils.bind(self.firstModel, unionVcfData);


        self.firstModel.vcf.promiseGetClinvarRecords(
            unionVcfData,
            self.firstModel._stripRefName(geneObject.chr),
            geneObject,
            self.geneModel.clinvarGenes,
            refreshVariantsFunction)
        .then(function() {
            // Create a hash lookup of all clinvar variants
            var clinvarLookup = {};
            unionVcfData.features.forEach(function(variant) {
              var clinvarAnnot = {};
              for (var key in self.firstModel.vcf.getClinvarAnnots()) {
                  clinvarAnnot[key] = variant[key];
                  clinvarLookup[formatClinvarKey(variant)] = clinvarAnnot;
              }
            })
            var refreshPromises = [];

            // Use the clinvar variant lookup to initialize variants with clinvar annotations
            for (var id in resultMap) {
              var vcfData = resultMap[id];
              if (!vcfData.loadState['clinvar']) {
                var p = refreshVariantsWithClinvarLookup(vcfData, clinvarLookup);
                if (!isBackground) {
                  self.getModel(id).vcfData = vcfData;
                }
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

  /* Promises to get gene coverage on every model */
  promiseGetCachedGeneCoverage(geneObject, transcript, showProgress = false) {
    let self = this;
    return new Promise(function(resolve, reject) {
      var geneCoverageAll = {gene: geneObject, transcript: transcript, geneCoverage: {}};
      var promises = [];
      self.sampleModels.forEach(function(model) {
        if (model.isBamLoaded()) {
          if (showProgress) {
            // TODO: is this being refactored?
            //vc.showBamProgress("Analyzing coverage in coding regions");
          }
          var promise = model.promiseGetGeneCoverage(geneObject, transcript)
           .then(function(data) {
            var gc = data.geneCoverage;
            geneCoverageAll.geneCoverage[data.model.getRelationship()] = gc;
            if (showProgress) {
              // TODO: is this being refactored?
              //getVariantCard(data.model.getRelationship()).endBamProgress();
            }
           })
           .catch(function(error) {
            reject(error);
           })
          promises.push(promise);
        }
      })
      Promise.all(promises).then(function() {
        resolve(geneCoverageAll);
      })
    })
  }

  promiseCacheCohortVcfData(geneObject, theTranscript, dataKind, resultMap, cacheIt) {
    let self = this;
    return new Promise(function(resolve, reject) {
      // Cache vcf data for all samples (TODO: this was previously done for trio - can we cache this much data?)
      var cachePromise = null;
      if (cacheIt) {
        var cachedPromises = [];
        self.sampleModels.forEach(function(model) {
          if (resultMap[model.getRelationship()]) {
            var p = model._promiseCacheData(resultMap[model.getRelationship()], dataKind, geneObject.gene_name, theTranscript);
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

  promiseLoadBamDepth(theGene, theTranscript) {
    let self = this;
    return new Promise(function(resolve, reject) {
      let promises = [];
      let theResultMap = {};
      self.getCanonicalModels().forEach(function(model) {
        if (model.isBamLoaded()) {
          model.inProgress.loadingCoverage = true;
          var p =  new Promise(function(innerResolve, innerReject) {
            var theModel = model;
            theModel.getBamDepth(theGene, theTranscript, function(coverageData) {
              theModel.inProgress.loadingCoverage = false;
              theResultMap[theModel.relationship] = coverageData;
              innerResolve();
            });
          })
          promises.push(p);
        }
      })
      Promise.all(promises)
      .then(function() {
        resolve(theResultMap);
      })
    })
  }

  // promiseSummarizeDanger(geneObject, theTranscript, probandVcfData, options, filterModel) {
  //   let self = this;
  //
  //   return new Promise(function(resolve, reject) {
  //     self.promiseGetCachedGeneCoverage(geneObject, theTranscript, false)
  //     .then(function(data) {
  //       var geneCoverageAll = data.geneCoverage;
  //       self.getProbandModel().promiseGetDangerSummary(geneObject.gene_name)
  //       .then(function(dangerSummary) {
  //
  //           // Summarize the danger for the gene based on the filtered annotated variants and gene coverage
  //           var filteredVcfData = null;
  //           var filteredFbData = null;
  //           if (probandVcfData.features && probandVcfData.features.length > 0) {
  //             filteredVcfData = self.getProbandModel().filterVariants(probandVcfData, filterModel.getFilterObject(), geneObject.start, geneObject.end, true);
  //             filteredFbData  = self.getProbandModel().reconstituteFbData(filteredVcfData);
  //           }
  //           var theOptions = $.extend({}, options);
  //           if ((dangerSummary && dangerSummary.CALLED) || (filteredFbData && filteredFbData.features.length > 0)) {
  //               theOptions.CALLED = true;
  //           }
  //           return self.getProbandModel().promiseSummarizeDanger(geneObject.gene_name, filteredVcfData, theOptions, geneCoverageAll, filterModel);
  //       })
  //       .then(function(theDangerSummary) {
  //         resolve();
  //       })
  //       .catch(function(error) {
  //         var msg = "An error occurred in promiseSummarizeDanger() when calling VariantModel.promiseGetDangerSummary(): " + error;
  //         console.log(msg);
  //         reject(msg);
  //       })
  //     })
  //     .catch(function(error) {
  //       var msg = "An error occurred in CohortModel.promiseSummarizeDanger() when calling promiseGetCachedGeneCoverage(): " + error;
  //       console.log(msg);
  //       reject(msg);
  //     });
  //   });
  // }

  /*** HELPERS ***/
  /* Returns true if model contains only bam data, and not vcf */
  isAlignmentsOnly(callback) {
    var theModels = this.sampleModels.filter(function(model) {
      return model.isAlignmentsOnly();
    });
    return theModels.length == this.sampleModels.length;
  }

  /* Clears data from each model */
  clearLoadedData() {
    let self = this;
    self.sampleModels.forEach(function(model) {
      model.loadedVariants = {loadState: {}, features: [], maxLevel: 1, featureWidth: 0};
      model.coverage = [[0,0]];
    });
  }

}
