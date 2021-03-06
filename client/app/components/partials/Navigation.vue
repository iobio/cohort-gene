<style lang="sass">
    nav.toolbar
        background-color: #516e87 !important
        font-weight: 300 !important

        i.material-icons
            margin-right: 2px

        .toolbar__title
            font-family: Quicksand
            font-size: 28px
            margin-right: 20px
            padding-bottom: 5px
</style>
<style>
    ::placeholder { /* Chrome, Firefox, Opera, Safari 10.1+ */
        color: white !important;
        opacity: 1; /* Firefox */
        font-family: Quicksand;
        font-size: 14px;
    }
</style>

<template>
    <div>
        <v-toolbar fixed app :clipped-left="clipped" dark prominent>
            <v-toolbar-title style="margin-right: 0px" v-text="title"></v-toolbar-title>
            <v-toolbar-title style="color: #95b0c6 !important; margin-left: 0px !important"
                             v-text="titleSuffix"></v-toolbar-title>

            <v-toolbar-items style="margin-left:20px" class="hidden-sm-and-down">

                <v-icon>search</v-icon>
                <v-form>
                    <div style="padding-top: 15px">
                        <input id="search-gene-name" class="form-control" type="text" placeholder="Enter gene..."
                               style="color: white; background-color: #516e87;">
                        <br/>
                        <typeahead v-model="selectedGene" force-select match-start target="#search-gene-name"
                                   :data="knownGenes" item-key="gene_name"/>
                    </div>
                </v-form>

                <div v-bind:class="{ hide: !selectedGeneName }"
                     style="text-align: center; padding-top: 11px; padding-left: 8px">
                    <v-chip color="cohortDarkBlue" text-color="white"
                            style="font-size: 14px; font-family: Quicksand; font-weight: bold;">
                        {{ selectedGeneDisplay }}
                    </v-chip>
                    <v-chip color="cohortDarkBlue" text-color="white"
                            style="font-size: 14px; font-family: Quicksand; font-weight: bold;">
                        {{ selectedBuild }}
                    </v-chip>
                </div>

            </v-toolbar-items>

            <v-spacer></v-spacer>
            <files-menu
                    ref="fileMenuRef"
                    :variantModel="variantModel"
                    :launchedFromHub="launchedFromHub"
                    @on-files-loaded="onFilesLoaded"
                    @load-demo-data="onLoadDemoData">
            </files-menu>
            <v-menu
                    offset-y
                    :close-on-content-click="false"
                    :nudge-width="400"
                    v-model="showLegendMenu">
                <v-btn flat slot="activator">
                    <v-icon>description</v-icon>
                    Legend
                </v-btn>
                <legend-panel></legend-panel>
            </v-menu>


            <v-menu offset-y>
                <v-btn flat slot="activator">Help</v-btn>
                <v-list>
                    <v-list-tile @click="openWorkflow">
                        <v-list-tile-title>View example workflow</v-list-tile-title>
                    </v-list-tile>
                </v-list>
            </v-menu>
        </v-toolbar>
    </div>
</template>

<script>

    import {Typeahead} from 'uiv'
    import GenesMenu from '../partials/GenesMenu.vue'
    import FilesMenu from '../partials/FilesMenu.vue'
    import LegendPanel from '../partials/LegendPanel.vue'
    //import FlaggedVariantsCard from '../viz/FlaggedVariantsCard.vue'

    //import allGenesData from '../../../data/genes.json'

    export default {
        name: 'navigation',
        components: {
            Typeahead,
            GenesMenu,
            FilesMenu,
            LegendPanel
        },
        props: {
            knownGenes: null,
            selectedGeneName: "",
            selectedChr: "",
            selectedBuild: '',
            variantModel: null,
            launchedFromHub: false
        },
        computed: {
            selectedGeneDisplay: function () {
                return this.selectedGeneName + " " + this.selectedChr;
            },
            selectedGeneWrapper: function () {
                if (this.selectedGene) return true;
                else return false;
            }
        },
        data() {
            return {
                title: 'cohort-gene',
                titleSuffix: '.iobio',

                selectedGene: {},
                clipped: false,
                //leftDrawer: false,
                rightDrawer: false,

                //leftDrawerContents: "",
                showLegendMenu: false,
                focusToggle: false
            }
        },
        watch: {
            selectedGeneWrapper: function () {
                if (this.selectedGeneWrapper) {
                    this.$emit("input", this.selectedGene.gene_name);
                }
            }
        },
        methods: {
            openWorkflow: function () {
                let pdf = '../../../assets/documents/Cohort-Gene-Workflow.pdf';
                window.open(pdf);
            },
            onLoadDemoData: function (loadAction) {
                this.$emit("load-demo-data", loadAction);
            },
            onClearCache: function () {
                this.$emit("clear-cache")
            },
            onApplyGenes: function (genesToApply) {
                this.$emit("apply-genes", genesToApply);
            },
            onFlaggedVariantSelected: function (variant) {
                this.$emit("flagged-variant-selected", variant)
            },
            onFlaggedVariantsImported: function () {
                this.$emit("flagged-variants-imported")
            },
            onFilesLoaded: function (probandN, subsetN, cohortVcfDataChanged) {
                this.$emit("on-files-loaded", probandN, subsetN, cohortVcfDataChanged);
            },
            openFileSelection: function() {
                let self = this;
                if (self.$refs.fileMenuRef) {
                    self.$refs.fileMenuRef.openFileSelection();
                }
            },
            onAutoLoad: function() {
                let self = this;
                if (self.$refs.fileMenuRef) {
                    self.$refs.fileMenuRef.promiseLoadDemoFromWelcome();
                }
            },
            closeFileMenu: function() {
                let self = this;
                if (self.$refs.fileMenuRef) {
                    self.$refs.fileMenuRef.closeFileMenu();
                }
            },
            // Used for history list reload
            setSelectedGeneText: function(selectedGeneName) {
                $('#search-gene-name').val(selectedGeneName);
            }
        },
        created: function () {
        },
        mounted: function () {
            $("#search-gene-name").attr('autocomplete', 'off');

            // Prevent enter from submitting form
            document.querySelector('#search-gene-name')
                .addEventListener('keypress', function (e) {
                    var key = e.which || e.keyCode;
                    if (key === 13) { // Return key
                        e.preventDefault();
                    }
                });

            // Prevent window focus from opening gene name dropdown TODO
            // document.querySelector('#search-gene-name')
            //         .addEventListener('blur', function (e) {
            //         }, true);
            //
            // document.querySelector('#search-gene-name')
            //         .addEventListener('focus', function(e) {
            //         })
        }
    }

</script>
