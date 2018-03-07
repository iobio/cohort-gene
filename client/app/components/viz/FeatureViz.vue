<!-- Displays variant impact classification from various sources -->
<style lang="sass">

</style>

<template>
  <!-- <div style="margin-top:-7px;margin-left:20px;display:inline-block;width:150px"> -->
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
           <v-flex xs9 class="field-value">{{ impact }}</v-flex>
        </v-layout>
      </v-flex>
      <v-flex >
        <v-layout row>
           <v-flex xs3 class="field-label">Clinvar:</v-flex>
           <!-- SJG TODO: does this need to be link here? -->
           <v-flex xs9 class="field-value" v-html="clinVar"></v-flex>
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
  <!-- </div> -->
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
    clinVar: {
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
  created: function() {},
  mounted: function() {},
  methods: {},
  watch: {}
}

</script>
