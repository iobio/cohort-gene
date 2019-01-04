<!--SJG Jan2019; Adapted from gene.iobio and TDS Aug2018-->
<style lang="sass">
    .filter-form
        .input-group
            label
                font-size: 13px
</style>

<template>
    <v-layout row wrap class="filter-form mx-2 px-2" style="max-width:500px;">
        <v-flex id="name" xs12 class="mb-3">
             <!--TODO: put range in here-->
            <!--<v-btn style="float:right"-->
            <!--@click="onApply">-->
            <!--Apply-->
            <!--</v-btn>-->
        </v-flex>
    </v-layout>
</template>

<script>
    export default {
        name: 'filter-settings-range',
        components: {},
        props: {
            filter: null,
            filterModel: null,
            idx: null
        },
        data() {
            return {
                theFilter: null,
                name: null,
                maxAf: null,
                selectedClinvarCategories: null,
                selectedImpacts: null,
                selectedZygosity: null,
                selectedInheritanceModes: null,
                selectedConsequences: null,
                minGenotypeDepth: null,
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
        watch: {},
        methods: {
            init: function () {
                let flagCriteria = this.filterModel.flagCriteria[this.theFilter.name];
                if (flagCriteria == null) {
                    flagCriteria = {};
                    flagCriteria.custom = true;
                    flagCriteria.active = false;
                    flagCriteria.name = this.theFilter.display;
                    flagCriteria.maxAf = null;
                    flagCriteria.clinvar = null;
                    flagCriteria.impact = null;
                    flagCriteria.consequence = null;
                    flagCriteria.inheritance = null;
                    flagCriteria.zygosity = null;
                    flagCriteria.genotypeDepth = null;
                    this.filterModel.flagCriteria[this.theFilter.name] = flagCriteria;
                }
                this.name = flagCriteria.name;
                this.maxAf = flagCriteria.maxAf ? flagCriteria.maxAf * 100 : null;
                this.selectedClinvarCategories = flagCriteria.clinvar;
                this.selectedImpacts = flagCriteria.impact;
                this.selectedConsequences = flagCriteria.consequence;
                this.selectedInheritanceModes = flagCriteria.inheritance;
                this.selectedZygosity = flagCriteria.zygosity;
                this.minGenotypeDepth = flagCriteria.minGenotypeDepth;
            },
            apply: function () {
                let flagCriteria = this.filterModel.flagCriteria[this.theFilter.name];
                flagCriteria.name = this.name;
                if (flagCriteria.custom) {
                    flagCriteria.title = this.name;
                }
                flagCriteria.maxAf = this.maxAf ? this.maxAf / 100 : null;
                flagCriteria.clinvar = this.selectedClinvarCategories;
                flagCriteria.impact = this.selectedImpacts;
                flagCriteria.consequence = this.selectedConsequences;
                flagCriteria.inheritance = this.selectedInheritanceModes;
                flagCriteria.zygosity = this.selectedZygosity;
                flagCriteria.minGenotypeDepth = this.minGenotypeDepth;
                flagCriteria.active = true;
            },
            onChangeName: function () {
                this.theFilter.display = this.name;
            }
        },
        computed: {},
        created: function () {
        },
        mounted: function () {
            this.theFilter = this.filter;
            this.init();
        }
    }
</script>