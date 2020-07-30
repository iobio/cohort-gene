import iobiocmd from '../thirdparty/iobio.js';
import { Client } from 'iobio-api-client';

export default class EndpointCmd {
    constructor(iobioSource, iobioServices, revelFile, useSSL, launchTimestamp, genomeBuildHelper, getHumanRefNamesFunc) {
        this.launchTimestamp = launchTimestamp;
        this.genomeBuildHelper = genomeBuildHelper;
        this.getHumanRefNames = getHumanRefNamesFunc;
        this.vepRevelFile = revelFile;
        this.gruBackend = true;

        // talk to gru
        this.api = new Client(iobioSource, { secure: true });

        // iobio services
        this.IOBIO = {};
        this.IOBIO.tabix = iobioServices + "od_tabix/";
        this.IOBIO.vcfReadDepther = iobioServices + "vcfdepther/";
        this.IOBIO.snpEff = iobioServices + "snpeff/";
        this.IOBIO.vt = iobioServices + "vt/";
        this.IOBIO.af = iobioServices + "af/";
        this.IOBIO.vep = iobioServices + "vep/";
        this.IOBIO.contigAppender = iobioServices + "ctgapndr/";
        this.IOBIO.bcftools = iobioServices + "bcftools/";
        this.IOBIO.coverage = iobioServices + "coverage/";
        this.IOBIO.samtools = iobioServices + "samtools/";
        this.IOBIO.samtoolsOnDemand = iobioServices + "od_samtools/";
        this.IOBIO.freebayes = iobioServices + "freebayes/";
        this.IOBIO.vcflib = iobioServices + "vcflib/";
        this.IOBIO.geneCoverage = iobioServices + "genecoverage/";
        this.IOBIO.vtCombiner = iobioServices + "vtCombiner/";
        this.IOBIO.gtEnricher = iobioServices + "gtEnricher/";
    }


    getVcfHeader(vcfUrl, tbiUrl) {
        if (this.gruBackend) {
            return this.api.streamCommand('variantHeader', {url: vcfUrl, indexUrl: tbiUrl});
        } else {
            let me = this;
            let args = ['-H', '"' + vcfUrl + '"'];
            if (tbiUrl) {
                args.push('"' + tbiUrl + '"');
            }
            let cmd = new iobio.cmd(
                me.IOBIO.tabix,
                args,
                {ssl: useSSL}
            );
            return cmd;
        }
    }

    getVcfDepth(vcfUrl, tbiUrl) {
        if (this.gruBackend) {
            if (!tbiUrl) {
                tbiUrl = vcfUrl + '.tbi';
            }
            return this.api.streamCommand('vcfReadDepth', {url: tbiUrl});
        } else {
            let me = this;
            let args = ['-i'];
            if (tbiUrl) {
                args.push('"' + tbiUrl + '"');
            } else {
                args.push('"' + vcfUrl + '.tbi' + '"');
            }

            let cmd = new iobio.cmd(
                me.IOBIO.vcfReadDepther,
                args,
                {ssl: useSSL}
            );
            return cmd;
        }
    }

