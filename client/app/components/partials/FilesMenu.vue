<style lang="sass">
    @import ../../../assets/sass/variables

    .menuable__content__active
        > form
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

    #files-form

        .radio-group
            .input-group__input
                min-height: 25px

        .loader
            display: inline-block
            margin-right: 2px

            img
                width: 20px
                height: 20px

        .sample-label
            span
                margin-top: 2px
                margin-bottom: 2px
                vertical-align: top
                margin-left: 0px
                font-size: 15px
                color: $app-color
                display: inline-block
                margin-right: 20px
            .switch
                display: inline-block
                width: 100px
</style>
<!--Taken from https://alligator.io/vuejs/file-select-component/-->
<style scoped>
    .file-select > .select-button {
        text-align: left;
        padding-left: 15px;
        cursor: pointer;
        font-weight: 500;
    }

    /* Don't forget to hide the original file input! */
    .file-select > input[type="file"] {
        display: none;
    }
</style>

<template>
    <v-menu
            id="files-menu"
            offset-y
            :close-on-content-click="false"
            :nudge-width="500"
            v-model="showFilesMenu">
        <v-btn id="files-menu-button" flat slot="activator">
            Files
        </v-btn>
        <v-form id="files-form">
            <v-layout row wrap class="mt-2">
                <v-flex xs6 class="mt-2">
                    <v-container>
                        <v-switch label="Separate index URL" hide-details v-model="separateUrlForIndex">
                        </v-switch>
                    </v-container>
                </v-flex>

                <v-flex xs3 class="pl-2 pr-0">
                    <v-select
                            label="Genome Build"
                            hide-details
                            v-model="buildName"
                            :items="buildList"
                            color="cohortNavy"
                    ></v-select>
                </v-flex>

                <v-flex xs3 class="pr-0 pt-2">
                    <v-menu>
                        <v-btn outline
                               color="cohortNavy"
                               slot="activator">
                            Auto-Fill
                            <v-icon small>keyboard_arrow_down</v-icon>
                        </v-btn>
                        <v-list>
                            <v-list-tile>
                                <v-list-tile-action>
                                    <v-btn flat color="appGray"
                                           @click="onAutoLoad(false)">
                                        {{ autofill.display }}
                                    </v-btn>
                                </v-list-tile-action>
                            </v-list-tile>
                            <v-list-tile>
                                <label class="file-select">
                                    <!-- We can't use a normal button element here, it would become the target of the label. -->
                                    <div class="select-button">
                                        <span style="color: #888888">Upload Config</span>
                                    </div>
                                    <!-- Hidden file input -->
                                    <input type="file" @change="onUploadCustomFile"/>
                                </label>
                            </v-list-tile>
                            <v-list-tile>
                                <v-list-tile-action>
                                    <v-btn flat color="appGray" :disabled="!isValid"
                                           @click="onDownloadCustomFile">
                                        Download Config
                                    </v-btn>
                                </v-list-tile-action>
                            </v-list-tile>
                        </v-list>
                    </v-menu>
                </v-flex>
                <v-flex xs12
                        v-for="entry in entryIds"
                        :key="entry"
                        :id="entry"
                        v-if="modelInfoMap && modelInfoMap[entry]">
                    <sample-data
                            ref="sampleDataRef"
                            v-if="modelInfoMap && modelInfoMap[entry]"
                            :modelInfo="modelInfoMap[entry]"
                            :dragId="entry"
                            :arrIndex=entryIds.indexOf(entry)
                            :separateUrlForIndex="separateUrlForIndex"
                            :launchedFromHub="launchedFromHub"
                            @sample-data-changed="validate"
                            @remove-sample="removeSample">
                    </sample-data>
                </v-flex>
                <v-flex xs6 class="mt-2 text-xs-left">
                    <v-btn small outline fab color="cohortNavy"
                           @click="promiseAddEntry">
                        <v-icon>add</v-icon>
                    </v-btn>
                </v-flex>
                <v-flex xs6 class="mt-2 text-xs-right">
                    <div class="loader" v-show="inProgress">
                        <img src="../../../assets/images/wheel.gif">
                    </div>
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

    import SampleData from '../partials/SampleData.vue'
    import draggable from 'vuedraggable'

    export default {
        name: 'files-menu',
        components: {
            SampleData,
            draggable
        },
        props: {
            variantModel: null,
            launchedFromHub: false
        },
        data() {
            return {
                showFilesMenu: false,
                isValid: false,
                speciesList: [],
                speciesName: null,
                buildName: null,
                activeTab: null,

                // TODO: these need to be modified for cohort style upload
                modelInfoMap: {},
                entryIds: [],       // One per file menu entry

                autofill: {'display': 'Demo Data', 'value': 'cohort'},
                autofillAction: null,
                separateUrlForIndex: false,
                inProgress: false,
                stateUnchanged: true,
                arrId: 0,
                debugMe: false,
                inputClass: 'fileSelect'
            }
        },
        watch: {
            showFilesMenu: function () {
                if (this.variantModel && this.showFilesMenu) {
                    this.init();
                }
            }
        },
        methods: {
            promiseAddEntry: function (stateChanged = true) {
                let self = this;
                if (stateChanged) {
                    self.stateUnchanged = false;
                }

                // If we've loaded a demo, and they change it, deselect demo drop-down
                if (self.autofillAction != null) {
                    self.autofillAction = null;
                }

                return new Promise((resolve, reject) => {
                    let newId = self.findNextAvailableId();
                    self.entryIds.push(newId);

                    // Add entry to map
                    let newInfo = {};
                    newInfo.id = newId;
                    newInfo.displayName = '';
                    newInfo.samples = [];       // All samples in vcf provided
                    newInfo.subsetSampleIds = [];
                    newInfo.excludeSampleIds = [];
                    newInfo.vcfs = [];
                    newInfo.tbis = [];
                    newInfo.bams = [];
                    newInfo.bais = [];
                    self.modelInfoMap[newId] = newInfo;

                    // Add sample model for new entry
                    self.variantModel.promiseAddEntry(newInfo)
                        .then((dataSet) => {
                            newInfo.dataSet = dataSet;
                            resolve();
                        })
                        .catch(() => {
                            reject('There was a problem adding sample.');
                        });
                });
            },
            findNextAvailableId: function () {
                let self = this;
                let ids = [];
                let arrLength = self.entryIds.length;
                for (let i = 0; i < arrLength; i++) {
                    ids.push(parseInt(self.entryIds[i].substring(1)));
                }
                ids.sort();
                let nextVal = arrLength;
                for (let i = 0; i < arrLength - 1; i++) {
                    if (ids[i + 1] - ids[i] > 1) {
                        nextVal = i + 1;
                        break;
                    }
                }
                return 's' + nextVal;
            },
            onLoad: function () {
                let self = this;
                self.inProgress = true;

                self.variantModel.genomeBuildHelper.setCurrentBuild(self.buildName);
                self.variantModel.genomeBuildHelper.setCurrentSpecies(self.speciesName);

                // TODO: remove loading clinvar here? or get this working
                self.variantModel.promiseAddClinvarSample()
                    .then(function () {
                        //self.cohortModel.setTumorInfo(true);
                        self.variantModel.getCanonicalModels().forEach(function (model) {
                            if (model.displayName == null || model.displayName.length === 0) {
                                model.displayName = model.id;
                            }
                        });
                    })
                    .then(function () {
                        let performAnalyzeAll = self.autofillAction ? true : false;
                        self.inProgress = false;

                        self.$emit("on-files-loaded", performAnalyzeAll);
                        self.showFilesMenu = false;
                    });
            },
            onCancel: function () {
                this.showFilesMenu = false;
            },
            onUploadCustomFile: function (evt) {
                let self = this;

                let customFile = evt.target.files[0];
                self.variantModel.promiseInitCustomFile(customFile)
                    .then((obj) => {
                        // TODO: set anything we need to do
                        //self.onAutoLoad(obj.isTimeSeries, 'custom', obj.infos);
                    })
                    .catch((e) => {
                        console.log('Problem loading custom config file: ' + e);
                        alert('There was a problem loading from the selected config file. Please try again.');
                    });
            },
            onDownloadCustomFile: function () {
                let self = this;

                // JSON.stringify
                //let exportObj = {'isTimeSeries': self.timeSeriesMode};
                let sampleArr = [];
                let infoValues = Object.values(self.modelInfoMap);
                infoValues.forEach((val) => {
                    let newVal = {};
                    newVal.id = val.id;
                    newVal.isTumor = val.isTumor;
                    newVal.vcf = val.vcf;
                    newVal.tbi = val.tbi;
                    newVal.bam = val.bam;
                    newVal.bai = val.bai;
                    newVal.selectedSample = val.selectedSample;
                    newVal.displayName = val.displayName;
                    sampleArr.push(newVal);
                });
                exportObj['samples'] = sampleArr;
                const exportFile = JSON.stringify(exportObj);
                const blob = new Blob([exportFile], {type: 'text/plain'});
                const e = document.createEvent('MouseEvents'),
                    a = document.createElement('a');
                a.download = "oncogene_config.json";
                a.href = window.URL.createObjectURL(blob);
                a.dataset.downloadurl = ['text/json', a.download, a.href].join(':');
                e.initEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                a.dispatchEvent(e);
            },
            onAutoLoad: function (customInfos = false) {
                let self = this;

                let infosToLoad = null;
                if (!customInfos) {
                    self.separateUrlForIndex = false;
                    infosToLoad = self.variantModel.demoInfo;
                } else {
                    infosToLoad = customInfos;
                    self.separateUrlForIndex = self.checkCustomIndex(customInfos);
                }

                // Reset modelInfoMap to get rid of any added info extras
                self.modelInfoMap = {};

                // Add relevant infos to map and ids to sample array in correct order
                let idList = [];
                let arrIndex = 0;
                infosToLoad.forEach(function (modelInfo) {
                    let id = modelInfo.id;
                    idList.push(id);
                    self.modelInfoMap[id] = modelInfo;
                    self.entryIds[arrIndex] = modelInfo.id;
                    arrIndex++;
                });

                // Get rid of any remaining extra samples names in array
                if (self.entryIds.length > arrIndex) {
                    let numToDelete = self.entryIds.length - arrIndex;
                    self.entryIds.splice(arrIndex, numToDelete);
                }

                // Ensure models are synonymous with infos and in same order as view
                self.variantModel.removeExtraneousDataSets(idList);
                let addPromises = [];
                for (let i = 0; i < self.entryIds.length; i++) {
                    let currId = self.entryIds[i];
                    let currDataSet = self.variantModel.getDataSet(currId);
                    if (currDataSet == null) {
                        let corrInfo = self.modelInfoMap[currId];
                        let p = self.variantModel.promiseAddEntry(corrInfo); // Don't need to assign to map, done in promiseSetModel below
                        addPromises.push(p);
                    }
                }

                Promise.all(addPromises)
                    .then(() => {
                        self.variantModel.getAllDataSets().forEach(function (dataSet) {
                            self.promiseSetModel(dataSet);
                        });
                    })
            },
            checkCustomIndex: function (infos) {
                let areSeparate = false;
                infos.forEach((info) => {
                    if (info.bai != null || info.tbi != null) {
                        areSeparate = true;
                    }
                });
                return areSeparate;
            },
            /* Sets corresponding data set for each info object, pulls out samples for associated vcf, validates all files. */
            promiseSetModel: function (dataSet) {
                let self = this;
                return new Promise(function (resolve, reject) {

                    // Assign data set prop in info object to model
                    let theDataSet = dataSet;
                    let theModelInfo = self.modelInfoMap[theDataSet.entryId];
                    theModelInfo.dataSet = theDataSet;  // TODO: do I need to keep track of dataSet or Model here (or neither?)

                    // Check files in data set model
                    let nameList = [theModelInfo.id];
                    theDataSet.onVcfUrlEntered(nameList, theModelInfo.vcfs, theModelInfo.tbis)
                        .then((successObj) => {
                            if (successObj) {
                                // Set samples prop
                                theModelInfo.samples = successObj.samples;
                                self.$refs.sampleDataRef.forEach(function (ref) {
                                    if (ref.modelInfo.id === theDataSet.id) {
                                        // Set selected sample in model and in child cmpnt
                                        theDataSet.selectedSample = theModelInfo.selectedSample;
                                        ref.updateSamples(successObj.samples, theModelInfo.selectedSample);

                                        // Set display name in model
                                        theDataSet.displayName = theModelInfo.displayName ? theModelInfo.displayName : theModelInfo.selectedSample;
                                        self.validate();
                                    }
                                });
                                theDataSet.onBamUrlEntered(theModelInfo.bam, theModelInfo.bai, function (success) {
                                    self.validate();
                                    if (success) {
                                        resolve();
                                    } else {
                                        reject();
                                    }
                                })
                            } else {
                                reject();
                            }
                        })
                })
            },
            validate: function () {
                this.isValid = true;

                let keyList = Object.keys(this.modelInfoMap);
                for (let i = 0; i < keyList.length; i++) {
                    let currKey = keyList[i];
                    this.isValid &= (this.modelInfoMap[currKey] != null && this.modelInfoMap[currKey].dataSet.isReadyToLoad());
                }
            },
            getModel: function (id) {
                let theModel = null;
                if (this.variantModel) {
                    let modelObject = this.variantModel.sampleMap[id];
                    if (modelObject) {
                        theModel = modelObject.model;
                    }
                }
                return theModel;
            },
            // Called each time files menu opened
            init: function() {
                let self = this;
                // If we already have model information from Hub, we want to display that in the file loader
                if (self.variantModel && self.variantModel.getAllDataSets().length > 0) {
                    self.initModelInfo();
                } else {
                    self.promiseAddEntry(false);
                }
            },
            initModelInfo: function () {
                let self = this;
                self.separateUrlForIndex = false;
                self.timeSeries = false;
                self.variantModel.getAllDataSets().forEach((dataSet) => {

                    let modelInfo = self.modelInfoMap[dataSet.id];
                    let probandModel = dataSet.getProbandCohort();
                    let subsetModel = dataSet.getSubsetCohort();
                    if (modelInfo == null) {
                        modelInfo = {};
                        modelInfo.displayName = probandModel != null ? probandModel.trackName : '';
                        modelInfo.sampleIds = subsetModel != null ? subsetModel.sampleIds : [];
                        modelInfo.excludeIds = probandModel != null ? probandModel.excludeIds : [];
                        modelInfo.vcfs = dataSet.vcfs;
                        modelInfo.tbis = dataSet.tbis;
                        modelInfo.bams = dataSet.bams;
                        modelInfo.bais = dataSet.bais;
                        modelInfo.dataSet = dataSet;
                        if (modelInfo.tbi || modelInfo.bai) {
                            self.separateUrlForIndex = true;
                        }
                        let key = 's' + self.entryIds.length;
                        self.$set(self.modelInfoMap, key, modelInfo);
                    }
                })
            },
            removeSample: function (entryId, stateChanged = true, demoCall = false) {
                let self = this;
                if (stateChanged) {
                    self.stateUnchanged = false;
                }

                // If we've selected a demo, and then changed it, deselect dropdown
                if (self.autofillAction != null && !demoCall) {
                    self.autofillAction = null;
                }

                // Remove sample and delete info
                let entryIndex = self.entryIds.indexOf(entryId);
                self.entryIds.splice(entryIndex, 1);
                delete self.modelInfoMap[entryId];
                self.variantModel.removeEntry(entryId);
            }
        },
        computed: {
            buildList: function () {
                if (this.speciesName && this.variantModel.genomeBuildHelper) {
                    return this.variantModel.genomeBuildHelper.speciesToBuilds[this.speciesName].map(function (gb) {
                        return gb.name;
                    })
                } else {
                    return [];
                }
            }
        },
        created: function () {
        },
        mounted: function () {
            if (this.variantModel) {
                this.speciesName = this.variantModel.genomeBuildHelper.getCurrentSpeciesName();
                this.buildName = this.variantModel.genomeBuildHelper.getCurrentBuildName();
                this.speciesList = this.variantModel.genomeBuildHelper.speciesList.map(function (sp) {
                    return sp.name;
                }).filter(function (name) {
                    return name === 'Human';
                });
            }


        }
    }
</script>
