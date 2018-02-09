/* Logic relative to groups of samples */
class CohortModel {
  constructor(endpoint, genericAnnotation, translator, geneModel, cacheHelper, genomeBuildHelper) {
    // Data
    this.sfariSamplesModel = null;
    this.subsetSfariSampleIds = {};
    this.subsetSfariPhenotypes = "";

    this.altSamplesModel = null;
    this.subsetAltSampleIds = {};
    this.subsetAltPhenotyps = "";

    // Back-end data properties
    this.endpoint = endpoint;
    this.genericAnnotation = genericAnnotation;
    this.translator = translator;
    this.geneModel = geneModel;
    this.cacheHelper = cacheHelper;
    this.genomeBuildHelper = genomeBuildHelper;
    this.filterModel = null;
    this.annotationScheme = 'vep';
    this.isLoaded = false;

    // Visualization calculation properties
    this.maxAlleleCount = null;
    this.affectedInfo = null;
    this.maxDepth = 0;
    this.maxAlleleCount = null;
    this.affectedInfo = null;
    this.maxDepth = 0;
    this.inProgress = { 'loadingDataSources': false };

    // TODO: fill in demo data for testing
    this.demoVcf = 'https://s3.amazonaws.com/iobio/samples/vcf/platinum-exome.vcf.gz';
    this.demoBam = '';
    this.demoGenes = ['RAI1', 'MYLK2', 'PDHA1', 'PDGFB', 'AIRE'];
  }

  // TODO: getters on multi-sample models?

