<!--Adapted from gene.iobio and TDS Aug2018-->
<style lang="sass">
    .filter-form
        .input-group
            label
                font-size: 13px
</style>

<template>
    <v-layout row wrap class="filter-form px-2" style="max-width:500px;">
        <v-flex id="name" xs12 class="mb-3">
            <v-expansion-panel>
                <v-expansion-panel-content
                        v-for="category in categories[filterName]"
                        :ref="category.name + 'ExpansionRef'"
                        :key="category.name"
                        :value="category.active">
                    <div slot="header">
                        <v-avatar v-if="category.active" size="10px" color="green"></v-avatar>
                        <span class="filter-title">
                            {{ category.display }}
                        </span>
                    </div>
                    <v-card>
                        <filter-settings-checkbox
                                v-if="category.type === 'checkbox'"
                                v-bind:ref="category.name + 'SettingsRef'"
                                :parentFilterName="category.name"
                                @filter-toggled="onFilterToggled">
                        </filter-settings-checkbox>
                        <filter-settings-range
                                v-if="category.type === 'range'"
                                v-bind:ref="category.name + 'SettingsRef'"
                                :filterModel="filterModel"
                                :filter="category">
                        </filter-settings-range>
                    </v-card>
                </v-expansion-panel-content>
            </v-expansion-panel>
        </v-flex>
    </v-layout>
</template>

<script>
    import FilterSettingsCheckbox from '../partials/FilterSettingsCheckbox.vue'
    import FilterSettingsRange from '../partials/FilterSettingsRange.vue'

    export default {
        name: 'filter-settings',
        components: {
            FilterSettingsCheckbox,
            FilterSettingsRange
        },
        props: {
            filter: null,
            filterName: '',
            filterModel: null,
            idx: null
        },
        data() {
            return {
                theFilter: null,
                name: null,
                maxAf: null,
                selectedClinvarCategories: null,
                selectedImpacts: null,
                selectedZygosity: null,
                selectedInheritanceModes: null,
                selectedConsequences: null,
                minGenotypeDepth: null,
                categories: {
                    'annotation': [
                        {name: 'impact', display: 'Impact', active: false, type: 'checkbox'},
                        {name: 'type', display: 'Type', active: false, type: 'checkbox'},
                        {name: 'zygosities', display: 'Zygosities', active: false, type: 'checkbox'},],
                    'coverage': [
                        {name: 'coverage', display: 'Coverage', active: false, type: 'range'}],
                    'enrichment': [
                        {name: 'pValue', display: 'P-value', active: false, type: 'range'},
                        {name: 'deltaFreq', display: 'Fold Change', active: false, type: 'range'}],
                    'frequencies': [
                        {name: '1000G', display: '1000G', active: false, type: 'range'},
                        {name: 'exac', display: 'ExAC', active: false, type: 'range'},
                        {name: 'gnomad', display: 'GnomAD', active: false, type: 'range'},
                        {name: 'probandFreq', display: 'Proband', active: false, type: 'range'},
                        {name: 'subsetFreq', display: 'Subset', active: false, type: 'range'}],
                    'rawCounts': [
                        {name: 'rawCounts', display: 'Raw Counts', active: false, type: 'range'}],
                    'samplePresence': [{name: 'samplePresence', display: 'Sample Presence', active: false, type: 'checkbox'}]
                }
            }
        },
        watch: {},
        methods: {
            init: function () {
                let flagCriteria = this.filterModel.flagCriteria[this.theFilter.name];
                if (flagCriteria == null) {
                    flagCriteria = {};
                    flagCriteria.custom = true;
                    flagCriteria.active = false;
                    flagCriteria.name = this.theFilter.display;
                    flagCriteria.maxAf = null;
                    flagCriteria.clinvar = null;
                    flagCriteria.impact = null;
                    flagCriteria.consequence = null;
                    flagCriteria.inheritance = null;
                    flagCriteria.zygosity = null;
                    flagCriteria.genotypeDepth = null;
                    this.filterModel.flagCriteria[this.theFilter.name] = flagCriteria;
                }
                this.name = flagCriteria.name;
                this.maxAf = flagCriteria.maxAf ? flagCriteria.maxAf * 100 : null;
                this.selectedClinvarCategories = flagCriteria.clinvar;
                this.selectedImpacts = flagCriteria.impact;
                this.selectedConsequences = flagCriteria.consequence;
                this.selectedInheritanceModes = flagCriteria.inheritance;
                this.selectedZygosity = flagCriteria.zygosity;
                this.minGenotypeDepth = flagCriteria.minGenotypeDepth;
            },
            apply: function () {
                let flagCriteria = this.filterModel.flagCriteria[this.theFilter.name];
                flagCriteria.name = this.name;
                if (flagCriteria.custom) {
                    flagCriteria.title = this.name;
                }
                flagCriteria.maxAf = this.maxAf ? this.maxAf / 100 : null;
                flagCriteria.clinvar = this.selectedClinvarCategories;
                flagCriteria.impact = this.selectedImpacts;
                flagCriteria.consequence = this.selectedConsequences;
                flagCriteria.inheritance = this.selectedInheritanceModes;
                flagCriteria.zygosity = this.selectedZygosity;
                flagCriteria.minGenotypeDepth = this.minGenotypeDepth;
                flagCriteria.active = true;
            },
            onChangeName: function () {
                this.theFilter.display = this.name;
            },
            onFilterToggled: function(filterName, filterState) {
                let self = this;
                self.$emit('filter-toggled', filterName, filterState);
            }
        },
        computed: {},
        created: function () {
        },
        mounted: function () {
            this.theFilter = this.filter;
            this.init();
        }
    }
</script>