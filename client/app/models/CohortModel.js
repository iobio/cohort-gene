/* Represents the variant data relative to a group of samples, or cohort.
   TD & SJG updated Apr2018 */

class CohortModel {
    constructor(theVariantModel) {
        this.vcfEndptHash = {};         // One vcf iobio service endpoint per multi-vcf url (key is name of file)
        this.varsInFileHash = {};       // Key is file name, value is list of variant IDs (used for individual variant annotations)

        // BAM, VCF data fields
        this.vcfData = null;            // Combined vcf data for all phase files apart of this cohort
        this.fbData = null;
        this.bamData = null;
        this.vcfUrlEntered = false;
        this.vcfFileOpened = false;
        this.getVcfRefName = null;
        this.majorityBuild = '';        // Represents the build found in most uploaded files to the application (i.e., GRCh37 or GRCh38)
        this.bamUrlEntered = false;
        this.bamFileOpened = false;
        this.getBamRefName = null;

        this.trackName = '';            // Displays in italics before chips
        this.isGeneratedSampleName = false;
        this.vcfRefNamesMap = {};
        this.lastVcfAlertify = null;
        this.lastBamAlertify = null;
        this.debugMe = false;
        this.calledVariants = null;
        this.loadedVariants = null;
        this.selectedVariants = null;   // Selected in zoom panel
        this.coverage = [[]];

        // Optional subset IDs
        this.subsetIds = [];            // IDs that compose this cohort (filled for proband cohort also)
        this.subsetPhenotypes = [];     // Phrases describing phenotypic filtering data; displayed in track chips
        this.noMatchingSamples = false; // Flag to display No Matching Variants chip

        this.inProgress = {
            'fetchingHubData': false,
            'verifyingVcfUrl': false,
            'loadingVariants': false,
            'drawingVariants': false
        };

        // Pseudo-private access to variant model & parent data set
        this._variantModel = theVariantModel;
        this.getVariantModel = function () {
            return this._variantModel;
        }
        this.getDataSet = function () {
            return this._variantModel.dataSet;
        }

        // Identifiers
        this.isProbandCohort = false;
        this.isSubsetCohort = false;
        this.isUnaffectedCohort = false;
    }

    /* Returns descriptive name depending on the ID flags.
       Returns an empty string if the track is not a proband, subset, or unaffected cohort. */
    getName() {
        let self = this;
        if (self.isProbandCohort) return PROBAND_ID;
        if (self.isSubsetCohort) return SUBSET_ID;
        if (self.isUnaffectedCohort) return UNAFFECTED_ID;
        return '';
    }

    /* Returns sample name. Used in gene.iobio */

    getSampleName() {
        return this.sampleName;
    }

    /* Returns a sample name if provided in the VCF header, otherwise returns null. */
    getVcfSampleName() {
        return !this.isGeneratedSampleName ? (this.sampleName === "" ? null : this.sampleName) : null;
    }

    /* Returns gene model from parent variant model. */
    getGeneModel() {
        return this.getVariantModel().geneModel;
    }

    /* Returns translator from parent variant model. */
    getTranslator() {
        return this.getVariantModel().translator;
    }

    getCacheHelper() {
        return this.getVariantModel().cacheHelper;
    }

    /* Returns Simons ID map from parent variant model. */
    getSimonsIdMap() {
        return this.getVariantModel().simonsIdMap;
    }

    /* Sets sample name. */
    setSampleName(sampleName) {
        this.sampleName = sampleName;
    }

    /* Returns the first vcf in vcfEndptHash. */
    getFirstVcf() {
        let self = this;
        let urlNames = Object.keys(self.vcfEndptHash);
        if (urlNames != null && urlNames.length > 0 && urlNames[0] != null && urlNames[0] != '') {
            return self.vcfEndptHash[urlNames[0]];
        }
    }

    promiseSetLoadState(theVcfData, taskName) {
        let me = this;

        let resolveIt = function (resolve, theVcfData) {
            if (theVcfData != null) {
                if (theVcfData.loadState == null) {
                    theVcfData.loadState = {};
                }
                theVcfData.loadState[taskName] = true;
            }
            resolve();
        }

        return new Promise(function (resolve, reject) {
            if (theVcfData != null) {
                resolveIt(resolve, theVcfData);
            } else {
                me.promiseGetVcfData(window.gene, window.selectedTranscript)
                    .then(function (data) {
                            resolveIt(resolve, data.vcfData);
                        },
                        function (error) {
                            let msg = "A problem occurred in CohortModel.promiseSetLoadState(): " + error;
                            console.log(msg);
                            reject(msg);
                        })
            }
        })
    }

    getAnnotators() {
        return this.vcf ? this.vcf.getAnnotators() : [];
    }

    isLoaded() {
        return this.vcf != null && this.vcfData != null;
    }

    isReadyToLoad() {
        return (this.isVcfReadyToLoad() && this.isSampleSelected()) || this.isBamReadyToLoad();
    }

    isBamReadyToLoad() {
        return this.bam != null && (this.bamUrlEntered || this.bamFileOpened);
    }

    isVcfReadyToLoad() {
        return this.vcf != null && (this.vcfUrlEntered || this.vcfFileOpened);
    }

    isSampleSelected() {
        return !this.isMultiSample || (this.sampleName && this.sampleName.length > 0);
    }

    isBamLoaded() {
        return this.bam && (this.bamUrlEntered || (this.bamFileOpened && this.getBamRefName));
    }

    isVcfLoaded() {
        return this.vcf && (this.vcfUrlEntered || this.vcfFileOpened);
    }

    isInheritanceLoaded() {
        return (this.vcfData != null && this.vcfData.loadState != null && this.vcfData.loadState['inheritance']);
    }

    getAffectedInfo() {
        return this.affectedInfo;
    }

    getAnnotationScheme() {
        // If this is the refseq gene model, set the annotation
        // scheme on the filter card to 'VEP' since snpEff will
        // be bypassed at this time.
        if (this.getGeneModel().geneSource === 'refseq') {
            return "VEP";
        } else {
            return this.getDataSet().getAnnotationScheme();
        }
    }

    promiseGetVcfData(geneObject, selectedTranscript, whenEmptyUseFbData = true) {
        let me = this;
        let dataKind = CacheHelper.VCF_DATA;
        return new Promise(function (resolve, reject) {
            if (geneObject == null) {
                reject("Empty geneObject in CohortModel.promiseGetVcfData()");
            }

            // If only alignments have specified, but not variant files, we will need to use the
            // getBamRefName function instead of the getVcfRefName function.
            var theGetRefNameFunction = me.getVcfRefName != null ? me.getVcfRefName : me.getBamRefName;
            if (theGetRefNameFunction == null) {
                theGetRefNameFunction = me._stripRefName;
            }
            if (theGetRefNameFunction == null) {
                var msg = "No function defined to parse ref name from file";
                console.log(msg);
                reject(msg);
            }

            var theVcfData = null;

            if (me[dataKind] != null && me[dataKind].features && me[dataKind].features.length > 0) {
                if (theGetRefNameFunction(geneObject.chr) == me[dataKind].ref &&
                    geneObject.start == me[dataKind].start &&
                    geneObject.end == me[dataKind].end &&
                    geneObject.strand == me[dataKind].strand) {
                    theVcfData = me[dataKind];
                    resolve({model: me, vcfData: theVcfData});
                }
            }

            if (theVcfData == null) {
                // Find vcf data in cache
                me._promiseGetData(dataKind, geneObject.gene_name, selectedTranscript)
                    .then(function (data) {
                        if (data != null && data != '') {
                            me[dataKind] = data;
                            theVcfData = data;
                            resolve({model: me, vcfData: theVcfData});
                        } else {
                            // If the vcf data is null, see if there are called variants in the cache.  If so,
                            // copy the called variants into the vcf data.
                            if (whenEmptyUseFbData && me.isAlignmentsOnly()) {
                                me.promiseGetFbData(geneObject, selectedTranscript)
                                    .then(function (theFbData) {
                                            // If no variants are loaded, create a dummy vcfData with 0 features
                                            if (theFbData && theFbData.features) {
                                                theVcfData = $.extend({}, theFbData);
                                                theVcfData.features = [];
                                                me.promiseSetLoadState(theVcfData, 'clinvar')
                                                    .then(function () {
                                                        return me.promiseSetLoadState(theVcfData, 'coverage');
                                                    })
                                                    .then(function () {
                                                        return me.promiseSetLoadState(theVcfData, 'inheritance');
                                                    })
                                                    .then(function () {
                                                        me.addCalledVariantsToVcfData(theVcfData, theFbData);
                                                    })
                                            }
                                            resolve({model: me, vcfData: theVcfData});

                                        },
                                        function (error) {
                                            var msg = "Problem occurred in CohortModel.promiseGetVcfData: " + error;
                                            console.log(msg);
                                            reject(error);
                                        });
                            } else {
                                resolve({model: me, vcfData: theVcfData});
                            }
                        }
                    })
            }
        });
    }

    promiseGetFbData(geneObject, selectedTranscript, reconstiteFromVcfData = false) {
        let me = this;
        return new Promise(function (resolve, reject) {
            me._promiseGetData(CacheHelper.FB_DATA, geneObject.gene_name, selectedTranscript)
                .then(function (theFbData) {
                        if (reconstiteFromVcfData) {
                            // Reconstitute called variants from vcf data that contains called variants
                            if (theFbData == null || theFbData.features == null) {
                                me.promiseGetVcfData(geneObject, selectedTranscript, false)
                                    .then(function (data) {
                                            var theVcfData = data.vcfData;
                                            var dangerSummary = me.promiseGetDangerSummary(geneObject.gene_name)
                                                .then(function (dangerSummary) {
                                                        if (theVcfData && theVcfData.features) {
                                                            theFbData = me.reconstituteFbData(theVcfData);
                                                            resolve({fbData: theFbData, model: me});
                                                        } else {
                                                            resolve({fbData: theFbData, model: me});
                                                        }
                                                    },
                                                    function (error) {
                                                        var msg = "An error occurred in CohortModel.promiseGetFbData: " + error;
                                                        console.log(msg);
                                                        reject(msg);
                                                    })

                                        },
                                        function (error) {
                                            var msg = "An error occurred in CohortModel.promiseGetFbData: " + error;
                                            console.log(msg);
                                            reject(msg);
                                        });
                            } else {
                                resolve({fbData: theFbData, model: me});
                            }
                        } else {
                            resolve({fbData: theFbData, model: me});
                        }
                    },
                    function (error) {
                        var msg = "Problem in CohortModel.promiseGetFbData(): " + error;
                        console.log(msg);
                        reject(msg);
                    })
        })
    }

    reconstituteFbData(theVcfData) {
        let me = this;
        let theFbData = $.extend({}, theVcfData);
        theFbData.features = [];
        theFbData.loadState = {clinvar: true, coverage: true, inheritance: true};
        // Add the unique freebayes variants to vcf data to include
        // in feature matrix
        theVcfData.features.forEach(function (v) {
            if (v.hasOwnProperty('fbCalled') && v.fbCalled == 'Y') {
                let variantObject = $.extend({}, v);
                theFbData.features.push(variantObject);
                variantObject.source = v;
            }
        });
        return theFbData;
    }

    promiseGetKnownVariants(geneObject, transcript, binLength) {
        let me = this;
        return new Promise(function (resolve, reject) {
            let refName = me._stripRefName(geneObject.chr);
            me.vcf.promiseGetKnownVariants(refName, geneObject, transcript, binLength)
                .then(function (results) {
                        resolve(results);
                        /* SJG TODO: currently not being called - artifact from gene?
                        if (transcript) {
                      var exonBins = me.binKnownVariantsByExons(geneObject, transcript, binLength, results);
                      resolve(exonBins);
                    } else {
                          resolve(results);
                    }
                    */
                    },
                    function (error) {
                        reject(error);
                    });
        })
    }

