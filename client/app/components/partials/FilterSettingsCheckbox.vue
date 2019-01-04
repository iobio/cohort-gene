<!--SJG Jan2019; Adapted from gene.iobio and TDS Aug2018-->
<style lang="sass">
    @import ../../../assets/sass/variables
    .filter-form
        .input-group
            label
                padding-top: 5px
                font-size: 14px
                font-weight: normal
                color: black !important
</style>

<template>
    <v-layout row wrap class="filter-form mx-2 px-2" style="max-width:500px;">
        <v-flex id="name" xs12 class="mb-3">
            <v-container fluid>
                <v-checkbox v-for="item in checkboxLists[parentFilterName]"
                            :key="item.name"
                            :label="item.displayName"
                            v-model="item.model"
                            class="checkbox-label"
                            color="cohortBlue"
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
                    // effect: [
                    //     'transcript_ablation',
                    //     'splice_acceptor_variant',
                    //     'splice_donor_variant',
                    //     'stop_gained',
                    //     'frameshift_variant',
                    //     'stop_lost',
                    //     'start_lost',
                    //     'transcript_amplification',
                    //     'inframe_insertion',
                    //     'inframe_deletion',
                    //     'missense_variant',
                    //     'protein_altering_variant',
                    //     'splice_region_variant',
                    //     'incomplete_terminal_codon_variant',
                    //     'stop_retained_variant',
                    //     'synonymous_variant',
                    //     'coding_sequence_variant',
                    //     'mature_miRNA_variant',
                    //     '5_prime_UTR_variant',
                    //     '3_prime_UTR_variant',
                    //     'non_coding_transcript_exon_variant',
                    //     'intron_variant',
                    //     'NMD_transcript_variant',
                    //     'non_coding_transcript_variant',
                    //     'upstream_gene_variant',
                    //     'downstream_gene_variant',
                    //     'TFBS_ablation',
                    //     'TFBS_amplification',
                    //     'TF_binding_site_variant',
                    //     'regulatory_region_ablation',
                    //     'regulatory_region_amplification',
                    //     'feature_elongation',
                    //     'regulatory_region_variant',
                    //     'feature_truncation',
                    //     'intergenic_variant'],
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
            }
        },
        computed: {},
        created: function () {},
        mounted: function () {}
    }
</script>