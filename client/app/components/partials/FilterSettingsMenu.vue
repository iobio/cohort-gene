<!--Adapted from gene.iobio and TDS 17Aug2018-->

<style lang="sass">
    @import ../../../assets/sass/variables
    .filter-settings-form
        .filter-title
            vertical-align: top
            margin-left: 3px
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
        <v-expansion-panel>
            <v-expansion-panel-content
                    v-for="filter in filters"
                    :ref="filter.name + 'ExpansionRef'"
                    :key="filter.name"
                    :value="filter.active">
                <div slot="header">
                    <filter-icon :icon="filter.name">
                    </filter-icon>
                    <span class="filter-title">
                        {{ filter.display }}
                    </span>
                    <v-btn small flat
                           class="remove-custom-filter"
                           v-if="filter.custom"
                           @click="onRemoveCustomFilter(filter)">
                        Remove
                    </v-btn>
                </div>
                <v-card>
                    <filter-settings
                            v-if="filter.name !== 'coverage'"
                            v-bind:ref="filter.name + 'SettingsRef'"
                            :filterModel="filterModel"
                            :filter="filter">
                    </filter-settings>
                    <filter-settings-coverage
                            v-if="filter.name === 'coverage'"
                            v-bind:ref="filter.name + 'SettingsRef'"
                            :filterModel="filterModel">
                    </filter-settings-coverage>
                </v-card>
            </v-expansion-panel-content>
        </v-expansion-panel>


        <v-flex xs12>
            <v-btn style="float:right"
                   @click="onNewFilter">
                New
            </v-btn>
            <v-btn style="float:right"
                    @click="onApply">
                Apply
            </v-btn>
            <v-btn style="float:right"
                   @click="onCancel">
                Cancel
            </v-btn>
        </v-flex>
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
                    {name: 'pathogenic', display: 'Known pathogenic', active: false, custom: false},
                    {name: 'autosomalDominant', display: 'Autosomal dominant', active: false, custom: false},
                    {name: 'denovo', display: 'De novo', active: false, custom: false},
                    {name: 'recessive', display: 'Recessive', active: false, custom: false},
                    {name: 'xlinked', display: 'X-linked', active: false, custom: false},
                    {name: 'compoundHet', display: 'Compound het', active: false, custom: false},
                    {name: 'highOrModerate', display: 'High or moderate impact', active: false, custom: false}
                    // {name: 'coverage', display: 'Insufficient coverage', active: false, custom: false}
                ]
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
            }
        },
        computed: {},
        created: function () {
        },
        mounted: function () {
        }
    }
</script>