    /*binKnownVariantsByExons(geneObject, transcript, binLength, results) {
      let exonBins = [];
      transcript.features.filter(function(feature) {
        return feature.feature_type.toUpperCase() == 'CDS' || feature.feature_type.toUpperCase() == 'CDS';
      }).forEach(function(exon) {
        var exonBin = {point: (+exon.start + ((+exon.end - +exon.start)/2)), start: exon.start, end: exon.end, total: +0, path: +0, benign: +0, unknown: +0, other: +0};
        results.forEach(function(rec) {
          if (+rec.start >= +exon.start && +rec.end <= +exon.end) {
            exonBin.total    += +rec.total;
            exonBin.path     += +rec.path;
            exonBin.benign   += +rec.benign;
            exonBin.other    += +rec.other;
            exonBin.unknown  += +rec.unknown;
          }
        })
        exonBins.push(exonBin);
      })
      return exonBins;
    }*/

    /*
    promiseGetGeneCoverage(geneObject, transcript) {
      var me = this;

      return new Promise( function(resolve, reject) {
        me.promiseGetCachedGeneCoverage(geneObject, transcript)
         .then( function(cachedGeneCoverage) {
          if (cachedGeneCoverage) {
            resolve({model: me, 'geneCoverage': cachedGeneCoverage})
          } else {
            if (transcript.features == null || transcript.features.length == 0) {
              resolve({model: me, gene: geneObject, transcript: transcript, 'geneCoverage': []});
            } else {
              me.bam.getGeneCoverage(geneObject,
                transcript,
                [me.bam],
                function(theData, trRefName, theGeneObject, theTranscript) {
                  var geneCoverageObjects = me._parseGeneCoverage(theData);
                  if (geneCoverageObjects.length > 0) {
                    me._setGeneCoverageExonNumbers(transcript, geneCoverageObjects);
                    me.setGeneCoverageForGene(geneCoverageObjects, theGeneObject, theTranscript);
                    resolve({model: me, gene: theGeneObject, transcript: theTranscript, 'geneCoverage': geneCoverageObjects});
                  } else {
                    console.log("Cannot get gene coverage for gene " + theGeneObject.gene_name);
                    resolve({model: me, gene: theGeneObject, transcript: theTranscript, 'geneCoverage': []});
                  }
                }
              );
            }
          }
         },
         function(error) {
          reject(error);
         });
      });
    }

    _setGeneCoverageExonNumbers(transcript, geneCoverageObjects) {
      var me = this;
      transcript.features.forEach(function(feature) {
        var gc = null;
        var matchingFeatureCoverage = geneCoverageObjects.filter(function(gc) {
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
        theData.split("\n").forEach(function(rec) {
          if (rec.indexOf("#") == 0 && fieldNames.length == 0) {
            rec.split("\t").forEach(function(field) {
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
                    var parts  = fields[i].split(":");
                    gc.chrom   = parts[0];
                    var region = parts[1].split("-");
                    gc.start   = region[0];
                    gc.end     = region[1];
                  }
                }
              }
              geneCoverageObjects.push(gc);
            }
          }
        })
      }
      return geneCoverageObjects;
    }*/

    promiseGetCachedGeneCoverage(geneObject, selectedTranscript) {
        let self = this;
        return self._promiseGetData(CacheHelper.GENE_COVERAGE_DATA, geneObject.gene_name, selectedTranscript, cacheHelper);
    }

    // setGeneCoverageForGene(geneCoverage, geneObject, transcript) {
    //   let self = this;
    //   geneObject = geneObject ? geneObject : window.gene;
    //   transcript = transcript ? transcript : window.selectedTranscript;
    //   self._promiseCacheData(geneCoverage, CacheHelper.GENE_COVERAGE_DATA, geneObject.gene_name, transcript);
    // }

    promiseGetDangerSummary(geneName) {
        let self = this;
        return self._promiseGetData(CacheHelper.DANGER_SUMMARY_DATA, geneName, null, cacheHelper);
    }

    // promiseGetVariantCount(data) {
    //   var me = this;
    //
    //   var resolveIt = function(resolve, theVcfData) {
    //     var loadedVariantCount = 0;
    //     if (theVcfData && theVcfData.features) {
    //       theVcfData.features.forEach(function(variant) {
    //         if (variant.fbCalled == 'Y') {
    //
    //         } else if (variant.zygosity && variant.zygosity.toLowerCase() == "homref") {
    //
    //         } else {
    //           loadedVariantCount++;
    //         }
    //       });
    //     }
    //     resolve(loadedVariantCount);
    //
    //   }
    //   return new Promise(function(resolve, reject) {
    //     var theVcfData = null;
    //     if (data != null && data.features != null) {
    //       resolveIt(resolve, data);
    //     } else {
    //       me.promiseGetVcfData(window.gene, window.selectedTranscript)
    //        .then(function(theData) {
    //         theVcfData = theData.vcfData;
    //         resolveIt(resolve, theData.vcfData);
    //        },
    //        function(error) {
    //         var msg = "Problem in CohortModel.promiseGetVariantCount(): " + error;
    //         console.log(msg);
    //         reject(msg);
    //        })
    //     }
    //   })
    //
    // }

    promiseSummarizeDanger(geneName, theVcfData, options, geneCoverageAll, filterModel) {
        var me = this;
        return new Promise(function (resolve, reject) {
            var dangerSummary = CohortModel._summarizeDanger(geneName, theVcfData, options, geneCoverageAll, filterModel, me.getTranslator(), me.getAnnotationScheme());
            me.promiseCacheDangerSummary(dangerSummary, geneName).then(function () {
                    resolve(dangerSummary);
                },
                function (error) {
                    reject(error);
                })
        })
    }

    promiseSummarizeError(geneName, error) {
        var me = this;
        return new Promise(function (resolve, reject) {
            var dangerSummary = CohortModel.summarizeError(error);
            me.promiseCacheDangerSummary(dangerSummary, geneName)
                .then(function () {
                        resolve(dangerSummary);
                    },
                    function (error) {
                        reject(error);
                    })
        })
    }

    // filterBamDataByRegion(coverage, regionStart, regionEnd) {
    //   return coverage.filter(function(d) {
    //     return (d[0] >= regionStart && d[0] <= regionEnd);
    //   });
    // }
    //
    // reduceBamData(coverageData, numberOfPoints) {
    //   var factor = d3.round(coverageData.length / numberOfPoints);
    //   var xValue = function(d) { return d[0]; };
    //   var yValue = function(d) { return d[1]; };
    //   return this.bam.reducePoints(coverageData, factor, xValue, yValue);
    // }

    setLoadedVariants(theVcfData) {
        this.vcfData = theVcfData;
    }

    // setCalledVariants(theFbData, cache=false) {
    //   let self = this;
    //   self.fbData = theFbData;
    //   if (cache) {
    //     self._promiseCacheData(theFbData, CacheHelper.FB_DATA, window.gene.gene_name, window.selectedTranscript);
    //   }
    // }
    //
    // promiseGetCalledVariantCount() {
    //   var me = this;
    //   return new Promise(function(resolve, reject) {
    //     me.promiseGetFbData(window.gene, window.selectedTranscript, true)
    //      .then(function(data) {
    //       var theFbData = data.fbData;
    //       if (theFbData && theFbData.features ) {
    //         var count = theFbData.features
    //          .filter(function(d) {
    //           // Filter homozygous reference for proband only
    //           if (d.zygosity && d.zygosity.toLowerCase() == 'homref') {
    //             return false;
    //           }
    //           return true;
    //          }).length;
    //          resolve(count);
    //       } else {
    //         resolve(0);
    //       }
    //      },
    //      function(error) {
    //       var msg = "Problem in getCalledVariantCount(): " + error;
    //       console.log(msg);
    //       reject(msg);
    //      });
    //   })
    // }

    // promiseHasCalledVariants() {
    //   var me = this;
    //   return new Promise(function(resolve,reject) {
    //     if (me.fbData != null ) {
    //       resolve(me.fbData != null && me.fbData.features != null && me.fbData.features.length > 0);
    //     } else {
    //       me.promiseGetFbData(window.gene, window.selectedTranscript, true)
    //        .then(function(data) {
    //         resolve(data.fbData != null && data.fbData.features != null && data.fbData.features.length > 0);
    //        },
    //        function(error) {
    //         var msg = "Problem in CohortModel.promiseHasCalledVariants(): " + error;
    //         console.log(msg);
    //         reject(msg);
    //        })
    //     }
    //   })
    // }
    //
    // promiseVariantsHaveBeenCalled() {
    //   var me = this;
    //   return new Promise(function(resolve, reject) {
    //     if (me.fbData) {
    //       resolve(true);
    //     } else {
    //       me.promiseGetFbData(window.gene, window.selectedTranscript, true)
    //        .then(function(data) {
    //         resolve(data.fbData != null);
    //        },
    //        function(error) {
    //         var msg = "Problem in CohortModel.promiseVariantsHaveBeenCalled(): " + error;
    //         console.log(msg);
    //         reject(msg);
    //        });
    //     }
    //   })
    //
    // }

    /* Setup VCF fields */
    init(variantModel, vcfFileNames) {
        let me = this;

        vcfFileNames.forEach((fileName) => {
            me.vcfEndptHash[fileName] = vcfiobio();
            let currEndpt = me.vcfEndptHash[fileName];
            currEndpt.setEndpoint(variantModel.endpoint);
            currEndpt.setGenericAnnotation(variantModel.genericAnnotation);
            currEndpt.setGenomeBuildHelper(variantModel.genomeBuildHelper);
        });
        // TODO: get rid of once refactor done
        // me.vcf = vcfiobio();
        // me.vcf.setEndpoint(variantModel.endpoint);
        // me.vcf.setGenericAnnotation(variantModel.genericAnnotation);
        // me.vcf.setGenomeBuildHelper(variantModel.genomeBuildHelper);
    };

    // promiseBamFilesSelected(event) {
    //   var me = this;
    //   return new Promise(function(resolve, reject) {
    //     me.bamData = null;
    //     me.fbData = null;
    //     me.bam = new Bam();
    //     me.bam.openBamFile(event, function(success, message) {
    //       if (me.lastBamAlertify) {
    //         me.lastBamAlertify.dismiss();
    //       }
    //       if (success) {
    //         me.bamFileOpened = true;
    //         me.getBamRefName = me._stripRefName;
    //         resolve(me.bam.bamFile.name);
    //       } else {
    //         if (me.lastBamAlertify) {
    //           me.lastBamAlertify.dismiss();
    //         }
    //         var msg = "<span style='font-size:18px'>" + message + "</span>";
    //             alertify.set('notifier','position', 'top-right');
    //         me.lastBamAlertify = alertify.error(msg, 15);
    //
    //         reject(message);
    //       }
    //     });
    //   });
    // }
    //
    // onBamUrlEntered(bamUrl, baiUrl, callback) {
    //   var me = this;
    //   this.bamData = null;
    //   this.fbData = null;
    //
    //   if (bamUrl == null || bamUrl.trim() == "") {
    //     this.bamUrlEntered = false;
    //     this.bam = null;
    //   } else {
    //     this.bamUrlEntered = true;
    //     this.bam = new Bam(this.cohort.endpoint, bamUrl, baiUrl);
    //     this.bam.checkBamUrl(bamUrl, baiUrl, function(success, errorMsg) {
    //       if (me.lastBamAlertify) {
    //         me.lastBamAlertify.dismiss();
    //       }
    //       if (!success) {
    //         this.bamUrlEntered = false;
    //         this.bam = null;
    //         var msg = "<span style='font-size:18px'>" + errorMsg + "</span><br><span style='font-size:12px'>" + bamUrl + "</span>";
    //             alertify.set('notifier','position', 'top-right');
    //         me.lastBamAlertify = alertify.error(msg, 15);
    //       }
    //       if(callback) {
    //         callback(success);
    //       }
    //     });
    //   }
    //     this.getBamRefName = this._stripRefName;
    // }