    /* Returns command to obtain vcf annotated with enrichment information.
     * Used in cohort-gene.iobio to render large amounts of variants ranked by enrichment quickly and without overflow.
     * Input: a vcf file, experimental group IDs (aka Subset for now) and control group IDs (aka Probands for now)
     * Output: a vcf file with all proband samples with 'enrichment' info field and no genotype info field */
    annotateEnrichmentCounts(vcfSource, refName, regions, expSampleNames, controlSampleNames, optionalFilterArgs) {
        const self = this;
        // Note: these were used for SFARI Viewer w/ SSC data specifically
        // SFARI Viewer taken down now but keeping to see how filter args should be composed
        //const sfariFilterArgs = ['-f', 'PASS', '-t', '\"SSC_PASS\"', '-d', '\"Variants passing all SSC filters\"', '-'];

        let filterArgs = optionalFilterArgs;

        if (this.gruBackend) {
            const refNames = this.getHumanRefNames(refName).split(" ");
            const refFastaFile = this.genomeBuildHelper.getFastaPath(refName);

            const ncmd = this.api.streamCommand('annotateEnrichmentCounts', {
                vcfUrl: vcfSource.vcfUrl,
                tbiUrl: vcfSource.tbiUrl,
                refNames,
                regions,
                refFastaFile,
                filterArgs,
                expIdString: expSampleNames.join(' '),
                controlIdString: controlSampleNames.join('\n')
            });
            return ncmd;
        } else {
            let regionParm = "";
            if (regions && regions.length > 0) {
                regions.forEach(function (region) {
                    if (regionParm.length > 0) {
                        regionParm += " ";
                    }
                    regionParm += region.name + ":" + region.start + "-" + region.end;
                })
            }

            let contigStr = "";
            self.getHumanRefNames(refName).split(" ").forEach(function (ref) {
                contigStr += "##contig=<ID=" + ref + ">\n";
            });
            let contigNameFile = new Blob([contigStr]);

            // Create an iobio command get get the variants and add any header recs.
            let cmd = null;
            if (vcfSource.hasOwnProperty('vcfUrl')) {
                //  If we have a vcf URL, use tabix to get the variants for the region
                let args = ['-h', '"' + vcfSource.vcfUrl + '"', regionParm];
                if (vcfSource.tbiUrl) {
                    args.push('"' + vcfSource.tbiUrl + '"');
                }
                cmd = new iobio.cmd(self.IOBIO.tabix, args, {ssl: self.useSSL})
                    .pipe(self.IOBIO.bcftools, ['annotate', '-h', contigNameFile, '-'], {ssl: self.useSSL});

            } else if (vcfSource.hasOwnProperty('writeStream')) {
                // If we have a local vcf file, use the writeStream function to stream in the vcf records
                cmd = new iobio.cmd(self.IOBIO.bcftools, ['annotate', '-h', contigNameFile, vcfSource.writeStream], {ssl: self.useSSL})
            } else {
                console.log("EndpointCmd.annotateVariants() vcfSource arg is not invalid.");
                return null;
            }

            // Filter vcf for probands only
            if (controlSampleNames && controlSampleNames.length > 0) {
                let formattedControls = controlSampleNames.join("\n");
                let sampleNameFile = new Blob([formattedControls]);
                cmd = cmd.pipe(self.IOBIO.vt, ["subset", "-s", sampleNameFile, '-'], {ssl: self.useSSL});
            }

            if (filterArgs) {
                filterArgs.splice(0, 0, 'filter');
                cmd = cmd.pipe(self.IOBIO.vt, filterArgs, {ssl: self.useSSL});
            }

            // Annotate enrichment info
            cmd = cmd.pipe(self.IOBIO.gtEnricher, expSampleNames, {ssl: self.useSSL});

            return cmd;
        }
    };

    // /* Takes in multiple gtEnricher commands and sends them into vtCombiner for combining and enrichStats for p-values.
    //  * NOTE: this function assumes gtEnricherCmds and fileNames are in stable order relative to each other. */
    // combineCalcEnrichment = function (gtEnricherCmds) {
    //     const self = this;
    //     let vtCombinerArgs = [];
    //     for (let i = 0; i < gtEnricherCmds.length; i++) {
    //         let gtEnricherCmd = gtEnricherCmds[i];
    //         vtCombinerArgs.push(gtEnricherCmd);
    //     }
    //     if (this.gruBackend) {
    //         return this.api.streamCommand('enrichStats', { vtCombinerArgs });
    //     } else {
    //         let cmd = new iobio.cmd(self.IOBIO.vtCombiner, vtCombinerArgs, {ssl: self.useSSL});
    //         cmd.pipe(self.IOBIO.enrichStats, {ssl: self.useSSL});
    //
    //         return cmd;
    //     }
    // };

