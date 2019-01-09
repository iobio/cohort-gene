function HubEndpoint(source, usingNewApi) {
    this.api = decodeURIComponent(source); //+ '/apiv1';
    this.oauth_api = decodeURIComponent(source);
    this.client_id = 'HkWNVjYK';
    this.usingNewApi = usingNewApi;
}

/* First call to Hub from client to get files.
   If token expires, will prompt user to renew. */
HubEndpoint.prototype.getFilesForProject = function (projectId, initialLaunch) {
    let self = this;
    let key = localStorage.getItem('hub-iobio-tkn');

    let fileQuery = $.ajax({
        url: self.api + '/projects/' + projectId + '/files',
        type: 'GET',
        contentType: 'application/json',
        headers: {
            Authorization: localStorage.getItem('hub-iobio-tkn')
        }
    }).fail(function (xhr, status, error) {
        let curr_uri = window.location.href;
        let redirect_uri = '';
        // Strip of # to comply with Vue/Oauth mixture if initial token expiration
        if (initialLaunch) {
            let hash_index = curr_uri.indexOf('#');
            let stripped_href = curr_uri.substring(0, (hash_index - 1));
            stripped_href += curr_uri.substring(hash_index + 2);
            redirect_uri = encodeURIComponent(stripped_href);
        }
        // On subsequent token refresh no # to parse out
        else {
            redirect_uri = encodeURIComponent(curr_uri);
        }
        let oauthLink = `${self.oauth_api}/oauth/authorization?response_type=token&client_id=${self.client_id}&redirect_uri=${redirect_uri}`;

        $('#warning-authorize')
            .append('Your access to hub.iobio has expired. Please click <a href=' + oauthLink + '>here</a> to renew your access.')
            .css('display', 'block');
    });
    return fileQuery;
};

HubEndpoint.prototype.getProject = function (projectId) {
    let self = this;
    return $.ajax({
        url: self.api + '/projects/' + projectId,
        type: 'GET',
        contentType: 'application/json',
        headers: {
            'Authorization': localStorage.getItem('hub-iobio-tkn')
        }
    });
};

HubEndpoint.prototype.getSamplesForProject = function (projectId, sampleFilters) {
    let self = this;
    let queryParams = {include: 'files'};
    if (sampleFilters) {
        queryParams.filter = sampleFilters;
    }

    let params = Qs.stringify(queryParams, {addQueryPrefix: true, arrayFormat: 'brackets'});
    let urlParam = '';
    if (self.usingNewApi) {
        urlParam = self.api + '/projects/' + projectId + '/samples/list' + params;
    } else {
        urlParam = self.api + '/projects/' + projectId + '/samples' + params;
    }
    let authToken = localStorage.getItem('hub-iobio-tkn');

    return $.ajax({
        url: urlParam,
        type: 'GET',
        contentType: 'application/json',
        headers: {
            'Authorization': authToken
        }
    }).then(function (response) {
        return response.data;
    });
};

HubEndpoint.prototype.getSignedUrlForFile = function (projectId, fileId) {
    let self = this;
    if (self.usingNewApi) {
        return $.ajax({
            url: self.api + '/projects/' + projectId + '/files/' + fileId + '/url',
            type: 'GET',
            contentType: 'application/json',
            headers: {
                'Authorization': localStorage.getItem('hub-iobio-tkn')
            }
        });
    } else {
        return $.ajax({
            url: self.api + '/files/' + fileId + '/url',
            type: 'GET',
            contentType: 'application/json',
            headers: {
                'Authorization': localStorage.getItem('hub-iobio-tkn')
            }
        });
    }
};


HubEndpoint.prototype.requestAuthorization = function () {
    let link = $.ajax({
        url: '/refreshAuthorization',
        type: 'GET',
        contentType: 'text/html'
    }).fail(function (xhr, status, error) {
        alert('Could not complete reauthorization request. Please relaunch app from Hub.');
    });
};