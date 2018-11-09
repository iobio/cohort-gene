<style lang="sass">
.dragArea
    min-height: 50px
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
                            <draggable id="unselectedDiv" v-model="currUnselectedSamples" :options="{group:'samples', sort: true}" class="dragArea" @onAdd="addToList">
                                <div v-for="element in currUnselectedSamples" :key="element">{{element}}</div>
                            </draggable>
                        </v-flex>
                        <v-flex xs6>
                            <div>Selected Samples</div>
                            <draggable id="selectedDiv" v-model="currSelectedSamples" :options="{group:'samples', sort: true}" class="dragArea" @onAdd="addToList">
                                <div v-for="element in currSelectedSamples" :key="element">{{element}}</div>
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
            addToList: function(evt) {
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
            displayDialog: function(unselectedSamples, selectedSamples) {
                let self = this;
                self.currUnselectedSamples = unselectedSamples;
                self.currSelectedSamples = selectedSamples;
                self.dialog = true;
            },
            hideDialog: function() {
                let self = this;
                self.dialog = false;
            }
        },
        created: function() {},
        mounted: function() {}
    }

</script>