    /* Compiles and annotates variants for the given regions, from the given sources. */
    annotateVariants(vcfSource, refName, regions, vcfSampleNames, annotationEngine, isRefSeq, hgvsNotation, getRsId, vepAF, useServerCache, serverCacheKey, sfariMode = false, gnomadUrl, gnomadRegionStr) {
        const me = this;
        if (this.gruBackend) {
            const refNames = this.getHumanRefNames(refName).split(" ");
            const genomeBuildName = this.genomeBuildHelper.getCurrentBuildName();
            const refFastaFile = this.genomeBuildHelper.getFastaPath(refName);

            const ncmd = this.api.streamCommand('annotateVariants', {
                vcfUrl: vcfSource.vcfUrl,
                tbiUrl: vcfSource.tbiUrl,
                refNames,
                regions,
                vcfSampleNames,
                refFastaFile,
                genomeBuildName,
                isRefSeq,
                hgvsNotation,
                getRsId,
                vepAF,
                sfariMode,
                vepREVELFile: me.vepRevelFile,
                gnomadUrl: gnomadUrl ? gnomadUrl : '',
                gnomadRegionStr: gnomadRegionStr ? gnomadRegionStr : '',
            });

            return ncmd;
        } else {
            // Figure out the file location of the reference seq files
            var regionParm = "";
            if (regions && regions.length > 0) {
                regions.forEach(function (region) {
                    if (regionParm.length > 0) {
                        regionParm += " ";
                    }
                    regionParm += region.name + ":" + region.start + "-" + region.end;
                })
            }

            var contigStr = "";
            me.getHumanRefNames(refName).split(" ").forEach(function (ref) {
                contigStr += "##contig=<ID=" + ref + ">\n";
            })
            var contigNameFile = new Blob([contigStr]);


            // Create an iobio command get get the variants and add any header recs.
            var args = [];
            var cmd = null;
            if (vcfSource.hasOwnProperty('vcfUrl')) {
                //  If we have a vcf URL, use tabix to get the variants for the region
                var args = ['-h', '"' + vcfSource.vcfUrl + '"', regionParm];
                if (vcfSource.tbiUrl) {
                    args.push('"' + vcfSource.tbiUrl + '"');
                }
                cmd = new iobio.cmd(me.IOBIO.tabix, args, {ssl: me.useSSL})
                    .pipe(me.IOBIO.bcftools, ['annotate', '-h', contigNameFile, '-'], {ssl: me.useSSL})

            } else if (vcfSource.hasOwnProperty('writeStream')) {
                // If we have a local vcf file, use the writeStream function to stream in the vcf records
                cmd = new iobio.cmd(me.IOBIO.bcftools, ['annotate', '-h', contigNameFile, vcfSource.writeStream], {ssl: me.useSSL})
            } else {
                console.log("EndpointCmd.annotateVariants() vcfSource arg is not invalid.");
                return null;
            }

            if (vcfSampleNames && vcfSampleNames.length > 0) {
                var sampleNameFile = new Blob([vcfSampleNames.join("\n")]);
                cmd = cmd.pipe(me.IOBIO.vt, ["subset", "-s", sampleNameFile, '-'], {ssl: me.useSSL})
            }

            // normalize variants
            var refFastaFile = me.genomeBuildHelper.getFastaPath(refName);
            cmd = cmd.pipe(me.IOBIO.vt, ["normalize", "-n", "-r", refFastaFile, '-'], {ssl: me.useSSL})

            // if af not retreived from vep, get allele frequencies from 1000G and ExAC in af service
            cmd = cmd.pipe(me.IOBIO.af, ["-b", me.genomeBuildHelper.getCurrentBuildName()], {ssl: me.useSSL});

            // Skip snpEff if RefSeq transcript set or we are just annotating with the vep engine
            if (isRefSeq || annotationEngine === 'vep') {
                // VEP
                var vepArgs = [];
                vepArgs.push(" --assembly");
                vepArgs.push(me.genomeBuildHelper.getCurrentBuildName());
                vepArgs.push(" --format vcf");
                vepArgs.push(" --allele_number");
                if (me.vepRevelFile) {
                    vepArgs.push(" --plugin REVEL," + me.vepREVELFile);
                }
                if (vepAF) {
                    vepArgs.push("--af");
                    vepArgs.push("--af_gnomad");
                    vepArgs.push("--af_esp");
                    vepArgs.push("--af_1kg");
                    vepArgs.push("--max_af");
                }
                if (isRefSeq) {
                    vepArgs.push("--refseq");
                }
                // Get the hgvs notation and the rsid since we won't be able to easily get it on demand
                // since we won't have the original vcf records as input
                if (hgvsNotation) {
                    vepArgs.push("--hgvs");
                }
                if (getRsId) {
                    vepArgs.push("--check_existing");
                }
                if (hgvsNotation || utility.getRsId || isRefSeq) {
                    vepArgs.push("--fasta");
                    vepArgs.push(refFastaFile);
                }

                //
                //  SERVER SIDE CACHING
                //
                var cacheKey = null;
                var urlParameters = {};
                if (useServerCache && serverCacheKey.length > 0) {
                    urlParameters.cache = serverCacheKey;
                    urlParameters.partialCache = true;
                    cmd = cmd.pipe("nv-dev-new.iobio.io/vep/", vepArgs, {ssl: me.useSSL, urlparams: urlParameters});
                } else {
                    cmd = cmd.pipe(me.IOBIO.vep, vepArgs, {ssl: me.useSSL, urlparams: urlParameters});
                }

            } else if (annotationEngine === 'snpeff') {
                cmd = cmd.pipe(me.IOBIO.snpEff, [], {ssl: me.useSSL});
            }
            return cmd;
        }
    }

