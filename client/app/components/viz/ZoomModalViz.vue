<!-- Component populated with variant details on selection.
     SJG updated Apr2018 -->

<style lang="css">
    .modal-mask {
        position: fixed;
        z-index: 9998;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, .5);
        display: table;
        transition: opacity .3s ease;
    }

    .modal-wrapper {
        display: table-cell;
        vertical-align: middle;
    }

    .modal-container {
        width: 300px;
        margin: 0px auto;
        padding: 20px 30px;
        background-color: #fff;
        border-radius: 2px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, .33);
        transition: all .3s ease;
        font-family: Helvetica, Arial, sans-serif;
    }

    .modal-header h3 {
        margin-top: 0;
        color: #42b983;
    }

    .modal-body {
        margin: 20px 0;
    }

    .modal-default-button {
        float: right;
    }

    .modal-enter {
        opacity: 0;
    }

    .modal-leave-active {
        opacity: 0;
    }

    .modal-enter .modal-container,
    .modal-leave-active .modal-container {
        -webkit-transform: scale(1.1);
        transform: scale(1.1);
    }
</style>

<template>
    <v-layout row justify-center>
        <v-dialog v-model="displayZoom" width="600px">
            <v-card>
                <v-card-title>
                    <span class="headline">Variants</span>
                </v-card-title>

                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="green darken-1" flat="flat" @click="displayZoom = false">Close</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-layout>
</template>


<script>
    export default {
        name: 'zoom-modal-viz',
        components: {},
        props: {
            displayZoom: false,
            //selectedVariants: null
        },
        data() {
            return {
            }
        },
        computed: {},
        mounted: function () {
        },
        methods: {}
    }

</script>
