/* Represents the variant data relative to a group of samples, or cohort.
   TD & SJG updated Nov2018 */
class CohortModel {
    constructor(theDataSetModel) {

        // <editor-fold desc="IDENTIFIER PROPS">
        this.isProbandCohort = false;
        this.isSubsetCohort = false;
        this.isUnaffectedCohort = false;
        // </editor-fold>

        // <editor-fold desc="MODEL PROPS">
        this._dataSetModel = theDataSetModel;
        // </editor-fold>

        // <editor-fold desc="DATA PROPS">
        this.vcfData = null;            // Annotated VCF data
        this.filteredVcfData = null;    // Base vcf data with filters applied
        this.fbData = null;
        this.bamData = null;
        this.coverage = [[]];
        this.sampleIds = [];            // Sample IDs that compose this cohort
        this.phenotypes = [];           // Phrases describing phenotypic filtering data; displayed in track chips
        // </editor-fold>

        // TODO: TB DEPRECIATED
        this.singleDegreeChiSqValues = [0.000, 0.001, 0.004, 0.016, 0.102, 0.455, 1.32, 1.64, 2.71, 3.84, 5.02, 5.41, 6.63, 7.88, 9.14, 10.83, 12.12];
        this.correspondingPValues = [0.99, 0.975, 0.95, 0.90, 0.75, 0.50, 0.25, 0.2, 0.10, 0.05, 0.025, 0.02, 0.01, 0.005, 0.0025, 0.001, 0.0005];
        this.TOTAL_VAR_CUTOFF = 5000;
    }

    // <editor-fold desc="GETTERS & SETTERS">
    getDataSetModel() {
        let self = this;
        return self._dataSetModel;
    }

    /* Returns descriptive name depending on the ID flags, or empty string if none set. */
    getName() {
        let self = this;
        if (self.isProbandCohort) return PROBAND_ID;
        if (self.isSubsetCohort) return SUBSET_ID;
        if (self.isUnaffectedCohort) return UNAFFECTED_ID;
        return '';
    }

    getAnnotationScheme() {
        if (this.getDataSetModel().getGeneModel().geneSource === 'refseq') {
            return "VEP";
        } else {
            return this.getDataSetModel().getAnnotationScheme();
        }
    }

    /* Adds subset IDs and exclude IDs to the phenotypes field. Phenotypes are displayed as Analysis Sources chips in Variant Viz.*/
    setSelectionDetails(excludeIds) {
        let self = this;

        // Add subset IDs
        if (self.sampleIds.length === 1) {
            if (self.getDataSetModel().getProbandCohort() != null) {
                self.phenotypes.push('Subset Sample: ' + self.sampleIds.join(', '));
            } else {
                self.phenotypes.push('Sample: ' + self.sampleIds.join());
            }
        }
        else if (self.sampleIds.length < 4) {
            self.phenotypes.push('Subset Samples: ' + self.sampleIds.join(', '));
        } else {
            let firstFew = self.sampleIds.splice(3).join() + '...';
            self.phenotypes.push('Subset Samples: ' + firstFew);
        }

        // Add exclude IDs if they exist
        if (excludeIds.length > 0 && excludeIds.length < 4) {
            self.phenotypes.push('Excluded Samples: ' + excludeIds.join(', '));
        } else if (excludeIds.length > 0) {
            let firstFew = excludeIds.splice(3).join() + '...';
            self.phenotypes.push('Excluded Samples: ' + firstFew);
        }
    }

    // </editor-fold>