    normalizeVariants(vcfUrl, tbiUrl, refName, regions) {
        const me = this;
        if (this.gruBackend) {
            let refFastaFile = me.genomeBuildHelper.getFastaPath(refName);
            // do with annotateVariants
            let contigStr = "";
            me.getHumanRefNames(refName).split(" ").forEach(function (ref) {
                contigStr += "##contig=<ID=" + ref + ">\n";
            });
            return this.api.streamCommand('normalizeVariants', {
                vcfUrl,
                tbiUrl,
                refName,
                regions,
                contigStr,
                refFastaFile
            });
        } else {

            var refFastaFile = me.genomeBuildHelper.getFastaPath(refName);

            var regionParm = "";
            regions.forEach(function (region) {
                if (regionParm.length > 0) {
                    regionParm += " ";
                }
                regionParm += region.refName + ":" + region.start + "-" + region.end;
            })

            var args = ['-h', vcfUrl, regionParm];
            if (tbiUrl) {
                args.push(tbiUrl);
            }

            var contigStr = "";
            me.getHumanRefNames(refName).split(" ").forEach(function (ref) {
                contigStr += "##contig=<ID=" + ref + ">\n";
            })
            var contigNameFile = new Blob([contigStr])

            var cmd = new iobio.cmd(me.IOBIO.tabix, args, {ssl: me.useSSL})
                .pipe(me.IOBIO.bcftools, ['annotate', '-h', contigNameFile, '-'], {ssl: me.useSSL})

            // normalize variants
            cmd = cmd.pipe(me.IOBIO.vt, ["normalize", "-n", "-r", refFastaFile, '-'], {ssl: me.useSSL})

            return cmd;
        }
    }