    // promiseVcfFilesSelected(event) {
    //   var me = this;
    //
    //   return new Promise( function(resolve, reject) {
    //     me.sampleName = null;
    //     me.vcfData = null;
    //     me.vcf.openVcfFile( event,
    //       function(success, message) {
    //         if (me.lastVcfAlertify) {
    //           me.lastVcfAlertify.dismiss();
    //         }
    //         if (success) {
    //           me.vcfFileOpened = true;
    //           me.vcfUrlEntered = false;
    //           me.getVcfRefName = null;
    //           me.isMultiSample = false;
    //
    //           // Get the sample names from the vcf header
    //             me.vcf.getSampleNames( function(sampleNames) {
    //               me.isMultiSample = sampleNames && sampleNames.length > 1 ? true : false;
    //               resolve({'fileName': me.vcf.getVcfFile().name, 'sampleNames': sampleNames});
    //             });
    //         } else {
    //           var msg = "<span style='font-size:18px'>" + message + "</span>";
    //             alertify.set('notifier','position', 'top-right');
    //             me.lastVcfAlertify = alertify.error(msg, 15);
    //
    //           reject(message);
    //         }
    //       }
    //     );
    //   });
    // }
    //
    // clearVcf(cardIndex) {
    //
    //   this.vcfData = null;
    //   this.vcfUrlEntered = false;
    //   this.vcfFileOpened = false;
    //   this.sampleName = null;
    //   window.utility.removeUrl('sample'+ cardIndex);
    //   window.utility.removeUrl('vcf' + cardIndex);
    //   window.utility.removeUrl('name'+ cardIndex);
    //   this.vcf.clear();
    // }
    //
    // clearBam(cardIndex) {
    //
    //   this.bamData = null;
    //   this.bamUrlEntered = false;
    //   this.bamFileOpened = false;
    //   window.utility.removeUrl('bam' + cardIndex);
    //   if (this.bam) {
    //     this.bam.clear();
    //   }
    // }


    /* Checks vcfs to ensure they are found and can be successfully opened. Also retrieves build information
     * for each vcf provided.
     *
     * Takes in three stably sorted lists of file names, vcf urls, and tbi urls.
     *
     * Returns three stable sorted lists of vcf names, urls, and tbi urls.
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

                let openPromises = [];
                let singleSuccess = true;
                for (let i = 0; i < vcfUrls.length; i++) {
                    let p = new Promise((resolve, reject) => {
                        let currFileName = urlNames[i];
                        let currVcfEndpt = me.vcfEndptHash[currFileName];
                        let currVcf = vcfUrls[i];
                        let currTbi = tbiUrls[i];
                        currVcfEndpt.openVcfUrl(currVcf, currTbi, function (success, errorMsg, hdrBuildResult) {
                            singleSuccess |= success;
                            if (success) {
                                // Get the sample names from the vcf header
                                currVcfEndpt.getSampleNames(function (sampleNames) {
                                    me.isMultiSample = !!(sampleNames && sampleNames.length > 1);   // TODO: this may be need to be moved to vcf model - not sure what fxnality is
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

                        // Remove files that that could not be found or opened
                        if (openErrorFiles.length === urlNames.length) {
                            me.vcfUrlEntered = false;
                            errorMsg = 'None of the provided files could be found or opened. If launching from Mosaic, please contact a Frameshift representative.';
                            alert(errorMsg);
                            reject();
                        }
                        else if (openErrorFiles.length > 0) {
                            errorMsg += 'The following files could not be found and will not be included in the analysis: ' + openErrorFiles.join(',');
                            me.removeEntriesFromHash(openErrorFiles);
                            let updatedListObj = me.removeEntriesFromLists(openErrorFiles, urlNames, vcfUrls, tbiUrls);
                            urlNames = updatedListObj['names'];
                            vcfUrls = updatedListObj['vcfs'];
                            tbiUrls = updatedListObj['tbis'];
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
                            errorMsg = 'None of the provided files could be loaded because their reference build could not be determined. If launching from Mosaic, please contact a Frameshift representative.';
                            reject();
                        }
                        // If we have some files we couldn't find a reference for, remove from lists
                        else if (unfoundRefFiles.length > 0) {
                            me.removeEntriesFromHash(unfoundRefFiles);
                            updatedListObj = me.removeEntriesFromLists(unfoundRefFiles, urlNames, vcfUrls, tbiUrls);
                            urlNames = updatedListObj['names'];
                            vcfUrls = updatedListObj['vcfs'];
                            tbiUrls = updatedListObj['tbis'];
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
                            updatedListObj = me.removeEntriesFromLists(minorityRefKeyNames, urlNames, vcfUrls, tbiUrls);
                            urlNames = updatedListObj['names'];
                            vcfUrls = updatedListObj['vcfs'];
                            tbiUrls = updatedListObj['tbis'];
                            errorMsg += ' The following files will not be included in the analysis because their reference build could not be determined: ' + unfoundRefFiles.join(',');
                        }

                        // Set flags and display error message as appropriate
                        if (errorMsg !== '') {
                            alert(errorMsg);
                        }
                        me.vcfUrlEntered = true;
                        me.vcfFileOpened = false;
                        me.getVcfRefName = null;
                        resolve(updatedListObj);
                    });
            }
        });
    }

    /* Takes in a list of file names and removes them from the subsequent three provided lists.
     * If a file name is provided that is not within nameList, vcfList, and/or tbiList, nothing is affected
     * Returns nameList, vcfList, and tbiList in a combined object. */
    removeEntriesFromLists(fileNames, nameList, vcfList, tbiList) {
        let self = this;

        // Create return object
        let listObj = {};

        fileNames.forEach((fileName) => {
            // Get index of file relative to all lists
            let fileIndex = nameList.indexOf(fileName);
            nameList.splice(fileIndex, 1);
            vcfList.splice(fileIndex, 1);
            tbiList.splice(fileIndex, 1);
        });

        listObj['names'] = nameList;
        listObj['vcfs'] = vcfList;
        listObj['tbis'] = tbiList;
        return listObj;
    }

    /* Removes the object-key pair from this cohort's vcf endpoint hash. */
    removeEntriesFromHash(fileNames) {
        let self = this;
        fileNames.forEach((fileName) => {
            self.vcfEndptHash = _.omit(self.vcfEndptHash,fileName);
        })
    }


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
                let firstVcfEndpt = me.getFirstVcf();

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

    // promiseGetMatchingVariant(variant) {
    //   var me = this;
    //   return new Promise(function(resolve, reject) {
    //     var theVcfData = me.promiseGetVcfData(window.gene, window.selectedTranscript)
    //      .then(function(data) {
    //       var theVcfData = data.vcfData;
    //       var matchingVariant = null;
    //       if (theVcfData && theVcfData.features) {
    //         theVcfData.features.forEach(function(v) {
    //           if (v.start == variant.start
    //               && v.end == variant.end
    //               && v.ref == variant.ref
    //               && v.alt == variant.alt
    //               && v.type.toLowerCase() == variant.type.toLowerCase()) {
    //             matchingVariant = v;
    //           }
    //         });
    //       }
    //       resolve(matchingVariant);
    //      },
    //      function(error) {
    //       var msg = "A problem occurred in CohortModel.promiseGetMatchingVariant(): " + error;
    //       console.log(msg);
    //       reject(msg);
    //      })
    //   });
    // }

    /*
    * A gene has been selected. Clear out the model's state
    * in preparation for getting data.
    */
    wipeGeneData() {
        var me = this;
        this.vcfData = null;
        this.fbData = null;
        this.bamData = null;
    }

