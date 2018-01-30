
    var testsContext = require.context("../../client/spec", false);

    var runnable = testsContext.keys();

    runnable.forEach(testsContext);
    