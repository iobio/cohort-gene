<style lang="sass">
    @import "../assets/sass/site.sass"

    .container
        margin-top: 0px
        margin-bottom: 10px
        margin-right: 0px
        margin-left: 0px
        width: 100%
        padding: 0px 5px 0px 5px

    button
        color: $text-color

    .theme--light
        .content--wrap
            .btn
                color: $text-color
                padding-top: 2px
                padding-bottom: 2px
                height: 30px

</style>

<style lang="scss">
    @import url('https://fonts.googleapis.com/css?family=Open+Sans|Quattrocento|Quattrocento+Sans|Quicksand|Roboto');
    @import url("https://fonts.googleapis.com/css?family=Poppins");
</style>

<template>
    <v-app light>
        <router-view></router-view>
    </v-app>
</template>

<script>
    export default {
        name: 'app',
        data() {
            return {}
        }
    }
</script>