  /*** SETTERS ***/
  /* Retrieves variant information and sets in backing models */
  setLoadedVariants(theGene, regionStart, regionEnd) {
    let self = this;
    var model = this.sfariSamplesModel;
    if (model.vcfData && model.vcfData.features) {
      var loadedVariants = $.extend({}, model.vcfData);
      loadedVariants.features = model.vcfData.features.filter(function(feature) {
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
    // TODO future: set variants for alt data set
  }

  /* TODO: this only applies to canonical models, do I need this? */
  // setCoverage() {
  //   let self = this;
  //   self.getCanonicalModels().forEach(function(model) {
  //     if (model.bamData) {
  //       model.coverage = model.bamData.coverage;
  //       if (model.coverage) {
  //         var max = d3.max(model.coverage, function(d,i) { return d[1]});
  //         if (max > self.maxDepth) {
  //           self.maxDepth = max;
  //         }
  //       }
  //     }
  //   })
  // }

  /*** Whole Data Retrieval ***/
  /* Promises to load in demo data from 1000g */
  promiseInitDemo() {
    let self = this;
    // Enforce sfari always added first
    var modelInfos = [
      {name: 'sfari', 'vcf': self.demoVcf, 'bam': self.demoBam}
      // TODO future: add entry for alt data set if exists
    ];
    // TODO: put appropriate demo info in these
    self.subsetSfariSampleIds = [];
    self.subsetSfariPhenotypes= [];
    return self.promiseInit(modelInfos, true);
  }

  /* Initializes backing models and gets data load promises going. */
  promiseInit(modelInfos, demoMode) {
    let self = this;

    // Return promise object
    return new Promise(function(resolve, reject) {
      self.isLoaded = false;
      self.inProgress.loadingDataSources = true;
      let promises = [];

      // Initialize sfari model
      var sfariInfo = modelInfos[0];
      self.sfariSamplesModel = new MultiSampleModel();
      self.sfariSamplesModel.setName(sfariInfo.name);

      // Add samples for sfari data set
      var sfariPromise = self.promiseAddSamples(self.sfariSamplesModel, sfariInfo.vcf, sfariInfo.bam);
      promises.push(sfariPromise);

      // Pull out phenotypic info and sample IDs from multi-vcf
      // TODO: need to make sure this can take advantage of cacheing here
      if (!demoMode) {
        var subsetInfoPromise = self.promiseGetSubsetSampleInfo(sfariInfo.vcf);
        promises.push(subsetInfoPromise);
      }

      // TODO Future: fill in altSubsetModel

      // Resolve
      Promise.all(promises)
      .then(function() {
        //self.setAffectedInfo();
        self.inProgress.loadingDataSources = false;
        self.isLoaded = true;
        resolve();
      })
      .catch(function(error) {
        reject(error);
      })
    })
  }

  /* Loads VCF and BAM information for given sample model. */
  promiseAddSamples(multiSampleModel, sampleVcf, sampleBam) {
    debugger;
    let self = this;

    return new Promise(function(resolve,reject) {
      var vm = multiSampleModel;
      vm.init(self);

      var vcfPromise = null;
      if (sampleVcf) {
        vcfPromise = new Promise(function(vcfResolve, vcfReject) {
          // SJG TODO: 2nd param previously modelInfo.tbi but not assigned anywhere
          vm.onVcfUrlEntered(sampleVcf, null, function() {
            vcfResolve();
          })
        },
        function(error) {
          vcfReject(error);
        });
      } else {
        vcfPromise = Promise.resolve();
      }

      var bamPromise = null;
      if (sampleBam) {
        bamPromise = new Promise(function(bamResolve, bamReject) {
          // SJG TODO: 2nd param previously modelInfo.bai but not assigned anywhere
          vm.onBamUrlEntered(sampleBam, null, function() {
            bamResolve();
          })
        },
        function(error) {
          bamReject(error);
        });
      } else {
        bamPromise = Promise.resolve();
      }

      Promise.all([vcfPromise, bamPromise])
      .then(function() {
        resolve();
      })
    })
  }

  /*** Externally called ***/
  /* Coordinates annotation, coverage, & danger promises  */
  // TODO: need to make sure this is not called prior to promiseInit resolving
  promiseLoadData(theGene, theTranscript, filterModel, options) {
    let self = this;
    let promises = [];

    return new Promise(function(resolve, reject) {
      if (sfariSamplesModel == null) {
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

        /* TODO: incorporate coverage back in
        let p2 = self.promiseLoadCoverage(theGene, theTranscript)
        .then(function() {
          self.setCoverage();
        })
        promises.push(p2);*/

        Promise.all(promises)
        .then(function() {
            // TODO: I have this summarizing danger for the subset - do I need to do it for full sfari data set?
            // To answer this: what is promiseSummarizeDanger doing?
            self.promiseSummarizeDanger(theGene, theTranscript, cohortResultMap[1], null)
            .then(function() {
              resolve();
            })
        })
        .catch(function(error) {
          reject(error);
        })
      }
    })
  }

  /* Coordinates annotating variants */
  // TODO: think I can get rid of this because not annotating inheritance after so just double wrapping 1x promise
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
  promiseAnnotateVariants(theGene, theTranscript, isBackground, options={}) {
    let self = this;
    var i = 0;
    return new Promise(function(resolve, reject) {
      var annotatePromises = [];
      var theResultMap = {};

      // Annotate variants for entire sfari dataset
        var sfariModel = sfariSamplesModel;
        if (!sfariModel) {
          resolve();
        }
        sfariModel.inProgress.loadingVariants = true;
        if (sfariModel.isVcfReadyToLoad() || vc.model.isLoaded()) {
          var pAll = sfariModel.promiseAnnotateVariants(theGene, theTranscript, sfariModel, true, isBackground, null, null, [])
                .then(function(resultMap) {
                  for (var track in resultMap) {
                    theResultMap[track] = resultMap[track];
                  }
                })
          annotatePromises.push(pAll);

          // Annotate variants for phenotypically filtered sfari subset
          var subsetIds = this.subsetSfariSampleIds ? this.subsetSfariSampleIds : [];
          var pSubset = sfariModel.promiseAnnotateVariants(theGene, theTranscript, sfariModel, true, isBackground, null, null, subsetIds)
          .then(function(resultMap) {
            for (var track in resultMap) {
                theResultMap[track] = retsultMap[track];
              }
          })
          annotatePromises.push(pSubset);
        }

        // TODO future: annotate variants for alt data set

      Promise.all(annotatePromises)
      .then(function() {
        sfariModel.inProgress.loadingVariants = false;  // Moved this here since both need to be annotated but linked to same model
        // TODO: determine if need to annotate with clinvar
        // TODO: if we don't need clinvar fxn, return data differently
        //self.promiseAnnotateWithClinvar(theResultMap, theGene, theTranscript, isBackground)
          resolve(theResultMap);
      });
    })
  }

  // TODO: do I need to annotate with Clinvar
  // promiseAnnotateWithClinvar(resultMap, geneObject, transcript, isBackground) {
  //   let self = this;
  //
  //   var formatClinvarKey = function(variant) {
  //     var delim = '^^';
  //     return variant.chrom + delim + variant.ref + delim + variant.alt + delim + variant.start + delim + variant.end;
  //   }
  //
  //   var formatClinvarThinVariant = function(key) {
  //     var delim = '^^';
  //     var tokens = key.split(delim);
  //     return {'chrom': tokens[0], 'ref': tokens[1], 'alt': tokens[2], 'start': tokens[3], 'end': tokens[4]};
  //   }
  //
  //   var refreshVariantsWithClinvarLookup = function(theVcfData, clinvarLookup) {
  //     theVcfData.features.forEach(function(variant) {
  //       var clinvarAnnot = clinvarLookup[formatClinvarKey(variant)];
  //       if (clinvarAnnot) {
  //         for (var key in clinvarAnnot) {
  //           variant[key] = clinvarAnnot[key];
  //         }
  //       }
  //     })
  //     if (theVcfData.loadState == null) {
  //       theVcfData.loadState = {};
  //     }
  //     theVcfData.loadState['clinvar'] = true;
  //   }
  //
  //   return new Promise(function(resolve, reject) {
  //     // TODO: Combine the sfari samples into one set of variants so that we can access clinvar once
  //     // instead of on a per sample basis?
  //     var uniqueVariants = {};
  //     var unionVcfData = {features: []}
  //
  //     for (var samp in resultMap) {
  //       var vcfData = resultMap[samp];
  //       if (!vcfData.loadState['clinvar'] /*&& samp != 'known-variants'*/) {
  //        vcfData.features.forEach(function(feature) {
  //           uniqueVariants[formatClinvarKey(feature)] = true;
  //        })
  //       }
  //     }
  //     if (Object.keys(uniqueVariants).length == 0) {
  //       resolve(resultMap);
  //     } else {
  //       for (var key in uniqueVariants) {
  //         unionVcfData.features.push(formatClinvarThinVariant(key));
  //       }
  //
  //       // TODO: ensure replacing proband with first model in dictionary is appropriate here
  //       var firstModel = self.getFirstModel();
  //       var refreshVariantsFunction = isClinvarOffline || clinvarSource == 'vcf'
  //         ? firstModel._refreshVariantsWithClinvarVCFRecs.bind(self.firstModel, unionVcfData)
  //         : firstModel._refreshVariantsWithClinvarEutils.bind(self.firstModel, unionVcfData);
  //
  //
  //       self.firstModel.vcf.promiseGetClinvarRecords(
  //           unionVcfData,
  //           self.firstModel._stripRefName(geneObject.chr),
  //           geneObject,
  //           self.geneModel.clinvarGenes,
  //           refreshVariantsFunction)
  //       .then(function() {
  //           // Create a hash lookup of all clinvar variants
  //           var clinvarLookup = {};
  //           unionVcfData.features.forEach(function(variant) {
  //             var clinvarAnnot = {};
  //             for (var key in self.firstModel.vcf.getClinvarAnnots()) {
  //                 clinvarAnnot[key] = variant[key];
  //                 clinvarLookup[formatClinvarKey(variant)] = clinvarAnnot;
  //             }
  //           })
  //           var refreshPromises = [];
  //
  //           // Use the clinvar variant lookup to initialize variants with clinvar annotations
  //           for (var id in resultMap) {
  //             var vcfData = resultMap[id];
  //             if (!vcfData.loadState['clinvar']) {
  //               var p = refreshVariantsWithClinvarLookup(vcfData, clinvarLookup);
  //               if (!isBackground) {
  //                 self.getModel(id).vcfData = vcfData;
  //               }
  //               refreshPromises.push(p);
  //             }
  //           }
  //           Promise.all(refreshPromises)
  //           .then(function() {
  //             resolve(resultMap);
  //           })
  //           .catch(function(error) {
  //             reject(error);
  //           })
  //       })
  //     }
  //   })
  // }

  /* TODO: refactor away from model array
  promiseLoadCoverage(theGene, theTranscript) {
    let self = this;

    return new Promise(function(resolve, reject) {
      self.promiseGetCachedGeneCoverage(theGene, theTranscript, true)
      .then(function(data) {
        return self.promiseLoadBamDepth(theGene, theTranscript);
      })
      .then(function(data) {
        resolve(data);
      })
      .catch(function(error) {
        reject(error);
      })
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
  promiseGetCachedGeneCoverage(geneObject, transcript, showProgress = false) {
    let self = this;

    return new Promise(function(resolve, reject) {
      var geneCoverageAll = {gene: geneObject, transcript: transcript, geneCoverage: {}};
      var promises = [];
      self.sampleModels.forEach(function(model) {
        if (model.isBamLoaded()) {
          if (showProgress) {
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
  } */

  /* TODO: do I need to annotate inheritance
  promiseAnnotateInheritance(geneObject, theTranscript, resultMap, options={isBackground: false, cacheData: true}) {
    let self = this;

    var resolveIt = function(resolve, resultMap, geneObject, theTranscript, options) {

      // Now that inheritance mode has been determined, we can assess each variant's impact
      self.sampleModels.forEach(function(model) {
        if (resultMap[model.getRelationship()]) {
          model.assessVariantImpact(resultMap[model.getRelationship()], theTranscript);
        }
      })


      self.promiseCacheCohortVcfData(geneObject, theTranscript, CacheHelper.VCF_DATA, resultMap, options.cacheData)
      .then(function() {
        resolve({'resultMap': resultMap, 'gene': geneObject, 'transcript': theTranscript});
      })

    }

    return new Promise(function(resolve,reject) {

      if (self.isAlignmentsOnly() && !autocall && (resultMap == null || resultMap.proband == null)) {
          resolve({'resultMap': {'proband': {features: []}}, 'gene': geneObject, 'transcript': theTranscript});
      } else {


        if (self.mode == 'single') {
          // Determine harmful variants, cache data, etc.
          resolveIt(resolve, resultMap, geneObject, theTranscript, options);
        } else {

          // Set the max allele count across all variants in the trio.  We use this to properly scale
          // the allele counts bars in the tooltip
          self.maxAlleleCount = 0;
          for(var rel in resultMap) {
            self.maxAlleleCount = SampleModel.calcMaxAlleleCount(resultMap[rel], self.maxAlleleCount);
          }


          // We only pass in the affected info if we need to sync up genotypes because samples
          // where in separate vcf files
          var affectedInfoToSync = self.isAlignmentsOnly() || self.samplesInSingleVcf() ? null : self.affectedInfo;

          var trioModel = new VariantTrioModel(resultMap.proband, resultMap.mother, resultMap.father, null, affectedInfoToSync);

          // Compare the mother and father variants to the proband, setting the inheritance
          // mode on the proband's variants
          trioModel.compareVariantsToMotherFather(function() {

            // Now set the affected status for the family on each variant of the proband
            self.getProbandModel().determineAffectedStatus(resultMap.proband, geneObject, theTranscript, self.affectedInfo, function() {

              // Determine harmful variants, cache data, etc.
              resolveIt(resolve, resultMap, geneObject, theTranscript, options);

            });
          })
        }
      }
    })
  }
  promiseCacheCohortVcfData(geneObject, theTranscript, dataKind, resultMap, cacheIt) {
    let self = this;

    return new Promise(function(resolve, reject) {
      var cachePromise = null;
      if (cacheIt) {
        var cachedPromises = [];
        var model = this.sfariSamplesModel;
        // TODO: start here if we pick this up again
        var sfariP = model._promiseCacheData();

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
  */


  promiseSummarizeError(error) {
    let self = this;
    return new Promise(function(resolve, reject) {
      this.sfariSamplesModel.promiseSummarizeError(error.geneName, error.message)
      .then(function(dangerObject) {
          self.geneModel.setDangerSummary(geneObject, dangerObject);
          resolve();
      }).
      catch(function(error) {
        reject(error);
      })
    })
  }

  promiseSummarizeDanger(geneObject, theTranscript, sfariVcfData, options, filterModel) {
    let self = this;

    return new Promise(function(resolve, reject) {
      self.promiseGetCachedGeneCoverage(geneObject, theTranscript, false)
      .then(function(data) {
        var geneCoverageAll = data.geneCoverage;
        this.sfariSamplesModel.promiseGetDangerSummary(geneObject.gene_name)
        .then(function(dangerSummary) {

            // Summarize the danger for the gene based on the filtered annotated variants and gene coverage
            var filteredVcfData = null;
            var filteredFbData = null;
            if (sfariVcfData.features && sfariVcfData.features.length > 0) {
              filteredVcfData = this.sfariSamplesModel.filterVariants(sfariVcfData, filterModel.getFilterObject(), geneObject.start, geneObject.end, true);
              filteredFbData  = this.sfariSamplesModel.reconstituteFbData(filteredVcfData);
            }
            var theOptions = $.extend({}, options);
            if ((dangerSummary && dangerSummary.CALLED) || (filteredFbData && filteredFbData.features.length > 0)) {
                theOptions.CALLED = true;
            }
            return this.sfariSamplesModel.promiseSummarizeDanger(geneObject.gene_name, filteredVcfData, theOptions, geneCoverageAll, filterModel);
        })
        .then(function(theDangerSummary) {
          resolve();
        })
        .catch(function(error) {
          var msg = "An error occurred in promiseSummarizeDanger() when calling VariantModel.promiseGetDangerSummary(): " + error;
          console.log(msg);
          reject(msg);
        })
      })
      .catch(function(error) {
        var msg = "An error occurred in CohortModel.promiseSummarizeDanger() when calling promiseGetCachedGeneCoverage(): " + error;
        console.log(msg);
        reject(msg);
      });
    });
  }

  // SJG TODO: verify that passing correct param here and making use of cache
  promiseGetSubsetSampleInfo(sampleVcf) {
    var promises = [];

    var idPromise = new Promise(function(resolve, reject) {
      sampleVcf.promiseGetSubsetIds() // TODO: implement this
        .then(function(ids) {
          subsetSfariSampleIds = ids;
          resolve();
        })
        .catch(function(error) {
          var msg = "An error occurred in vcf.iobio.js.promiseGetSubsetIds()";
          console.log(msg);
          reject(msg);
        });
    });
    promises.push(idPromise);

    var phenoPromise = new Promise(function(resolve, reject) {
      sampleVcf.promiseGetSubsetPhenotypes() // TODO: implement this
        .then(function(phenotypes) {
          subsetSfariPhenotypes = phenotypes;
          resolve();
        })
        .catch(function(error) {
          var msg = "An error occurred in vcf.iobio.js.promiseGetSubsetPhenotypes()";
          console.log(msg);
          reject(msg);
        });
    });
    promises.push(phenoPromise);

    Promise.all(promises)
    .then(function() {
        resolve();
    })
    .catch(function(error) {
      var msg = "An error occurred in promiseGetSubsetSampleInfo()";
      console.log(msg);
      reject(msg);
    });
  }

  /*** HELPERS ***/
  /* Returns true if model contains only bam data, and not vcf */
  isAlignmentsOnly(callback) {
    return this.sfariSamplesModel.isAlignmentsOnly();
    // TODO future: incorporate alt data set model
  }

  /* Clears data from each model */
  clearLoadedData() {
    let self = this;
    var model = this.sfariSamplesModel;
    model.loadedVariants = {loadState: {}, features: [], maxLevel: 1, featureWidth: 0};
    model.coverage = [[0,0]];

    // TODO future: incorporate alt data set model
  }
}

export default CohortModel;