    // promiseAnnotated(theVcfData) {
    //   var me = this;
    //   return new Promise( function(resolve, reject) {
    //     if (theVcfData != null &&
    //       theVcfData.features != null &&
    //       theVcfData.loadState != null &&
    //        //(dataCard.mode == 'single' || theVcfData.loadState['inheritance'] == true) &&
    //       theVcfData.loadState['clinvar'] == true ) {
    //
    //       resolve();
    //
    //     } else {
    //       reject();
    //     }
    //   });
    // }
    //
    // promiseAnnotatedAndCoverage(theVcfData) {
    //   var me = this;
    //   return new Promise( function(resolve, reject) {
    //     if (theVcfData != null &&
    //       theVcfData.features != null &&
    //       theVcfData.loadState != null &&
    //        (dataCard.mode == 'single' || theVcfData.loadState['inheritance'] == true) &&
    //       theVcfData.loadState['clinvar'] == true  &&
    //       (!me.isBamLoaded() || theVcfData.loadState['coverage'] == true)) {
    //       resolve();
    //
    //     } else {
    //       reject();
    //     }
    //   });
    // }

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
                        containingVcf.promiseGetVariants(
                            me.getVcfRefName(theGene.chr),
                            fakeGeneObject,
                            theTranscript,
                            null,   // regions
                            false,   //isMultiSample
                            me.getFormattedSampleIds('subset'),
                            me.getFormattedSampleIds('proband'),
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

                                                            // re-cache the data
                                                            me._promiseCacheData(cachedVcfData, CacheHelper.VCF_DATA, theGene.gene_name, theTranscript)
                                                                .then(function () {
                                                                    // return the annotated variant
                                                                    resolve(theVariant);
                                                                }, function (error) {
                                                                    let msg = "Problem caching data in CohortModel.promiseGetVariantExtraAnnotations(): " + error;
                                                                    console.log(msg);
                                                                    reject(msg);
                                                                });

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
                                    var msg = "Empty results returned from CohortModel.promiseGetVariantExtraAnnotations() for variant " + variant.chrom + " " + variant.start + " " + variant.ref + "->" + variant.alt;
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


    promiseAnnotateVariants(theGene, theTranscript, cohortModels, isMultiSample, isBackground, keepVariantsCombined, enrichMode = false) {
        let me = this;

        return new Promise(function (resolve, reject) {
            me._promiseVcfRefName(theGene.chr)
                .then(function () {
                    let urlNames = Object.keys(me.vcfEndptHash);
                    let annotationResults = {};
                    let annotationPromises = [];
                    for (let i = 0; i < urlNames.length; i++) {
                        let currFileName = urlNames[i];
                        let currVcfEndpt = me.vcfEndptHash[currFileName];
                        if (currVcfEndpt != null) {
                            let subsetIds = me.getFormattedSampleIds('subset');
                            let probandIds = me.getFormattedSampleIds('probands');
                            let annoP = currVcfEndpt.promiseGetVariants(
                                me.getVcfRefName(theGene.chr),
                                theGene,
                                theTranscript,
                                null,       // regions
                                isMultiSample,
                                subsetIds,
                                probandIds,
                                me.getName() === 'known-variants' ? 'none' : me.getAnnotationScheme().toLowerCase(),
                                me.getTranslator().clinvarMap,
                                me.getGeneModel().geneSource === 'refseq',
                                false,      // hgvs notation
                                false,      // rsid
                                true,      // vep af
                                null,
                                keepVariantsCombined,
                                enrichMode)
                                .then((results) => {
                                    annotationResults[currFileName] = results;
                                });
                            annotationPromises.push(annoP);

                        } else {
                            console.log('Problem in CohortModel promoiseAnnotateVariants: Could not retrieve endpoint for the file: ' + urlNames[i]);
                        }
                    }
                    Promise.all(annotationPromises)
                        .then(() => {
                            resolve(annotationResults);
                        })
                        .catch((error) => {
                            console.log('Problem in cohort model ' + error);
                        });
                });
        });
    }


    /* Promises to obtain enrichment values for all variants within all urls within the provided cohort model. */
    promiseAnnotateVariantEnrichment(theGene, theTranscript, cohortModels, isMultiSample, isBackground, keepVariantsCombined, enrichmentMode = true) {
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
                            let subsetIds = me.getFormattedSampleIds('subset');
                            let probandIds = me.getFormattedSampleIds('probands');
                            let enrichP = currVcfEndpt.promiseGetVariants(
                                me.getVcfRefName(theGene.chr),
                                theGene,
                                theTranscript,
                                null,       // regions
                                isMultiSample,
                                subsetIds,
                                probandIds,
                                me.getName() === 'known-variants' ? 'none' : me.getAnnotationScheme().toLowerCase(),
                                me.getTranslator().clinvarMap,
                                me.getGeneModel().geneSource === 'refseq',
                                false,      // hgvs notation
                                false,      // rsid
                                false,      // vep af
                                null,
                                keepVariantsCombined,
                                enrichmentMode)
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
                            let combinedResults = me._combineEnrichmentCounts(enrichResults);
                            if (combinedResults) {
                                let theGeneObject = me.getGeneModel().geneObjects[combinedResults.gene];
                                if (theGeneObject) {
                                    let resultMap = {};
                                    let model = cohortModels[0];
                                    let theVcfData = combinedResults;
                                    if (theVcfData == null) {
                                        if (callback) {
                                            callback();
                                        }
                                        return;
                                    }
                                    theVcfData.gene = theGeneObject;
                                    let cohortName = me.getName();
                                    resultMap[cohortName] = theVcfData;

                                    if (!isBackground) {
                                        model.vcfData = theVcfData;
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

    /* Combines zygosity counts for each variant, from each vcf file, into the first object in annotation results. Recalculates subset delta and reassigns.
    *  If only one vcf result is provided, returns original data. */
    _combineEnrichmentCounts(annotationResults) {
        let self = this;

        let vcfNames = Object.keys(annotationResults);
        let combinedResults = annotationResults[vcfNames[0]];
        let featureLookup = {};
        let featureList = combinedResults.features;
        for (let i = 0; i < featureList.length; i++) {
            featureLookup[featureList[i].id] = i;
        }

        for (let i = 1; i < vcfNames.length; i++) {
            let currName = vcfNames[i];
            let currResult = annotationResults[currName];
            if (currResult != null) {
                // Combine currResult features into combined result object
                let currFeatures = currResult.features;
                currFeatures.forEach((feature) => {
                    if (featureLookup[feature.id] != null) {
                        // Pull out existing counts
                        let combinedIndex = featureLookup[feature.id];
                        let combinedFeatures = combinedResults.features;
                        let currProCounts = combinedFeatures[combinedIndex].probandZygCounts;
                        let currSubCounts = combinedFeatures[combinedIndex].subsetZygCounts;

                        // Pull out additional counts to add
                        let addProCounts = feature.probandZygCounts;
                        let addSubCounts = feature.subsetZygCounts;

                        // Combine counts
                        currProCounts[0] += addProCounts[0];    // Hom ref
                        currProCounts[1] += addProCounts[1];    // Hets
                        currProCounts[2] += addProCounts[2];    // Hom alt
                        currProCounts[3] += addProCounts[3];    // No call
                        currSubCounts[0] += addSubCounts[0];    // Hom ref
                        currSubCounts[1] += addSubCounts[1];    // Hets
                        currSubCounts[2] += addSubCounts[2];    // Hom alt
                        currSubCounts[3] += addSubCounts[3];    // No call

                        // Reassign counts back
                        combinedResults.features[combinedIndex].probandZygCounts = currProCounts;
                        combinedResults.features[combinedIndex].subsetZygCounts = currSubCounts;

                        // Recalculate subset delta
                        let totalProbandCount = +currProCounts[0] + +currProCounts[1] + +currProCounts[2] + +currProCounts[3];
                        let totalSubsetCount = +currSubCounts[0] + +currSubCounts[1] + +currSubCounts[2] + +currSubCounts[3];
                        let affectedSubsetCount = +currSubCounts[1] + +currSubCounts[2];
                        let affectedProbandCount = +currProCounts[1] + +currProCounts[2];
                        let subsetPercentage = totalSubsetCount === 0 ? 0 : affectedSubsetCount / totalSubsetCount * 100;  // Can be 0
                        let probandPercentage = affectedProbandCount / totalProbandCount * 100; // Can never be 0
                        combinedResults.features[combinedIndex].subsetDelta = subsetPercentage === 0 ? 1 : subsetPercentage / probandPercentage;

                        // Add this feature to the combinedResults if it doesn't already exist
                    } else {
                        combinedResults.features.push(feature);

                        // Add feature to lookup
                        featureLookup[feature.id] = combinedResults.features.length - 1;
                    }
                });
            }
        }
        return combinedResults;
    }

    _combineUniqueFeatures(results) {
        var combinedFeatures = [];
        if (results != null && results.length > 0) {
            results.forEach(function (sample) {
                combinedFeatures = combinedFeatures.concat(sample.features);
            })
        }
        return combinedFeatures;
    }

    _promiseDetermineVariantBookmarks(theVcfData, theGeneObject, theTranscript) {
        var me = this;

        if (me.getName() == PROBAND_ID) {
            return bookmarkCard.promiseDetermineVariantBookmarks(theVcfData, theGeneObject, theTranscript);
        } else {
            return new Promise(function (resolve, reject) {
                resolve();
            })
        }
    }

    assessVariantImpact(theVcfData, theTranscript) {
        var me = this;
        if (theVcfData == null || theVcfData.features == null) {
            return;
        }
        theVcfData.features.forEach(function (variant) {

            variant.harmfulVariantLevel = 'none';
            variant.harmfulVariant = null;
            variant.afFieldHighest = null;
            variant.afHighest = '.';

            var variantDanger = {
                meetsAf: false,
                af: false,
                impact: false,
                clinvar: false,
                sift: false,
                polyphen: false,
                inheritance: false
            };

            // For ExAC levels, differentiate between af not found and in
            // coding region (level = private) and af not found and intronic (non-coding)
            // region (level = unknown)
            if (variant.afExAC == 0) {
                variant.afExAC = -100;
                me.getGeneModel().getCodingRegions(theTranscript).forEach(function (codingRegion) {
                    if (variant.start >= codingRegion.start && variant.end <= codingRegion.end) {
                        variant.afExAC = 0;
                    }
                });
            }
            if (variant.afgnomAD == '.') {
                variant.afgnomAD = 0;
            }

            for (key in variant.highestImpactVep) {
                if (me.getTranslator().impactMap.hasOwnProperty(key) && me.getTranslator().impactMap[key].badge) {
                    if (key == 'HIGH' || key == 'MODERATE') {
                        variantDanger.impact = key.toLowerCase();
                    }
                }
            }

            for (key in variant.highestSIFT) {
                if (me.getTranslator().siftMap.hasOwnProperty(key) && me.getTranslator().siftMap[key].badge) {
                    variantDanger.sift = key.split("_").join(" ").toLowerCase();
                }
            }

            for (key in variant.highestPolyphen) {
                if (me.getTranslator().polyphenMap.hasOwnProperty(key) && me.getTranslator().polyphenMap[key].badge) {
                    variantDanger.polyphen = key.split("_").join(" ").toLowerCase();
                }
            }

            if (variant.hasOwnProperty('clinvar')) {
                var clinvarEntry = null;
                var clinvarDisplay = null;
                var clinvarKey = null;
                for (var key in me.getTranslator().clinvarMap) {
                    var self = me.getTranslator().clinvarMap[key];
                    if (self.clazz == variant.clinvar) {
                        clinvarEntry = self;
                        clinvarDisplay = key;
                        clinvarKey = key;
                    }
                }
                if (clinvarEntry && clinvarEntry.badge) {
                    variantDanger.clinvar = clinvarDisplay;
                }
            }

            if (variant.inheritance && variant.inheritance != 'none') {
                variantDanger.inheritance = true;
            }

            // Figure out which is the highest AF between exac, 1000g, and gnomAD
            me._determineHighestAf(variant);

            // Determine if the highest AF is in a range that we consider 'rare'
            if (variant.afFieldHighest) {
                me.getTranslator().afHighestMap.forEach(function (rangeEntry) {
                    if (+variant.afHighest > rangeEntry.min && +variant.afHighest <= rangeEntry.max) {
                        if (rangeEntry.badge) {
                            variantDanger.af = +variant.afHighest;
                            variantDanger.meetsAf = true;
                        }
                    }
                });
            }

            // Turn on flag for harmful variant if one is found
            if (variantDanger.meetsAf && (variantDanger.impact || variantDanger.clinvar || variantDanger.sift || variantDanger.polyphen)) {
                variant.harmfulVariant = {
                    'type': variant.type,
                    'clinvar': variantDanger.clinvar,
                    'polyphen': variantDanger.polyphen,
                    'SIFT': variantDanger.sift,
                    'impact': variantDanger.impact,
                    'inheritance': variant.inheritance && variant.inheritance != 'none' ? variant.inheritance : false,
                    'level': variantDanger.clinvar ? 1 : (variantDanger.impact == 'high' ? 2 : 3)
                };
                variant.harmfulVariantLevel = variant.harmfulVariant.level;
            }
        });
    }

    _determineHighestAf(variant) {
        var me = this;
        // Find the highest value (the least rare AF) betweem exac and 1000g to evaluate
        // as 'lowest' af for all variants in gene
        var afHighest = null;
        if ($.isNumeric(variant.afExAC) && $.isNumeric(variant.af1000G)) {
            // Ignore exac n/a.  If exac is higher than 1000g, evaluate exac
            if (variant.afExAC > -100 && variant.afExAC >= variant.af1000G) {
                variant.afFieldHighest = 'afExAC';
            } else {
                variant.afFieldHighest = 'af1000G';
            }
        } else if ($.isNumeric(variant.afExAC)) {
            variant.afFieldHighest = 'afExAC';

        } else if ($.isNumeric(variant.af1000G)) {
            variant.afFieldHighest = 'af1000G';
        }
        afHighest = me.getHighestAf(variant);

        if (global_vepAF) {
            if ($.isNumeric(variant.vepAf.gnomAD.AF) && afHighest) {
                if (variant.vepAf.gnomAD.AF >= afHighest) {
                    variant.afFieldHighest = 'afgnomAD';
                }
            } else if ($.isNumeric(variant.vepAf.gnomAD.AF)) {
                variant.afFieldHighest = 'afgnomAD';
            }
        }
        variant.afHighest = me.getHighestAf(variant);
    }

    getHighestAf(variant) {
        var me = this;
        if (variant.afFieldHighest) {
            var subfields = variant.afFieldHighest.split(".");
            var current = variant;
            subfields.forEach(function (subfield) {
                current = current[subfield];
            })
            return current;
        } else {
            return null;
        }
    }

    _determineAffectedStatusImpl(theVcfData, affectedStatus, affectedInfo) {
        var me = this;
        theVcfData.features.forEach(function (variant) {
            CohortModel._determineAffectedStatusForVariant(variant, affectedStatus, affectedInfo);
        });
    }

    promiseIsCached(geneName, transcript) {
        var me = this;

        return new Promise(function (resolve, reject) {
            var key = me._getCacheKey(CacheHelper.VCF_DATA, geneName.toUpperCase(), transcript);
            me.getCacheHelper().promiseGetData(key)
                .then(function (data) {
                        resolve(data != null && data != "");
                    },
                    function (error) {
                        reject(error);
                    })
        })
    }

    promiseIsCachedAndInheritanceDetermined(geneObject, transcript, checkForCalledVariants) {
        var me = this;
        return new Promise(function (resolve, reject) {
            me._promiseGetData(CacheHelper.VCF_DATA, geneObject.gene_name, transcript)
                .then(function (theVcfData) {
                        me.promiseGetFbData(geneObject, transcript, true)
                            .then(function (data) {
                                var theFbData = data.fbData;
                                var vcfDataCached = theVcfData && theVcfData.loadState != null && (dataCard.mode == 'single' || theVcfData.loadState['inheritance']);
                                resolve(vcfDataCached && (!checkForCalledVariants || (theFbData && theFbData.features)));
                            })
                    },
                    function (error) {
                        var msg = "A problem occurred in CohortModel.promiseIsCachedAndInheritanceDetermined(): " + error;
                        console.log(msg);
                        reject(msg);
                    });
        })
    }

    _getCacheKey(dataKind, geneName, transcript) {
        var me = this;
        return me.getCacheHelper().getCacheKey(
            {
                name: me.name,
                sample: (me.sampleName != null ? me.sampleName : "null"),
                gene: (geneName != null ? geneName : gene.gene_name),
                transcript: (transcript != null ? transcript.transcript_id : "null"),
                annotationScheme: (me.getAnnotationScheme().toLowerCase()),
                dataKind: dataKind
            }
        );
    }

    promiseCacheDangerSummary(dangerSummary, geneName) {
        let self = this;
        return self._promiseCacheData(dangerSummary, CacheHelper.DANGER_SUMMARY_DATA, geneName);
    }

    clearCacheItem(dataKind, geneName, transcript) {
        let self = this;
        var key = self._getCacheKey(dataKind, geneName, transcript);
        self.getCacheHelper().promiseRemoveCacheItem(dataKind, key);
    }

    /* Only called by subset model for now */
    getFormattedSampleIds(type) {
        let self = this;
        if (type === 'subset') {
            return self.subsetIds;
        }
        else if (type === 'probands') {
            return self.getDataSet().getProbandCohort().subsetIds;
        }
    }

    _getSamplesToRetrieve() {
        var me = this;
        var samplesToRetrieve = [];

        if (me.getVcfSampleName()) {
            samplesToRetrieve.push({
                vcfSampleName: me.getVcfSampleName(),
                sampleName: me.getSampleName()
            });

            // Include all of the sample names for the proband
            me.getAffectedInfo().forEach(function (info) {
                if (info.model == me) {
                    // ignore the affected info for this sample.  We already added it
                    // to the list of samples to retrieve

                } else if (info.model.getVcfSampleName() && me._otherSampleInThisVcf(info.model)) {
                    // If the 'other' sample exists in the sample multi-sample vcf as this sample,
                    // add it to the list of samples to retrieve.  For example, an affected sib could be in the
                    // mother's vcf file.   In this case, we will retreive both the mother and affected sib at
                    // the same time so we can obtain the genotype for the affected sib and sync up to the
                    // proband later (when inheritance is determined)
                    samplesToRetrieve.push({
                        vcfSampleName: info.model.getVcfSampleName(),
                        sampleName: info.model.getSampleName()
                    });
                }
            })
        } else {
            samplesToRetrieve.push({
                vcfSampleName: "",
                sampleName: ""
            });
            // Might need this for cohort SJG NOTE
            // me.subsetIds.forEach(function(sample) {
            //   samplesToRetrieve.push( {vcfSampleName: "",
            //                          sampleName: sample } );
            //})
        }
        return samplesToRetrieve;
    }

    _otherSampleInThisVcf(otherModel) {
        var me = this;
        var theVcfs = {};

        var pushVcfFile = function (model) {
            if (model.vcfUrlEntered) {
                theVcfs[model.vcf.getVcfURL()] = true;
            } else {
                theVcfs[model.vcf.getVcfFile().name] = true;
            }
        }

        pushVcfFile(me);
        pushVcfFile(otherModel);

        return Object.keys(theVcfs).length == 1;
    }

    /* Original, from Gene */
    _pileupVariants(features, start, end) {
        let me = this;
        let width = 1000;
        let theFeatures = features;
        theFeatures.forEach(function (v) {
            v.level = 0;
        });

        let featureWidth = 4;
        let posToPixelFactor = Math.round((end - start) / width);
        let widthFactor = featureWidth + (4);
        let combinedVcf = this.getFirstVcf();
        let maxLevel = combinedVcf.pileupVcfRecords(theFeatures, start, posToPixelFactor, widthFactor);
        if (maxLevel > 30) {
            for (let i = 1; i < posToPixelFactor; i++) {
                // TODO:  Devise a more sensible approach to setting the min width.  We want the
                // widest width possible without increasing the levels beyond 30.
                if (i > 4) {
                    featureWidth = 1;
                } else if (i > 3) {
                    featureWidth = 2;
                } else if (i > 2) {
                    featureWidth = 3;
                } else {
                    featureWidth = 4;
                }

                features.forEach(function (v) {
                    v.level = 0;
                });
                let factor = posToPixelFactor / (i * 2);
                maxLevel = me.vcf.pileupVcfRecords(theFeatures, start, factor, featureWidth + 1);
                if (maxLevel <= 50) {
                    i = posToPixelFactor;
                    break;
                }
            }
        }
        return {'maxLevel': maxLevel, 'featureWidth': featureWidth};
    }

    /* For Cohort */
    _enrichmentPileupVariants(features, start, end) {
        let me = this;
        let width = 1000;
        let theFeatures = features;
        theFeatures.forEach(function (v) {
            v.level = 0;
        });

        let featureWidth = 4;
        let posToPixelFactor = Math.round((end - start) / width);
        let widthFactor = featureWidth + (4);
        if (posToPixelFactor > 1000) {
            widthFactor /= 2;
        }

        // Pull out first (now combined) vcf
        let combinedVcf = me.getFirstVcf();

        let levelObj = combinedVcf.updatedPileupVcfRecords(theFeatures, start, posToPixelFactor, widthFactor, true);
        let maxSubLevel = levelObj.maxSubLevel;
        let maxPosLevel = levelObj.maxPosLevel;
        let maxNegLevel = levelObj.maxNegLevel;

        // SJG TODO: figure out what this does and comment back in
        // if (maxPosLevel > 30 && maxNegLevel < -30) {
        //     for (var i = 1; i < posToPixelFactor; i++) {
        //         if (i > 4) {
        //             featureWidth = 1;
        //         } else if (i > 3) {
        //             featureWidth = 2;
        //         } else if (i > 2) {
        //             featureWidth = 3;
        //         } else {
        //             featureWidth = 4;
        //         }
        //
        //         features.forEach(function (v) {
        //             v.level = 0;
        //         });
        //         var factor = posToPixelFactor / (i * 2);
        //         if (self.isSubsetCohort) {
        //             levelObj = me.vcf.updatedPileupVcfRecords(theFeatures, start, factor, featureWidth + 1, true);
        //             maxSubLevel = levelObj.maxSubLevel;
        //             maxPosLevel = levelObj.maxPosLevel;
        //             maxNegLevel = levelObj.maxNegLevel;
        //         }
        //         else {
        //             maxPosLevel = this.vcf.updatedPileupVcfRecords(theFeatures, start, factor, featureWidth + 1);
        //         }
        //         if (maxPosLevel <= 50 && maxNegLevel >= -50) {
        //             i = posToPixelFactor;
        //             break;
        //         }
        //     }
        // }
        return {
            'maxSubLevel': maxSubLevel,
            'maxPosLevel': maxPosLevel,
            'maxNegLevel': maxNegLevel,
            'featureWidth': featureWidth
        };
    }

    flagDupStartPositions(variants) {
        // Flag variants with same start position as this will throw off comparisons
        for (var i = 0; i < variants.length - 1; i++) {
            var variant = variants[i];
            var nextVariant = variants[i + 1];
            if (i == 0) {
                variant.dup = false;
            }
            nextVariant.dup = false;

            if (variant.start == nextVariant.start) {
                nextVariant.dup = true;
            }
        }
    }

    _refreshVariantsWithCoverage(theVcfData, coverage, callback) {
        var me = this;
        var vcfIter = 0;
        var covIter = 0;
        if (theVcfData == null) {
            callback();
        }
        var recs = theVcfData.features;

        me.flagDupStartPositions(recs);

        for (var vcfIter = 0, covIter = 0; vcfIter < recs.length; null) {
            // Bypass duplicates
            if (recs[vcfIter].dup) {
                recs[vcfIter].bamDepth = recs[vcfIter - 1].bamDepth;
                vcfIter++;
            }
            if (vcfIter >= recs.length) {

            } else {
                if (covIter >= coverage.length) {
                    recs[vcfIter].bamDepth = "";
                    vcfIter++;
                } else {
                    var coverageRow = coverage[covIter];
                    var coverageStart = coverageRow[0];
                    var coverageDepth = coverageRow[1];

                    // compare curr variant and curr coverage record
                    if (recs[vcfIter].start == coverageStart) {
                        recs[vcfIter].bamDepth = +coverageDepth;
                        vcfIter++;
                        covIter++;
                    } else if (recs[vcfIter].start < coverageStart) {
                        recs[vcfIter].bamDepth = "";
                        vcfIter++;
                    } else {
                        //console.log("no variant corresponds to coverage at " + coverageStart);
                        covIter++;
                    }
                }
            }

        }
        if (!theVcfData.hasOwnProperty('loadState')) {
            theVcfData.loadState = {};
        }
        theVcfData.loadState['coverage'] = true;
        callback();
    }

    _refreshVariantsWithVariantIds(theVcfData, annotatedVcfData) {
        var me = this;
        if (theVcfData == null) {
            return;
        }
        var loadVariantIds = function (recs, annotedRecs) {
            for (var vcfIter = 0, annotIter = 0; vcfIter < recs.length && annotIter < annotedRecs.length; null) {

                var annotatedRec = annotedRecs[annotIter];

                // compare curr variant and curr clinVar record
                if (recs[vcfIter].start == +annotatedRec.start) {

                    // add clinVar info to variant if it matches
                    if (recs[vcfIter].alt == annotatedRec.alt &&
                        recs[vcfIter].ref == annotatedRec.ref) {

                        var variant = recs[vcfIter];

                        // set the hgvs and rsid on the existing variant
                        variant.extraAnnot = true;
                        variant.vepHGVSc = annotatedRec.vepHGVSc;
                        variant.vepHGVSp = annotatedRec.vepHGVSp;
                        variant.vepVariationIds = annotatedRec.vepVariationIds;

                        vcfIter++;
                        annotIter++;
                    } else {
                        // If clinvar entry didn't match the variant, figure out if the vcf
                        // iter (multiple vcf recs with same position as 1 clinvar rec) or
                        // the clinvar iter needs to be advanced (multiple clinvar recs with same
                        // position as 1 vcf rec)
                        if (vcfIter + 1 < recs.length && recs[vcfIter + 1].start == +annotatedRec.start) {
                            vcfIter++;
                        } else {
                            annotIter++;
                        }
                    }
                } else if (recs[vcfIter].start < +annotatedRec.start) {
                    vcfIter++;
                } else {
                    annotIter++;
                }
            }
        }

        // Load the clinvar info for the variants loaded from the vcf
        var sortedFeatures = theVcfData.features.sort(CohortModel.orderVariantsByPosition);
        var sortedAnnotVariants = annotatedVcfData.features.sort(CohortModel.orderVariantsByPosition)
        loadVariantIds(sortedFeatures, sortedAnnotVariants);
    }

    _refreshVariantsWithClinvarEutils(theVcfData, clinVars) {
        var me = this;
        var clinVarIds = clinVars.uids;
        if (theVcfData == null) {
            return;
        }

        var loadClinvarProperties = function (recs) {
            for (var vcfIter = 0, clinvarIter = 0; vcfIter < recs.length && clinvarIter < clinVarIds.length; null) {
                var uid = clinVarIds[clinvarIter];
                var clinVarStart = clinVars[uid].variation_set[0].variation_loc.filter(function (v) {
                    return v["assembly_name"] == me.getGenomeBuildHelper().getCurrentBuildName()
                })[0].start;
                var clinVarAlt = clinVars[uid].variation_set[0].variation_loc.filter(function (v) {
                    return v["assembly_name"] == me.getGenomeBuildHelper().getCurrentBuildName()
                })[0].alt;
                var clinVarRef = clinVars[uid].variation_set[0].variation_loc.filter(function (v) {
                    return v["assembly_name"] == me.getGenomeBuildHelper().getCurrentBuildName()
                })[0].ref;


                // compare curr variant and curr clinVar record
                if (recs[vcfIter].clinvarStart == clinVarStart) {
                    // add clinVar info to variant if it matches
                    if (recs[vcfIter].clinvarAlt == clinVarAlt &&
                        recs[vcfIter].clinvarRef == clinVarRef) {
                        me._addClinVarInfoToVariant(recs[vcfIter], clinVars[uid]);
                        vcfIter++;
                        clinvarIter++;
                    } else {
                        // If clinvar entry didn't match the variant, figure out if the vcf
                        // iter (multiple vcf recs with same position as 1 clinvar rec) or
                        // the clinvar iter needs to be advanced (multiple clinvar recs with same
                        // position as 1 vcf rec)
                        if (vcfIter + 1 < recs.length && recs[vcfIter + 1].clinvarStart == clinVarStart) {
                            vcfIter++;
                        } else {
                            clinvarIter++;
                        }
                    }
                } else if (recs[vcfIter].start < clinVarStart) {
                    vcfIter++;
                } else {
                    clinvarIter++;
                }
            }
        }

        // Load the clinvar info for the variants loaded from the vcf
        var sortedFeatures = theVcfData.features.sort(CohortModel.orderVariantsByPosition);
        loadClinvarProperties(sortedFeatures);
    }

    _refreshVariantsWithClinvarVCFRecs(theVcfData, clinvarVariants) {
        var me = this;
        if (theVcfData == null) {
            return;
        }


        var loadClinvarProperties = function (recs, clinvarRecs) {
            for (var vcfIter = 0, clinvarIter = 0; vcfIter < recs.length && clinvarIter < clinvarRecs.length; null) {

                var clinvarRec = clinvarRecs[clinvarIter];

                // compare curr variant and curr clinVar record
                if (+(recs[vcfIter].start) === +clinvarRec.pos) {


                    // add clinVar info to variant if it matches
                    if (recs[vcfIter].alt === clinvarRec.alt &&
                        recs[vcfIter].ref === clinvarRec.ref) {
                        var variant = recs[vcfIter];

                        let combinedVcf = me.getFirstVcf();
                        var result = combinedVcf.parseClinvarInfo(clinvarRec.info, me.getTranslator().clinvarMap);
                        for (let key in result) {
                            variant[key] = result[key];
                        }

                        vcfIter++;
                        clinvarIter++;
                    } else {
                        // If clinvar entry didn't match the variant, figure out if the vcf
                        // iter (multiple vcf recs with same position as 1 clinvar rec) or
                        // the clinvar iter needs to be advanced (multiple clinvar recs with same
                        // position as 1 vcf rec)
                        if (vcfIter + 1 < recs.length && +(recs[vcfIter + 1].start) === +clinvarRec.pos) {
                            vcfIter++;
                        } else {
                            clinvarIter++;
                        }
                    }

                } else if (+(recs[vcfIter].start) < +clinvarRec.pos) {
                    vcfIter++;
                } else {
                    clinvarIter++;
                }
            }
        }

        // Load the clinvar info for the variants loaded from the vcf
        var sortedFeatures = theVcfData.features.sort(CohortModel.orderVariantsByPosition);
        var sortedClinvarVariants = clinvarVariants.sort(CohortModel.orderVariantsByPosition)
        loadClinvarProperties(sortedFeatures, sortedClinvarVariants);

    }

    _addClinVarInfoToVariant(variant, clinvar) {
        var me = this;
        variant.clinVarUid = clinvar.uid;

        if (!variant.clinVarAccession) {
            variant.clinVarAccession = clinvar.accession;
        }

        var clinSigObject = variant.clinVarClinicalSignificance;
        if (clinSigObject == null) {
            variant.clinVarClinicalSignificance = {"none": "0"};
        }

        var clinSigString = clinvar.clinical_significance.description;
        var clinSigTokens = clinSigString.split(", ");
        var idx = 0;
        clinSigTokens.forEach(function (clinSigToken) {
            if (clinSigToken != "") {
                // Replace space with underlink
                clinSigToken = clinSigToken.split(" ").join("_").toLowerCase();
                variant.clinVarClinicalSignificance[clinSigToken] = idx.toString();
                idx++;

                // Get the clinvar "classification" for the highest ranked clinvar
                // designation. (e.g. "pathogenic" trumps "benign");
                var mapEntry = me.getTranslator().clinvarMap[clinSigToken];
                if (mapEntry != null) {
                    if (variant.clinvarRank == null ||
                        mapEntry.value < variant.clinvarRank) {
                        variant.clinvarRank = mapEntry.value;
                        variant.clinvar = mapEntry.clazz;
                    }
                }
            }

        });


        var phenotype = variant.clinVarPhenotype;
        if (phenotype == null) {
            variant.clinVarPhenotype = {};
        }

        var phTokens = clinvar.trait_set.map(function (d) {
            return d.trait_name;
        }).join('; ')
        if (phTokens != "") {
            var tokens = phTokens.split("; ");
            var idx = 0;
            tokens.forEach(function (phToken) {
                // Replace space with underlink
                phToken = phToken.split(" ").join("_");
                variant.clinVarPhenotype[phToken.toLowerCase()] = idx.toString();
                idx++;
            });
        }
    }

    loadCalledTrioGenotypes(theVcfData, theFbData) {
        var me = this;

        theVcfData = theVcfData ? theVcfData : this.vcfData;
        if (theVcfData == null || theVcfData.features == null) {
            return;
        }
        theFbData = theFbData ? theFbData : this.fbData;


        var sourceVariants = theVcfData.features
            .filter(function (variant) {
                return variant.fbCalled == 'Y';
            })
            .reduce(function (object, variant) {
                var key = variant.type + " " + variant.start + " " + variant.ref + " " + variant.alt;
                object[key] = variant;
                return object;
            }, {});
        if (theFbData) {
            theFbData.features.forEach(function (fbVariant) {
                var key = fbVariant.type + " " + fbVariant.start + " " + fbVariant.ref + " " + fbVariant.alt;
                var source = sourceVariants[key];
                if (source) {
                    fbVariant.inheritance = source.inheritance;
                    fbVariant.genotypeRefCountMother = source.genotypeRefCountMother;
                    fbVariant.genotypeAltCountMother = source.genotypeAltCountMother;
                    fbVariant.genotypeDepthMother = source.genotypeDepthMother;
                    fbVariant.bamDepthMother = source.bamDepthMother;
                    fbVariant.genotypeRefCountFather = source.genotypeRefCountFather;
                    fbVariant.genotypeAltCountFather = source.genotypeAltCountFather;
                    fbVariant.genotypeDepthFather = source.genotypeDepthFather;
                    fbVariant.bamDepthFather = source.bamDepthFather;
                    fbVariant.fatherZygosity = source.fatherZygosity;
                    fbVariant.motherZygosity = source.motherZygosity;
                    fbVariant.uasibsZygosity = source.uasibsZygosity;
                    ['affected', 'unaffected']
                        .forEach(function (affectedStatus) {
                            ['summary', 'zygosity', 'genotypeAltCount', 'genotypeRefCount', 'genotypeDepth', 'bamDepth']
                                .forEach(function (field) {
                                    var attr = affectedStatus + "_" + field;
                                    fbVariant[attr] = source[attr];
                                })
                        })
                    if (me.relationship != 'proband') {
                        fbVariant.genotypeRefCountProband = source.genotypeRefCountProband;
                        fbVariant.genotypeAltCountProband = source.genotypeAltCountProband;
                        fbVariant.genotypeDepthProband = source.genotypeDepthProband;
                        fbVariant.probandZygosity = source.probandZygosity;
                    }
                }
            });
        }
    }

    isAlignmentsOnly() {
        return !this.isVcfReadyToLoad() && this.isBamLoaded();
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
                tokens.forEach(function (token) {
                    effects += " " + token;

                });
            } else {
                effects += " " + key;
            }
        }
        var impactList = (annotationScheme == null || annotationScheme.toLowerCase() == 'snpeff' ? d.impact : d[IMPACT_FIELD_TO_FILTER]);
        for (var key in impactList) {
            impacts += " " + key;
        }
        var colorImpactList = (annotationScheme == null || annotationScheme.toLowerCase() == 'snpeff' ? d.impact : d[IMPACT_FIELD_TO_COLOR]);
        for (var key in colorImpactList) {
            colorimpacts += " " + 'impact_' + key;
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

        return 'variant ' + d.type.toLowerCase() + ' ' + d.zygosity.toLowerCase() + ' ' + (d.inheritance ? d.inheritance.toLowerCase() : "") + ' ua_' + d.ua + ' ' + sift + ' ' + polyphen + ' ' + regulatory + ' ' + +' ' + d.clinvar + ' ' + impacts + ' ' + effects + ' ' + d.consensus + ' ' + colorimpacts;
    }

    classifyByClinvar(d) {
        return 'variant ' + d.type.toLowerCase() + ' ' + d.clinvar + ' colorby_' + d.clinvar;
    }

    /*
     *  For trios, mother and father vcf data cache was cleared out, so now
     *  we need to reconstruct vcf data to equal loaded variants + unique freebayes
     *  variants
     */
    addCalledVariantsToVcfData(theVcfData, theFbData) {
        var me = this;

        // Exit if there are no cached called variants
        if (theFbData == null || theFbData.features.length == 0) {
            return;
        }

        // We have to order the variants in both sets before comparing
        theVcfData.features = theVcfData.features.sort(CohortModel.orderVariantsByPosition);
        theFbData.features = theFbData.features.sort(CohortModel.orderVariantsByPosition);

        // We will call this multiple times, so clear out any called variants from the
        // vcf data to start fresh
        theVcfData.features = theVcfData.features.filter(function (d, i) {
            return !d.hasOwnProperty("fbCalled") || d.fbCalled != 'Y';
        })

        // Compare the variant sets, marking the variants as unique1 (only in vcf),
        // unique2 (only in freebayes set), or common (in both sets).
        if (me.isVcfLoaded()) {
            // Compare fb data to vcf data
            me.vcf.compareVcfRecords(theVcfData, theFbData);

            // Add unique freebayes variants to vcfData
            theFbData.features = theFbData.features.filter(function (d) {
                return d.consensus == 'unique2';
            });
        }

        // Add the unique freebayes variants to vcf data to include
        // in feature matrix
        theFbData.features.forEach(function (v) {
            var variantObject = $.extend({}, v);
            theVcfData.features.push(variantObject);
            v.source = variantObject;
        });

        return theVcfData;
    }

    _determineUniqueFreebayesVariants(geneObject, theTranscript, theVcfData, theFbData) {
        var me = this;


        if (theVcfData == null) {
            theVcfData = me.vcfData;
        }
        if (theFbData == null) {
            theFbData = me.fbData;
        }


        // We have to order the variants in both sets before comparing
        theVcfData.features = theVcfData.features.sort(CohortModel.orderVariantsByPosition);
        theFbData.features = theFbData.features.sort(CohortModel.orderVariantsByPosition);

        // Compare the variant sets, marking the variants as unique1 (only in vcf),
        // unique2 (only in freebayes set), or common (in both sets).
        if (me.isVcfLoaded()) {
            // Compare fb data to vcf data
            me.vcf.compareVcfRecords(theVcfData, theFbData);

            // Add unique freebayes variants to vcfData
            theFbData.features = theFbData.features.filter(function (d) {
                return d.consensus == 'unique2';
            });
        }


        // Add the unique freebayes variants to vcf data to include
        // in feature matrix
        theFbData.features.forEach(function (v) {
            var variantObject = $.extend({}, v);
            theVcfData.features.push(variantObject);
            v.source = variantObject;
        });

        // Figure out max level (lost for some reason)
        var maxPosLevel = 1;
        var maxNegLevel = 1;
        var maxSubLevel = 1;
        theVcfData.features.forEach(function (feature) {
            if (feature.level > maxPosLevel) {
                maxPosLevel = feature.level;
            }
            else if (feature.level < maxNegLevel) {
                maxNegLevel = feature.level;
            }

            if (feature.subLevel > maxSubLevel) {
                maxSubLevel = feature.subLevel;
            }
        });
        theVcfData.maxPosLevel = maxPosLevel;
        theVcfData.maxNegLevel = maxNegLevel;
        theVcfData.maxSubLevel = maxSubLevel;

        pileupObject = me._pileupVariants(theFbData.features, geneObject.start, geneObject.end);
        theFbData.maxPosLevel = pileupObject.maxPosLevel;
        theFbData.maxNegLevel = pileupObject.maxNegLevel;
        theFbData.maxSubLevel = pileupObject.maxSubLevel;
        theFbData.featureWidth = pileupObject.featureWidth;

    }

    filterVariants(data, filterObject, start, end, bypassRangeFilter) {
        var me = this;

        if (data == null || data.features == null) {
            console.log("Empty data/features");
            return;
        }

        if (me.relationship == 'known-variants') {
            return me.filterKnownVariants(data, start, end, bypassRangeFilter);
        }

        var impactField = me.getAnnotationScheme().toLowerCase() === 'snpeff' ? 'impact' : IMPACT_FIELD_TO_FILTER;
        var effectField = me.getAnnotationScheme().toLowerCase() === 'snpeff' ? 'effect' : 'vepConsequence';

        // coverageMin is always an integer or NaN
        var coverageMin = filterObject.coverageMin;
        var intronsExcludedCount = 0;

        var affectedFilters = null;
        if (filterObject.affectedInfo) {
            affectedFilters = filterObject.affectedInfo.filter(function (info) {
                return info.filter;
            });
        } else {
            affectedFilters = {};
        }


        var filteredFeatures = data.features.filter(function (d) {

            var passAffectedStatus = true;
            if (me.getName() == PROBAND_ID && affectedFilters.length > 0) {
                affectedFilters.forEach(function (info) {
                    var genotype = data.genotypes[info.variantCard.getSampleName()];
                    var zygosity = genotype && genotype.zygosity ? genotype.zygosity : "gt_unknown";

                    if (info.status == 'affected') {
                        if (zygosity.toUpperCase() != 'HET' && zygosity.toUpperCase() != 'HOM') {
                            passAffectedStatus = false;
                        }
                    } else if (info.status == 'unaffected') {
                        if (zygosity.toUpperCase() == 'HET' || zygosity.toUpperCase() == 'HOM') {
                            passAffectedStatus = false;
                        }
                    }
                })
            }


            // We don't want to display homozygous reference variants in the variant chart
            // or feature matrix (but we want to keep it to show trio allele counts).
            var isHomRef = (d.zygosity != null && (d.zygosity.toLowerCase() == 'gt_unknown' || d.zygosity.toLowerCase() == 'homref')) ? true : false;
            var isGenotypeAbsent = d.genotype == null ? true : (d.genotype.absent ? d.genotype.absent : false);

            var meetsRegion = true;
            if (!bypassRangeFilter) {
                if (start != null && end != null) {
                    meetsRegion = (d.start >= start && d.start <= end);
                }
            }

            // Allele frequency Exac - Treat null and blank af as 0
            var variantAf = d.afHighest && d.afHighest != "." ? d.afHighest : 0;
            var meetsAf = true;
            if ($.isNumeric(filterObject.afMin) && $.isNumeric(filterObject.afMax)) {
                meetsAf = (variantAf >= filterObject.afMin && variantAf <= filterObject.afMax);
            }

            var meetsLoadedVsCalled = false;
            if (filterObject.loadedVariants && filterObject.calledVariants) {
                meetsLoadedVsCalled = true;
            } else if (!filterObject.loadedVariants && !filterObject.calledVariants) {
                meetsLoadedVsCalled = true;
            } else if (filterObject.loadedVariants) {
                if (!d.hasOwnProperty("fbCalled") || d.fbCalled != 'Y') {
                    meetsLoadedVsCalled = true;
                }
            } else if (filterObject.calledVariants) {
                if (d.hasOwnProperty("fbCalled") && d.fbCalled == 'Y') {
                    meetsLoadedVsCalled = true;
                }
            }

            var meetsExonic = false;
            if (filterObject.exonicOnly) {
                for (key in d[impactField]) {
                    if (key.toLowerCase() == 'high' || key.toLowerCase() == 'moderate') {
                        meetsExonic = true;
                    }
                }
                if (!meetsExonic) {
                    for (key in d[effectField]) {
                        if (key.toLowerCase() != 'intron_variant' && key.toLowerCase() != 'intron variant' && key.toLowerCase() != "intron") {
                            meetsExonic = true;
                        }
                    }
                }
                if (!meetsExonic) {
                    intronsExcludedCount++;
                }
            } else {
                meetsExonic = true;
            }


            // Evaluate the coverage for the variant to see if it meets min.
            var meetsCoverage = true;
            if (coverageMin && coverageMin > 0) {
                if ($.isNumeric(d.bamDepth)) {
                    meetsCoverage = d.bamDepth >= coverageMin;
                } else if ($.isNumeric(d.genotypeDepth)) {
                    meetsCoverage = d.genotypeDepth >= coverageMin;
                }
            }

            var incrementEqualityCount = function (condition, counterObject) {
                var countAttribute = condition ? 'matchCount' : 'notMatchCount';
                counterObject[countAttribute]++;
            }
            // Iterate through the clicked annotations for each variant. The variant
            // needs to match
            // at least one of the selected values (e.g. HIGH or MODERATE for IMPACT)
            // for each annotation (e.g. IMPACT and ZYGOSITY) to be included.
            var evaluations = {};
            for (key in filterObject.annotsToInclude) {
                var annot = filterObject.annotsToInclude[key];
                if (annot.state) {
                    var evalObject = evaluations[annot.key];
                    if (!evalObject) {
                        evalObject = {};
                        evaluations[annot.key] = evalObject;
                    }

                    var annotValue = d[annot.key] || '';

                    // Keep track of counts where critera should be true vs counts
                    // for critera that should be false.
                    //
                    // In the simplest case,
                    // the filter is evalated for equals, for example,
                    // clinvar == pathogenic or clinvar == likely pathogenic.
                    // In this case, if a variant's clinvar = pathogenic, the
                    // evaluations will look like this:
                    //  evalEquals: {matchCount: 1, notMatchCount: 0}
                    // When variant's clinvar = benign
                    //  evalEquals: {matchCount: 0, notMatchCount: 1}
                    //
                    // In a case where the filter is set to clinvar NOT EQUAL 'pathogenic'
                    // AND NOT EQUAL 'likely pathogenic'
                    // the evaluation will be true on if the variant's clinvar is NOT 'pathogenic'
                    // AND NOT 'likely pathogenic'
                    // When variant's clinvar is blank:
                    //  evalNotEquals: {matchCount: 0, notMatchCount: 2}
                    //
                    // If variant's clinvar is equal to pathogenic
                    //  evalNotEquals: {matchCount: 1, notMatchCount 1}
                    //
                    var evalKey = 'equals';
                    if (annot.hasOwnProperty("not") && annot.not) {
                        evalKey = 'notEquals';
                    }
                    if (!evalObject.hasOwnProperty(evalKey)) {
                        evalObject[evalKey] = {matchCount: 0, notMatchCount: 0};
                    }
                    if ($.isPlainObject(annotValue)) {
                        for (avKey in annotValue) {
                            var doesMatch = avKey.toLowerCase() == annot.value.toLowerCase();
                            incrementEqualityCount(doesMatch, evalObject[evalKey])
                        }
                    } else {
                        var doesMatch = annotValue.toLowerCase() == annot.value.toLowerCase();
                        incrementEqualityCount(doesMatch, evalObject[evalKey])
                    }
                }
            }

            // If zero annots to evaluate, the variant meets the criteria.
            // If annots are to be evaluated, the variant must match
            // at least one value for each annot to meet criteria
            var meetsAnnot = true;
            for (key in evaluations) {
                var evalObject = evaluations[key];

                // Bypass evaluation for non-proband on inheritance mode.  This only
                // applied to proband.
                if (key == 'inheritance' && me.getName() != PROBAND_ID) {
                    continue;
                }
                if (evalObject.hasOwnProperty("equals") && evalObject["equals"].matchCount == 0) {
                    meetsAnnot = false;
                    break;
                }
            }

            // For annotations set to 'not equal', any case where the annotation matches (matchCount > 0),
            // we set that the annotation critera was not met.  Example:  When filter is
            // clinvar 'not equal' pathogenic, and variant.clinvar == 'pathogenic' matchCount > 0,
            // so the variants does not meet the annotation criteria
            var meetsNotEqualAnnot = true
            for (key in evaluations) {
                var evalObject = evaluations[key];

                // Bypass evaluation for non-proband on inheritance mode.  This only
                // applied to proband.
                if (key == 'inheritance' && me.getName() != PROBAND_ID) {
                    continue;
                }
                // Any case where the variant attribute matches value on a 'not equal' filter,
                // we have encountered a condition where the criteria is not met.
                if (evalObject.hasOwnProperty("notEquals") && evalObject["notEquals"].matchCount > 0) {
                    meetsNotEqualAnnot = false;
                    break;
                }
            }


            return (!isHomRef || isGenotypeAbsent) && meetsRegion && meetsAf && meetsCoverage && meetsAnnot && meetsNotEqualAnnot && meetsExonic && meetsLoadedVsCalled && passAffectedStatus;
        });

        var pileupObject = this._pileupVariants(filteredFeatures, start, end);

        var vcfDataFiltered = {
            intronsExcludedCount: intronsExcludedCount,
            end: end,
            features: filteredFeatures,
            maxPosLevel: pileupObject.maxPosLevel,
            maxNegLevel: pileupObject.maxNegLevel,
            maxSubLevel: pileupObject.maxSubLevel,
            levelRange: pileupObject.levelRange,
            featureWidth: pileupObject.featureWidth,
            name: data.name,
            start: start,
            strand: data.strand,
            variantRegionStart: start,
            genericAnnotators: data.genericAnnotators
        };
        return vcfDataFiltered;
    }

    filterKnownVariants(data, start, end, bypassRangeFilter, filterModel) {
        var me = this;

        var theFilters = filterModel.getModelSpecificFilters('known-variants').filter(function (theFilter) {
            return theFilter.value == true;
        })

        var filteredVariants = data.features.filter(function (d) {

            var meetsRegion = true;
            if (!bypassRangeFilter) {
                if (start != null && end != null) {
                    meetsRegion = (d.start >= start && d.start <= end);
                }
            }

            var meetsFilter = true;
            if (theFilters.length > 0) {
                var meetsFilter = false;
                theFilters.forEach(function (theFilter) {
                    if (d[theFilter.key] == theFilter.clazz) {
                        meetsFilter = true;
                    }
                });
            }

            return meetsRegion && meetsFilter;

        })

        var pileupObject = this._pileupVariants(filteredVariants, start, end);

        var vcfDataFiltered = {
            intronsExcludedCount: 0,
            end: end,
            features: filteredVariants,
            maxPosLevel: pileupObject.maxPosLevel,
            maxNegLevel: pileupObject.maxNegLevel,
            maxSubLevel: pileupObject.maxSubLevel,
            featureWidth: pileupObject.featureWidth,
            name: data.name,
            start: start,
            strand: data.strand,
            variantRegionStart: start,
            genericAnnotators: data.genericAnnotators
        };
        return vcfDataFiltered;
    }


    _promiseGetData(dataKind, geneName, transcript) {
        let me = this;
        return new Promise(function (resolve, reject) {
            if (geneName == null) {
                var msg = "CohortModel._promiseGetData(): empty gene name";
                console.log(msg);
                reject(msg);
            } else {
                var key = me._getCacheKey(dataKind, geneName.toUpperCase(), transcript);
                me.getCacheHelper().promiseGetData(key)
                    .then(function (data) {
                            resolve(data);
                        },
                        function (error) {
                            var msg = "An error occurred in CohortModel._promiseGetData(): " + error;
                            console.log(msg);
                            reject(msg);
                        })
            }
        })
    }

    _promiseCacheData(data, dataKind, geneName, transcript) {
        var me = this;
        return new Promise(function (resolve, reject) {
            var key = me._getCacheKey(dataKind, geneName.toUpperCase(), transcript);
            me.getCacheHelper().promiseCacheData(key, data)
                .then(function () {
                        resolve();
                    },
                    function (error) {
                        me.getCacheHelper().showError(key, error);
                        // genesCard.hideGeneBadgeLoading(geneName);
                        // genesCard.clearGeneGlyphs(geneName);
                        // genesCard.setGeneBadgeError(geneName);
                        alertify.set('notifier', 'position', 'top-right');
                        alertify.error("Error occurred when compressing analyzed data before caching.", 15);
                        reject(error);
                    })
        })
    }
}

// Static functions
CohortModel
    ._summarizeDanger = function (geneName, theVcfData, options = {}, geneCoverageAll, filterModel, translator, annotationScheme) {
    var dangerCounts = $().extend({}, options);
    dangerCounts.geneName = geneName;
    CohortModel.summarizeDangerForGeneCoverage(dangerCounts, geneCoverageAll, filterModel);

    if (theVcfData == null) {
        console.log("unable to summarize danger due to null data");
        dangerCounts.error = "unable to summarize danger due to null data";
        return dangerCounts;
    } else if (theVcfData.features.length == 0) {
        dangerCounts.failedFilter = filterModel.hasFilters();
        return dangerCounts;
    }

    var siftClasses = {};
    var polyphenClasses = {};
    var clinvarClasses = {};
    var impactClasses = {};
    var consequenceClasses = {};
    var inheritanceClasses = {};
    var afClazz = null;
    var afField = null;
    var lowestAf = 999;
    dangerCounts.harmfulVariantsInfo = [];

    theVcfData.features.forEach(function (variant) {

        for (key in variant.highestImpactSnpeff) {
            if (translator.impactMap.hasOwnProperty(key) && translator.impactMap[key].badge) {
                impactClasses[key] = impactClasses[key] || {};
                impactClasses[key][variant.type] = variant.highestImpactSnpeff[key]; // key = effect, value = transcript id
            }
        }

        for (key in variant.highestImpactVep) {
            if (translator.impactMap.hasOwnProperty(key) && translator.impactMap[key].badge) {
                consequenceClasses[key] = consequenceClasses[key] || {};
                consequenceClasses[key][variant.type] = variant.highestImpactVep[key]; // key = consequence, value = transcript id
            }
        }

        for (key in variant.highestSIFT) {
            if (translator.siftMap.hasOwnProperty(key) && translator.siftMap[key].badge) {
                var clazz = translator.siftMap[key].clazz;
                dangerCounts.SIFT = {};
                dangerCounts.SIFT[clazz] = {};
                dangerCounts.SIFT[clazz][key] = variant.highestSIFT[key];
            }
        }

        for (key in variant.highestPolyphen) {
            if (translator.polyphenMap.hasOwnProperty(key) && translator.polyphenMap[key].badge) {
                var clazz = translator.polyphenMap[key].clazz;
                dangerCounts.POLYPHEN = {};
                dangerCounts.POLYPHEN[clazz] = {};
                dangerCounts.POLYPHEN[clazz][key] = variant.highestPolyphen[key];
            }
        }

        if (variant.hasOwnProperty('clinvar')) {
            var clinvarEntry = null;
            var clinvarDisplay = null;
            var clinvarKey = null;
            for (var key in translator.clinvarMap) {
                var me = translator.clinvarMap[key];
                if (clinvarEntry == null && me.clazz == variant.clinvar) {
                    clinvarEntry = me;
                    clinvarDisplay = key;
                    clinvarKey = key;
                }
            }
            if (clinvarEntry && clinvarEntry.badge) {
                clinvarClasses[clinvarKey] = clinvarEntry;
            }
        }

        if (variant.inheritance && variant.inheritance != 'none') {
            var clazz = translator.inheritanceMap[variant.inheritance].clazz;
            inheritanceClasses[clazz] = variant.inheritance;
        }


        if (variant.afFieldHighest) {
            translator.afHighestMap.forEach(function (rangeEntry) {
                if (+variant.afHighest > rangeEntry.min && +variant.afHighest <= rangeEntry.max) {
                    if (rangeEntry.value < lowestAf) {
                        lowestAf = rangeEntry.value;
                        afClazz = rangeEntry.clazz;
                        afField = variant.afFieldHighest;
                    }
                }
            });
        }

        // Turn on flag for harmful variant if one is found
        if (variant.harmfulVariant) {
            dangerCounts.harmfulVariantsInfo.push(variant.harmfulVariant);
        }
    });

    var getLowestClinvarClazz = function (clazzes) {
        var lowestOrder = 9999;
        var lowestClazz = null;
        var dangerObject = null;
        for (clazz in clazzes) {
            var object = clazzes[clazz];
            if (object.value < lowestOrder) {
                lowestOrder = object.value;
                lowestClazz = clazz;
            }
        }
        if (lowestClazz) {
            dangerObject = {};
            dangerObject[lowestClazz] = clazzes[lowestClazz];
        }
        return dangerObject;
    }

    var getLowestImpact = function (impactClasses) {
        var classes = ['HIGH', 'MODERATE', 'MODIFIER', 'LOW'];
        for (var i = 0; i < classes.length; i++) {
            var impactClass = classes[i];
            if (impactClasses[impactClass]) {
                var lowestImpact = {};
                lowestImpact[impactClass] = impactClasses[impactClass];
                return lowestImpact;
            }
        }
        return {};
    }

    var hvLevel = dangerCounts.harmfulVariantsInfo
        .map(d => d.level)
        .reduce((min, cur) => Math.min(min, cur), Infinity);
    dangerCounts.harmfulVariantsLevel = hvLevel == Infinity ? null : hvLevel;

    dangerCounts.CONSEQUENCE = getLowestImpact(consequenceClasses);
    dangerCounts.IMPACT = annotationScheme.toLowerCase() == 'vep' ? dangerCounts.CONSEQUENCE : getLowestImpact(impactClasses);
    dangerCounts.CLINVAR = getLowestClinvarClazz(clinvarClasses);
    dangerCounts.INHERITANCE = inheritanceClasses;

    var afSummaryObject = {};
    if (afClazz != null) {
        afSummaryObject[afClazz] = {field: afField, value: lowestAf};
    }
    dangerCounts.AF = afSummaryObject;

    dangerCounts.featureCount = theVcfData.features.length;
    dangerCounts.loadedCount = theVcfData.features.filter(function (d) {
        if (d.hasOwnProperty('zygosity') && d.zygosity != null) {
            return d.zygosity.toUpperCase() != 'HOMREF' && !d.hasOwnProperty("fbCalled") || d.fbCalled != 'Y';
        } else {
            return !d.hasOwnProperty("fbCalled") || d.fbCalled != 'Y';
        }
    }).length;
    dangerCounts.calledCount = theVcfData.features.filter(function (d) {
        if (d.hasOwnProperty('zygosity') && d.zygosity != null) {
            return d.zygosity.toUpperCase() != 'HOMREF' && d.hasOwnProperty("fbCalled") && d.fbCalled == 'Y';
        } else {
            return d.hasOwnProperty("fbCalled") && d.fbCalled == 'Y';
        }
    }).length;

    // Indicate if the gene pass the filter (if applicable)
    dangerCounts.failedFilter = filterModel.hasFilters() && dangerCounts.featureCount == 0;

    return dangerCounts;
}

CohortModel
    .summarizeDangerForGeneCoverage = function (dangerObject, geneCoverageAll, filterModel, clearOtherDanger = false, refreshOnly = false) {
    dangerObject.geneCoverageInfo = {};
    dangerObject.geneCoverageProblem = false;

    if (geneCoverageAll && Object.keys(geneCoverageAll).length > 0) {
        for (relationship in geneCoverageAll) {
            var geneCoverage = geneCoverageAll[relationship];
            if (geneCoverage) {
                geneCoverage.forEach(function (gc) {
                    if (gc.region != 'NA') {
                        if (filterModel.isLowCoverage(gc)) {
                            dangerObject.geneCoverageProblem = true;

                            // build up the geneCoveragerInfo to show exon numbers with low coverage
                            // and for which samples
                            //   example:  {'Exon 1/10': {'proband'}, 'Exon 9/10': {'proband', 'mother'}}
                            var exon = null;
                            if (gc.exon_number) {
                                exon = +gc.exon_number.split("\/")[0];
                            } else {
                                exon = +gc.id;
                            }
                            if (dangerObject.geneCoverageInfo[exon] == null) {
                                dangerObject.geneCoverageInfo[exon] = {};
                            }
                            dangerObject.geneCoverageInfo[exon][relationship] = true;
                        }

                    }
                })
            }
        }
    }

    // When we are just showing gene badges for low coverage and not reporting on status of
    // filtered variants, clear out the all of the danger summary object related to variants
    if (clearOtherDanger) {
        dangerObject.CONSEQUENCE = {};
        dangerObject.IMPACT = {};
        dangerObject.CLINVAR = {};
        dangerObject.INHERITANCE = {};
        dangerObject.AF = {};
        dangerObject.featureCount = 0;
        dangerObject.loadedCount = 0;
        dangerObject.calledCount = 0;
        dangerObject.harmfulVariantsInfo = [];
        // If a gene filter is being applied (refreshOnly=false)
        // The app is applying the standard filter of 'has exon coverage problems', so
        // indicate that gene didn't pass filter if there is NOT a coverage problem
        dangerObject.failedFilter = refreshOnly ? false : !dangerObject.geneCoverageProblem;
    }
    return dangerObject;
}

CohortModel
    .summarizeError = function (theError) {
    var summaryObject = {};

    summaryObject.CONSEQUENCE = {};
    summaryObject.IMPACT = {};
    summaryObject.CLINVAR = {}
    summaryObject.INHERITANCE = {};
    summaryObject.ERROR = theError;
    summaryObject.featureCount = 0;

    return summaryObject;
}


CohortModel
    ._determineAffectedStatusForVariant = function (variant, affectedStatus, affectedInfo) {
    var matchesCount = 0;
    var summaryField = affectedStatus + "_summary";

    variant[summaryField] = "none";

    affectedInfo.forEach(function (info) {
        var sampleName = info.model.getSampleName();
        var genotype = variant.genotypes[sampleName];

        if (genotype) {

            var zyg = genotype.zygosity ? genotype.zygosity : "none";
            if (zyg.toLowerCase() != 'none' && zyg.toLowerCase() != 'gt_unknown' && zyg.toLowerCase() != 'homref') {
                matchesCount++;
            }
        }
    })

    if (matchesCount > 0 && matchesCount == affectedInfo.length) {
        variant[summaryField] = "present_all";
    } else if (matchesCount > 0) {
        variant[summaryField] = "present_some"
    } else {
        variant[summaryField] = "present_none";
    }
}

CohortModel
    .calcMaxAlleleCount = function (theVcfData, maxAlleleCount = 0) {
    if (theVcfData && theVcfData.features) {
        theVcfData.features.forEach(function (theVariant) {
            if (theVariant.genotypeDepth) {
                if ((+theVariant.genotypeDepth) > maxAlleleCount) {
                    maxAlleleCount = +theVariant.genotypeDepth;
                }
            }
        })
    }
    return maxAlleleCount;
}


CohortModel
    .orderVariantsByPosition = function (a, b) {
    var refAltA = a.ref + "->" + a.alt;
    var refAltB = b.ref + "->" + b.alt;

    var chromA = a.chrom.indexOf("chr") == 0 ? a.chrom.split("chr")[1] : a.chrom;
    var chromB = b.chrom.indexOf("chr") == 0 ? b.chrom.split("chr")[1] : b.chrom;
    if (!$.isNumeric(chromA)) {
        chromA = chromA.charCodeAt(0);
    }
    ;
    if (!$.isNumeric(chromB)) {
        chromB = chromB.charCodeAt(0);
    }
    ;

    if (+chromA == +chromB) {
        if (a.start == b.start) {
            if (refAltA == refAltB) {
                return 0;
            } else if (refAltA < refAltB) {
                return -1;
            } else {
                return 1;
            }
        } else if (a.start < b.start) {
            return -1;
        } else {
            return 1;
        }
    } else {
        if (+chromA < +chromB) {
            return -1;
        } else if (+chromA > +chromB) {
            return 1;
        }
    }
}

CohortModel
    .orderVcfRecords = function (rec1, rec2) {
    var fields1 = rec1.split("\t");
    var fields2 = rec2.split("\t");

    var chrom1 = fields1[0].indexOf("chr") == 0 ? fields1[0].split("chr")[1] : fields1[0];
    var chrom2 = fields2[0].indexOf("chr") == 0 ? fields2[0].split("chr")[1] : fields2[0];
    if (!$.isNumeric(chrom1)) {
        chrom1 = chrom1.charCodeAt(0);
    }
    ;
    if (!$.isNumeric(chrom2)) {
        chrom2 = chrom2.charCodeAt(0);
    }
    ;

    var start1 = +fields1[1];
    var start2 = +fields2[1];

    var refalt1 = fields1[3] + fields1[4];
    var refalt2 = fields2[3] + fields2[4];


    if (+chrom1 < +chrom2) {
        return -1;
    } else if (+chrom1 > +chrom2) {
        return 1;
    } else {
        if (+start1 < +start2) {
            return -1;
        } else if (+start1 > +start2) {
            return 1;
        } else {
            if (refalt1 > refalt2) {
                return -1;
            } else if (refalt1 > refalt2) {
                return 1;
            } else {
                return 0;
            }
        }
    }
}
