/* Logic relative to a single data set (for example, Sfari data set). Holds list of CohortModels. */
class DataSetModel {
  constructor() {
    this.name = '';       // Must be unique

    // Route information
    this.vcfUrl = null;
    this.vcfFile = null;
    this.tbiUrl = null;
    this.tbiFile = null;

    this.cohorts = [];    // List of cohort models
    this.cohortMap = {};  // Maps cohort models to names
  }

  isAlignmentsOnly() {
    var theCohorts = this.cohorts.filter(function(cohort) {
      return cohort.isAlignmentsOnly();
    });
    return theCohorts.length == this.cohorts.length;
  }

  getCohortModel(name) {
    return this.cohortMap[name];
  }
}
