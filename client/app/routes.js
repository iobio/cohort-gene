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
import { Typeahead } from 'uiv'
Vue.use(Typeahead)

import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.css'
import '../assets/css/siteVuetify.css'
Vue.use(Vuetify, {
  theme: {
    cohortBlue: '#95b0c6',
    cohortDarkBlue: '#6c94b7',
    cohortNavy: '#516e87'
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
        paramProjectId:             route.query.project_uuid,
        parmTokenType:              route.query.token_type,
        paramToken:                 route.query.access_token
    })
  },
  {
    name: 'hub_home',
    path: '/#',
    component: Home,
    props: (route) => ({
        paramProjectId:             route.query.project_uuid,
        parmTokenType:              route.query.token_type,
        paramToken:                 route.query.access_token
    })
  }
]

const router = new VueRouter({
  'routes': routes
})

window.vm = new Vue({
  el: '#app',
  created: function() {
  },
  render: h => h(App),
  router
});
