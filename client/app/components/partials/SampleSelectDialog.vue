<style lang="sass">
    @import ../../../assets/sass/variables

    .dragArea
        min-height: 50px

    .dialog-list-header
        font-size: 16px !important
        text-align: left !important
        font-weight: bold !important
        color: rgba(0,0,0,0.54) !important

    .drag-title
        text-align: center !important
        padding-bottom: 2px !important

</style>
<template>
    <v-layout row justify-center>
        <v-dialog v-model="dialog" persistent max-width="500">
            <v-toolbar>
                <v-toolbar-title style="color: white">Select {{idType}} Samples</v-toolbar-title>
            </v-toolbar>
            <v-card>
                <v-container>
                    <v-layout row>
                        <v-flex xs6>
                            <v-list>
                                <v-list-tile>
                                    <v-list-tile-title class="dialog-list-header"
                                                       v-text="'Available Samples'">
                                    </v-list-tile-title>
                                </v-list-tile>
                                <draggable id="unselectedDiv" v-model="currUnselectedSamples"
                                           :options="{group:'samples', sort: true}" class="dragArea"
                                           @onAdd="addToList">
                                    <v-list-tile v-for="element in currUnselectedSamples" :key="element">
                                        <v-container>
                                            <v-layout row>
                                                <v-flex xs12>
                                                    <v-chip outline color="cohortBlue">{{element}}</v-chip>
                                                </v-flex>
                                            </v-layout>
                                        </v-container>
                                    </v-list-tile>
                                </draggable>
                            </v-list>
                        </v-flex>
                        <v-flex xs6>
                            <v-list>
                                <v-list-tile>
                                    <v-list-tile-title class="dialog-list-header"
                                                       v-text="'Selected Samples'">
                                    </v-list-tile-title>
                                </v-list-tile>
                                <draggable id="selectedDiv" v-model="currSelectedSamples"
                                           :options="{group:'samples', sort: true}" class="dragArea"
                                           @onAdd="addToList">
                                    <v-list-tile v-for="element in currSelectedSamples" :key="element">
                                        <v-container>
                                            <v-layout row>
                                                <v-flex xs12>
                                                    <v-chip outline color="cohortNavy">{{element}}</v-chip>
                                                </v-flex>
                                            </v-layout>
                                        </v-container>
                                    </v-list-tile>
                                </draggable>
                            </v-list>
                        </v-flex>
                    </v-layout>
                </v-container>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="cohort-navy" @click.native="saveDialog">OK</v-btn>
                    <v-btn color="cohort-navy" @click.native="cancelDialog">Cancel</v-btn>
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
            addToList: function (evt) {
                let self = this;

                let newList = evt.to.id;
                let oldList = evt.from.id;
                if (newList === oldList) {
                    return;
                }

                if (newList === 'unselectedDiv') {
                    self.currUnselectedSamples.push(evt.item.textContent);

                    let index = self.currSelectedSamples.indexOf(evt.item.textContent);
                    self.currSelectedSamples.splice(index, 1);
                } else {
                    let index = self.currUnselectedSamples.indexOf(evt.item.textContent);
                    self.currUnselectedSamples.splice(index, 1);
                    self.currSelectedSamples.push(evt.item.textContent);
                }
            },
            displayDialog: function (unselectedSamples, selectedSamples) {
                let self = this;
                self.currUnselectedSamples = unselectedSamples;
                self.currSelectedSamples = selectedSamples;
                self.dialog = true;
            },
            saveDialog: function() {
                let self = this;
                self.dialog = false;
                self.$emit('save-sample-selection', self.idType, self.currSelectedSamples);
            },
            cancelDialog: function() {
                let self = this;
                self.dialog = false;
            }
        },
        created: function () {
        },
        mounted: function () {
        }
    }

</script>