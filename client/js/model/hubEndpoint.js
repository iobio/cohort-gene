function HubEndpoint(source, projectId) {
  this.api = decodeURIComponent(source) + '/apiv1';
  this.oauth_api = decodeURIComponent(source);
  this.projectId = projectId;
  this.client_id = 'HkWNVjYK';
}

// Used when coming from Oauth reauthorize
HubEndpoint.prototype.assignParameters = function(source, projectId) {
  let self = this;
  self.api = decodeURIComponent(source) + '/apiv1';
  self.oauth_api = decodeURIComponent(source);
  self.projectId = projectId;
}

/* First call to Hub from client to get files.
   If token expires, will prompt user to renew. */
HubEndpoint.prototype.getFilesForProject = function(project_uuid) {
  let self = this;
  var key = localStorage.getItem('hub-iobio-tkn');

  let fileQuery = $.ajax({
    url: self.api + '/projects/' + project_uuid + '/files',
    type: 'GET',
    contentType: 'application/json',
    headers: {
      Authorization: localStorage.getItem('hub-iobio-tkn')
    }
  }).fail(function(xhr,status,error) {
    // Strip of # to comply with Vue/Oauth mixture
    let curr_uri = window.location.href;
    let hash_index = curr_uri.indexOf('#');
    let stripped_href = curr_uri.substring(0, (hash_index-1));
    stripped_href += curr_uri.substring(hash_index + 2);
    let redirect_uri = encodeURIComponent(stripped_href);
    let oauthLink = `${self.oauth_api}/oauth/authorization?response_type=token&client_id=${self.client_id}&redirect_uri=${redirect_uri}`;

    $('#warning-authorize')
      .append('Your access to hub.iobio has expired. Please click <a href='+oauthLink+'>here</a> to renew your access.')
      .css('display', 'block');
  });
  return fileQuery;
}

HubEndpoint.prototype.getProject = function(project_uuid) {
  let self = this;
  return $.ajax({
    url: self.api + '/projects/' + project_uuid,
    type: 'GET',
    contentType: 'application/json',
    headers: {
      'Authorization': localStorage.getItem('hub-iobio-tkn')
    }
  });
}

HubEndpoint.prototype.getSamplesForProject = function(project_uuid, sampleFilters) {
  let self = this;
  let queryParams = { include: 'files' };
  if (sampleFilters) {
    queryParams.filter = sampleFilters;
  }

  let params = Qs.stringify(queryParams, { addQueryPrefix: true, arrayFormat: 'brackets' });
  let urlParam = self.api + '/projects/' + project_uuid + '/samples' + params;
  let authToken = localStorage.getItem('hub-iobio-tkn');

  return $.ajax({
    url: urlParam,
    type: 'GET',
    contentType: 'application/json',
    headers: {
      'Authorization': authToken
    }
  }).then(function(response) {
    return response.data;
  });
}


HubEndpoint.prototype.getSignedUrlForFile = function(file) {
  let self = this;
  return $.ajax({
    url: self.api + '/files/' + file.uuid + '/url',
    type: 'GET',
    contentType: 'application/json',
    headers: {
      'Authorization': localStorage.getItem('hub-iobio-tkn')
    }
  });
}

HubEndpoint.prototype.requestAuthorization = function() {
  let link = $.ajax({
    url: '/refreshAuthorization',
    type: 'GET',
    contentType: 'text/html'
  }).fail(function(xhr,status,error) {
    alert('Could not complete reauthorization request. Please relaunch app from Hub.');
  });
}
