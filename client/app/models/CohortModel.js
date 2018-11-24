/* Represents the variant data relative to a group of samples, or cohort.
   TD & SJG updated Nov2018 */
class CohortModel {
    constructor(theDataSetModel, theVariantModel) {

        // <editor-fold desc="IDENTIFIER PROPS">
        this.isProbandCohort = false;
        this.isSubsetCohort = false;
        this.isUnaffectedCohort = false;
        // </editor-fold>

        // <editor-fold desc="MODEL PROPS">
        this._variantModel = theVariantModel;
        this._dataSetModel = theDataSetModel;
        // </editor-fold>

        // <editor-fold desc="DATA PROPS">
        this.vcfData = null;            // Annotated VCF data
        this.fbData = null;
        this.bamData = null;
        this.sampleIds = [];            // Sample IDs that compose this cohort
        this.phenotypes = [];           // Phrases describing phenotypic filtering data; displayed in track chips
        // </editor-fold>

        // TODO: TB DEPRECIATED
        this.singleDegreeChiSqValues = [0.000, 0.001, 0.004, 0.016, 0.102, 0.455, 1.32, 1.64, 2.71, 3.84, 5.02, 5.41, 6.63, 7.88, 9.14, 10.83, 12.12];
        this.correspondingPValues = [0.99, 0.975, 0.95, 0.90, 0.75, 0.50, 0.25, 0.2, 0.10, 0.05, 0.025, 0.02, 0.01, 0.005, 0.0025, 0.001, 0.0005];
        this.TOTAL_VAR_CUTOFF = 5000;
    }

    // <editor-fold desc="GETTERS">
    // getVariantModel() {
    //     let self = this;
    //     return self._variantModel;
    // }

    getDataSetModel() {
        let self = this;
        return self._dataSetModel;
    }

    // /* Returns gene model from parent variant model. */
    // getGeneModel() {
    //     return this.getVariantModel().geneModel;
    // }
    //
    // /* Returns translator from parent variant model. */
    // getTranslator() {
    //     return this.getVariantModel().translator;
    // }
    //
    // getCacheHelper() {
    //     return this.getVariantModel().cacheHelper;
    // }

    /* Returns descriptive name depending on the ID flags, or empty string if none set. */
    getName() {
        let self = this;
        if (self.isProbandCohort) return PROBAND_ID;
        if (self.isSubsetCohort) return SUBSET_ID;
        if (self.isUnaffectedCohort) return UNAFFECTED_ID;
        return '';
    }

    getAnnotationScheme() {
        if (this.getGeneModel().geneSource === 'refseq') {
            return "VEP";
        } else {
            return this.getDataSetModel().getAnnotationScheme();
        }
    }

    // </editor-fold>

    // <editor-fold desc="FREEBAYES FXNS">

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

    // <editor-fold desc="SUMMARIZE DANGER">

    promiseGetDangerSummary(geneName) {
        let self = this;
        return self._promiseGetData(CacheHelper.DANGER_SUMMARY_DATA, geneName, null, cacheHelper);
    }

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

