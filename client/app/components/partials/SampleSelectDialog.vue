<style>

</style>
<template>
    <v-layout row justify-center>
        <v-dialog v-model="dialog" persistent max-width="290">
            <v-card>
                <v-card-title class="headline">Select {{idType}} Samples</v-card-title>
                <v-container>
                    <v-layout row>
                        <v-flex xs6>
                            <div>Available Samples</div>
                            <draggable v-model="unselectedSamples" @start="drag=true" @end="drag=false">
                                <div v-for="element in unselectedSamples" :key="element.id">{{element.id}}</div>
                            </draggable>
                        </v-flex>
                        <v-flex xs6>
                            <div>Selected Samples</div>
                            <draggable v-model="selectedSamples" @start="drag=true" @end="drag=false">
                                <div v-for="element in selectedSamples" :key="element.id">{{element.id}}</div>
                            </draggable>
                        </v-flex>
                    </v-layout>
                </v-container>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="cohort-navy" flat @click.native="hideDialog">OK</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-layout>
</template>
<script>
    import draggable from 'vuedraggable'

    export default {
        name: 'sample-select-dialog',
        components: {
            draggable
        },
        props: {
            idType: {
                type: String,
                default: ''
            },
            unselectedSamples: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            selectedSamples: {
                type: Array,
                default: function() {
                    return [];
                }
            }
        },
        data() {
            return {
                dialog: false,
                currUnselectedSamples: [],
                currSelectedSamples: []
            }
        },
        watch: {},
        computed: {},
        methods: {
            // selectAll: function() {
            //
            // },
            // deselectAll: function() {
            //
            // },
            displayDialog: function() {
                let self = this;
                self.dialog = true;
            },
            hideDialog: function() {
                let self = this;
                self.dialog = false;
            }
        },
        mounted: function() {
            let self = this;
            self.currUnselectedSamples = self.unselectedSamples;
            self.currSelectedSamples = self.selectedSamples;
        },
        created: function() {}
    }

</script>