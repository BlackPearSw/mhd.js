/*
Requires openxds services prepopulated with documents
 */
var vows = require("vows");
var check = require("validator").check;
var libxmljs = require("libxmljs");
var constants = require("./config/constants.js");
var xds = require("../lib/xds/xds.js");

var adapter = new xds.Adapter(constants.xdsRegistry, constants.xdsRepository);

vows.describe("xdsAdapter functional tests").addBatch({
    "when retrieving document dossier":{
        topic:function () {
            adapter.getDocumentDossier(constants.wellformedDocumentUuid, constants.wellformedPatientId, this.callback);
        },
        "there is no error":function (err, dossier) {
            check(err).isNull();
        },
        "dossier JSON is found":function (err, dossier) {
            check(dossier).notNull();
        }
    }
}).addBatch({
        "when searching for document dossiers for patient with documents":{
            topic:function () {
                var params = {
                    originalUrl:"http://dummy:888/",
                    query:{ PatientID:constants.wellformedPatientId}
                };
                adapter.findDocumentDossiers(params, this.callback);
            },
            "there is no error":function (err, results) {
                check(err).isNull();
            },
            "there are results":function (err, results) {
                check(results).notNull();
            }
        }
    }).addBatch({
        "when searching for document dossiers for patient with no documents":{
            topic:function () {
                var params = {
                    originalUrl:"http://dummy:888/",
                    query:{ PatientID:constants.noDocumentsPatientId}
                };
                adapter.findDocumentDossiers(params, this.callback);
            },
            "the error is 'No Document Entries found' ":function (err, results) {
                check(err).is("No Document Entries found");
            },
            "there is no dossier":function (err, results) {
                check(results).isNull();
            }
        }
    }).
    addBatch({
        "when getting document":{
            topic:function () {
                adapter.getDocument(constants.wellformedDocumentUuid, constants.wellformedPatientId, this.callback);
            },
            "there is no error":function (err, document) {
                check(err).isNull();
            },
            "there is a document":function (err, document) {
                check(document.toString()).notEmpty();
            }
        }
    }).run();