    // // <editor-fold desc="ANNOTATION">
    //
    // /* Sends enricher commands into vcf model to retrieve combined counts and p-values. */
    // _getCombinedResults(gtenricherCmds, fileNames, theGene, theTranscript) {
    //     let me = this;
    //
    //     let aVcf = me.getDataSetModel().getFirstVcf();
    //     return aVcf.combineCalcEnrichment(
    //         gtenricherCmds,
    //         fileNames,
    //         me.getVcfRefName(theGene.chr),
    //         theGene,
    //         theTranscript,
    //         null,   // regions
    //         false,   //isMultiSample
    //         me.getFormattedSampleIds('subset'),
    //         me.getFormattedSampleIds('proband'),
    //         me.getName() === 'known-variants' ? 'none' : me.getAnnotationScheme().toLowerCase(),
    //         me.getTranslator().clinvarMap,
    //         me.getGeneModel().geneSource === 'refseq',
    //         false,      // hgvs notation
    //         false,      // rsid
    //         true,       // vep af
    //         null,
    //         true,       // keepVariantsCombined
    //         true);      // enrichment mode (aka subset delta calculations only - no annotation)
    // }
    //
    // // Take in single variant, navigate to variant in vcf, annotate, return variant result
    // promiseGetVariantExtraAnnotations(theGene, theTranscript, variant, format, getHeader = false, sampleNames) {
    //     let me = this;
    //
    //     return new Promise(function (resolve, reject) {
    //
    //         // Create a gene object with start and end reduced to the variants coordinates.
    //         let fakeGeneObject = $().extend({}, theGene);
    //         fakeGeneObject.start = variant.start;
    //         fakeGeneObject.end = variant.end;
    //
    //         if ((variant.fbCalled === 'Y' || variant.extraAnnot) && format !== "vcf") {
    //             // We already have the hgvs and rsid for this variant, so there is
    //             // no need to call the services again.  Just return the
    //             // variant.  However, if we are returning raw vcf records, the
    //             // services need to be called so that the info field is formatted
    //             // with all of the annotations.
    //             if (format && format === 'csv') {
    //                 // Exporting data requires additional data to be returned to link
    //                 // the extra annotations back to the original bookmarked entries.
    //                 resolve([variant, variant, ""]);
    //             } else {
    //                 resolve(variant);
    //             }
    //         } else {
    //             let containingVcf = me.getContainingVcf(variant.id);
    //             me._promiseVcfRefName(theGene.chr)
    //                 .then(function () {
    //                     containingVcf.promiseGetVariants(
    //                         me.getVcfRefName(theGene.chr),
    //                         fakeGeneObject,
    //                         theTranscript,
    //                         null,   // regions
    //                         false,   //isMultiSample
    //                         me.getFormattedSampleIds('subset'),
    //                         me.getFormattedSampleIds('proband'),
    //                         me.getName() === 'known-variants' ? 'none' : me.getAnnotationScheme().toLowerCase(),
    //                         me.getTranslator().clinvarMap,
    //                         me.getGeneModel().geneSource === 'refseq',
    //                         false,      // hgvs notation
    //                         false,      // rsid
    //                         true,       // vep af
    //                         null,
    //                         true,      // keepVariantsCombined
    //                         false       // enrichment mode (aka subset delta calculations only - no annotation)
    //                     )
    //                         .then(function (singleVarData) {
    //                             // TODO: need to test this when variant overlap
    //                             if (singleVarData != null && singleVarData.features != null) {
    //                                 let matchingVariants = [];
    //                                 let featureList = [];
    //                                 // If we have multiple variants at site
    //                                 if (singleVarData.features.length > 0) {
    //                                     featureList = singleVarData.features;
    //                                 }
    //                                 // If only one variant, format in list
    //                                 else {
    //                                     featureList.push(singleVarData.features);
    //                                 }
    //                                 // Pull out features matching position
    //                                 let matchingVar = featureList.filter(function (aVariant) {
    //                                     let matches =
    //                                         (variant.start === aVariant.start &&
    //                                             variant.alt === aVariant.alt &&
    //                                             variant.ref === aVariant.ref);
    //                                     return matches;
    //                                 });
    //                                 if (matchingVar.length > 0)
    //                                     matchingVariants.push(matchingVar);
    //
    //                                 // Return matching features
    //                                 if (matchingVariants.length > 0) {
    //                                     let v = matchingVariants[0];
    //                                     if (format && format === 'csv') {
    //                                         resolve([v, variant]);
    //                                     } else if (format && format === 'vcf') {
    //                                         resolve([v, variant]);
    //                                     } else {
    //                                         me._promiseGetData(CacheHelper.VCF_DATA, theGene.gene_name, theTranscript, cacheHelper)
    //                                             .then(function (cachedVcfData) {
    //                                                 if (cachedVcfData) {
    //                                                     let theVariants = cachedVcfData.features.filter(function (d) {
    //                                                         if (d.start === v.start &&
    //                                                             d.alt === v.alt &&
    //                                                             d.ref === v.ref) {
    //                                                             return true;
    //                                                         } else {
    //                                                             return false;
    //                                                         }
    //                                                     });
    //                                                     if (theVariants && theVariants.length > 0) {
    //                                                         let theVariant = theVariants[0];
    //
    //                                                         // set the hgvs and rsid on the existing variant
    //                                                         theVariant.extraAnnot = true;
    //                                                         theVariant.vepHGVSc = v.vepHGVSc;
    //                                                         theVariant.vepHGVSp = v.vepHGVSp;
    //                                                         theVariant.vepVariationIds = v.vepVariationIds;
    //                                                     } else {
    //                                                         let msg = "Cannot find corresponding variant to update HGVS notation for variant " + v.chrom + " " + v.start + " " + v.ref + "->" + v.alt;
    //                                                         console.log(msg);
    //                                                         reject(msg);
    //                                                     }
    //                                                 } else {
    //                                                     let msg = "Unable to update gene vcfData cache with updated HGVS notation for variant " + v.chrom + " " + v.start + " " + v.ref + "->" + v.alt;
    //                                                     console.log(msg);
    //                                                     reject(msg);
    //                                                 }
    //                                             })
    //                                     }
    //                                 } else {
    //                                     reject('Cannot find vcf record for variant ' + theGene.gene_name + " " + variant.start + " " + variant.ref + "->" + variant.alt);
    //                                 }
    //                             } else {
    //                                 var msg = "Empty results returned from CohortModel.promiseGetVariantExtraAnnotations() for variant " + variant.chrom + " " + variant.start + " " + variant.ref + "->" + variant.alt;
    //                                 console.log(msg);
    //                                 if (format === 'csv' || format === 'vcf') {
    //                                     resolve([variant, variant, []]);
    //                                 }
    //                                 reject(msg);
    //                             }
    //                         });
    //                 });
    //         }
    //     });
    // }
    //
    // promiseAnnotateVariants(theGene, theTranscript, cohortModels, isMultiSample, isBackground, keepVariantsCombined, enrichMode = false) {
    //     let me = this;
    //
    //     return new Promise(function (resolve, reject) {
    //         me._promiseVcfRefName(theGene.chr)
    //             .then(function () {
    //                 let urlNames = Object.keys(me.vcfEndptHash);
    //                 let annotationResults = {};
    //                 let annotationPromises = [];
    //                 for (let i = 0; i < urlNames.length; i++) {
    //                     let currFileName = urlNames[i];
    //                     let currVcfEndpt = me.vcfEndptHash[currFileName];
    //                     if (currVcfEndpt != null) {
    //                         let subsetIds = me.getFormattedSampleIds('subset');
    //                         let probandIds = me.getFormattedSampleIds('probands');
    //                         let annoP = currVcfEndpt.promiseGetVariants(
    //                             me.getVcfRefName(theGene.chr),
    //                             theGene,
    //                             theTranscript,
    //                             null,       // regions
    //                             isMultiSample,
    //                             subsetIds,
    //                             probandIds,
    //                             me.getName() === 'known-variants' ? 'none' : me.getAnnotationScheme().toLowerCase(),
    //                             me.getTranslator().clinvarMap,
    //                             me.getGeneModel().geneSource === 'refseq',
    //                             false,      // hgvs notation
    //                             false,      // rsid
    //                             true,      // vep af
    //                             null,
    //                             keepVariantsCombined,
    //                             enrichMode)
    //                             .then((results) => {
    //                                 annotationResults[currFileName] = results;
    //                             });
    //                         annotationPromises.push(annoP);
    //
    //                     } else {
    //                         console.log('Problem in CohortModel promoiseAnnotateVariants: Could not retrieve endpoint for the file: ' + urlNames[i]);
    //                     }
    //                 }
    //                 Promise.all(annotationPromises)
    //                     .then(() => {
    //                         resolve(annotationResults);
    //                     })
    //                     .catch((error) => {
    //                         console.log('Problem in cohort model ' + error);
    //                     });
    //             });
    //     });
    // }
    //
    // /* Promises to obtain enrichment values for all variants within all urls within the provided cohort model. */
    // promiseAnnotateVariantEnrichment(theGene, theTranscript, cohortModels, isMultiSample, isBackground, keepVariantsCombined, enrichmentMode = true) {
    //     let me = this;
    //     return new Promise(function (resolve, reject) {
    //
    //         me.getDataSetModel()._promiseVcfRefName(theGene.chr)
    //             .then(function () {
    //                 let urlNames = Object.keys(me.vcfEndptHash);
    //                 let enrichResults = {};
    //                 let enrichCmds = [];
    //                 let fileNames = []; // Stable sorted to enrichCmds
    //                 let enrichCmdPromises = [];
    //                 for (let i = 0; i < urlNames.length; i++) {
    //                     let currFileName = urlNames[i];
    //                     let currVcfEndpt = me.vcfEndptHash[currFileName];
    //                     if (currVcfEndpt != null) {
    //                         let subsetIds = me.getFormattedSampleIds('subset');
    //                         let probandIds = me.getFormattedSampleIds('probands');
    //                         let enrichCmdP = currVcfEndpt.promiseGetEnrichCmd(
    //                             me.getVcfRefName(theGene.chr),
    //                             theGene,
    //                             theTranscript,
    //                             null,       // regions
    //                             isMultiSample,
    //                             subsetIds,
    //                             probandIds)
    //                             .then((cmd) => {
    //                                 enrichCmds.push(cmd);
    //                                 fileNames.push(currFileName);
    //                             });
    //
    //                         // TODO: move this below once we get results
    //                         // .then((results) => {
    //                         //     // Add variant ids to map correlated with file
    //                         //     me.varsInFileHash[currFileName] = results.features.map((feature) => {
    //                         //         return feature.id;
    //                         //     });
    //                         //     // Add results to return object
    //                         //     enrichResults[urlNames[i]] = results;
    //                         // });
    //                         enrichCmdPromises.push(enrichCmdP);
    //                         //enrichPromises.push(enrichP);
    //                     }
    //                     else {
    //                         console.log('Problem in CohortModel promoiseAnnotateVariants: Could not retrieve endpoint for the file: ' + urlNames[i]);
    //                     }
    //                 }
    //                 Promise.all(enrichCmdPromises)
    //                     .then(() => {
    //                         // TODO: send enrich commands into combiner here - write separate method that interacts w/ endpoint directly
    //                         let combinedResults = me._getCombinedResults(enrichCmds, fileNames, theGene, theTranscript, cohortModels, isMultiSample, isBackground, keepVariantsCombined, enrichmentMode);
    //
    //                         // TODO: then will have combined results already
    //
    //                         //let combinedResults = me._combineEnrichmentCounts(enrichResults);
    //                         if (combinedResults.features.length > me.TOTAL_VAR_CUTOFF) {
    //                             combinedResults.features = me.filterVarsOnPVal(combinedResults.features);
    //                         }
    //                         // Add variant number to chips
    //                         me.phenotypes.push(combinedResults.features.length + ' variants');
    //
    //                         // Assign data parameter
    //                         if (combinedResults) {
    //                             let theGeneObject = me.getGeneModel().geneObjects[combinedResults.gene];
    //                             if (theGeneObject) {
    //                                 let resultMap = {};
    //                                 let model = cohortModels[0];
    //                                 let theVcfData = combinedResults;
    //                                 if (theVcfData == null) {
    //                                     if (callback) {
    //                                         callback();
    //                                     }
    //                                     return;
    //                                 }
    //                                 theVcfData.gene = theGeneObject;
    //                                 let cohortName = me.getName();
    //                                 resultMap[cohortName] = theVcfData;
    //
    //                                 if (!isBackground) {
    //                                     model.vcfData = theVcfData;
    //                                 }
    //                                 resolve(resultMap);
    //                             } else {
    //                                 let error = "ERROR - cannot locate gene object to match with vcf data " + data.ref + " " + data.start + "-" + data.end;
    //                                 console.log(error);
    //                                 reject(error);
    //                             }
    //                         } else {
    //                             let error = "ERROR - empty vcf results for " + theGene.gene_name;
    //                             console.log(error);
    //                             reject(error);
    //                         }
    //                     })
    //                     .catch((error) => {
    //                         console.log('Problem in cohort model ' + error);
    //                     });
    //             })
    //     });
    // }
    //
    // // </editor-fold>

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

    filterVariants(data, filterObject, start, end, bypassRangeFilter) {
        var me = this;

        if (data == null || data.features == null) {
            console.log("Empty data/features");
            return;
        }

        if (me.relationship === 'known-variants') {
            return me.filterKnownVariants(data, start, end, bypassRangeFilter);
        }

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
                maxLevel = me.vcf.pileupVcfRecords(theFeatures, start, factor, featureWidth + 1);
                if (maxLevel <= 50) {
                    i = posToPixelFactor;
                    break;
                }
            }
        }
        return {'maxLevel': maxLevel, 'featureWidth': featureWidth};
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

// TODO: refactor this...
    /* Only called by subset model for now */
    getFormattedSampleIds(type) {
        let self = this;

        if (type === 'subset') {
            return self.sampleIds;
        }
        else if (type === 'probands') {
            return self.getDataSetModel().getProbandCohort().sampleIds;
        }
    }

    /* A gene has been selected. Clear out the model's state in preparation for getting data.*/
    wipeGeneData() {
        if (this.phenotypes.length > 3) {
            this.phenotypes.pop();
        }
        this.loadedVariants = null;
    }

    setLoadedVariants(theVcfData) {
        this.vcfData = theVcfData;
    }

    // </editor-fold>
}
