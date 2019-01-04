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
        <v-expansion-panel focusable>
            <v-expansion-panel-content
                    v-for="filter in filters"
                    :ref="filter.name + 'ExpansionRef'"
                    :key="filter.name"
                    :value="filter.active">
                <div slot="header" class="filter-settings-form">
                    <v-avatar v-if="filter.active" size="10px" color="green"></v-avatar>
                    <span class="filter-title">
                        {{ filter.display }}
                    </span>
                </div>
                <v-card>
                    <v-card-text><i>{{filter.description}}</i></v-card-text>
                    <filter-settings
                            v-if="filter.name !== 'coverage'"
                            v-bind:ref="filter.name + 'SettingsRef'"
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
                    {name: 'coverage', display: 'COVERAGE', active: false, custom: false, description: 'Filter by fold coverage counts'},
                    {name: 'enrichment', display: 'ENRICHMENT', active: false, custom: false, description: 'Filter by enrichment statistics'},
                    {name: 'frequencies', display: 'FREQUENCIES', active: false, custom: false, description: 'Filter by variant frequency within population databases or within the cohort'},
                    {name: 'rawCounts', display: 'RAW COUNTS', active: false, custom: false, description: 'Display variants that appear a specified number of times within the cohort'},
                    {name: 'samplePresence', display: 'SAMPLE PRESENCE', active: false, custom: false, description: 'Filter cohort variants by only displaying those also within a single sample track'},
                    {name: 'zygosities', display: 'ZYGOSITIES', active: false, custom: false, description: 'Display only variants with a specific zygosity'}
                ],
                clinvarCategories: [
                {'key': 'clinvar', 'selected': true, value: 'clinvar_path', text: 'Pathogenic'},
                {'key': 'clinvar', 'selected': true, value: 'clinvar_lpath', text: 'Likely pathogenic'},
                {'key': 'clinvar', 'selected': true, value: 'clinvar_uc', text: 'Uncertain significance'},
                {'key': 'clinvar', 'selected': true, value: 'clinvar_cd', text: 'Conflicting data'},
                {'key': 'clinvar', 'selected': false, value: 'clinvar_other', text: 'Other'},
                {'key': 'clinvar', 'selected': false, value: 'clinvar_benign', text: 'Benign'},
                {'key': 'clinvar', 'selected': false, value: 'clinvar_lbenign', text: 'Likely benign'}
            ],
                impacts: ['HIGH', 'MODERATE', 'MODIFIER', 'LOW'],
                zygosities: ['HOM', 'HET']
            }
        },
        watch: {
            showCoverageCutoffs: function () {
                if (this.showCoverageCutoffs) {
                    this.showMenu = true;
                    this.filters.forEach(function (f) {
                        f.active = f.name === 'coverage';
                    })
                }
            }
        },
        methods: {
            onNewFilter: function () {
                let self = this;
                this.filters.forEach(function (filter) {
                    filter.active = false;
                    let refName = filter.name + 'ExpansionRef';
                    self.$refs[refName].forEach(function (component) {
                        component.isActive = false;
                    })
                });
                this.filters.push({
                    name: 'custom' + (this.filters.length - 7),
                    display: 'custom',
                    active: true,
                    custom: true
                });
            },
            onApply: function () {
                let self = this;
                this.filters.forEach(function (filter) {
                    let refName = filter.name + 'SettingsRef';
                    self.$refs[refName].forEach(function (component) {
                        component.apply();
                    })
                });
                self.$emit('filter-settings-applied');
                this.$emit('filter-settings-closed');
                this.showMenu = false;
            },
            onCancel: function () {
                this.showMenu = false;
                this.$emit('filter-settings-closed');
            },
            close: function () {
                this.showMenu = false;
                this.$emit('filter-settings-closed');
            },
            onRemoveCustomFilter: function (filter) {
                let idx = this.filters.indexOf(filter);
                if (idx >= 0) {
                    this.filters.splice(idx, 1);
                }
            },
            filterBoxToggled: function(filterName, filterState) {
                let self = this;
                self.$emit('filter-box-toggled', filterName, filterState);
            }
        },
        computed: {},
        created: function () {
        },
        mounted: function () {
        }
    }
</script>