    // <editor-fold desc="FREEBAYES FXNS">

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
                                            let theVcfData = data.vcfData;
                                            let dangerSummary = me.promiseGetDangerSummary(geneObject.gene_name)
                                                .then(function (dangerSummary) {
                                                        if (theVcfData && theVcfData.features) {
                                                            theFbData = me.reconstituteFbData(theVcfData);
                                                            resolve({fbData: theFbData, model: me});
                                                        } else {
                                                            resolve({fbData: theFbData, model: me});
                                                        }
                                                    },
                                                    function (error) {
                                                        let msg = "An error occurred in SampleModel.promiseGetFbData: " + error;
                                                        console.log(msg);
                                                        reject(msg);
                                                    })

                                        },
                                        function (error) {
                                            let msg = "An error occurred in SampleModel.promiseGetFbData: " + error;
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
                        let msg = "Problem in SampleModel.promiseGetFbData(): " + error;
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
            if (v.hasOwnProperty('fbCalled') && v.fbCalled === 'Y') {
                let variantObject = $.extend({}, v);
                theFbData.features.push(variantObject);
                variantObject.source = v;
            }
        });
        return theFbData;
    }

    // </editor-fold>

    // <editor-fold desc="BAM & COVERAGE FXNS">

    getBamDepth(gene, selectedTranscript, bamIsLoaded, callbackDataLoaded) {
        let me = this;

        // TODO: what is this and how do I re-incorporate?
        // if (bamIsLoaded) {
        //     if (callbackDataLoaded) {
        //         callbackDataLoaded();
        //     }
        //     return;
        // }

        var performCallbackForCachedData = function (regions, theVcfData, coverageData) {
            if (regions.length > 0) {
                me._refreshVariantsWithCoverage(theVcfData, coverageData, function () {
                    if (callbackDataLoaded) {
                        callbackDataLoaded(coverageData);
                    }
                });
            } else {
                if (callbackDataLoaded) {
                    callbackDataLoaded(coverageData);
                }
            }
        }

        var performCallback = function (regions, theVcfData, coverageForRegion, coverageForPoints) {
            if (regions.length > 0) {
                me._refreshVariantsWithCoverage(theVcfData, coverageForPoints, function () {
                    if (callbackDataLoaded) {
                        callbackDataLoaded(coverageForRegion);
                    }
                });
            } else {
                if (callbackDataLoaded) {
                    callbackDataLoaded(coverageForRegion, CacheHelper.BAM_DATA);
                }
            }
        }


        // A gene has been selected.  Read the bam file to obtain
        // the read converage.
        let refName = me.getDataSetModel().getBamRefName(gene.chr);
        me.promiseGetVcfData(gene, selectedTranscript)
            .then(function (data) {
                let theVcfData = data.vcfData;
                let regions = [];
                // We we have variants, get the positions for each variant.  This will
                // be provided for the service to get coverage data so that specific
                // base coverage is also returned.
                if (theVcfData != null) {
                    me.flagDupStartPositions(theVcfData.features);
                    if (theVcfData) {
                        theVcfData.features.forEach(function (variant) {
                            if (!variant.dup) {
                                regions.push({name: refName, start: variant.start - 1, end: variant.start});
                            }
                        });
                    }
                }
                // Get the coverage data for the gene region
                // First the gene vcf data has been cached, just return
                // it.  (No need to retrieve the variants from the iobio service.)
                me._promiseGetData(CacheHelper.BAM_DATA, gene.gene_name)
                    .then(function (data) {
                        if (data != null && data !== '') {
                            me.bamData = data;
                            performCallbackForCachedData(regions, theVcfData, data.coverage);
                        } else {
                            // TODO: hardcoded userServerCache to false in line below - ensure that is correct
                            let useServerCache = false;
                            me.getDataSetModel().bamEndpt.getCoverageForRegion(refName, gene.start, gene.end, regions, 2000, useServerCache,
                                function (coverageForRegion, coverageForPoints) {
                                    if (coverageForRegion != null) {
                                        me.bamData = {
                                            gene: gene.gene_name,
                                            ref: refName,
                                            start: gene.start,
                                            end: gene.end,
                                            coverage: coverageForRegion
                                        };

                                        // Use browser cache for storage coverage data if app is not relying on
                                        // server-side cache
                                        if (!useServerCache) {
                                            me.getDataSetModel()._promiseCacheData(me.bamData, CacheHelper.BAM_DATA, gene.gene_name)
                                                .then(function () {
                                                    performCallback(regions, theVcfData, coverageForRegion, coverageForPoints);
                                                })
                                        } else {
                                            performCallback(regions, theVcfData, coverageForRegion, coverageForPoints);
                                        }
                                    } else {
                                        performCallback(regions, theVcfData, coverageForRegion, coverageForPoints);
                                    }

                                });
                        }

                    })
            })
    }

    promiseGetVcfData(geneObject, selectedTranscript, whenEmptyUseFbData = true) {
        let me = this;
        let dataKind = CacheHelper.VCF_DATA;
        return new Promise(function (resolve, reject) {
            if (geneObject == null) {
                reject("Empty geneObject in SampleModel.promiseGetVcfData()");
            }

            // If only alignments have specified, but not variant files, we will need to use the
            // getBamRefName function instead of the getVcfRefName function.
            let theGetRefNameFunction = me.getDataSetModel().getVcfRefName != null ? me.getDataSetModel().getVcfRefName : me.getDataSetModel().getBamRefName;
            if (theGetRefNameFunction == null) {
                theGetRefNameFunction = me.getDataSetModel()._stripRefName;
            }
            if (theGetRefNameFunction == null) {
                let msg = "No function defined to parse ref name from file";
                console.log(msg);
                reject(msg);
            }

            let theVcfData = null;

            if (me[dataKind] != null && me[dataKind].features && me[dataKind].features.length > 0) {
                if (theGetRefNameFunction(geneObject.chr) === me[dataKind].ref &&
                    geneObject.start === me[dataKind].start &&
                    geneObject.end === me[dataKind].end &&
                    geneObject.strand === me[dataKind].strand) {
                    theVcfData = me[dataKind];
                    resolve({model: me, vcfData: theVcfData});
                }
            }

            if (theVcfData == null) {
                // Find vcf data in cache
                me._promiseGetData(dataKind, geneObject.gene_name, selectedTranscript)
                    .then(function (data) {
                        if (data != null && data !== '') {
                            me[dataKind] = data;
                            theVcfData = data;
                            resolve({model: me, vcfData: theVcfData});
                        } else {
                            resolve({model: me, vcfData: theVcfData});
                        }

                    })
            }
        });
    }

    _refreshVariantsWithCoverage(theVcfData, coverage, callback) {
        let me = this;
        var vcfIter = 0;
        var covIter = 0;
        if (theVcfData == null || coverage == null) {
            callback();
        }
        let recs = theVcfData.features;

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
                    let coverageRow = coverage[covIter];
                    let coverageStart = coverageRow[0];
                    let coverageDepth = coverageRow[1];

                    // compare curr variant and curr coverage record
                    if (recs[vcfIter].start === coverageStart) {
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

    flagDupStartPositions(variants) {
        // Flag variants with same start position as this will throw off comparisons
        for (let i = 0; i < variants.length - 1; i++) {
            let variant = variants[i];
            let nextVariant = variants[i + 1];
            if (i === 0) {
                variant.dup = false;
            }
            nextVariant.dup = false;

            if (variant.start === nextVariant.start) {
                nextVariant.dup = true;
            }
        }
    }

    _promiseGetData(dataKind, geneName, transcript) {
        let me = this;
        return new Promise(function (resolve, reject) {

            if (geneName == null) {
                let msg = "CohortModel._promiseGetData(): empty gene name";
                console.log(msg);
                reject(msg);
            } else {
                let key = me.getDataSetModel()._getCacheKey(dataKind, geneName.toUpperCase(), transcript);
                me.getDataSetModel().getCacheHelper().promiseGetData(key)
                    .then(function (data) {
                            resolve(data);
                        },
                        function (error) {
                            let msg = "An error occurred in CohortModel._promiseGetData(): " + error;
                            console.log(msg);
                            reject(msg);
                        })
            }
        })
    }

    promiseSetLoadState(theVcfData, taskName) {
        let me = this;

        var resolveIt = function (resolve, theVcfData) {
            if (theVcfData != null) {
                if (theVcfData.loadState == null) {
                    theVcfData.loadState = {};
                }
                theVcfData.loadState[taskName] = true;
            }
            resolve();
        };

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

    // </editor-fold>

    // <editor-fold desc="SUMMARIZE DANGER">

    promiseGetDangerSummary(geneName) {
        let self = this;
        return self._promiseGetData(CacheHelper.DANGER_SUMMARY_DATA, geneName, null, cacheHelper);
    }

    promiseSummarizeDanger(geneName, theVcfData, options, geneCoverageAll, filterModel) {
        let me = this;
        return new Promise(function (resolve, reject) {
            let dangerSummary = me._summarizeDanger(geneName, theVcfData, options, geneCoverageAll, filterModel, me.getDataSetModel().getTranslator(), me.getAnnotationScheme());
            me.promiseCacheDangerSummary(dangerSummary, geneName).then(function () {
                    resolve(dangerSummary);
                },
                function (error) {
                    reject(error);
                })
        })
    }

    promiseCacheDangerSummary(dangerSummary, geneName) {
        return this.getDataSetModel()._promiseCacheData(dangerSummary, CacheHelper.DANGER_SUMMARY_DATA, geneName);
    }

    promiseSummarizeError(geneName, error) {
        let me = this;
        return new Promise(function (resolve, reject) {
            let dangerSummary = me.summarizeError(error);
            me.promiseCacheDangerSummary(dangerSummary, geneName)
                .then(function () {
                        resolve(dangerSummary);
                    },
                    function (error) {
                        reject(error);
                    })
        })
    }

    summarizeError(theError) {
        let summaryObject = {};

        summaryObject.CONSEQUENCE = {};
        summaryObject.IMPACT = {};
        summaryObject.CLINVAR = {};
        summaryObject.INHERITANCE = {};
        summaryObject.ERROR = theError;
        summaryObject.featureCount = 0;

        return summaryObject;
    }

    _summarizeDanger(geneName, theVcfData, options = {}, geneCoverageAll, filterModel, translator, annotationScheme) {
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

    summarizeDangerForGeneCoverage(dangerObject, geneCoverageAll, filterModel, clearOtherDanger = false, refreshOnly = false) {
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

    // </editor-fold>

    // <editor-fold desc="FILTER & CLASSIFY">

    /* Takes in a list of variants and filters them based on decreasing levels of p-values until the number of variants reaches < 10,000. */
    filterVarsOnPVal(variants) {
        let self = this;

        let filteredVars = [];
        for (let i = 3; i < self.correspondingPValues.length; i++) {    // Start cutoff at 0.9
            filteredVars = [];
            let currPValCutoff = self.correspondingPValues[i];
            variants.forEach((variant) => {
                if (variant.pVal < currPValCutoff) {
                    filteredVars.push(variant);
                }
            });
            if (filteredVars.length < self.TOTAL_VAR_CUTOFF) {
                alert('The number of variants at this locus exceeds display capacity. Only displaying variants with a p-value < ' + currPValCutoff);
                return filteredVars;
            }
        }
    }

    // TODO: refactor this as appropriate
    // TODO: where are the filter objects generated and what do they have in them - from filter model
    // Takes in vcfData and filter object - filters vcfdata and returns filtered version
    filterVariants(data, filterObject, start, end, bypassRangeFilter) {
        var me = this;

        if (data == null || data.features == null) {
            console.log("Empty data/features");
            return;
        }

        // Filter clinvar track - TODO: not displaying clinVar track for now, can get rid of
        // if (me.relationship === 'known-variants') {
        //     return me.filterKnownVariants(data, start, end, bypassRangeFilter);
        // }

        let impactField = me.getAnnotationScheme().toLowerCase() === 'snpeff' ? 'impact' : IMPACT_FIELD_TO_FILTER;
        let effectField = me.getAnnotationScheme().toLowerCase() === 'snpeff' ? 'effect' : 'vepConsequence';

        // coverageMin is always an integer or NaN
        let coverageMin = filterObject.coverageMin;
        let intronsExcludedCount = 0;

        let affectedFilters = null;
        if (filterObject.affectedInfo) {
            affectedFilters = filterObject.affectedInfo.filter(function (info) {
                return info.filter;
            });
        } else {
            affectedFilters = {};
        }


        let filteredFeatures = data.features.filter(function (d) {

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

        let pileupObject = this._pileupVariants(filteredFeatures, start, end);

        let vcfDataFiltered = {
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
        let self = this;

        let theFilters = filterModel.getModelSpecificFilters('known-variants').filter(function (theFilter) {
            return theFilter.value === true;
        });

        let filteredVariants = data.features.filter(function (d) {

            let meetsRegion = true;
            if (!bypassRangeFilter) {
                if (start != null && end != null) {
                    meetsRegion = (d.start >= start && d.start <= end);
                }
            }

            let meetsFilter = true;
            if (theFilters.length > 0) {
                meetsFilter = false;
                theFilters.forEach(function (theFilter) {
                    if (d[theFilter.key] === theFilter.clazz) {
                        meetsFilter = true;
                    }
                });
            }

            return meetsRegion && meetsFilter;

        });

        let pileupObject = self._pileupVariants(filteredVariants, start, end);

        let vcfDataFiltered = {
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
        if (colorimpacts === "") {
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

    // </editor-fold>

    // <editor-fold desc="CLINVAR">

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
                    return v["assembly_name"] === me.getDataSetModel().getGenomeBuildHelper().getCurrentBuildName()
                })[0].start;
                var clinVarAlt = clinVars[uid].variation_set[0].variation_loc.filter(function (v) {
                    return v["assembly_name"] === me.getDataSetModel().getGenomeBuildHelper().getCurrentBuildName()
                })[0].alt;
                var clinVarRef = clinVars[uid].variation_set[0].variation_loc.filter(function (v) {
                    return v["assembly_name"] === me.getDataSetModel().getGenomeBuildHelper().getCurrentBuildName()
                })[0].ref;


                // compare curr variant and curr clinVar record
                if (recs[vcfIter].clinvarStart === clinVarStart) {
                    // add clinVar info to variant if it matches
                    if (recs[vcfIter].clinvarAlt === clinVarAlt &&
                        recs[vcfIter].clinvarRef === clinVarRef) {
                        me._addClinVarInfoToVariant(recs[vcfIter], clinVars[uid]);
                        vcfIter++;
                        clinvarIter++;
                    } else {
                        // If clinvar entry didn't match the variant, figure out if the vcf
                        // iter (multiple vcf recs with same position as 1 clinvar rec) or
                        // the clinvar iter needs to be advanced (multiple clinvar recs with same
                        // position as 1 vcf rec)
                        if (vcfIter + 1 < recs.length && recs[vcfIter + 1].clinvarStart === clinVarStart) {
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
        var sortedFeatures = theVcfData.features.sort(self.orderVariantsByPosition);
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

                        let combinedVcf = me.getDataSetModel().getFirstVcf();
                        var result = combinedVcf.parseClinvarInfo(clinvarRec.info, me.getDataSetModel().getTranslator().clinvarMap);
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
        var sortedFeatures = theVcfData.features.sort(me.orderVariantsByPosition);
        var sortedClinvarVariants = clinvarVariants.sort(me.orderVariantsByPosition);
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
                var mapEntry = me.getDataSetModel().getTranslator().clinvarMap[clinSigToken];
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

    // </editor-fold>

    // <editor-fold desc="PILEUP">

    /* Calculates variant position for visual rendering. */
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
        let combinedVcf = this.getDataSetModel().getFirstVcf();
        let maxLevel = combinedVcf.pileupVcfRecords(theFeatures, start, posToPixelFactor, widthFactor);
        if (maxLevel > 30) {
            for (let i = 1; i < posToPixelFactor; i++) {
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
                maxLevel = combinedVcf.pileupVcfRecords(theFeatures, start, factor, featureWidth + 1);
                if (maxLevel <= 50) {
                    i = posToPixelFactor;
                    break;
                }
            }
        }
        return {'maxPosLevel': maxLevel, 'featureWidth': featureWidth};
    }

    /* Calculates variant position for visual rendering based on enrichment */
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
        let combinedVcf = me.getDataSetModel().getFirstVcf();

        let levelObj = combinedVcf.pileupVcfRecordsByPvalue(theFeatures, start, posToPixelFactor, widthFactor, true);
        let maxSubLevel = levelObj.maxSubLevel;
        let maxPosLevel = levelObj.maxPosLevel;
        let maxNegLevel = levelObj.maxNegLevel;

        if (maxPosLevel > 30 && maxNegLevel < -30) {
            for (let i = 1; i < posToPixelFactor; i++) {
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
                if (self.isSubsetCohort) {
                    levelObj = combinedVcf.pileupVcfRecordsByPvalue(theFeatures, start, factor, featureWidth + 1, true);
                    maxSubLevel = levelObj.maxSubLevel;
                    maxPosLevel = levelObj.maxPosLevel;
                    maxNegLevel = levelObj.maxNegLevel;
                }
                else {
                    maxPosLevel = combinedVcf.pileupVcfRecordsByPvalue(theFeatures, start, factor, featureWidth + 1);
                }
                if (maxPosLevel <= 50 && maxNegLevel >= -50) {
                    i = posToPixelFactor;
                    break;
                }
            }
        }
        return {
            'maxSubLevel': maxSubLevel,
            'maxPosLevel': maxPosLevel,
            'maxNegLevel': maxNegLevel,
            'featureWidth': featureWidth
        };
    }

    // </editor-fold>

    // <editor-fold desc="ENRICHMENT HELPERS">

    /* Performs a Cochran Armitage Trend test for the given values. Takes in the following parameters:
    *  homozygous reference counts (AA), heterozygous alternate counts (Aa), homozygous alternate counts (aa) from an
    *  experimental group (aka subset cohort), and a control group (aka non-subset cohort), respectively.
    *  Assumes a codominant model for weighting of (0,1,2).
    *  Returns a p-value based on a single degree of freedom, or one independent variable.
    *
    *  For more info: http://statgen.org/wp-content/uploads/2012/08/armitage.pdf
    */
    computeTrend(expHomRef, expHet, expHomAlt, conHomRef, conHet, conHomAlt) {
        let self = this;
        // Define variables
        let controlTotal = conHomRef + conHet + conHomAlt;  // Aka S
        let expTotal = expHomRef + expHet + expHomAlt;      // Aka R
        let sampleTotal = controlTotal + expTotal;          // Aka N
        let hetTotal = expHet + conHet;                     // Aka n_1
        let homAltTotal = expHomAlt + conHomAlt;            // Aka n_2

        // Calculate numerator and denominator of Sasieni notation for CA using weighted vector of (0,1,2)
        let trendTestStat = (sampleTotal * (expHet + (2 * expHomAlt))) - (expTotal * (hetTotal + (2 * homAltTotal)));   // Aka U_mod
        let trendVarA = controlTotal * expTotal;    // Aka S * R
        let trendVarB = sampleTotal * (hetTotal + (4 * homAltTotal));   // Aka N * (n_1 + 4*n_2)
        let trendVarC = (hetTotal + (2 * homAltTotal)) ** 2;    // Aka (n_1 + 2*n_2)^2
        let numerator = sampleTotal * (trendTestStat ** 2);     // Aka N * U_mod
        let denominator = trendVarA * (trendVarB - trendVarC);  // Aka A*(B-C)
        let z = Math.sqrt((numerator / denominator));

        // Find where our chi-squared value falls & return appropriate p-value
        let lowestBound = self.singleDegreeChiSqValues[0];
        let highestBound = self.singleDegreeChiSqValues[self.singleDegreeChiSqValues.length - 1];
        let pVal = 1;
        if (z <= lowestBound) {
            pVal = self.correspondingPValues[0];
        } else if (z >= highestBound) {
            pVal = self.correspondingPValues[self.correspondingPValues.length - 1];
        } else {
            // Iterate through array, comparing adjacent values to see if curr number falls in that range
            for (let i = 0; i < self.correspondingPValues.length; i++) {
                let lowBound = self.singleDegreeChiSqValues[i];
                let highBound = self.singleDegreeChiSqValues[i + 1];
                if (z >= lowBound && z < highBound) {
                    pVal = self.correspondingPValues[i];
                    break;
                }
            }
        }
        return pVal;
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

        // First loop to combine counts
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
                    } else {
                        // Add this feature to the combinedResults if it doesn't already exist and add to lookup
                        combinedResults.features.push(feature);
                        featureLookup[feature.id] = combinedResults.features.length - 1;
                    }
                });
            }
        }
        // Second loop to calculate subset deltas and p-values only once for combined values
        combinedResults.features.forEach((feature) => {

            let currProCounts = feature.probandZygCounts;
            let currSubCounts = feature.subsetZygCounts;

            // Calculate subset delta
            let totalProbandCount = +currProCounts[0] + +currProCounts[1] + +currProCounts[2];  // NOTE: not including no calls in counts
            let totalSubsetCount = +currSubCounts[0] + +currSubCounts[1] + +currSubCounts[2];
            let affectedSubsetCount = +currSubCounts[1] + +currSubCounts[2];
            let affectedProbandCount = +currProCounts[1] + +currProCounts[2];

            let subsetPercentage = totalSubsetCount === 0 ? 0 : affectedSubsetCount / totalSubsetCount * 100;  // Can be 0
            let probandPercentage = affectedProbandCount / totalProbandCount * 100; // Can never be 0
            feature.subsetDelta = subsetPercentage === 0 ? 1 : subsetPercentage / probandPercentage;

            // Calculate p-value using Cochran Armitage trend test
            let homRefNonSubset = +currProCounts[0] - +currSubCounts[0];
            let hetAffNonSubset = +currProCounts[1] - +currSubCounts[1];
            let homAffNonSubset = +currProCounts[2] - +currSubCounts[2];
            let pVal = self.computeTrend(+currSubCounts[0], +currSubCounts[1], +currSubCounts[2], homRefNonSubset, hetAffNonSubset, homAffNonSubset);
            feature.pVal = pVal;
        });

        return combinedResults;
    }

    // </editor-fold>

    // <editor-fold desc="HELPERS">

    orderVariantsByPosition(a, b) {
        var refAltA = a.ref + "->" + a.alt;
        var refAltB = b.ref + "->" + b.alt;

        var chromA = a.chrom.indexOf("chr") === 0 ? a.chrom.split("chr")[1] : a.chrom;
        var chromB = b.chrom.indexOf("chr") === 0 ? b.chrom.split("chr")[1] : b.chrom;
        if (!$.isNumeric(chromA)) {
            chromA = chromA.charCodeAt(0);
        }
        ;
        if (!$.isNumeric(chromB)) {
            chromB = chromB.charCodeAt(0);
        }
        ;

        if (+chromA === +chromB) {
            if (a.start === b.start) {
                if (refAltA === refAltB) {
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

    /* Clear off the last selection detail chip containing the number of variants for the selected locus.*/
    updateChips() {
        let self = this;
        if (self.phenotypes.length > 1) {
            self.phenotypes.pop();
        }
    }

    clearChips() {
        let self = this;
        self.phenotypes = [];
    }

    setLoadedVariants(theVcfData) {
        this.vcfData = theVcfData;
    }

    // </editor-fold>
}
export default CohortModel
