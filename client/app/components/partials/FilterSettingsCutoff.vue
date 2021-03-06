<!--SJG Jan2019; Adapted from gene.iobio and TDS Aug2018-->
<style scoped lang="sass">
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
                    <v-flex d-flex xs8 xl10>
                        <v-select v-bind:class="'filter-list'"
                                :items="dropDownOptions"
                                :disabled="blacklistStatus"
                                label="Select"
                                v-model="filterLogic"
                                single-line
                                color="colorNavy"
                                @change="checkApplyButtonState"
                        ></v-select>
                        <v-text-field
                            v-if="isFrequencyField"
                            v-model="cutoffValue"
                            single-line
                            label="Value"
                            suffix="%"
                            color="cohortNavy"
                            :disabled="blacklistStatus"
                            :rules="[(v) => (v > 0 && v < 100) || 'Integer between 1-99']"
                            :style="'padding-left: 5px'"
                            @change="checkApplyButtonState">
                        </v-text-field>
                        <v-text-field
                                v-else
                                v-model="cutoffValue"
                                single-line
                                label="Value"
                                color="cohortNavy"
                                :disabled="blacklistStatus"
                                :rules="[(v) => (v > 0 && v < 1) || 'Value between 0-1']"
                                :style="'padding-left: 5px'"
                                @change="checkApplyButtonState">
                        </v-text-field>
                    </v-flex>
                    <v-flex d-flex xs2 justify-end align-center>
                        <v-tooltip color="appGray" top>
                            <v-btn fab
                                   icon
                                   outline
                                   v-bind:style="{maxWidth: '30px', color: filterButtonColor}"
                                   slot="activator"
                                   @click="onApplyFilter"
                                   :disabled="!readyToApply || !fullAnnotationComplete || blacklistStatus">
                                <v-icon>check</v-icon>
                            </v-btn>
                            <span>{{buttonTipText}}</span>
                        </v-tooltip>
                    </v-flex>
                    <v-flex d-flex xs2 justify-start align-center>
                        <v-tooltip color="appGray" top>
                            <v-btn fab
                                   icon
                                   outline
                                   v-bind:style="{maxWidth: '30px', color: '#95b0c6'}"
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
            fullAnnotationComplete: false,
            blacklistStatus: false
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
                filterButtonColor: '#d18e00'
            }
        },
        watch: {},
        methods: {
            clearFilters: function() {
                let self = this;
                self.filterLogic = null;
                self.cutoffValue = null;
                self.readyToApply = false;
                self.$emit('cutoff-filter-cleared', self.filterName, self.parentFilterName);
            },
            onApplyFilter: function() {
                let self = this;
                self.filterButtonColor = '#d18e00';     // Flip button color
                self.$emit('filter-applied', self.filterName, self.filterLogic.text, self.cutoffValue, self.parentFilterName);
            },
            checkApplyButtonState: function() {
                let self = this;

                let inputValid = false;
                if (self.isFrequencyField) {
                    inputValid = self.cutoffValue > 0 && self.cutoffValue < 100;
                } else {
                    inputValid = self.cutoffValue > 0 && self.cutoffValue < 1;
                }
                self.readyToApply = self.filterLogic && inputValid;
                if (self.readyToApply) {
                    self.filterButtonColor = '#8BC34A';
                }
            }
        },
        computed: {
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