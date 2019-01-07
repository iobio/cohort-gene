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
                pointer-events: none !important
                cursor: default
</style>

<template>
    <v-layout row wrap class="filter-form mx-2 px-2" style="max-width:500px;">
        <v-flex xs12>
            <v-container fluid>
                <v-checkbox v-for="item in checkboxLists[parentFilterName]"
                            :key="item.name"
                            :label="item.displayName"
                            v-model="item.model"
                            color="cohortBlue"
                            style="padding-left: 15px; margin-top: 0; margin-bottom: 0; max-height: 30px"
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

                    // Enrichment
                    pValue: [
                        {name: 'pVal0_0001', displayName: '0 - 0.0001', model: true},
                        {name: 'pVal0001_0005', displayName: '0.0001 - 0.0005', model: true},
                        {name: 'pVal0005_001', displayName: '0.0005 - 0.001', model: true},
                        {name: 'pVal001_005', displayName: '0.001 - 0.005', model: true},
                        {name: 'pVal005_01', displayName: '0.005 - 0.01', model: true},
                        {name: 'pVal01_05', displayName: '0.01 - 0.05', model: true},
                        {name: 'pVal05_1', displayName: '0.05 - 0.1', model: true},
                        {name: 'pVal1_25', displayName: '0.1 - 0.25', model: true},
                        {name: 'pVal25_50', displayName: '0.25 - 0.50', model: true},
                        {name: 'pVal50_100', displayName: '0.50 - 1.0', model: true}
                    ],

                    subsetDelta: [
                        {name: 'delta2', displayName: '>2x increase in subset', model: true},
                        {name: 'delta4', displayName: '>4x increase in subset', model: true},
                        {name: 'delta10', displayName: '>10x increase in subset', model: true}
                    ],

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
                    ]
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
            },
            clearFilters: function() {
                let self = this;
                (Object.values(self.checkboxLists)).forEach((checkList) => {
                    checkList.forEach((filt) => {
                        filt.model = true;
                    });
                })
            }
        },
        computed: {},
        created: function () {},
        mounted: function () {}
    }
</script>