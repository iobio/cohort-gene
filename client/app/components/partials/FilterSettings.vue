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
            <v-expansion-panel expand>
                <v-expansion-panel-content
                        v-for="category in categories[filterName]"
                        :ref="category.name + 'ExpansionRef'"
                        :key="category.name"
                        :value="category.active">
                    <div slot="header">
                        <v-avatar v-if="category.active" size="12px" color="cohortBlue" style="margin-right: 10px"></v-avatar>
                        <v-avatar v-else size="10px" color="white" style="margin-right: 12px"></v-avatar>
                        <span class="filter-title">
                            {{ category.display }}
                        </span>
                    </div>
                    <v-card>
                        <filter-settings-checkbox
                                ref="filtCheckRef"
                                :parentFilterName="category.name"
                                :grandparentFilterName="filterName"
                                @filter-toggled="onFilterToggled">
                        </filter-settings-checkbox>
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
                        {name: 'pValue', display: 'P-value', active: false, type: 'checkbox'},
                        {name: 'subsetDelta', display: 'Fold Change', active: false, type: 'checkbox'}],
                    'frequencies': [
                        {name: 'g1000', display: '1000G', active: false, type: 'checkbox'},
                        {name: 'exac', display: 'ExAC', active: false, type: 'checkbox'},
                        {name: 'gnomad', display: 'gnomAD', active: false, type: 'checkbox'},
                        {name: 'probandFreq', display: 'Proband', active: false, type: 'checkbox'},
                        {name: 'subsetFreq', display: 'Subset', active: false, type: 'checkbox'}],
                    'rawCounts': [ // Currently unused - may incorporate later
                        {name: 'rawCounts', display: 'Raw Counts', active: false, type: 'range'}],
                    'samplePresence': [{name: 'samplePresence', display: 'Sample Presence', active: false, type: 'checkbox'}]
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
            }
        },
        computed: {},
        created: function () {
        },
        mounted: function () {
        }
    }
</script>