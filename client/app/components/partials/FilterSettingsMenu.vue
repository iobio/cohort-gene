<!--Adapted from gene.iobio and TDS 17Aug2018-->

<style lang="sass">
    @import ../../../assets/sass/variables
    .filter-settings-form
        .filter-title
            font-size: 14px
            font-family: 'Open Sans', 'Quattrocento Sans', 'sans serif'
            vertical-align: top
            margin-left: 6px
            color: $text-color
        svg
            width: 22px
            height: 18px
        .remove-custom-filter
            margin: 0px
            float: right
            color: $text-color

    #filter-settings-icon
        font-size: 20px
        color: $app-color
</style>

<template>
    <v-flex xs12 style="padding-top: 10px">
        <v-card
                v-for="filter in filters"
                :ref="filter.name + 'ExpansionRef'"
                :key="filter.name"
                :value="filter.custom">
            <v-card-title class="filter-settings-form">
                <v-icon small style="padding-left: 5px; padding-right: 5px">
                    {{filter.icon}}
                </v-icon>
                {{ filter.display }}
                    <v-fab-transition>
                        <v-btn v-if="filter.name === topFilter"
                               v-show="anyFiltersActive"
                               v-bind:style="{height: 38 + 'px', marginTop: 10 + 'px'}"
                               color="cohortGold"
                               small
                               top
                               dark
                               fab
                               right
                               absolute
                               @click="removeAllFilters">
                            <v-icon color="white">close</v-icon>
                        </v-btn>
                    </v-fab-transition>
            </v-card-title>
            <v-card-text>
                <i>{{filter.description}}</i>
            </v-card-text>
            <filter-settings
                    v-if="filter.name !== 'coverage'"
                    ref="filterSettingsRef"
                    :filterName="filter.name"
                    :filterModel="filterModel"
                    :filter="filter"
                    :fullAnnotationComplete="fullAnnotationComplete"
                    :blacklistStatus="blacklistStatus"
                    :totalNumTracks="totalNumTracks"
                    @filter-toggled="filterBoxToggled"
                    @filter-applied="filterCutoffApplied"
                    @cutoff-filter-cleared="filterCutoffCleared">
            </filter-settings>
        </v-card>
    </v-flex>
</template>


<script>
    import FilterIcon from '../partials/FilterIcon.vue'
    import FilterSettings from '../partials/FilterSettings.vue'
    import FilterSettingsCoverage from '../partials/FilterSettingsCoverage.vue'

    export default {
        name: 'filter-settings-menu',
        components: {
            FilterIcon,
            FilterSettings,
            FilterSettingsCoverage
        },
        props: {
            filterModel: null,
            showCoverageCutoffs: null,
            fullAnnotationComplete: false,
            blacklistStatus: false,
            totalNumTracks: 0
        },
        data() {
            return {
                showMenu: true,
                anyFiltersActive: false,
                topFilter: 'annotation',
                filters: [
                    {
                        name: 'annotation',
                        display: 'ANNOTATION FILTERS',
                        active: false,
                        custom: false,
                        description: 'Filter by variant effect, impact, or type',
                        icon: 'category'
                    },
                    {
                        name: 'enrichment',
                        display: 'ENRICHMENT FILTERS',
                        active: false,
                        custom: false,
                        description: 'Filter by cohort variants by enrichment statistics',
                        icon: 'poll'
                    },
                    {
                        name: 'frequencies',
                        display: 'FREQUENCY FILTERS',
                        active: false,
                        custom: false,
                        description: 'Filter by variant frequency within population databases or within the cohort',
                        icon: 'people_outline'
                    },
                ]
            }
        },
        watch: {},
        methods: {
            filterBoxToggled: function (filterName, filterState, parentFilterName, grandparentFilterName, grandparentFilterState, cohortOnlyFilter, filterDisplayName, trackId) {
                let self = this;
                let filterObj = self.filters.filter((filt) => {
                    return filt.name === grandparentFilterName;
                });
                if (filterObj.length > 0) {
                    filterObj[0].active = grandparentFilterState;
                }
                self.checkForAnyActiveFilters();
                self.$emit('filter-box-toggled', filterName, filterState, cohortOnlyFilter, parentFilterName, grandparentFilterName, filterDisplayName, trackId);
            },
            filterCutoffApplied: function (filterName, filterLogic, cutoffValue, parentFilterName, parentFilterState, grandparentFilterName, cohortOnlyFilter, filterDisplayName) {
                let self = this;
                let filterObj = self.filters.filter((filt) => {
                    return filt.name === parentFilterName;
                });
                if (filterObj.length > 0) {
                    filterObj[0].active = parentFilterName;
                    self.anyFiltersActive = true;
                }
                self.$emit('filter-cutoff-applied', filterName, filterLogic, cutoffValue, cohortOnlyFilter, parentFilterName, grandparentFilterName, filterDisplayName);
            },
            filterCutoffCleared: function (filterName, parentFilterName, parentFilterState, grandparentFilterName, cohortOnlyFilter, filterDisplayName, trackId) {
                let self = this;
                let filterObj = self.filters.filter((filt) => {
                    return filt.name === parentFilterState;
                });
                if (filterObj.length > 0) {
                    filterObj[0].active = parentFilterState;
                }
                self.checkForAnyActiveFilters();
                self.$emit('filter-cutoff-cleared', filterName, cohortOnlyFilter, parentFilterName, grandparentFilterName, filterDisplayName, trackId);
            },
            clearFilters: function () {
                let self = this;
                self.anyFiltersActive = false;
                self.filters.forEach((filter) => {
                    filter.active = false;
                });
                if (self.$refs.filterSettingsRef) {
                    self.$refs.filterSettingsRef.forEach((filtRef) => {
                        filtRef.clearFilters();
                    });
                }
            },
            removeFilterViaChip: function(filterName, parentFilterName, grandparentFilterName, filterType, trackId) {
                let self = this;
                if (self.$refs.filterSettingsRef) {
                    self.$refs.filterSettingsRef.forEach((filtRef) => {
                        if (filterType === 'checkbox' && filtRef.filterName === grandparentFilterName) {
                            filtRef.removeFilterViaChip(filterName, parentFilterName, filterType, trackId);
                        } else if (filterType === 'cutoff' && filtRef.filterName === parentFilterName) {
                            filtRef.removeFilterViaChip(filterName, parentFilterName, filterType, trackId);
                        }
                    });
                }
                self.checkForAnyActiveFilters();
            },
            checkForAnyActiveFilters: function() {
                let self = this;
                let anyActive = false;
                self.filters.filter((filt) => {
                    anyActive |= filt.active;
                });
                self.anyFiltersActive = anyActive === 1;
            },
            removeAllFilters: function() {
                let self = this;
                self.clearFilters();
                self.$emit('remove-all-filters');
            }
        },
        computed: {},
        created: function () {
        },
        mounted: function () {
        }
    }
</script>
