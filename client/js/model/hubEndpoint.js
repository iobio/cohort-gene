function HubEndpoint(env) {
  this.api = {
		development: "http://localhost:3000/apiv1",
		production: "https://staging.frameshift.io/apiv1"
	};
  this.env = env;
}

HubEndpoint.prototype.getFilesForProject = function(project_uuid) {
  let self = this;
  var key = localStorage.getItem('hub-iobio-tkn');
  return $.ajax({
    url: self.api[self.env] + '/projects/' + project_uuid + '/files',
    type: 'GET',
    contentType: 'application/json*',
    headers: {
      'Authorization': localStorage.getItem('hub-iobio-tkn')
    }
  });
}

HubEndpoint.prototype.getProject = function(project_uuid) {
  let self = this;
  return $.ajax({
    url: self.api[self.env] + '/projects/' + project_uuid,
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
  let urlParam = self.api[self.env] + '/projects/' + project_uuid + '/samples' + params;
  let authToken = localStorage.getItem('hub-iobio-tkn');

  return $.ajax({
    url: urlParam,
    type: 'GET',
    contentType: 'application/json',
    headers: {
      'Authorization': authToken
    }
  }).then(function(response) {
    // Put in map
    // foreach line in response.data, fill first id w/ matching
    return response.data;
  });
}


HubEndpoint.prototype.getSignedUrlForFile = function(file) {
  let self = this;
  return $.ajax({
    url: self.api[self.env] + '/files/' + file.uuid + '/url',
    type: 'GET',
    contentType: 'application/json',
    headers: {
      'Authorization': localStorage.getItem('hub-iobio-tkn')
    }
  });
}
