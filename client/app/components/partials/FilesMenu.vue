<!-- SJG TODO: this needs to be modified as appropriate for dataset input and phenotype hasFilters
will wait to get details from CM and AW about data prior to implementing -->
<style lang="sass">

.menuable__content__active
  >form
    margin-left: 30px
    margin-right: 30px
    max-width: 720px
    font-size: 12px !important

  .input-group.radio
    margin-top: 0px
    margin-bottom: 0px

  .radio label
    line-height: 25px

  .input-group.radio-group
    padding-top: 0px

  .input-group__selections__comma
    font-size: 13px

  .input-group.input-group--selection-controls.switch
    label
      font-weight: normal
      font-size: 12px
      padding-left: 5px

</style>

<template>
  <v-menu
  id="files-menu"
  offset-y
  :close-on-content-click="false"
  :nudge-width="500"
  v-model="showFilesMenu"
  >

    <v-btn flat slot="activator">
     <v-icon>input</v-icon>
     Input Sources
    </v-btn>

    <v-form id="files-form">

      <v-layout row wrap class="mt-2">

        <v-flex xs2 class="px-2">
          <v-select
            label="Species"
            hide-details
            v-model="speciesName"
            :items="speciesList"
          ></v-select>
        </v-flex>

        <v-flex xs2 class="px-2">
          <v-select
            label="Genome Build"
            hide-details
            v-model="buildName"
            :items="buildList"
          ></v-select>
         </v-flex>

        <v-flex xs3>
            <v-select
              :items="demoActions"
              item-value="value"
              item-text="display"
              @input="onLoadDemoData"
              v-model="demoAction"
              overflow
              hide-details
              label="Demo data"></v-select>
        </v-flex>

            <sample-data
             ref="sampleDataRef"
             v-if="modelInfoMap && modelInfoMap[rel] && Object.keys(modelInfoMap[rel]).length > 0"
             :modelInfo="modelInfoMap[rel]"
             :separateUrlForIndex="separateUrlForIndex"
             @sample-data-changed="validate"
            >
          </sample-data>
         </v-flex>

        <v-flex xs12 class="mt-4 text-xs-right">
          <v-btn
            @click="onLoad"
            :disabled="!isValid">
            Load
          </v-btn>

          <v-btn @click="onCancel">
           Cancel
         </v-btn>
        </v-flex>
      </v-layout>

    </v-form>

  </v-menu>
</template>

<script>

// import SampleData          from '../partials/SampleData.vue'


