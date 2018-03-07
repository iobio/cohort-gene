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
             {{impact}}
           </v-flex>
        </v-layout>
      </v-flex>
      <v-flex >
        <v-layout row>
           <v-flex xs3 class="field-label">Clinvar:</v-flex>
           <v-flex xs9 class="field-value">
             <svg id="gene-badge-clinvar" class="glyph" width="13" height="14">
                 <g transform="translate(1,3)"
                 :class="clinVarColor">
                     <use xmlns:xlink="http://www.w3.org/1999/xlink"
                     xlink:href="#clinvar-symbol" width="11.5"
                     height="11.5">
                     </use>
                 </g>
             </svg>
             <span>{{ clinVarText }}</span>
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
  props: {
    effect: {
      default: "",
      type: String
    },
    impact: {
      default: "",
      type: String
    },
    clinVarText: {
      default:"",
      type: String
    },
    clinVarClazz: {
      default: "",
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
  computed: {
    clinVarColor: function() {
        if (this.clinVarClazz != "")
          return "colorby_" + this.clinVarClazz;
        return "";
    }
  },
  created: function() {},
  mounted: function() {},
  methods: {},
  watch: {}
}

</script>
