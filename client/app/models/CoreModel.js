/* Coordinates back-end pipeline functionality. Holds single application instance objects (for example, GeneModel) and list of DataSetModels. */
class CoreModel {
  constructor(endpoint, genericAnnotation, translator, geneModel, cacheHelper, genomeBuildHelper) {
    // Data sets
    this.dataSets = [];     // List of data set models
    this.dataSetMap = {};   // Maps data set models to names

    // Back-end data properties
    // TODO: should only give read only access to these in data set models/ cohort models
    this.endpoint = endpoint;
    this.genericAnnotation = genericAnnotation;
    this.translator = translator;
    this.geneModel = geneModel;
    this.cacheHelper = cacheHelper;
    this.genomeBuildHelper = genomeBuildHelper;
    this.filterModel = null;

    // These might need to be getters that iterate through each of the data set models and take max or some combinatory fxn?
    this.inProgress = { 'loadingDataSources': false };  // TODO: this more belongs in data set model?
    this.annotationScheme = 'vep';
    this.isLoaded = false;
    this.maxAlleleCount = null;
    this.affectedInfo = null;
    this.maxDepth = 0;

    this.demoGenes = ['RAI1', 'MYLK2', 'PDHA1', 'PDGFB', 'AIRE'];
  }

  promiseInitDemo() {
    // TODO: return void
  }

  promiseInit() {
    // TODO: void return
  }

  promiseLoadData(gene, transcript, options) {
    // TODO: return resultMap
  }

  setLoadedVariants(gene, relationship = null) {
    // TODO: void return
  }

  setCoverage(regionStart, regionEnd) {
    // TODO: void return
  }

  promiseLoadKnownVariants(gene, transcript) {
    // TODO: void return
  }

}
