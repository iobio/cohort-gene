<style lang="sass">
    @import ../../../assets/sass/variables
    #sample-data-form
        #sample-selection
            .input-group--select
                .input-group__selections__comma
                    font-size: 12px
                    padding: 0px 0px 0px 0px
            .input-group
                label
                    font-size: 12px
                    line-height: 25px
                    height: 25px
            .input-group__input
                min-height: 0px
                margin-top: 0px

            .input-group--text-field.input-group--dirty.input-group--select
                label
                    -webkit-transform: translate(0, -18px) scale(0.95)
                    transform: translate(0, -18px) scale(0.95)

            .input-group--text-field.input-group--dirty:not(.input-group--textarea)
                label
                    -webkit-transform: translate(0, -18px) scale(0.95)
                    transform: translate(0, -18px) scale(0.95)

        .sample-label
            span
                margin-top: 0px
                margin-bottom: 2px
                vertical-align: top
                margin-left: 0px
                font-size: 18px
                display: inline-block
                margin-right: 20px
            .switch
                display: inline-block
                width: 100px

</style>
<style lang="css">
    .drag-handle {
        cursor: move;
    }

    .vert-label {
        -webkit-transform: rotate(-90deg);
        -moz-transform: rotate(-90deg);
        color: #516e87;
        padding-top: 2px;
        padding-left: 0;
    }

    .vert-border {
        padding-left: 10px;
        border-left: 1px solid #95b0c6;
    }

    .cont-left {
        padding-right: 30px !important;
        padding-top: 25px !important;
    }
</style>

<template>
    <v-layout id="sample-data-form" row wrap
              :class="{'mt-3': true}">
        <v-flex d-flex xs1>
            <v-container height="100%" class="cont-left">
                <div class="vert-label">
                    {{entryLabel}}
                </div>
            </v-container>
        </v-flex>
        <v-flex d-flex xs11
                :style="{'margin-left': '-19px'}">
            <v-layout row wrap class="vert-border">
                <v-flex d-flex xs3 class="sample-label pb-1">
                    <v-text-field color="cohortNavy"
                                  label="Enter Track Name"
                                  hide-details
                                  v-model="modelInfo.displayName"
                                  @change="onNicknameEntered"
                    ></v-text-field>
                </v-flex>
                <v-flex d-flex xs7 v-if="launchedFromHub">
                    <v-container>
                        <div>
                            <v-chip small outline color="appColor">
                                {{chipLabel}}
                            </v-chip>
                        </div>
                    </v-container>
                </v-flex>
                <v-flex d-flex xs7 v-else>
                    <!--Spacing-->
                </v-flex>
                <v-flex d-flex xs2 v-if="!isMainCohort" style="padding-left: 30px">

                    <v-btn small flat icon style="margin: 0 !important"
                           @click="removeSample">
                        <v-icon color="cohortNavy">
                            clear
                        </v-icon>
                    </v-btn>
                </v-flex>
                <v-flex d-flex xs2 v-else>
                    <!--Spacing-->
                </v-flex>
                <v-flex d-flex xs12 class="ml-3">
                    <entry-data-file
                            :defaultUrl="firstVcf"
                            :defaultIndexUrl="firstTbi"
                            :label="`vcf`"
                            :indexLabel="`tbi`"
                            :filePlaceholder="filePlaceholder.vcf"
                            :fileAccept="fileAccept.vcf"
                            :separateUrlForIndex="separateUrlForIndex"
                            :isSampleEntry="false"
                            @url-entered="onVcfUrlEntered"
                            @file-selected="onVcfFilesSelected">
                    </entry-data-file>
                </v-flex>
                <v-flex xs6 id="subset-selection" v-if="samples && samples.length > 0">
                    <v-flex d-flex xs2>
                        <v-btn outline
                               small
                               color="cohortNavy">
                            Select Subset Samples
                        </v-btn>
                    </v-flex>
                    <v-flex d-flex xs4>
                        <span>{{subsetSampleIdDisplay}}</span>
                    </v-flex>
                </v-flex>
                <v-flex xs6 id="exclude-selection">
                    <v-flex d-flex xs2>
                        <v-btn outline
                               small
                               color="cohortNavy"
                               v-bind:class="samples == null || samples.length === 0 ? 'hide' : ''">
                            Exclude Samples
                        </v-btn>
                    </v-flex>
                </v-flex>
                <!--<v-flex d-flex xs12 class="ml-3">-->
                    <!--<entry-data-file-->
                            <!--:defaultUrl="firstBam"-->
                            <!--:defaultIndexUrl="firstBai"-->
                            <!--:label="`bam`"-->
                            <!--:indexLabel="`bai`"-->
                            <!--:filePlaceholder="filePlaceholder.bam"-->
                            <!--:fileAccept="fileAccept.bam"-->
                            <!--:separateUrlForIndex="separateUrlForIndex"-->
                            <!--@url-entered="onBamUrlEntered"-->
                            <!--@file-selected="onBamFilesSelected">-->
                    <!--</entry-data-file>-->
                <!--</v-flex>-->
            </v-layout>
        </v-flex>
    </v-layout>
