/* Logic relative to a single data set (for example, Sfari data set). Holds list of CohortModels. */
class DataSetModel {
  constructor() {
    this.name = '';       // Must be unique

    // Route information
    this.vcfUrl = null;
    this.vcfFile = null;

    this.cohorts = [];    // List of cohort models
    this.cohortMap = {};  // Maps cohort models to names
  }

  isAlignmentsOnly() {
    var theCohorts = this.cohorts.filter(function(cohort) {
      return cohort.isAlignmentsOnly();
    });
    return theCohorts.length == this.cohorts.length;
  }

  /*
    getMainCohort() {
      return this.cohorts[0];
    }

    getCohort(name) {
      return this.cohortMap[name];
    }

    getEndpoint() {
      return this.getCore().endpoint;
    }

    getGenericAnnotation() {
      return this.getCore().genericAnnotation;
    }

    getGenomeBuildHelper() {
      return this.getCore().genomeBuildHelper;
    }

    getGeneModel() {
      return this.getCore().geneModel;
    }

    getTranslator() {
      return this.getCore().translator;
    }

    getCacheHelper() {
      return this.getCore().cacheHelper;
    }

    getAnnotationScheme() {
      return this.getCore().annotationScheme;
    }

    getFilterModel() {
      return this.getCore().filterModel;
    }

    // Assume we have a combined vcf with a list of subset IDs and phenotype filters
    promiseInitDemo() {
      let self = this;

      // Set status
      self.isLoaded = false;
      self.inProgress.loadingDataSources = true;

      var allSampleModel = new CohortModel(self);
      allSampleModel.name = 'demo_all';
      self.cohorts.push(allSampleModel);
      self.cohortMap[allSampleModel.name] = allSampleModel;

      var subsetModel = new CohortModel(self);
      subsetModel.name = 'demo_subset';
      subsetModel.subsetIds.push('');
      subsetModel.subsetPhenotypes.push('Test Phenotype');
      self.cohorts.push(subsetModel);
      self.cohortMap[subsetModel.name] = subsetModel;

      return new Promise(function(resolve, reject) {
        let promises = [];
        self.cohorts.forEach(function(cohort) {
          promises.push(self.promiseAddSamples(cohort));
        })

        Promise.all(promises)
          .then(function() {
            self.inProgress.loadingDataSources = false;
            self.isLoaded = true;
            resolve();
          })
          .catch(function(error) {
            console.log("There was a problem in dataSetModel.promiseInitDemo: " + error);
            reject(error);
          })
      });
    }

    promiseInit(dataSetName) {
      let self = this;

      // Set status
      self.isLoaded = false;
      self.inProgress.loadingDataSources = true;

      // Add cohort model for entire data set
      var cohortAllModel = new CohortModel(self);
      var cohortAllName = dataSetName ? (dataSetName + '_all') : 'data_all';
      cohortAllModel.name = cohortAllName;
      self.cohorts.push(cohortAllModel);
      self.cohortMap[cohortAllName] = cohortAllModel;

      // Return promise to pull out subset cohort(s) and load samples
      return new Promise(function(resolve, reject) {
        let promises = [];

        this.promiseGetSubsetInfo()
          .then(function(subsets) {
            // Add one cohort model per subset found in vcf
            if (subsets) {
              Object.entries(subsets).forEach(([key, value]) => {
                var cohortSubsetModel = new CohortModel(self);
                cohortSubsetModel.subsetPhenotypes = key;
                cohortSubsetModel.subsetIds = value;
                var cohortSubsetName = dataSetName ? (dataSetName + '_subset') : 'data_subset';
                cohortSubsetModel.name = cohortSubsetName;
                self.cohorts.push(cohortSubsetModel);
                self.cohortMap[cohortSubsetName] = cohortSubsetModel;
              });
            }
            // Load samples for each cohort model
            self.cohorts.forEach(function(cohort) {
              promises.push(self.promiseAddSamples(cohort));
            })
          })

          // Resolve
          Promise.all(promises)
            .then(function() {
              self.inProgress.loadingDataSources = false;
              self.isLoaded = true;
              resolve();
            })
            .catch(function(error) {
              console.log("There was a problem in data set model promiseInit: " + error);
              reject(error);
            })
        });
    }

    promiseAddSamples(cohortModel) {
      let self = this;

      return new Promise(function(resolve,reject) {
        var vm = cohortModel;
        vm.init();

        var vcfPromise = null;
        if (self.vcf) {
          vcfPromise = new Promise(function(vcfResolve, vcfReject) {
            // SJG TODO: 2nd param previously modelInfo.tbi but not assigned anywhere
            vm.onVcfUrlEntered(self.vcf, null, function() {
              vcfResolve();
            })
          },
          function(error) {
            vcfReject(error);
          });
        } else {
          vcfPromise = Promise.resolve();
        }

        // var bamPromise = null;
        // if (self.bams && self.bams.length > 0) {
        //   bamPromise = new Promise(function(bamResolve, bamReject) {
        //     // SJG TODO: 2nd param previously modelInfo.bai but not assigned anywhere
        //     vm.onBamUrlEntered(self.bams, null, function() {
        //       bamResolve();
        //     })
        //   },
        //   function(error) {
        //     bamReject(error);
        //   });
        // } else {
        //   bamPromise = Promise.resolve();
        // }

        Promise.all([vcfPromise, bamPromise])
        .then(function() {
          resolve();
        })
      })
    }

    promiseLoadData(theGene, theTranscript, options) {
      let self = this;
      let promises = [];

      return new Promise(function(resolve, reject) {
        if (Object.keys(self.cohortMap).length == 0) {
          resolve();
        } else {
          // Load variants
          self.startGeneProgress(theGene.gene_name);
          self.clearLoadedData();
          // TODO: should this be dataSetResultMap or cohortResultMap?
          let dataSetResultMap = null;
          let p1 = self.promiseLoadVariants(theGene, theTranscript, options)
          .then(function(data) {
            dataSetResultMap = data.resultMap;
            self.setLoadedVariants(data.gene);
          })
          promises.push(p1);

          let p2 = self.promiseLoadCoverage(theGene, theTranscript)
          .then(function() {
            self.setCoverage();
          })
          promises.push(p2);

          Promise.all(promises)
          .then(function() {
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

    promiseLoadVariants(theGene, theTranscript, options) {
      let self = this;

      return new Promise(function(resolve, reject) {
        self.promiseAnnotateVariants(theGene, theTranscript, false, options)
        .then(function(resultMap) {
          // TODO: previously have bookmarks and inheritance here - can I get rid of this now?
          resolve(resultMap);
        })
        .catch(function(error) {
          reject(error);
        })
      })
    }

    /* Coordinates annotating each cohort model
    promiseAnnotateVariants(theGene, theTranscript, isBackground, options={}) {
      let self = this;
      alert("called promiseAnnotateVars in DataSetmodel");
      return new Promise(function(resolve, reject) {
        var annotatePromises = [];
        var theResultMap = {};

        // Annotate variants for every cohort model
          self.cohorts.forEach(function(cohortModel) {
            cohortModel.inProgress.loadingVariants = true;
            if (cohortModel.isVcfReadyToLoad() || cohortModel.isLoaded()) {
              var p = cohortModel.promiseAnnotateVariants(theGene, theTranscript, true, isBackground)
                .then(function(resultMap) { // TODO: what format does resultMap have?
                  cohortModel.inProgress.loadingVariants = false;
                  for (var track in resultMap) {
                    theResultMap[track] = resultMap[track];
                  }
                })
                annotatePromises.push(p)
            }
          })

          Promise.all(annotatePromises)
            .then(function() {
              self.promiseAnnotateWithClinvar(theResultMap, theGene, theTranscript, isBackground)
              resolve(data);
            })
            .catch(function(error) {
              console.log("There was a problem in DataSetModel promiseAnnotateVariants: " + error);
            });
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
        for (var rel in resultMap) {
          var vcfData = resultMap[rel];
          if (!vcfData.loadState['clinvar'] && rel != 'known-variants') {
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
              self.getGeneModel().clinvarGenes,
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
              for (var cohort in resultMap) {
                var vcfData = resultMap[cohort];
                if (!vcfData.loadState['clinvar']) {
                  var p = refreshVariantsWithClinvarLookup(vcfData, clinvarLookup);
                  if (!isBackground) {
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

    promiseSummarizeError(error) {
      let self = this;

      return new Promise(function(resolve, reject) {
        this.getMainCohort().promiseSummarizeError(error.geneName, error.message)
        .then(function(dangerObject) {
            self.getGeneModel().setDangerSummary(geneObject, dangerObject);
            resolve();
        }).
        catch(function(error) {
          reject(error);
        })
      })
    }

    promiseSummarizeDanger(geneObject, theTranscript, vcfData, options, filterModel) {
      let self = this;

      return new Promise(function(resolve, reject) {
        self.promiseGetCachedGeneCoverage(geneObject, theTranscript, false)
        .then(function(data) {
          var geneCoverageAll = data.geneCoverage;
          this.getMainCohort().promiseGetDangerSummary(geneObject.gene_name)
          .then(function(dangerSummary) {

              // Summarize the danger for the gene based on the filtered annotated variants and gene coverage
              var filteredVcfData = null;
              var filteredFbData = null;
              if (vcfData.features && vcfData.features.length > 0) {
                filteredVcfData = this.getMainCohort().filterVariants(vcfData, getFilterModel().getFilterObject(), geneObject.start, geneObject.end, true);
                filteredFbData  = this.getMainCohort().reconstituteFbData(filteredVcfData);
              }
              var theOptions = $.extend({}, options);
              if ((dangerSummary && dangerSummary.CALLED) || (filteredFbData && filteredFbData.features.length > 0)) {
                  theOptions.CALLED = true;
              }
              return this.getMainCohort().promiseSummarizeDanger(geneObject.gene_name, filteredVcfData, theOptions, geneCoverageAll, filterModel);
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

    promiseGetSubsetInfo() {
      let self = this;

      return new Promise(function(resolve, reject) {
        self.vcf.promiseGetSubsetInfo() // TODO: implement this
          .then(function(subsets) {
            resolve(subsets);
          })
          .catch(function(error) {
            var msg = "An error occurred while retrieving subset info: " + error;
            console.log(msg);
            reject(msg);
          });
      });
    }

    /* Retrieves variant information and sets in backing models
    setLoadedVariants(theGene, relationship=null) {
      let self = this;

      var filterAndPileupVariants = function(model, start, end, target='loaded') {
        var filteredVariants = $.extend({}, model.vcfData);
        filteredVariants.features = model.vcfData.features.filter( function(feature) {

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
          if (self.getFilterModel().regionStart && self.getFilterModel().regionEnd) {
            inRegion = feature.start >= self.filterModel.regionStart && feature.start <= self.filterModel.regionEnd;
          }

          var passesModelFilter = self.filterModel.passesModelFilter(model.relationship, feature);

          return isTarget && !isHomRef && inRegion && passesModelFilter;
        });

        var pileupObject = model._pileupVariants(filteredVariants.features, start, end);
        filteredVariants.maxLevel = pileupObject.maxLevel + 1;
        filteredVariants.featureWidth = pileupObject.featureWidth;

        return filteredVariants;
      }

      self.cohorts.forEach(function(model) {
        if (relationship == null || relationship == model.relationship) {
          if (model.vcfData && model.vcfData.features) {

            var start = self.filterModel.regionStart ? self.filterModel.regionStart : gene.start;
            var end   = self.filterModel.regionEnd   ? self.filterModel.regionEnd   : gene.end;

            var loadedVariants = filterAndPileupVariants(model, start, end, 'loaded');
            model.loadedVariants = loadedVariants;

            var calledVariants = filterAndPileupVariants(model, start, end, 'called');
            model.calledVariants = calledVariants;

            // TODO: add functionality for main variant track (proband prev)

          } else {
            model.loadedVariants = {loadState: {}, features: []};
            model.calledVariants = {loadState: {}, features: []}
          }
        }
      })
    }

    startGeneProgress(geneName) {
      var idx = this.genesInProgress.indexOf(geneName);
      if (idx < 0) {
        this.genesInProgress.push(geneName);
      }
    }

    endGeneProgress(geneName) {
      var idx = this.genesInProgress.indexOf(geneName);
      if (idx >= 0) {
        this.genesInProgress.splice(idx,1);
      }
    }

    isAlignmentsOnly(callback) {
      return this.getMainCohort().isAlignmentsOnly();
      // TODO future: incorporate alt data set model
    }

    /* Clears data from each model
    clearLoadedData() {
      let self = this;
      self.cohorts.forEach(function(model) {
        model.loadedVariants = {loadState: {}, features: [], maxLevel: 1, featureWidth: 0};
        model.calledVariants = {loadState: {}, features: [], maxLevel: 1, featureWidth: 0};
        model.coverage = [[]];
      });
    }
  }

  //export default DataSetModel;
  */

}
