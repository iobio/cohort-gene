function EndpointCmd(useSSL, IOBIOServiceNames, launchTimestamp, genomeBuildHelper, getHumanRefNamesFunc) {
    this.useSSL = useSSL;
    this.IOBIO = IOBIOServiceNames;
    this.launchTimestamp = launchTimestamp;
    this.genomeBuildHelper = genomeBuildHelper;
    this.getHumanRefNames = getHumanRefNamesFunc;

}


EndpointCmd.prototype.getVcfHeader = function (vcfUrl, tbiUrl) {
    var me = this;
    var args = ['-H', '"' + vcfUrl + '"'];
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

EndpointCmd.prototype.getChromosomesFromVcf = function (vcfUrl, tbiUrl) {
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

EndpointCmd.prototype.getVcfDepth = function (vcfUrl, tbiUrl) {
    var me = this;
    var args = ['-i'];
    if (tbiUrl) {
        args.push('"' + tbiUrl + '"');
    } else {
        args.push('"' + vcfUrl + '.tbi' + '"');
    }

    var cmd = new iobio.cmd(
        me.IOBIO.vcfReadDepther,
        args,
        {ssl: me.useSSL}
    );
    return cmd;
}

/* Returns command to obtain vcf annotated with enrichment information.
 * Used in cohort-gene.iobio to render large amounts of variants ranked by enrichment quickly and without overflow.
 * Input: a vcf file, experimental group IDs (aka Subset for now) and control group IDs (aka Probands for now)
 * Output: a vcf file with all proband samples with 'enrichment' info field and no genotype info field */
EndpointCmd.prototype.annotateEnrichmentCounts = function (vcfSource, refName, regions, expSampleNames, controlSampleNames) {
    let self = this;

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

    // // Filter vcf for probands only
    if (controlSampleNames && controlSampleNames.length > 0) {
        let formattedControls = controlSampleNames.join("\n");
        let sampleNameFile = new Blob([formattedControls]);
        cmd = cmd.pipe(self.IOBIO.vt, ["subset", "-s", sampleNameFile, '-'], {ssl: self.useSSL});
    }

    // Only use variants that have passed all Simons filters
    cmd = cmd.pipe(self.IOBIO.vt, ['filter', '-f', 'PASS', '-t', '\"SSC_PASS\"', '-d', '\"Variants passing all SSC filters\"', '-'], {ssl: self.useSSL});

    // Filter out alleles with <25% frequency - TODO: don't use info field, calculate this on a per sample basis and use some percentage cutoff
    //cmd = cmd.pipe(self.IOBIO.bcftools, ['filter', '-i', '\"AVG(INFO/AF)>0.25\"'], {ssl: self.useSSL});

    // Filter alleles with coverage <20x
    // TODO: do this on a per variant basis also

    // Filter alleles without representation on both strands
    // TODO: do this on a per variant basis also

    // Annotate enrichment info
    cmd = cmd.pipe(self.IOBIO.gtEnricher, expSampleNames, {ssl: self.useSSL});

    return cmd;
};

/* Takes in multiple gtEnricher commands and sends them into vtCombiner for combining and enrichStats for p-values.
*  NOTE: this function assumes gtEnricherCmds and fileNames are in stable order relative to each other. */
EndpointCmd.prototype.combineCalcEnrichment = function(gtEnricherCmds){
    let self = this;

    let vtCombinerArgs = [];
    for (let i = 0; i < gtEnricherCmds.length; i++) {
        let gtEnricherCmd = gtEnricherCmds[i];
        // TODO: I don't think I need filenames here...
        //vtCombinerArgs.push('-f');
        vtCombinerArgs.push(gtEnricherCmd);
    }

    // TODO: add in paths for these programs
    let cmd = new iobio.cmd(self.IOBIO.vtCombiner, vtCombinerArgs, {ssl: self.useSSL});
    cmd.pipe(self.IOBIO.enrichStats, {ssl: self.useSSL});

    return cmd;
};

/* Compiles and annotates variants for the given regions, from the given sources. */
EndpointCmd.prototype.annotateVariants = function (vcfSource, refName, regions, vcfSampleNames, annotationEngine, isRefSeq, hgvsNotation, getRsId, vepAF, useServerCache, serverCacheKey) {
    var me = this;
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
        vepArgs.push(me.genomeBuildHelper.getCurrentBuildName());   // TODO: debug - is grch38 a problem?
        vepArgs.push(" --format vcf");
        vepArgs.push(" --allele_number");
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
        // Get the hgvs notation and the rsid since we won't be able to easily get it one demand
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

EndpointCmd.prototype.normalizeVariants = function (vcfUrl, tbiUrl, refName, regions) {
    var me = this;

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


EndpointCmd.prototype.getBamCoverage = function (bamSource, refName, regionStart, regionEnd, regions, maxPoints, useServerCache, serverCacheKey) {
    var me = this;

    var samtools = bamSource.bamUrl != null ? me.IOBIO.samtoolsOnDemand : me.IOBIO.samtools;

    var regionsArg = "";
    regions.forEach(function (region) {
        region.name = refName;
        if (region.name && region.start && region.end) {
            if (regionsArg.length == 0) {
                regionsArg += " -p ";
            } else {
                regionsArg += ",";
            }
            regionsArg += region.name + ":" + region.start + ":" + region.end;
        }
    });
    var maxPointsArg = "";
    if (maxPoints) {
        maxPointsArg = "-m " + maxPoints;
    } else {
        maxPointsArg = "-m 0"
    }
    var spanningRegionArg = " -r " + refName + ":" + regionStart + ":" + regionEnd;
    var regionArg = refName + ":" + regionStart + "-" + regionEnd;


    var cmd = null;

    // When file served remotely, first run samtools view, then run samtools mpileup.
    // When bam file is read as a local file, just stream sam records for region to
    // samtools mpileup.
    if (bamSource.bamUrl) {
        var args = ['view', '-b', '"' + bamSource.bamUrl + '"', regionArg];
        if (bamSource.baiUrl) {
            args.push('"' + bamSource.baiUrl + '"');
        }
        cmd = new iobio.cmd(samtools, args,
            {
                'urlparams': {'encoding': 'binary'},
                ssl: me.useSSL
            });
        cmd = cmd.pipe(samtools, ["mpileup", "-"], {ssl: me.useSSL});
    } else {


        cmd = new iobio.cmd(samtools, ['mpileup', bamSource.writeStream],
            {
                'urlparams': {'encoding': 'utf8'},
                ssl: me.useSSL
            });

    }

    //
    //  SERVER SIDE CACHING for coverage service
    //
    var cacheKey = null;
    var urlParameters = {};
    if (useServerCache) {
        urlParameters.cache = serverCacheKey;
        urlParameters.partialCache = true;
        cmd = cmd.pipe("nv-dev-new.iobio.io/coverage/", [maxPointsArg, spanningRegionArg, regionsArg], {
            ssl: me.useSSL,
            urlparams: urlParameters
        });
    } else {
        // After running samtools mpileup, run coverage service to summarize point data.
        // NOTE:  Had to change to protocol http(); otherwise signed URLs don't work (with websockets)
        cmd = cmd.pipe(me.IOBIO.coverage, [maxPointsArg, spanningRegionArg, regionsArg], {ssl: me.useSSL});

    }

    return cmd;

}

EndpointCmd.prototype.freebayesJointCall = function (bamSources, refName, regionStart, regionEnd, isRefSeq, fbArgs, vepAF) {
    var me = this;

    var regionArg = refName + ":" + regionStart + "-" + regionEnd;

    var bamCmds = me._getBamRegions(bamSources, refName, regionStart, regionEnd);

    var refFastaFile = me.genomeBuildHelper.getFastaPath(refName);

    var freebayesArgs = [];
    bamCmds.forEach(function (bamCmd) {
        freebayesArgs.push("-b");
        freebayesArgs.push(bamCmd);
    });

    freebayesArgs.push("-f");
    freebayesArgs.push(refFastaFile);

    if (fbArgs && fbArgs.useSuggestedVariants.value == true) {
        freebayesArgs.push("-@");
        freebayesArgs.push(me._getSuggestedVariants(refName, regionStart, regionEnd));
    }
    if (fbArgs) {
        for (var key in fbArgs) {
            var theArg = fbArgs[key];
            if (theArg.hasOwnProperty('argName')) {
                if (theArg.hasOwnProperty('isFlag') && theArg.isFlag == true) {
                    if (theArg.value && theArg.value == true) {
                        freebayesArgs.push(theArg.argName);
                    }
                } else {
                    if (theArg.value && theArg.value != '') {
                        freebayesArgs.push(theArg.argName);
                        freebayesArgs.push(theArg.value);
                    }
                }

            }
        }

    }


    var cmd = new iobio.cmd(me.IOBIO.freebayes, freebayesArgs, {ssl: me.useSSL});


    // Normalize variants
    cmd = cmd.pipe(me.IOBIO.vt, ['normalize', '-r', refFastaFile, '-'], {ssl: me.useSSL});

    // Subset on all samples (this will get rid of low quality cases where no sample
    // is actually called as having the alt)
    //cmd = cmd.pipe(IOBIO.vt, ['subset', '-s', '-']);

    // Filter out anything with qual <= 0
    cmd = cmd.pipe(me.IOBIO.vt, ['filter', '-f', "\'QUAL>1\'", '-t', '\"PASS\"', '-d', '\"Variants called by iobio\"', '-'], {ssl: me.useSSL});


    //
    // Annotate variants that were just called from freebayes
    //

    // bcftools to append header rec for contig
    var contigStr = "";
    me.getHumanRefNames(refName).split(" ").forEach(function (ref) {
        contigStr += "##contig=<ID=" + ref + ">\n";
    })
    var contigNameFile = new Blob([contigStr])
    cmd = cmd.pipe(me.IOBIO.bcftools, ['annotate', '-h', contigNameFile], {ssl: me.useSSL})

    // Get Allele Frequencies from 1000G and ExAC
    cmd = cmd.pipe(me.IOBIO.af, [], {ssl: me.useSSL})

    // VEP to annotate
    var vepArgs = [];
    vepArgs.push(" --assembly");
    vepArgs.push(me.genomeBuildHelper.getCurrentBuildName());
    vepArgs.push(" --format vcf");
    vepArgs.push(" --allele_number");
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
    // Get the hgvs notation and the rsid since we won't be able to easily get it one demand
    // since we won't have the original vcf records as input
    vepArgs.push("--hgvs");
    vepArgs.push("--check_existing");
    vepArgs.push("--fasta");
    vepArgs.push(refFastaFile);
    cmd = cmd.pipe(me.IOBIO.vep, vepArgs, {ssl: me.useSSL});

    return cmd;
}


EndpointCmd.prototype.getGeneCoverage = function (bamSources, refName, geneName, regionStart, regionEnd, regions) {
    var me = this;
    var bamCmds = me._getBamRegions(bamSources, refName, regionStart, regionEnd);

    var args = [];

    bamCmds.forEach(function (bamCmd) {
        args.push("-b");
        args.push(bamCmd);
    });

    var regionStr = "#" + geneName + "\n";
    regions.forEach(function (region) {
        regionStr += refName + ":" + region.start + "-" + region.end + "\n";
    })
    var regionFile = new Blob([regionStr])

    args.push("-r");
    args.push(regionFile);


    var cmd = new iobio.cmd(me.IOBIO.geneCoverage, args, {ssl: me.useSSL});
    return cmd;


}

EndpointCmd.prototype._getBamRegions = function (bamSources, refName, regionStart, regionEnd) {
    var me = this;

    var regionArg = refName + ":" + regionStart + "-" + regionEnd;


    var bamCmds = [];
    bamSources.forEach(function (bamSource) {
        var samtools = bamSource.bamUrl != null ? me.IOBIO.samtoolsOnDemand : me.IOBIO.samtools;

        if (bamSource.bamUrl) {
            var args = ['view', '-b', '"' + bamSource.bamUrl + '"', regionArg];
            if (bamSource.baiUrl) {
                args.push('"' + bamSource.baiUrl + '"');
            }
            var bamCmd = new iobio.cmd(samtools, args, {'urlparams': {'encoding': 'binary'}, ssl: me.useSSL});
            bamCmds.push(bamCmd);

        } else {
            var args = ['view', '-b', bamSource.bamBlob];
            var bamCmd = new iobio.cmd(samtools, args, {'urlparams': {'encoding': 'binary'}, ssl: me.useSSL});
            bamCmds.push(bamCmd);
        }

    })
    return bamCmds;
}

EndpointCmd.prototype._getSuggestedVariants = function (refName, regionStart, regionEnd) {
    var me = this;

    // Create an iobio command get get the variants from clinvar for the region of the gene
    var regionParm = refName + ":" + regionStart + "-" + regionEnd;

    var clinvarUrl = me.genomeBuildHelper.getBuildResource(genomeBuildHelper.RESOURCE_CLINVAR_VCF_S3);

    var tabixArgs = ['-h', clinvarUrl, regionParm];
    var cmd = new iobio.cmd(me.IOBIO.tabix, tabixArgs, {ssl: me.useSSL});

    cmd = cmd.pipe(me.IOBIO.vt, ['view', '-f', '\"INFO.CLNSIG=~\'5|4\'\"', '-'], {ssl: me.useSSL});


    return cmd;
}
