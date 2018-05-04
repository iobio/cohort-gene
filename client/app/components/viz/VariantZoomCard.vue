<!-- Component populated with variant details on selection.
     SJG updated Apr2018 -->

<style lang="sass">
</style>

<template>
  <v-card>
    <v-card-title primary-title style="width: 100%; height: 30px">
      <span style="display:inline-block; padding-right: 10px; font-size: 16px">VARIANT ZOOM</span>
    </v-card-title>
    <v-container>
      <v-layout row wrap style="padding-top: 25%; padding-left: 25%">
        <div class="text-xs-center">
            <v-btn round ripple outline color="cohortNavy" @click="displayVariantBrush">Click to Select Area</v-btn>
          </div>
      </v-layout>
    </v-container>
  </v-card>
</template>


<script>
export default {
  name: 'variant-zoom-card',
  components: {
  },
  props: {
    selectedVariants: null,
    selectedVariantsInfo: null,
    selectedGene: ''
  },
  data() { return {} },
  computed: {
  },
  mounted: function() {
  },
  methods: {
    displayVariantBrush: function() {
      let self = this;
      self.$emit("displayVariantBrush");
    }
  }
}

</script>