    getBamHeader(bamUrl, baiUrl) {
        if (this.gruBackend) {
            let params = {url: bamUrl};
            if (baiUrl && baiUrl !== '') {
                params['indexUrl'] = baiUrl;

                // NOTE: we have to add a dummy region here for the program to look at the .bai file
                // Otherwise you can put garbage in here for .bai and it won't check it and return header just fine
                // TODO: THIS IS HARDCODED FOR GRCH37 CHR FORMAT
                // TODO: make this dynamic for grch38 also
                params['samtoolsRegion'] = '1:10000-20000';
            }
            return this.api.streamCommand('alignmentHeader', params);
        } else {
            const me = this;
            let args = ['view', '-H', '"' + bamUrl + '"'];
            if (baiUrl) {
                args.push('"' + baiUrl + '"');
            }
            return new iobio.cmd(
                me.IOBIO.samtoolsOnDemand,
                args,
                {ssl: me.useSSL}
            );
        }
    }

    getBamCoverage(bamSource, refName, regionStart, regionEnd, regions, maxPoints, useServerCache, serverCacheKey) {
        if (this.gruBackend) {
            // TODO: gru version of this is broken with multiple regions...
            // TODO: left off needing to determine why this doesn't work
            const url = bamSource.bamUrl;
            const samtoolsRegion = {refName, start: regionStart, end: regionEnd};
            const indexUrl = bamSource.baiUrl;
            maxPoints = maxPoints ? maxPoints : 0;

            return this.api.streamCommand('alignmentCoverage', {
                url,
                indexUrl,
                samtoolsRegion,
                maxPoints,
                coverageRegions: regions
            });
        } else {
            const me = this;
            let samtools = bamSource.bamUrl != null ? me.IOBIO.samtoolsOnDemand : me.IOBIO.samtools;

            // Format all regions into string param
            let regionsArg = "";
            regions.forEach(function (region) {
                region.name = refName;
                if (region.name && region.start && region.end) {
                    if (regionsArg.length === 0) {
                        regionsArg += " -p ";
                    } else {
                        regionsArg += ",";
                    }
                    regionsArg += region.name + ":" + region.start + ":" + region.end;
                }
            });
            let maxPointsArg = "";
            if (maxPoints) {
                maxPointsArg = "-m " + maxPoints;
            } else {
                maxPointsArg = "-m 0"
            }
            let spanningRegionArg = " -r " + refName + ":" + regionStart + ":" + regionEnd;
            let regionArg = refName + ":" + regionStart + "-" + regionEnd;


            let cmd = null;

            // When file served remotely, first run samtools view, then run samtools mpileup.
            // When bam file is read as a local file, just stream sam records for region to
            // samtools mpileup.
            if (bamSource.bamUrl) {
                let args = ['view', '-b', '"' + bamSource.bamUrl + '"', regionArg];
                if (bamSource.baiUrl) {
                    args.push('"' + bamSource.baiUrl + '"');
                }
                cmd = new iobio.cmd(samtools, args,
                    {
                        'urlparams': {'encoding': 'binary'},
                        ssl: useSSL
                    });
                cmd = cmd.pipe(samtools, ["mpileup", "-"], {ssl: useSSL});
            } else {
                cmd = this.iobio.cmd(samtools, ['mpileup', bamSource.writeStream],
                    {
                        'urlparams': {'encoding': 'utf8'},
                        ssl: useSSL
                    });

            }

            //
            //  SERVER SIDE CACHING for coverage service
            //
            let urlParameters = {};
            if (useServerCache) {
                urlParameters.cache = serverCacheKey;
                urlParameters.partialCache = true;
                cmd = cmd.pipe("nv-dev-new.iobio.io/coverage/", [maxPointsArg, spanningRegionArg, regionsArg], {
                    ssl: useSSL,
                    urlparams: urlParameters
                });
            } else {
                // After running samtools mpileup, run coverage service to summarize point data.
                // NOTE:  Had to change to protocol http(); otherwise signed URLs don't work (with websockets)
                cmd = cmd.pipe(me.IOBIO.coverage, [maxPointsArg, spanningRegionArg, regionsArg], {ssl: useSSL});

            }
            return cmd;
        }
    }

