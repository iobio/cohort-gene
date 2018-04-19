function HubEndpoint(source) {
  this.api = decodeURIComponent(source) + '/apiv1';
}

HubEndpoint.prototype.getFilesForProject = function(project_uuid) {
  let self = this;
  var key = localStorage.getItem('hub-iobio-tkn');
  debugger; // look at api

  var call =  $.ajax({
    url: self.api + '/projects/' + project_uuid + '/files',
    type: 'GET',
    contentType: 'application/json*',
    headers: {
      'Authorization': localStorage.getItem('hub-iobio-tkn')
    }
  });
  return call;
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