export default {
  name: 'files-menu',
  components: {
    //SampleData
  },
  props: {
    variantModel: null
  },
  data () {
    return {
      showFilesMenu: false,
      isValid: false,
      speciesList: [],
      speciesName: null,
      buildName: null,
      activeTab: null,
      modelInfoMap: {
        proband: {},
        mother: {},
        father: {}
      },
      demoActions: [
        // THis used ot be value = exome
        {'display': 'Demo Simons Subset', 'value': 'simons_subset'},
      ],
      demoAction: null,
      separateUrlForIndex: false
    }
  },
  watch: {
    showFilesMenu: function() {
      if (this.variantModel && this.showFilesMenu) {
        this.init();
      }
    }
  },
  methods: {
    onLoad: function() {
      // SJG TODO: refactor cohortModel -> variantModel/etc as approp
      let self = this;
      if (self.demoAction) {
        self.variantModel.geneModel.copyPasteGenes(self.variantModel.demoGenes.join(", "));
      }

      //this.cohortModel.mode = this.mode;
      self.variantModel.genomeBuildHelper.setCurrentBuild(self.buildName);
      self.variantModel.genomeBuildHelper.setCurrentSpecies(self.speciesName);
      self.variantModel.promiseAddClinvarSample()
      .then(function() {
        self.variantModel.setAffectedInfo();
        self.variantModel.isLoaded = true;

        // SJG TODO: Figure out purpose and refactor as necessary
        // self.variantModel.getMainCohort().forEach(function(cohort) {
        //   if (model.name == null || model.name.length == 0) {
        //     model.name = model.relationship;
        //   }
        // })
        //self.cohortModel.sortSampleModels();

        self.$emit("on-files-loaded");
        self.showFilesMenu = false;
      })
    },
    onCancel:  function() {
      this.showFilesMenu = false;
    },
    // TODO: factor in if trio incorporated
    // onModeChanged: function() {
    //   if (this.mode == 'trio' && this.cohortModel.getCanonicalModels().length < 3 ) {
    //     this.promiseInitMotherFather();
    //   } else if (this.mode == 'single' && this.cohortModel.getCanonicalModels().length > 1) {
    //     this.removeMotherFather();
    //   }
    //
    //   this.validate();
    // },
    onLoadDemoData: function() {
      let self = this;

      // TODO: changed this up a lot - see gene version if something missing
      self.variantModel.dataSets.forEach(function(dataSet) {
        dataSet.cohorts.forEach(function(cohort) {
          self.promiseSetModel(cohort);
        })
      })
    },
    promiseSetModel: function(cohortModel) {
      let self = this;
      return new Promise(function(resolve, reject) {
        var theModel = cohortModel;
        var theModelInfo = self.modelInfoMap[theModel.name];
        theModelInfo.cohortModel = theModel;
        theModel.onVcfUrlEntered(theModelInfo.vcf, null, function(success, sampleNames) {
          if (success) {
            theModelInfo.samples = sampleNames;
            self.$refs.sampleDataRef.forEach(function(ref) {
              if (ref.modelInfo.name == theModel.name) {
                theModel.sampleName = theModelInfo.sample;
                ref.updateSamples(sampleNames, theModelInfo.sample);
                theModel.name = theModel.name + " " + theModel.sampleName;
                self.validate();
              }
            })
            // SJG TODO: took bam stuff out of cohort model
            // theModel.onBamUrlEntered(theModelInfo.bam, null, function(success) {
            //   self.validate();
            //   if (success) {
            //     resolve();
            //   } else {
            //     reject();
            //   }
            // })
          } else {
            reject();
          }
        })
      })
    },
    validate: function() {
      // SJG TODO: refactor this
      // this.isValid = false;
      // if (this.mode == 'single') {
      //   if (this.modelInfoMap.proband && this.modelInfoMap.proband.model.isReadyToLoad()) {
      //     this.isValid = true;
      //   }
      // } else {
      //   if (this.modelInfoMap.proband && this.modelInfoMap.proband.model && this.modelInfoMap.proband.model.isReadyToLoad()
      //       && this.modelInfoMap.mother && this.modelInfoMap.mother.model && this.modelInfoMap.mother.model.isReadyToLoad()
      //       && this.modelInfoMap.father && this.modelInfoMap.father.model && this.modelInfoMap.father.model.isReadyToLoad()) {
      //     this.isValid = true;
      //   }
      // }
    },
    getModel: function(name) {
      // SJG TODO: refactor this
      // var theModel = null;
      // if (this.variantModel) {
      //   var modelObject = this.cohortModel.sampleMap[relationship];
      //   if (modelObject) {
      //     theModel = modelObject.model;
      //   }
      // }
      // return theModel;
    },
    init: function() {
      let self = this;
      self.modelInfoMap = {};
      if (self.variantModel && self.variantModel.getCohorts().length > 0) {
          self.initModelInfo();
      } else {
        var modelInfo = {};
        // TODO: how will we get the name here
        modelInfo.name = 'TODO';
        modelInfo.vcf = null;
        modelInfo.bam = null;
        modelInfo.affectedStatus = 'affected'
        self.variantModel.promiseAddSamples(modelInfo)
        .then(function() {
          self.initModelInfo();
        })
      }
    },
    initModelInfo: function() {
      let self = this;
      self.variantModel.getCohorts().forEach(function(cohort) {
        var modelInfo = self.modelInfoMap[cohort.name];
        if (modelInfo == null) {
          modelInfo = {};
          modelInfo.name = cohort.name;
          modelInfo.vcf          = cohort.vcf ? cohort.vcf.getVcfURL() : null;
          modelInfo.tbi          = cohort.vcf ? cohort.vcf.getTbiURL() : null;
          modelInfo.bam          = cohort.bam ? cohort.bam.bamUri : null;
          modelInfo.bai          = cohort.bam ? cohort.bam.baiUri : null;
          modelInfo.sample       = cohort.getSampleName();
          modelInfo.name         = cohort.getName();
          modelInfo.samples      = cohort.sampleNames;
          modelInfo.isAffected   = cohort.isAffected();
          modelInfo.model        = cohort;
          self.$set(self.modelInfoMap, cohort.name, modelInfo);
        }
      })
    },
    promiseInitMotherFather: function() {
      // let self = this;
      //
      // return new Promise(function(resolve, reject) {
      //   var modelInfoMother = {};
      //   modelInfoMother.relationship = 'mother';
      //   modelInfoMother.vcf = null;
      //   modelInfoMother.bam = null;
      //   modelInfoMother.affectedStatus = 'unaffected'
      //   self.cohortModel.promiseAddSample(modelInfoMother)
      //   .then(function() {
      //     var modelInfoFather = {};
      //     modelInfoFather.relationship = 'father';
      //     modelInfoFather.vcf = null;
      //     modelInfoFather.bam = null;
      //     modelInfoFather.affectedStatus = 'unaffected'
      //
      //       self.cohortModel.promiseAddSample(modelInfoFather)
      //       .then(function() {
      //
      //         self.initModelInfo();
      //         resolve();
      //
      //       })
      //       .catch(function(error) {
      //         reject(error);
      //       })
      //   })
      //   .catch(function(error) {
      //     reject(error);
      //   })
      //
      // })
    },
    removeMotherFather: function() {
      // let self = this;
      // delete self.modelInfoMap.mother;
      // delete self.modelInfoMap.father;
      // self.cohortModel.removeSample("mother");
      // self.cohortModel.removeSample("father");
    }
  },
  computed: {
    buildList: function() {
      if (this.speciesName && this.variantModel.genomeBuildHelper) {
        return this.variantModel.genomeBuildHelper.speciesToBuilds[this.speciesName].map(function(gb) {
          return gb.name;
        })
      } else {
        return [];
      }
    }
  },
  created: function() {
    let self = this;
    this.speciesName =  this.variantModel.genomeBuildHelper.getCurrentSpeciesName();
    this.buildName   =  this.variantModel.genomeBuildHelper.getCurrentBuildName();
    this.speciesList =  this.variantModel.genomeBuildHelper.speciesList.map(function(sp) {
      return sp.name;
    });


  },
  mounted: function() {


  }
}
</script>
