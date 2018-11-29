<!-- Displays variant impact classification from various sources -->
<style lang="sass">
</style>

<template>
    <v-flex xs12>
        <v-layout row>
            <v-flex xs12 class="field-label-header" style="text-align: left; margin-top: 5px">Cohort Details
            </v-flex>
        </v-layout>
        <v-layout row>
            <v-flex xs3 class="summary-field-label">Frequency ∆:</v-flex>
            <v-flex xs9 v-bind:class="{hide: loadingExtraAnnotations === true}" class="summary-field-value">
                <span class="summary-field-value">{{ foldEnrichmentInfo }}</span>
            </v-flex>
            <div class="loader" v-bind:class="{ hide: loadingExtraAnnotations === false }">
                <img src="../../../assets/images/wheel.gif">
            </div>
        </v-layout>
        <v-layout row>
            <v-flex xs3 class="summary-field-label">P-value:</v-flex>
            <v-flex xs9 v-bind:class="{hide: loadingExtraAnnotations === true}" class="summary-field-value">
                <span class="summary-field-value">{{ pValueInfo }}</span>
            </v-flex>
            <div class="loader" v-bind:class="{ hide: loadingExtraAnnotations === false }">
                <img src="../../../assets/images/wheel.gif">
            </div>
        </v-layout>
        <v-layout row style="padding-top: 10px">
            <v-flex xs12 class="field-label-header" style="text-align: left">Annotation Details</v-flex>
        </v-layout>
        <v-layout row>
            <v-flex xs1 md2 class="summary-field-label">Effect:</v-flex>
            <v-flex xs5 md4 v-bind:class="{hide: loadingExtraAnnotations === true}" class="summary-field-value">
                {{effect}}
            </v-flex>
            <div class="loader" v-bind:class="{ hide: loadingExtraAnnotations === false }">
                <img src="../../../assets/images/wheel.gif">
            </div>
            <v-flex xs1 md2 class="summary-field-label">Impact:</v-flex>
            <v-flex xs5 md4 v-bind:class="{hide: loadingExtraAnnotations === true}" class="summary-field-value">
         <span v-bind:class="{hide: impactText === ''}">
           <svg v-bind:class="{hide: (type !== 'snp' && type !== 'mnp')}" class="impact-badge" height="12" width="12">
             <g transform="translate(1,3)" class="filter-symbol" v-bind:class="impactColor">
               <rect width="8" height="8"></rect>
             </g>
           </svg>
           <svg v-bind:class="{hide: (type !== 'del')}" class="impact-badge" height="12" width="13">
             <g transform="translate(5,6)" class="filter-symbol" v-bind:class="impactColor">
               <path d="M0,-4.161791450287817L4.805622828269509,4.161791450287817 -4.805622828269509,4.161791450287817Z">
               </path>
             </g>
           </svg>
           <svg v-bind:class="{hide: (type !== 'ins')}" class="impact-badge" height="12" width="13">
             <g transform="translate(7,7)" class="filter-symbol" v-bind:class="impactColor">
               <path d="M0,3.5682482323055424A3.5682482323055424,3.5682482323055424 0 1,1 0,-3.5682482323055424A3.5682482323055424,3.5682482323055424 0 1,1 0,3.5682482323055424Z">
               </path>
             </g>
           </svg>
           <svg v-bind:class="{hide: (type !== 'complex')}" class="impact-badge" height="13" width="13">
             <g transform="translate(4,6)" class="filter-symbol" v-bind:class="impactColor">
               <path d="M0,-5.885661912765424L3.398088489694245,0 0,5.885661912765424 -3.398088489694245,0Z">
               </path>
             </g>
           </svg>
         </span>
                <span>
           {{impactText}}
         </span>
            </v-flex>
            <div class="loader" v-bind:class="{ hide: loadingExtraAnnotations === false }">
                <img src="../../../assets/images/wheel.gif">
            </div>
        </v-layout>
        <v-layout row>
            <v-flex xs1 md2 class="summary-field-label">Type:</v-flex>
            <v-flex xs5 md4 v-bind:class="{hide: loadingExtraAnnotations === true}" class="summary-field-value">
                {{type}}
            </v-flex>
            <div class="loader" v-bind:class="{ hide: loadingExtraAnnotations === false }">
                <img src="../../../assets/images/wheel.gif">
            </div>
            <v-flex xs1 md2 class="summary-field-label">Bases:</v-flex>
            <v-flex xs5 md4 v-bind:class="{hide: loadingExtraAnnotations === true}" class="summary-field-value">
                {{refAlt}}
            </v-flex>
            <div class="loader" v-bind:class="{ hide: loadingExtraAnnotations === false }">
                <img src="../../../assets/images/wheel.gif">
            </div>
        </v-layout>
        <v-layout row>
            <v-flex xs6 md2 class="summary-field-label">ClinVar:</v-flex>
            <v-flex xs6 md4 v-bind:class="{hide: loadingExtraClinvarAnnotations === true}" class="summary-field-value">
         <span v-bind:class="{hide: clinVarText == ''}">
           <svg id="gene-badge-clinvar" class="glyph" width="13" height="14">
               <g transform="translate(1,3)" v-bind:class="clinVarColor">
                 <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#clinvar-symbol"
                      width="11" height="11"></use>
               </g>
           </svg>
         </span>
                <span>{{ clinVarText || '-' }}</span>
            </v-flex>
            <div class="loader" v-bind:class="{ hide: loadingExtraClinvarAnnotations === false }">
                <img src="../../../assets/images/wheel.gif">
            </div>
            <v-flex xs6 md2 class="summary-field-label">PolyPhen:</v-flex>
            <v-flex xs6 md4 v-bind:class="{hide: loadingExtraAnnotations === true}" class="summary-field-value">
         <span v-bind:class="{hide: polyPhenText === ''}">
           <svg id="gene-badge-clinvar" class="glyph" width="13" height="14">
               <g transform="translate(1,3)" v-bind:class="polyPhenColor">
                 <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#biohazard-symbol"
                      width="12" height="12"></use>
               </g>
           </svg>
         </span>
                <span>
           {{ polyPhenText || '-' }}
         </span>
            </v-flex>
            <div class="loader" v-bind:class="{ hide: loadingExtraAnnotations === false }">
                <img src="../../../assets/images/wheel.gif">
            </div>
        </v-layout>
        <v-layout row>
            <v-flex xs6 md2 class="summary-field-label">SIFT:</v-flex>
            <v-flex xs6 md4 v-bind:class="{hide: loadingExtraAnnotations === true}" class="summary-field-value">
         <span v-bind:class="{hide: siftText === ''}">
           <svg id="gene-badge-clinvar" class="glyph" width="13" height="14">
               <g transform="translate(1,3)" v-bind:class="siftColor">
                 <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#danger-symbol" width="12"
                      height="12"></use>
               </g>
           </svg>
         </span>
                <span>
           {{ siftText || '-' }}
         </span>
            </v-flex>
            <div class="loader" v-bind:class="{ hide: loadingExtraAnnotations === false }">
                <img src="../../../assets/images/wheel.gif">
            </div>
            <v-flex xs6 md2 class="summary-field-label">REVEL:</v-flex>
            <v-flex xs6 md4 v-bind:class="{hide: loadingExtraAnnotations === true}" class="summary-field-value">
            <span>
           {{ revelText || '-' }}
            </span>
            </v-flex>
            <div class="loader" v-bind:class="{ hide: loadingExtraAnnotations === false }">
                <img src="../../../assets/images/wheel.gif">
            </div>
        </v-layout>
    </v-flex>
</template>


<script>
    export default {
        name: 'feature-viz',
        props: {
            effect: {
                default: "",
                type: String
            },
            impactText: {
                default: "",
                type: String
            },
            impactColor: {
                default: "",
                type: String
            },
            type: {
                default: "",
                type: String
            },
            refAlt: {
                default: "",
                type: String
            },
            clinVarText: {
                default: "",
                type: String
            },
            clinVarColor: {
                default: null,
                type: String
            },
            siftText: {
                default: "",
                type: String
            },
            siftColor: {
                default: "",
                type: String
            },
            polyPhenText: {
                default: "",
                type: String
            },
            polyPhenColor: {
                default: "",
                type: String
            },
            revelText: {
                default: "",
                type: String
            },
            variantSelected: {
                default: false,
                type: Boolean
            },
            foldEnrichmentInfo: {
                default: "",
                type: String
            },
            pValueInfo: {
                default: "",
                type: String
            },
            loadingExtraAnnotations: {
                default: false,
                type: Boolean
            },
            loadingExtraClinvarAnnotations: {
                default: false,
                type: Boolean
            }
        },
        computed: {
            impactSymbol: function () {
            }
        },
        created: function () {
        },
        mounted: function () {
        },
        methods: {},
        watch: {}
    }

</script>
