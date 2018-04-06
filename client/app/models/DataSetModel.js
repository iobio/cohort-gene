/* Logic relative to a single data set (for example, Sfari data set). Holds list of CohortModels. */
class DataSetModel {
  constructor() {
    // Public probs
    this.name = '';   // Key for variant card
    this.vcfUrl = null;
    this.vcfFile = null;
    this.tbiUrl = null;
    this.tbiFile = null;

    // Private props
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

  /* Returns proband cohort or undefined if it does not exist. */
  getSubsetCohort() {
    let self = this;
    return self._cohortMap[SUBSET_ID];
  }

  /* Returns proband cohort or undefined if it does not exist. */
  getUnaffectedCohort() {
    let self = this;
    return self._cohortMap[UNAFFECTED_ID];
  }

  /* Convenience method that returns cohort given an ID. */
  getCohort(id) {
    let self = this;
    return self._cohortMap[id];
  }

  /* Returns true if all cohort data are only alignments. */
  isAlignmentsOnly() {
    let self = this;
    var theCohorts = self._cohorts.filter(function(cohort) {
      return cohort.isAlignmentsOnly();
    });
    return theCohorts.length == self._cohorts.length;
  }
}
