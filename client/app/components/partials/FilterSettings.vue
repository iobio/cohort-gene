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
                        <v-avatar v-if="category.active" size="12px" color="cohortGold" style="margin-right: 10px"></v-avatar>
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
                                :totalNumTracks="totalNumTracks"
                                @filter-toggled="onFilterToggled">
                        </filter-settings-checkbox>
                        <filter-settings-cutoff
                                v-else-if="category.type==='cutoff'"
                                ref="filterCutoffRef"
                                :filterName="category.name"
                                :parentFilterName="filterName"
                                :fullAnnotationComplete="fullAnnotationComplete"
                                :blacklistStatus="(category.cohortOnly && blacklistStatus)"
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
            fullAnnotationComplete: false,
            blacklistStatus: false,
            totalNumTracks: 0   // Total number of variant tracks, one enrichment + user determined single samples
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
                        {name: 'impact', display: 'Impact', active: false, open: false, type: 'checkbox', cohortOnly: false},
                        {name: 'type', display: 'Type', active: false, open: false, type: 'checkbox', cohortOnly: false},
                        {name: 'zygosities', display: 'Zygosities', active: false, open: false, type: 'checkbox', cohortOnly: false},],
                    'enrichment': [
                        {name: 'pValue', display: 'p-val', active: false, open: false, numTracksActive: 0, type: 'cutoff', cohortOnly: true},
                        {name: 'adjPVal', display: '-log(p-val)', active: false, open: false, numTracksActive: 0, type: 'cutoff', cohortOnly: true}],
                    'frequencies': [
                        {name: 'g1000', display: '1000G', active: false, open: false, numTracksActive: 0, type: 'cutoff', cohortOnly: false},
                        {name: 'exac', display: 'ExAC', active: false, open: false, numTracksActive: 0, type: 'cutoff', cohortOnly: false},
                        {name: 'gnomad', display: 'gnomAD', active: false, open: false, numTracksActive: 0, type: 'cutoff', cohortOnly: false},
                        {name: 'probandFreq', display: 'Proband', active: false, open: false, numTracksActive: 0, type: 'cutoff', cohortOnly: true},
                        {name: 'subsetFreq', display: 'Subset', active: false, open: false, numTracksActive: 0, type: 'cutoff', cohortOnly: true}],
                    'rawCounts': [ // Currently unused - may incorporate later
                        {name: 'rawCounts', display: 'Raw Counts', active: false, open: false, type: 'cutoff'}],
                    'samplePresence': [{name: 'samplePresence', display: 'Sample Presence', active: false, open: false, type: 'checkbox'}]
                }
            }
        },
        watch: {},
        methods: {
            // Turns a checkbox filter on or off according to filterState
            onFilterToggled: function(filterName, filterState, parentFilterName, grandparentFilterName, parentFilterState, filterDisplayName, trackId) {
                let self = this;
                // Turn on indicator
                let filterObj = self.categories[grandparentFilterName].filter((cat) => {
                    return cat.name === parentFilterName;
                });
                let cohortOnly = false;
                if (filterObj.length > 0) {
                    filterObj[0].active = parentFilterState;
                    cohortOnly = filterObj[0].cohortOnly;
                }
                let grandparentFilterState = false;
                let parentFilters = self.categories[grandparentFilterName];
                parentFilters.forEach((filt) => {
                    grandparentFilterState |= filt.active;
                });
                // Format display name
                if (parentFilterName === 'impact') {
                    filterDisplayName = filterDisplayName.toLowerCase();
                    filterDisplayName = filterDisplayName.charAt(0).toUpperCase() + filterDisplayName.slice(1);
                    filterDisplayName += ' Impact';
                } else if (parentFilterName === 'type') {
                    if (filterDisplayName !== 'SNP' && filterDisplayName !== 'MNP') {
                        filterDisplayName = filterDisplayName.toLowerCase();
                        filterDisplayName = filterDisplayName.charAt(0).toUpperCase() + filterDisplayName.slice(1);
                    }
                    filterDisplayName += 's';
                } else if (parentFilterName === 'zygosities') {
                    if (filterName === 'hom') {
                        filterDisplayName = 'Homozygotes';
                    } else {
                        filterDisplayName = 'Heterozygotes';
                    }
                }
                self.$emit('filter-toggled', filterName, filterState, parentFilterName, grandparentFilterName, grandparentFilterState, cohortOnly, filterDisplayName, trackId);
            },
            // Applies a single cutoff filter for ALL tracks
            onFilterApplied: function(filterName, filterLogic, cutoffValue, grandparentFilterName) {
                let self = this;
                // Turn on indicator
                let filterObj = self.categories[grandparentFilterName].filter((cat) => {
                    return cat.name === filterName;
                });
                let cohortOnly = false;
                let displayName = '';
                if (filterObj.length > 0) {
                    filterObj[0].active = true;
                    cohortOnly = filterObj[0].cohortOnly;
                    displayName = filterObj[0].display;
                    if (grandparentFilterName === 'frequencies') {
                        displayName += ' Freq';
                    }
                    filterObj[0].numTracksActive = cohortOnly === true ? 1 : self.totalNumTracks;
                }
                let grandparentFilterState = false;
                let parentFilters = self.categories[grandparentFilterName];
                parentFilters.forEach((filt) => {
                    grandparentFilterState |= filt.active;
                });
                let greatGrandPlaceholder = ''; // No extra parental layer for cutoff filters
                self.$emit('filter-applied', filterName, filterLogic, cutoffValue, grandparentFilterName, grandparentFilterState, greatGrandPlaceholder, cohortOnly, displayName);
            },
            // Clears a cutoff filter for a single track if trackId is provided, otherwise clears filter from all tracks
            onFilterCleared: function(filterName, grandparentFilterName, trackId) {
                let self = this;

                let filterObj = self.categories[grandparentFilterName].filter((cat) => {
                    return cat.name === filterName;
                });
                let cohortOnly = false;
                let displayName = '';
                if (filterObj.length > 0) {
                    cohortOnly = filterObj[0].cohortOnly;
                    displayName = filterObj[0].display;
                    // Decrement active value if we're removing filter for single track
                    if (trackId != null) {
                        if (filterObj[0].numTracksActive === 0){
                            filterObj[0].active = false;
                        }
                    // Otherwise we're turning off filter for all tracks
                    } else {
                        filterObj[0].active = false;
                    }
                }
                let grandparentFilterState = false;
                let parentFilters = self.categories[grandparentFilterName];
                parentFilters.forEach((filt) => {
                    grandparentFilterState |= filt.active;
                });
                let greatGrandName = '';    // Don't have this level of hierarchy for cutoff filters but preserve param order
                self.$emit('cutoff-filter-cleared', filterName, grandparentFilterName, grandparentFilterState, greatGrandName, cohortOnly, displayName, trackId);
            },
            // Clears all filters from all tracks
            clearFilters: function() {
                let self = this;
                (Object.values(self.categories)).forEach((catList) => {
                    catList.forEach((filt) => {
                        filt.active = false;
                        if (filt.numTracksActive >= 0) {
                            filt.numTracksActive = 0;
                        }
                    })
                });
                if (self.$refs.filtCheckRef) {
                    self.$refs.filtCheckRef.forEach((checkRef) => {
                        checkRef.clearFilters();
                    });
                }
                if (self.$refs.filterCutoffRef) {
                    self.$refs.filterCutoffRef.forEach((cutoffRef) => {
                        cutoffRef.clearFilters();
                    });
                }
            },
            removeFilterViaChip: function(filterName, parentName, filterType, trackId) {
                let self = this;

                if (filterType === 'checkbox') {
                    self.$refs.filtCheckRef.forEach((checkRef) => {
                        if (checkRef.parentFilterName === parentName) {
                            checkRef.removeSingleTrack(filterName, parentName, trackId);
                        }
                    })
                } else {
                    // We need to filter bhy name here instead of parent name, b/c one level more advanced than checkbox
                    self.$refs.filterCutoffRef.forEach((cutoffRef) => {
                        if (cutoffRef.filterName === filterName) {

                            let filterObj = (self.categories[parentName]).filter((cat) => {
                                return cat.name === filterName;
                            });

                            if (filterObj.length > 0) {
                                filterObj[0].numTracksActive -= 1;

                                if (filterObj[0].numTracksActive === 0) {
                                    cutoffRef.clearFilters();
                                } else {
                                    self.onFilterCleared(filterName, parentName, trackId);
                                }
                            }
                        }
                    })
                }
            },
            isAnnotationCategory: function (currentCat) {
                // TODO: making all filters wait until annotation complete for now
                return true;
                // if (currentCat === 'impact' || currentCat === 'g1000' ||
                //     currentCat === 'exac' || currentCat === 'gnomad') {
                //     return true;
                // } else {
                //     return false;
                // }
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