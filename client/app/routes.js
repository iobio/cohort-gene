import jQuery from 'jquery'

global.jQuery = jQuery
global.$ = jQuery
import d3 from 'd3'
import _ from 'lodash'

import Vue from 'vue'
import VueRouter from 'vue-router'

import App from './App.vue'
import Home from './components/pages/Home.vue'

import bootstrap from 'bootstrap/dist/css/bootstrap.css'
import {Typeahead} from 'uiv'

Vue.use(Typeahead)

import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.css'
import '../assets/css/siteVuetify.css'

Vue.use(Vuetify, {
    theme: {
        cohortBlue: '#95b0c6',
        cohortDarkBlue: '#6c94b7',
        cohortNavy: '#516e87',
        cohortPeriwinkle: '#6c7cb7',
        limeGreen: '#00d60e',
        cherryRed: '#FF000D',
        slateGray: '#B7B7B7'
    }
})

global.bus = new Vue();

Vue.use(VueRouter);

const routes = [
    {
        name: 'home',
        path: '/',
        component: Home,
        props: (route) => ({
            paramProjectId: route.query.project_uuid,
            paramSource: route.query.source,
            paramGene: route.query.gene
        })
    },
    {
        name: 'auth',
        path: '/access_token*',
        beforeEnter: (to, from, next) => {
            // remove initial slash from path and parse
            const queryParams = Qs.parse(to.path.substring(1));
            const {access_token, expires_in, token_type, ...otherQueryParams} = queryParams;
            localStorage.setItem('hub-iobio-tkn', `${token_type} ${access_token}`);
            next(`/${Qs.stringify(otherQueryParams, {addQueryPrefix: true, arrayFormat: 'brackets'})}`);
        }
    }
]

const router = new VueRouter({
    routes: routes
})

window.vm = new Vue({
    el: '#app',
    mounted: function () {
        var q = this.$route.query
    },
    created: function () {
    },
    render: h => h(App),
    router
});
