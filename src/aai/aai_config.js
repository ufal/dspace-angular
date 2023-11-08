/*global jQuery */
/*jshint globalstrict: true*/
'use strict';

jQuery(document).ready(
    function () {
        var opts = (function () {
            var instance = {};
            //if ever port is needed (eg. testing other tomcat) it should be in responseUrl and target
            instance.port = (window.location.port === "" ? "" : ":" + window.location.port);
            instance.host = window.location.protocol + '//' +
                window.location.hostname;
            instance.repoPath = jQuery("a#repository_path").attr("href");
            if (instance.repoPath.charAt(instance.repoPath.length - 1) !== '/') {
                instance.repoPath = instance.repoPath + '/';
            }
            instance.target = instance.repoPath;

            //In order to use the discojuice store (improve score of used IDPs)
            //Works only with "verified" SPs - ie. ufal-point, displays error on ufal-point-dev
            instance.responseUrl =
                (window.location.hostname.search("ufal-point-dev") >= 0) ?
                        "" :
                        instance.host + instance.port + instance.repoPath +
                            "themes/UFAL/lib/html/disco-juice.html?";
            // e.g., instance.metadataFeed = "http://localhost:8080/server/api/discojuice/feeds?callback=dj_md_1";
            instance.metadataFeed = instance.target + "discojuice/feeds";
            instance.serviceName = "Data repository at CUNI";
            instance.localauth = true; // used to be html snippet; that was not used anymore
            instance.target = instance.target + "authn/shibboleth";
            return instance;
        })();
        if (!("aai" in window)) {
            throw "Failed to find UFAL AAI object. See https://redmine.ms.mff.cuni.cz/projects/lindat-aai for more details!";
        }
        window.aai.setup(opts);
    }
); // ready