</template>

<script>

    import EntryDataFile from './EntryDataFile.vue'
    import draggable from 'vuedraggable'

    export default {
        name: 'entry-data',
        components: {
            draggable,
            EntryDataFile
        },
        props: {
            modelInfo: null,
            separateUrlForIndex: null,
            dragId: '',
            arrIndex: 0,
            launchedFromHub: false,
            isSampleEntry: false
        },
        data() {
            return {
                isValid: false,
                filePlaceholder: {
                    'vcf': '.vcf.gz and .tbi files',
                    'bam': '.bam and .bai files'
                },
                fileAccept: {
                    'vcf': '.vcf.gz, .tbi',
                    'bam': '.bam, .bai'
                },
                samples: [],                    // the available samples to choose from
                subsetSampleIds: null,          // the samples composing the subset
                excludeSampleIds: null,         // the samples to exclude from all cohorts
                selectedSample: null,           // if isSampleEntry, user must select single sample for track
                isMainCohort: false,
                subsetSampleIdDisplay: '',
                entryLabel: '',
                chipLabel: 'Hub Sourced',
                firstVcf: null,
                firstTbi: null
            }
        },
        watch: {
            'modelInfo.vcfs': function(newVal, oldVal) {
                let self = this;
                self.firstVcf = newVal[0];
            },
            'modelInfo.tbis': function(newVal, oldVal) {
                let self = this;
                self.firstTbi = newVal;
            }
        },
        computed: {},
        methods: {
            onNicknameEntered: function () {
                if (self.modelInfo && self.modelInfo.dataSet) {
                    self.modelInfo.dataSet.getProbandCohort().trackName = self.modelInfo.displayName;
                }
            },
            onVcfUrlEntered: function (entryId, vcfUrl, tbiUrl) {
                let self = this;
                self.$set(self, "sample", null);
                self.$set(self, "samples", []);

                if (self.modelInfo && self.modelInfo.model) {
                    self.modelInfo.dataSet.onVcfUrlEntered([entryId], [vcfUrl], [tbiUrl])
                        .then((listObj) => {
                        if (listObj) {
                            debugger;   // TODO: Are we hitting this?
                            self.samples = listObj['samples'];
                            if (self.modelInfo.sample && self.samples.indexOf(self.modelInfo.sample) >= 0) {
                                self.sample = self.modelInfo.sample;
                                self.modelInfo.model.sampleName = self.modelInfo.sample;
                            } else if (self.samples.length === 1) {
                                self.sample = self.samples[0];
                                self.modelInfo.sample = self.sample;
                                self.modelInfo.model.sampleName = self.sample;
                            } else {
                                self.sample = null;
                                self.modelInfo.sample = null;
                                self.modelInfo.model.sampleName = null;
                            }
                            // self.$emit("samples-available", self.modelInfo.order, self.samples);
                        }
                        self.$emit("sample-data-changed");
                    })
                }
            },
            onVcfFilesSelected: function (fileSelection) {
                let self = this;
                self.$set(self, "sample", null);
                self.$set(self, "samples", []);
                self.modelInfo.model.promiseVcfFilesSelected(fileSelection)
                    .then(function (data) {
                        self.samples = data.sampleNames;
                        if (self.modelInfo.sample && self.samples.indexOf(self.modelInfo.sample) >= 0) {
                            self.sample = self.modelInfo.sample;
                            self.modelInfo.model.sampleName = self.modelInfo.sample;
                        } else if (self.samples.length === 1) {
                            self.sample = self.samples[0];
                            self.modelInfo.sample = self.sample;
                            self.modelInfo.model.sampleName = self.sample;
                        } else {
                            self.sample = null;
                            self.modelInfo.sample = null;
                            self.modelInfo.model.sampleName = null;
                        }
                        self.$emit("sample-data-changed");
                        self.$emit("samples-available", self.modelInfo.id, self.samples);
                    })
                    .catch(function (error) {
                        self.$emit("sample-data-changed");
                    })
            },
            // onIsAffected: function () {
            //     this.modelInfo.isTumor = this.isTumor;
            //     this.modelInfo.model.isTumor = this.modelInfo.affectedStatus;
            //     this.rowLabel = this.getRowLabel();
            // },

            /* Fills in samples field with all sample IDs seen when checking provided vcf urls.
             * If this is a cohort entry, fills in subset and exclude sample ID arrays.
             * Else if this is a sample entry, fills in selected sample ID. */
            fillSampleFields: function (samples, sampleToSelect, subsetSampleIds, excludeSampleIds) {
                this.samples = samples;
                if (sampleToSelect) {
                    this.selectedSample = sampleToSelect;
                } else {
                    this.subsetSampleIds = subsetSampleIds;
                    this.excludeSampleIds = excludeSampleIds;
                    this.selectedSample = null;
                }
            },
            // onSampleSelected: function () {
            //     let self = this;
            //     self.modelInfo.sample = this.sample;
            //     if (self.modelInfo.model) {
            //         self.modelInfo.model.sampleName = this.modelInfo.sample;
            //         self.modelInfo.model.setSelectedSample(this.modelInfo.sample);
            //     }
            //     self.$emit("sample-data-changed");
            // },
            onBamUrlEntered: function (bamUrl, baiUrl) {
                let self = this;
                if (self.modelInfo && self.modelInfo.model) {
                    self.modelInfo.model.onBamUrlEntered(bamUrl, baiUrl, function (success) {
                        if (success) {
                        } else {
                        }
                        self.$emit("sample-data-changed");
                    })
                }
            },
            onBamFilesSelected: function (fileSelection) {
                let self = this;
                self.modelInfo.model.promiseBamFilesSelected(fileSelection)
                    .then(function () {
                        self.$emit("sample-data-changed");
                    })
                    .catch(function (error) {
                        self.$emit("sample-data-changed");
                    })
            },
            removeSample: function () {
                let self = this;
                self.$emit("remove-entry", self.modelInfo.id);
            },
            // updateLabel: function() {
            //     let self = this;
            //     self.rowLabel = self.getRowLabel();
            // },
            // fillFirstFiles: function() {
            //     let self = this;
            //
            //     if (self.modelInfo && self.modelInfo.vcfs) {
            //         self.firstVcf = self.modelInfo.vcfs[0];
            //     }
            //     if (self.modelInfo && self.modelInfo.tbis) {
            //         self.firstTbi = self.modelInfo.tbis[0];
            //     }
            // }
        },
        created: function () {

        },
        mounted: function () {
            let self = this;
            self.samples = self.modelInfo.samples;
            self.isMainCohort = self.dragId === 's0';

            // Start loading process if mounting with data
            // if (self.modelInfo.vcfs) {
            //     self.onVcfUrlEntered(self.modelInfo.id, self.modelInfo.vcf, self.modelInfo.tbi);
            // }
            // Assign side bar label
            if (self.modelInfo.isSampleEntry) {
                self.entryLabel = 'SAMPLE';
            } else {
                self.entryLabel = 'COHORT';
            }
        }
    }

</script>