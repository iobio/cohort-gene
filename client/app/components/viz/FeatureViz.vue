<!-- Displays variant impact classification from various sources -->
<style lang="sass">
</style>

<template>
    <v-layout class="content" column nowrap>
      <v-flex>
        <v-layout row>
           <v-flex xs3 class="field-label">Effect:</v-flex>
           <v-flex xs9 class="field-value">{{ effect }}</v-flex>
        </v-layout>
      </v-flex>
      <v-flex>
        <v-layout row>
           <v-flex xs3 class="field-label">Impact:</v-flex>
           <v-flex xs9 class="field-value">
             <!-- SJG TODO: put in variant symbol variant.clinvar = 'clinvar_lpath' or variantInfo.clinvarSig = 'likely pathogenic' -->
             <!-- I have info to extract color and shape here (impact/type) -->
             <!-- How will I get access to glyph in here? -->
             <!-- Put in some sort of symbol placeholder here for d3 to work on -->
             {{impact}}
           </v-flex>
        </v-layout>
      </v-flex>
      <v-flex >
        <v-layout row>
           <v-flex xs3 class="field-label">Clinvar:</v-flex>
           <v-flex xs9 class="field-value">
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
        </v-layout>
      </v-flex>
      <v-flex>
        <v-layout row>
           <v-flex xs3 class="field-label">Polyphen:</v-flex>
           <v-flex xs9 class="field-value">{{ polyPhen }}</v-flex>
        </v-layout>
      </v-flex>
      <v-flex>
        <v-layout row>
           <v-flex xs3 class="field-label">SIFT:</v-flex>
           <v-flex xs9 class="field-value">{{ sift }}</v-flex>
        </v-layout>
      </v-flex>
    </v-layout>
</template>


<script>
export default {
  name: 'feature-viz',
  data: {
    clinVarColorData: 'rgb(173, 73, 74)'
  },
  props: {
    effect: {
      default: "",
      type: String
    },
    impact: {
      default: "",
      type: String
    },
    type: {
      default: "",
      type: String
    },
    clinVarText: {
      default:"-",
      type: String
    },
    clinVarColor: {
      default: null,
      type: String
    },
    sift: {
      default: "",
      type: String
    },
    polyPhen: {
      default: "",
      type: String
    }
  },
  computed: {},
  created: function() {},
  mounted: function() {},
  methods: {},
  watch: {}
}

</script>
