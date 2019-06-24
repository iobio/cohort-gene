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
                            v-bind:disabled="!fullAnnotationComplete && isAnnotationCategory"
                            v-model="item.model"
                            color="cohortGold"
                            style="padding-left: 15px; margin-top: 0; margin-bottom: 0; max-height: 30px"
                            @click="boxToggled(item)">
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
            grandparentFilterName: null,
            fullAnnotationComplete: true,
            totalNumTracks: 1   // Total number of variant tracks on screen
        },
        data() {
            return {
                checkboxLists: {
                    // Annotation categories
                    impact: [
                        {name: 'HIGH', displayName: 'HIGH', model: true, numTracksActive: 0},
                        {name: 'MODERATE', displayName: 'MODERATE', model: true, numTracksActive: 0},
                        {name: 'MODIFIER', displayName: 'MODIFIER', model: true, numTracksActive: 0},
                        {name: 'LOW', displayName: 'LOW', model: true, numTracksActive: 0}
                    ],
                    type: [
                        {name: 'del', displayName: 'DELETION', model: true, numTracksActive: 0},
                        {name: 'ins', displayName: 'INSERTION', model: true, numTracksActive: 0},
                        {name: 'mnp', displayName: 'MNP', model: true, numTracksActive: 0},
                        {name: 'snp', displayName: 'SNP', model: true, numTracksActive: 0}
                    ],
                    zygosities: [
                        {name: 'hom', displayName: 'HOMOZYGOUS', model: true, numTracksActive: 0},
                        {name: 'het', displayName: 'HETEROZYGOUS', model: true, numTracksActive: 0}
                    ]
                }
            }
        },
        watch: {},
        methods: {
            boxToggled: function(filterObj, trackId) {
                let self = this;
                filterObj.model = !filterObj.model;
                let updatedState = filterObj.model;
                if (updatedState === true) {
                    filterObj.numTracksActive = self.totalNumTracks;
                } else {
                    filterObj.numTracksActive = 0;
                }

                let filterName = filterObj.name;
                if (self.parentFilterName === 'impact') {
                    filterName = filterObj.name;
                }
                let anyFilterInParentActive = false;
                self.checkboxLists[self.parentFilterName].forEach((filter) => {
                   anyFilterInParentActive |= !filter.model;
                });
                self.$emit('filter-toggled', filterName, updatedState, self.parentFilterName, self.grandparentFilterName, anyFilterInParentActive, filterObj.displayName, trackId);
            },
            clearFilters: function() {
                let self = this;
                (Object.values(self.checkboxLists)).forEach((checkList) => {
                    checkList.forEach((filt) => {
                        filt.model = true;
                    });
                })
            },
            // Called when filter chip is x-ed out of on a track
            removeSingleTrack: function(filterName, parentName, trackId) {
                let self = this;

                // Get object corresponding to filterName
                let filterObj = self.checkboxLists[parentName].filter((cat) => {
                    return cat.name === filterName;
                });

                if (filterObj.length > 0) {
                    filterObj[0].numTracksActive -= 1;

                    // Check to see if we've removed all active tracks and need to update UI
                    if (filterObj[0].numTracksActive === 0) {
                        self.boxToggled(filterObj, trackId);
                    }
                }
            }
        },
        computed: {
            isAnnotationCategory: function() {
                let self = this;
                return true;

                // TODO: used to control waiting on filtering - have to make all unavailable until second annotation return for now
                // if (self.parentFilterName === 'impact' || self.parentFilterName === 'g1000' ||
                //     self.parentFilterName === 'exac' || self.parentFilterName === 'gnomad') {
                //     return true;
                // } else {
                //     return false;
                // }
            }
        },
        created: function () {},
        mounted: function () {}
    }
</script>