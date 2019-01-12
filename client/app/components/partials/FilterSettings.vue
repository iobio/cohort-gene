<!--Adapted from gene.iobio and TDS Aug2018-->
<style lang="sass">
    .filter-form
        .input-group
            label
                font-size: 13px
        .filter-loader
            padding-top: 4px
            padding-right: 7px
            max-width: 25px
            margin: 0 !important
        img
            width: 18px !important
</style>

<template>
    <v-layout row wrap class="filter-form px-2" style="max-width:500px;">
        <v-flex id="name" xs12 class="mb-3">
            <v-expansion-panel expand>
                <v-expansion-panel-content
                        v-for="category in categories[filterName]"
                        :ref="category.name + 'ExpansionRef'"
                        :key="category.name"
                        :value="category.open">
                    <div slot="header">
                        <v-avatar v-if="category.active" size="12px" color="cohortBlue" style="margin-right: 10px"></v-avatar>
                        <v-avatar v-else-if="!category.active && (!isAnnotationCategory(category.name) || (isAnnotationCategory(category.name) && fullAnnotationComplete))" size="10px" color="white" style="margin-right: 12px"></v-avatar>
                        <span v-bind:hidden="!isAnnotationCategory(category.name) || fullAnnotationComplete" class="filter-loader">
                            <img src="../../../assets/images/wheel.gif">
                        </span>
                        <span class="filter-title">
                            {{ category.display }}
                        </span>
                    </div>
                    <v-card>
                        <filter-settings-checkbox
                                v-if="category.type==='checkbox'"
                                ref="filtCheckRef"
                                :parentFilterName="category.name"
                                :grandparentFilterName="filterName"
                                :fullAnnotationComplete="fullAnnotationComplete"
                                @filter-toggled="onFilterToggled">
                        </filter-settings-checkbox>
                        <filter-settings-cutoff
                            v-else-if="category.type==='cutoff'"
                            ref="filterCutoffRef"
                            :filterName="category.name"
                            :parentFilterName="filterName"
                            :fullAnnotationComplete="fullAnnotationComplete"
                            @filter-applied="onFilterApplied"
                            @cutoff-filter-cleared="onFilterCleared">
                        </filter-settings-cutoff>
                    </v-card>
                </v-expansion-panel-content>
            </v-expansion-panel>
        </v-flex>
    </v-layout>
</template>

<script>
    import FilterSettingsCheckbox from '../partials/FilterSettingsCheckbox.vue'
    import FilterSettingsCutoff from '../partials/FilterSettingsCutoff.vue'

    export default {
        name: 'filter-settings',
        components: {
            FilterSettingsCheckbox,
            FilterSettingsCutoff
        },
        props: {
            filter: null,
            filterName: '',
            filterModel: null,
            idx: null,
            fullAnnotationComplete: false
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
                        {name: 'impact', display: 'Impact', active: false, open: false, type: 'checkbox'},
                        {name: 'type', display: 'Type', active: false, open: false, type: 'checkbox'},
                        {name: 'zygosities', display: 'Zygosities', active: false, open: false, type: 'checkbox'},],
                    'coverage': [
                        {name: 'coverage', display: 'Coverage', active: false, open: false, type: 'cutoff'}],
                    'enrichment': [
                        {name: 'pValue', display: 'p-value', active: false, open: false, type: 'cutoff'},
                        {name: 'adjPVal', display: 'Adj p-value', active: false, open: false, type: 'cutoff'}],
                    'frequencies': [
                        {name: 'g1000', display: '1000G', active: false, open: false, type: 'cutoff'},
                        {name: 'exac', display: 'ExAC', active: false, open: false, type: 'cutoff'},
                        {name: 'gnomad', display: 'gnomAD', active: false, open: false, type: 'cutoff'},
                        {name: 'probandFreq', display: 'Proband', active: false, open: false, type: 'cutoff'},
                        {name: 'subsetFreq', display: 'Subset', active: false, open: false, type: 'cutoff'}],
                    'rawCounts': [ // Currently unused - may incorporate later
                        {name: 'rawCounts', display: 'Raw Counts', active: false, open: false, type: 'cutoff'}],
                    'samplePresence': [{name: 'samplePresence', display: 'Sample Presence', active: false, open: false, type: 'checkbox'}]
                }
            }
        },
        watch: {},
        methods: {
            onFilterToggled: function(filterName, filterState, parentFilterName, grandparentFilterName, parentFilterState) {
                let self = this;

                // Turn on indicator
                let filterObj = self.categories[grandparentFilterName].filter((cat) => {
                    return cat.name === parentFilterName;
                });
                if (filterObj.length > 0) {
                    filterObj[0].active = parentFilterState;
                }
                let grandparentFilterState = false;
                let parentFilters = self.categories[grandparentFilterName];
                parentFilters.forEach((filt) => {
                    grandparentFilterState |= filt.active;
                });
                self.$emit('filter-toggled', filterName, filterState, grandparentFilterName, grandparentFilterState);
            },
            onFilterApplied: function(filterName, filterLogic, cutoffValue, grandparentFilterName) {
                let self = this;

                // Turn on indicator
                let filterObj = self.categories[grandparentFilterName].filter((cat) => {
                    return cat.name === filterName;
                });
                if (filterObj.length > 0) {
                    filterObj[0].active = true;
                }
                let grandparentFilterState = false;
                let parentFilters = self.categories[grandparentFilterName];
                parentFilters.forEach((filt) => {
                    grandparentFilterState |= filt.active;
                });

                self.$emit('filter-applied', filterName, filterLogic, cutoffValue, grandparentFilterName, grandparentFilterState);
            },
            onFilterCleared: function(filterName, grandparentFilterName) {
                let self = this;

                // Turn on indicator
                let filterObj = self.categories[grandparentFilterName].filter((cat) => {
                    return cat.name === filterName;
                });
                if (filterObj.length > 0) {
                    filterObj[0].active = false;
                }
                let grandparentFilterState = false;
                let parentFilters = self.categories[grandparentFilterName];
                parentFilters.forEach((filt) => {
                    grandparentFilterState |= filt.active;
                });

                self.$emit('cutoff-filter-cleared', filterName, grandparentFilterName, grandparentFilterState);
            },
            clearFilters: function() {
                let self = this;
                (Object.values(self.categories)).forEach((catList) => {
                    catList.forEach((filt) => {
                        filt.active = false;
                    })
                });
                self.$refs.filtCheckRef.forEach((checkRef) => {
                    checkRef.clearFilters();
                })
            },
            isAnnotationCategory: function (currentCat) {
                if (currentCat === 'impact' || currentCat === 'g1000' ||
                    currentCat === 'exac' || currentCat === 'gnomad') {
                    return true;
                } else {
                    return false;
                }
            }
        },
        computed: {
        },
        created: function () {
        },
        mounted: function () {
        }
    }
</script>