    getGeneCoverage(bamSources, refName, geneName, regionStart, regionEnd, regions) {
        if (this.gruBackend) {
            const url = bamSources[0].bamUrl;
            const indexUrl = bamSources[0].baiUrl;
            return this.api.streamCommand('geneCoverage', {
                url,
                indexUrl,
                refName,
                geneName,
                regionStart,
                regionEnd,
                regions
            });
        } else {
            const me = this;
            let bamCmds = me._getBamRegions(bamSources, refName, regionStart, regionEnd);
            let args = [];

            bamCmds.forEach(function (bamCmd) {
                args.push("-b");
                args.push(bamCmd);
            });

            let regionStr = "#" + geneName + "\n";
            regions.forEach(function (region) {
                regionStr += refName + ":" + region.start + "-" + region.end + "\n";
            });
            let regionFile = new Blob([regionStr]);
            args.push("-r");
            args.push(regionFile);

            let cmd = new iobio.cmd(me.IOBIO.geneCoverage, args, {ssl: useSSL});
            return cmd;
        }
    }

    // NOTE: this function has not been testing with the monolith backend as of Nov2019
    // Unaware if GRU has an endpoint for this - SJG
    _getBamRegions(bamSources, refName, regionStart, regionEnd) {
        const me = this;

        let regionArg = refName + ":" + regionStart + "-" + regionEnd;
        let bamCmds = [];
        bamSources.forEach(function (bamSource) {
            let samtools = bamSource.bamUrl != null ? me.IOBIO.samtoolsOnDemand : me.IOBIO.samtools;

            if (bamSource.bamUrl) {
                let args = ['view', '-b', '"' + bamSource.bamUrl + '"', regionArg];
                if (bamSource.baiUrl) {
                    args.push('"' + bamSource.baiUrl + '"');
                }
                let bamCmd = new iobio.cmd(samtools, args, {
                    'urlparams': {'encoding': 'binary'},
                    ssl: useSSL
                });
                bamCmds.push(bamCmd);

            } else {
                let args = ['view', '-b', bamSource.bamBlob];
                let bamCmd = new iobio.cmd(samtools, args, {
                    'urlparams': {'encoding': 'binary'},
                    ssl: useSSL
                });
                bamCmds.push(bamCmd);
            }

        });
        return bamCmds;
    }

    /* Used to corroborate build information of uploaded vcf and dropdown selection */
    getChromosomesFromVcf(vcfUrl, tbiUrl) {
        if (this.gruBackend) {
            return this.api.streamCommand('getChromosomes', {url: vcfUrl, indexUrl: tbiUrl});
        } else {
            var me = this;
            var args = ['-l', '"' + vcfUrl + '"'];
            if (tbiUrl) {
                args.push('"' + tbiUrl + '"');
            }
            var cmd = new iobio.cmd(
                me.IOBIO.tabix,
                args,
                {ssl: me.useSSL}
            );
            return cmd;
        }
    }

    // NOTE: this function has not been testing with the monolith backend as of Nov2019
    // Unaware if GRU has an endpoint for this - SJG
    // _getSuggestedVariants(refName, regionStart, regionEnd) {
    //     const me = this;
    //
    //     // Create an iobio command get get the variants from clinvar for the region of the gene
    //     let regionParm = refName + ":" + regionStart + "-" + regionEnd;
    //
    //     //var clinvarUrl = me.genomeBuildHelper.getBuildResource(me.genomeBuildHelper.RESOURCE_CLINVAR_VCF_FTP);
    //     let clinvarUrl = me.globalApp.getClinvarUrl(me.genomeBuildHelper.getCurrentBuildName());
    //
    //     let tabixArgs = ['-h', clinvarUrl, regionParm];
    //     let cmd = this.iobio.cmd(me.IOBIO.tabix, tabixArgs, {ssl: useSSL});
    //
    //     cmd = cmd.pipe(me.IOBIO.vt, ['view', '-f', '\"INFO.CLNSIG=~\'5|4\'\"', '-'], {ssl: useSSL});
    //     return cmd;
    // }
}