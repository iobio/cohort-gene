<!--Adapted from gene.iobio and TDS 17Aug2018-->

<style lang="sass">
    @import ../../../assets/sass/variables
    .history-card
        .history-title
            font-size: 14px
            font-family: 'Open Sans', 'Quattrocento Sans', 'sans serif'
</style>

<template>
    <v-layout row style="padding-top: 10px">
        <v-flex xs12>
            <v-card class="history-card">
                <v-toolbar color="gray">
                    <v-toolbar-title class="history-card">Re-visit genes previously analyzed by clicking the icon</v-toolbar-title>
                </v-toolbar>
                <v-list>
                    <v-list-tile v-for="item in geneHistoryList" :key="item" avatar @click="reloadGene(item)">
                        <v-list-tile-action>
                            <v-icon color="cohortBlue">replay</v-icon>
                        </v-list-tile-action>
                        <v-list-tile-content>
                            <v-list-tile-title v-text="item"></v-list-tile-title>
                        </v-list-tile-content>
                    </v-list-tile>
                </v-list>
            </v-card>
        </v-flex>
    </v-layout>
</template>


<script>
    export default {
        name: 'history-tab',
        components: {},
        props: {
            geneHistoryList: []
        },
        data() {
            return {}
        },
        watch: {},
        methods: {
            reloadGene(geneName) {
                let self = this;
                self.$emit('reload-gene-history', geneName);
            }
        },
        computed: {},
        created: function () {
        },
        mounted: function () {
        }
    }
</script>
