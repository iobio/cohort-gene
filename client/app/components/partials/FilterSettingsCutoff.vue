<!--SJG Jan2019; Adapted from gene.iobio and TDS Aug2018-->
<style lang="sass">
    @import ../../../assets/sass/variables
    .filter-form
        .input-group
            label
                padding-top: 5px
                padding-left: 15px
                font-size: 14px
                font-weight: normal
                color: black !important
                pointer-events: none !important
                cursor: default
</style>

<template>
    <v-layout row wrap class="filter-form mx-2 px-2" style="max-width:500px;">
        <v-flex xs12>
            <v-container fluid>
                <v-layout>
                    <v-flex d-flex xs8>
                        <v-select
                                :items="dropDownOptions"
                                label="Select"
                                v-model="filterLogic"
                                single-line
                                color="colorNavy"
                                @change="checkApplyButtonState"
                        ></v-select>
                    <!--</v-flex>-->
                    <!--<v-flex d-flex xs5 lg3>-->
                        <v-text-field
                            v-if="isFrequencyField"
                            v-model="cutoffValue"
                            single-line
                            label="Value"
                            suffix="%"
                            color="cohortNavy"
                            :rules="[(v) => (v > 0 && v < 100) || 'Integer between 1-99']"
                            :style="'padding-left: 5px'"
                            @change="checkApplyButtonState">
                        </v-text-field>
                        <v-text-field
                                v-else-if="isRawPVal"
                                v-model="cutoffValue"
                                single-line
                                label="Value"
                                color="cohortNavy"
                                :rules="[(v) => (v > 0 && v < 1) || 'Value between 0-1']"
                                :style="'padding-left: 5px'"
                                @change="checkApplyButtonState">
                        </v-text-field>
                        <v-text-field
                                v-else
                                v-model="cutoffValue"
                                single-line
                                label="Value"
                                color="cohortNavy"
                                :style="'padding-left: 5px'"
                                @change="checkApplyButtonState">
                        </v-text-field>
                    </v-flex>
                    <v-flex d-flex xs2>
                        <v-tooltip color="appGray" top>
                            <v-btn fab
                                   icon
                                   outline
                                   v-bind:style="{marginTop: '20px', maxWidth: '30px', color: filterButtonColor, marginRight: '5px !important'}"
                                   slot="activator"
                                   @click="onApplyFilter"
                                   :disabled="!readyToApply || (!fullAnnotationComplete && isFrequencyField)">
                                <v-icon>filter_list</v-icon>
                            </v-btn>
                            <span>{{buttonTipText}}</span>
                        </v-tooltip>
                    </v-flex>
                    <v-flex d-flex xs2>
                        <v-tooltip color="appGray" top>
                            <v-btn fab
                                   icon
                                   outline
                                   v-bind:style="{marginTop: '20px', maxWidth: '30px', marginLeft: '5px !important', color: '#95b0c6'}"
                                   slot="activator"
                                   @click="clearFilters">
                                <v-icon>clear</v-icon>
                            </v-btn>
                            <span>Clear</span>
                        </v-tooltip>
                    </v-flex>
                </v-layout>
            </v-container>
        </v-flex>
    </v-layout>
</template>

<script>
    export default {
        name: 'filter-settings-cutoff',
        components: {},
        props: {
            filterName: null,
            parentFilterName: null,
            fullAnnotationComplete: false
        },
        data() {
            return {
                dropDownOptions: [
                    { text: '<' },
                    { text: '<=' },
                    { text: '=' },
                    { text: '>=' },
                    { text: '>' }
                ],
                filterLogic: null,
                cutoffValue: null,
                readyToApply: false,
                isRawPVal: false,
                filterButtonColor: 'green'
            }
        },
        watch: {},
        methods: {
            clearFilters: function() {
                let self = this;
                (Object.values(self.checkboxLists)).forEach((checkList) => {
                    checkList.forEach((filt) => {
                        filt.model = true;
                    });
                })
            },
            onApplyFilter: function() {
                let self = this;
                self.filterButtonColor = '#95b0c6';     // Flip button color
                self.$emit('filter-applied', self.filterName, self.filterLogic, self.cutoffValue, self.parentFilterName);
            },
            checkApplyButtonState: function() {
                let self = this;

                let inputValid = false;
                if (self.isFrequencyField) {
                    inputValid = self.cutoffValue > 0 && self.cutoffValue < 100;
                } else if (self.isRawPVal) {
                    inputValid = self.cutoffValue > 0 && self.cutoffValue < 1;
                } else {
                    inputValid = self.cutoffValue != null;
                }
                self.readyToApply = self.filterLogic && inputValid;
                if (self.readyToApply) {
                    self.filterButtonColor = 'green';
                }
            }
        },
        computed: {
            isAnnotationCategory: function() {
                let self = this;
                if (self.filterName === 'impact' || self.filterName === 'g1000' ||
                    self.filterName === 'exac' || self.filterName === 'gnomad') {
                    return true;
                } else {
                    return false;
                }
            },
            isFrequencyField: function() {
                let self = this;
                if (self.filterName === 'g1000' || self.filterName === 'exac' ||
                    self.filterName === 'gnomad' || self.filterName === 'probandFreq'
                    || self.filterName === 'subsetFreq') {
                    return true;
                } else {
                    return false;
                }
            },
            buttonTipText: function() {
                let self = this;
                if (self.readyToApply) {
                    return 'Click to apply';
                } else {
                    return 'Enter criteria';
                }
            }
        },
        created: function () {},
        mounted: function () {}
    }
</script>