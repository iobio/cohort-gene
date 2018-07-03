<!-- SJG updated Jul2018 -->

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

    /*
     * The following styles are auto-applied to elements with
     * transition="modal" when their visibility is toggled
     * by Vue.js.
     *
     * You can easily play with the modal transition by editing
     * these styles.
     */

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

<!--<v-dialog v-model="insideLock" width="600px">-->
<!--<v-card>-->
<!--<v-card-title>-->
<!--<span class="headline">Variants</span>-->
<!--</v-card-title>-->

<!--<v-card-actions>-->
<!--<v-spacer></v-spacer>-->
<!--<v-btn color="cohortNavy" flat="flat" @click="resetModal">Close</v-btn>-->
<!--</v-card-actions>-->
<!--</v-card>-->
<!--</v-dialog>-->

<template>
    <transition name="modal">
        <div class="modal-mask">
            <div class="modal-wrapper">
                <div class="modal-container">

                    <div class="modal-header">
                        <slot name="header">
                            default header
                        </slot>
                    </div>

                    <div class="modal-body">
                        <slot name="body">
                            default body
                        </slot>
                    </div>

                    <div class="modal-footer">
                        <slot name="footer">
                            default footer
                            <button class="modal-default-button" @click="resetModal">
                                OK
                            </button>
                        </slot>
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>


<script>
    export default {
        name: 'zoom-modal-viz',
        components: {},
        props: {
            //outsideLock: false
        },
        data() {
            return {
                //insideLock: false
            }
        },
        mounted: function () {
            //this.insideLock = this.outsideLock;
        },
        created: function () {
            //this.insideLock = this.outsideLock;
        },
        methods: {
            resetModal: function () {
                this.$emit('closeModal');
            }
        },
        watch: {
            // outsideLock: function () {
            //     this.insideLock = this.outsideLock;
            // }
        }
    }

</script>
