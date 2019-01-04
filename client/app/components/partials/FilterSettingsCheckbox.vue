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
</style>

<template>
    <v-layout row wrap class="filter-form mx-2 px-2" style="max-width:500px;">
        <v-flex id="name" xs12>
            <v-container fluid>
                <v-checkbox v-for="item in checkboxLists[parentFilterName]"
                            :key="item.name"
                            :label="item.displayName"
                            v-model="item.model"
                            color="cohortBlue"
                            style="padding-left: 15px; margin-top: 0; margin-bottom: 0"
                            @click="boxChecked(item)">
                </v-checkbox>
            </v-container>
        </v-flex>
    </v-layout>
</template>

<script>
    export default {
        name: 'filter-settings-checkbox',
        components: {},
        props: {
            parentFilterName: null,
            grandparentFilterName: null
        },
        data() {
            return {
                checkboxLists: {
                    // Annotation categories
                    impact: [
                        {name: 'HIGH', displayName: 'HIGH', model: true},
                        {name: 'MODERATE', displayName: 'MODERATE', model: true},
                        {name: 'MODIFIER', displayName: 'MODIFIER', model: true},
                        {name: 'LOW', displayName: 'LOW', model: true}
                    ],
                    type: [
                        {name: 'del', displayName: 'DELETION', model: true},
                        {name: 'ins', displayName: 'INSERTION', model: true},
                        {name: 'mnp', displayName: 'MNP', model: true},
                        {name: 'snp', displayName: 'SNP', model: true}
                    ],
                    zygosities: [
                        {name: 'hom', displayName: 'HOMOZYGOUS', model: true},
                        {name: 'het', displayName: 'HETEROZYGOUS', model: true}
                    ],

                    // Coverage

                    // Enrichment

                    // Frequencies
                    g1000: [
                        {name: 'g1000_025', displayName: '0 - 25%', model: true},
                        {name: 'g1000_2550', displayName: '25 - 50%', model: true},
                        {name: 'g1000_5075', displayName: '50 - 75%', model: true},
                        {name: 'g1000_75100', displayName: '75 - 100%', model: true},
                    ],
                    exac: [
                        {name: 'exac_025', displayName: '0 - 25%', model: true},
                        {name: 'exac_2550', displayName: '25 - 50%', model: true},
                        {name: 'exac_5075', displayName: '50 - 75%', model: true},
                        {name: 'exac_75100', displayName: '75 - 100%', model: true},
                    ],
                    gnomad: [
                        {name: 'gnomad_025', displayName: '0 - 25%', model: true},
                        {name: 'gnomad_2550', displayName: '25 - 50%', model: true},
                        {name: 'gnomad_5075', displayName: '50 - 75%', model: true},
                        {name: 'gnomad_75100', displayName: '75 - 100%', model: true},
                    ],
                    probandFreq: [
                        {name: 'proband_025', displayName: '0 - 25%', model: true},
                        {name: 'proband_2550', displayName: '25 - 50%', model: true},
                        {name: 'proband_5075', displayName: '50 - 75%', model: true},
                        {name: 'proband_75100', displayName: '75 - 100%', model: true},
                    ],
                    subsetFreq: [
                        {name: 'subset_025', displayName: '0 - 25%', model: true},
                        {name: 'subset_2550', displayName: '25 - 50%', model: true},
                        {name: 'subset_5075', displayName: '50 - 75%', model: true},
                        {name: 'subset_75100', displayName: '75 - 100%', model: true},
                    ],

                    // Sample Presence

                }
            }
        },
        watch: {},
        methods: {
            boxChecked: function(filterObj) {
                let self = this;
                filterObj.model = !filterObj.model;
                let updatedState = filterObj.model;
                let filterName = filterObj.name;
                if (self.parentFilterName === 'impact') {
                    filterName = self.parentFilterName + '_' + filterObj.name;
                }
                let anyFilterInParentActive = false;
                self.checkboxLists[self.parentFilterName].forEach((filter) => {
                   anyFilterInParentActive |= !filter.model;
                });
                self.$emit('filter-toggled', filterName, updatedState, self.parentFilterName, self.grandparentFilterName, anyFilterInParentActive);
            }
        },
        computed: {},
        created: function () {},
        mounted: function () {}
    }
</script>