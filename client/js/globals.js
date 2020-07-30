

// Fields
var IMPACT_FIELD_TO_FILTER    = 'highestImpactVep';
var IMPACT_FIELD_TO_COLOR     = 'vepImpact';

// Cohort model identifiers
var PROBAND_ID = 'Proband';
var SUBSET_ID = 'Subset';
var UNAFFECTED_ID = 'Unaffected';

// Hub identifiers
var HUB_PROBANDS_NAME = "HubProbands";
var HUB_SUBSET_NAME = "HubSubsetProbands";


// URL for Phenolyzer
var OFFLINE_PHENOLYZER_CACHE_URL  = isOffline ?  (serverCacheDir) : ("../" + serverCacheDir);

// Url for offline Clinvar URL
var OFFLINE_CLINVAR_VCF_BASE_URL  = isOffline ?  ("http://" + serverInstance + serverCacheDir) : "";

var NCBI_GENE_SEARCH_URL          = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=gene&usehistory=y&retmode=json";
var NCBI_GENE_SUMMARY_URL         = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=gene&usehistory=y&retmode=json";
//
//  EDUCATIONAL / EXHIBIT
//

/*
* These variables control special behavior for running gene.iobio education edition, with
* a simplified interface and logic.  For running one of the special educational edition
* tours (e.g. a guided tour of the gene.iobio app), turn on isLevelEdu.
*/
var hideNextButtonAnim      = false;  // is next button hidden on animations during edu tour?
var hasTimeout              = false; // is a timeout based on n seconds of inactivity used?
var keepLocalStorage        = false; // maintain cache between sessions?


// Exhibit URLs
var EXHIBIT_URL             = 'exhibit.html';
var EXHIBIT_URL1            = 'exhibit-case-complete.html';
var EXHIBIT_URL2            = 'exhibit-cases-complete.html';


var eduTourNumber           = "0";
var eduTourShowPhenolyzer   = [true, false];

var EDU_TOUR_VARIANT_SIZE   = 16;

var levelEduImpact = {
  HIGH:      'Harmful',
  MODERATE:  'Probably harmful',
  MODIFIER:  'Probably benign',
  LOW:       'Benign'
};