/* Coordinates back-end pipeline functionality. Holds single application instance objects (for example, GeneModel) and list of DataSetModels. */
class CoreModel {
  constructor(endpoint, genericAnnotation, translator, geneModel, cacheHelper, genomeBuildHelper) {
    // Data sets
    this.dataSets = [];     // List of data set models
    this.dataSetMap = {};   // Maps data set models to names

    // Back-end data properties
    this.endpoint = endpoint;
    this.genericAnnotation = genericAnnotation;
    this.translator = translator;
    this.geneModel = geneModel;       // TODO: this contains state information - take out of models
    this.cacheHelper = cacheHelper;   // TODO: this contains state information - take out of models
    this.genomeBuildHelper = genomeBuildHelper;
    this.filterModel = null;    // TODO: this contains state information - take out of models

    // These might need to be getters that iterate through each of the data set models and take max or some combinatory fxn?
    this.inProgress = { 'loadingDataSources': false };
    this.annotationScheme = 'vep';
    this.isLoaded = false;
    this.maxAlleleCount = null;
    this.affectedInfo = null;
    this.maxDepth = 0;

    this.demoGenes = ['RAI1', 'MYLK2', 'PDHA1', 'PDGFB', 'AIRE'];
  }

  promiseInitDemo() {
    let self = this;

    var demoModel = new DataSetModel(self);
    demoModel.vcf = 'https://s3.amazonaws.com/iobio/samples/vcf/platinum-exome.vcf.gz';
    self.dataSets.push(demoModel);
    self.dataSetMap['demo'] = demoModel;

    return new Promise(function(resolve, reject) {
      demoModel.promiseInitDemo()
      .then(function() {
        resolve();
      })
      .catch(function(error) {
        console.log("There was a problem in core promiseInitDemo(): " + error);
        reject(error);
      })
    });
  }

  promiseInit() {
    let self = this;

    // TODO: pull name, vcf, bam, gene region(?) from front end
    var dataSetName = '';
    var dataSetModel = new DataSetModel(self);
    dataSetModel.vcf = '';
    // TODO: if vcf is blank return error
    self.dataSets.push(dataSetModel);
    self.dataSetMap[dataSetName] = dataSetModel;

    return new Promise(function(resolve, reject) {
      self.dataSetModel.promiseInit(dataSetName)
      .then(function() {
        resolve();
      })
      .catch(function(error) {
        console.log("There was a problem in core promiseInit(): " + error);
        reject(error);
      })
    });
  }

  /* Promies to load data for each data set in dataSets array */
  promiseLoadData(gene, transcript, options) {
    let self = this;

    alert("promiseLoadData called in core model");
    return new Promise(function(resolve, reject) {
      let promises = [];

      if (!self.dataSets) {
        resolve();
      }
      self.dataSets.forEach(function(dataSet) {
          promises.push(dataSet.promiseLoadData(gene, transcript, options));
      })

      Promise.all(promises)
        .then(function() {
          resolve();
        })
        .catch(function(error) {
          console.log("There was a problem in core promiseLoadData(): " + error);
          reject(error);
        })
    });
  }

  setLoadedVariants(gene, name = null) {
    let self = this;

    self.dataSets.forEach(function(dataSet) {
      dataSet.setLoadedVariants();
    })
  }

  setCoverage(regionStart, regionEnd) {
    // TODO: implement once BAMs incorporated
  }

  clearLoadedData() {
    let self = this;
    self.dataSets.forEach(function(dataSet) {
      dataSet.clearLoadedData();
    })
  }

}

export default CoreModel;
