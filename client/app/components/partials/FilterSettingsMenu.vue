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
        <v-expansion-panel expand>
            <v-expansion-panel-content
                    v-for="filter in filters"
                    :ref="filter.name + 'ExpansionRef'"
                    :key="filter.name"
                    :value="filter.custom">
                <div slot="header" class="filter-settings-form">
                    <v-avatar v-if="filter.active" size="12px" color="cohortBlue"></v-avatar>
                    <v-avatar v-else size="12px" color="white"></v-avatar>
                    <span class="filter-title">
                        {{ filter.display }}
                    </span>
                </div>
                <v-card>
                    <v-card-text><i>{{filter.description}}</i></v-card-text>
                    <filter-settings
                            v-if="filter.name !== 'coverage'"
                            ref="filterSettingsRef"
                            :filterName="filter.name"
                            :filterModel="filterModel"
                            :filter="filter"
                            @filter-toggled="filterBoxToggled">
                    </filter-settings>
                </v-card>
            </v-expansion-panel-content>
        </v-expansion-panel>
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
            showCoverageCutoffs: null
        },
        data() {
            return {
                showMenu: true,
                filters: [
                    {name: 'annotation', display: 'ANNOTATION', active: false, custom: false, description: 'Filter by variant effect, impact, or type'},
                    // {name: 'coverage', display: 'COVERAGE', active: false, custom: false, description: 'Filter individual sample tracks by fold coverage counts'},
                    {name: 'enrichment', display: 'ENRICHMENT', active: false, custom: false, description: 'Filter by cohort variants by enrichment statistics'},
                    {name: 'frequencies', display: 'FREQUENCIES', active: false, custom: false, description: 'Filter by variant frequency within population databases or within the cohort'},
                    // {name: 'samplePresence', display: 'SAMPLE PRESENCE', active: false, custom: false, description: 'Filter cohort variants by only displaying those also present within a single sample track'}
                ]
            //     clinvarCategories: [
            //     {'key': 'clinvar', 'selected': true, value: 'clinvar_path', text: 'Pathogenic'},
            //     {'key': 'clinvar', 'selected': true, value: 'clinvar_lpath', text: 'Likely pathogenic'},
            //     {'key': 'clinvar', 'selected': true, value: 'clinvar_uc', text: 'Uncertain significance'},
            //     {'key': 'clinvar', 'selected': true, value: 'clinvar_cd', text: 'Conflicting data'},
            //     {'key': 'clinvar', 'selected': false, value: 'clinvar_other', text: 'Other'},
            //     {'key': 'clinvar', 'selected': false, value: 'clinvar_benign', text: 'Benign'},
            //     {'key': 'clinvar', 'selected': false, value: 'clinvar_lbenign', text: 'Likely benign'}
            // ],
            //     impacts: ['HIGH', 'MODERATE', 'MODIFIER', 'LOW'],
            //     zygosities: ['HOM', 'HET']
            }
        },
        watch: {
            // showCoverageCutoffs: function () {
            //     if (this.showCoverageCutoffs) {
            //         this.showMenu = true;
            //         this.filters.forEach(function (f) {
            //             f.active = f.name === 'coverage';
            //         })
            //     }
            // }
        },
        methods: {
            filterBoxToggled: function(filterName, filterState, parentFilterName, parentFilterState) {
                let self = this;
                let filterObj = self.filters.filter((filt) => {
                    return filt.name === parentFilterName;
                });
                if (filterObj.length > 0) {
                    filterObj[0].active = parentFilterState;
                }
                self.$emit('filter-box-toggled', filterName, filterState);
            },
            clearFilters: function() {
                let self = this;
                self.filters.forEach((filter) => {
                    filter.active = false;
                });
                if (self.$refs.filterSettingsRef) {
                    self.$refs.filterSettingsRef.forEach((filtRef) => {
                        filtRef.clearFilters();
                    });
                }
            }
        },
        computed: {},
        created: function () {
        },
        mounted: function () {
        }
    }
</script>
