/* Logic relative to a single data set (for example, Sfari data set). Organized into cohort objects.
   SJG updated Aug2018 */
class DataSetModel {
    constructor() {
        // Public props
        this.id = null;
        this.name = '';                 // Key for variant card
        this.vcfNames = [];             // List of names (or IDs for local) corresponding to vcf urls - matching order as vcfUrls

        // Sources for data set
        this.vcfUrls = [];
        this.vcfFiles = [];
        this.tbiUrls = [];
        this.tbiFiles = [];
        this.bamUrls = [];
        this.bamFiles = [];
        this.baiUrls = [];
        this.baiFiles = [];

        // For Hub launch issues
        this.invalidVcfNames = [];      // List of names corresponding to invalid vcfs
        this.invalidVcfReasons = [];   // List of reasons corresponding to invalid vcfs - matching order as invalidVcfNames
        this.annotationScheme = 'VEP';
        this.affectedInfo = null;

        // Psuedo-private props
        this._cohorts = [];
        this._cohortMap = {};
    }

    /* Returns all cohorts in the dataset. */
    getCohorts() {
        let self = this;
        return self._cohorts;
    }

    /* Adds the cohort to the dataset. Places cohort in lookup by ID. */
    addCohort(cohort, id) {
        let self = this;
        self._cohorts.push(cohort);
        self._cohortMap[id] = cohort;
    }

    /* Returns proband cohort or undefined if it does not exist. */
    getProbandCohort() {
        let self = this;
        return self._cohortMap[PROBAND_ID];
    }

    /* Returns subset cohort or undefined if it does not exist. */
    getSubsetCohort() {
        let self = this;
        return self._cohortMap[SUBSET_ID];
    }

    /* Returns unaffected cohort or undefined if it does not exist. */
    getUnaffectedCohort() {
        let self = this;
        return self._cohortMap[UNAFFECTED_ID];
    }

    /* Convenience method that returns cohort given a valid ID. */
    getCohort(id) {
        let self = this;
        return self._cohortMap[id];
    }

    getAnnotationScheme() {
        let self = this;
        return self.annotationScheme;
    }

    /* Returns true if all cohort data are only alignments. */
    isAlignmentsOnly() {
        let self = this;
        let theCohorts = self._cohorts.filter(function (cohort) {
            return cohort.isAlignmentsOnly();
        });
        return theCohorts.length === self._cohorts.length;
    }
}
