var libxmljs = require("libxmljs");
var sanitize = require("validator").sanitize;
var xds = require("./xds.js");
var parseHttp = require("../parseHttp.js");


var NAMESPACES = {"rim":"urn:oasis:names:tc:ebxml-regrep:xsd:rim:3.0"};

var CLASSIFICATIONSCHEME_UNKNOWN = "";
var CLASSIFICATIONSCHEME_CLASSCODE = CLASSIFICATIONSCHEME_UNKNOWN;
var CLASSIFICATIONSCHEME_CONFIDENTIALITYCODE = "urn:uuid:f4f85eac-e6cb-4883-b524-f2705394840f";
var CLASSIFICATIONSCHEME_FORMATCODE = "urn:uuid:a09d5840-386c-46f2-b5ad-9c3699a4309d";
var CLASSIFICATIONSCHEME_TYPECODE = "urn:uuid:f0306f51-975f-434e-a61c-c59651d33983";
var CLASSIFICATIONSCHEME_AUTHOR = "urn:uuid:93606bcf-9494-43ec-9b4e-a7748d1a838d";
var CLASSIFICATIONSCHEME_PRACTICESETTINGCODES = "urn:uuid:cccf5598-8b07-4b77-a05e-ae952c785ead";

var REGISTRYSTOREDQUERY_RETURNTYPE_LEAFCLASS = "LeafClass";
var REGISTRYSTOREDQUERY_RETURNTYPE_OBJECTREF = "ObjectRef";

var REGISTRYSTOREDQUERY_PARAMETER_PATIENTID = "XDSDocumentEntryPatientId";
var REGISTRYSTOREDQUERY_PARAMETER_STATUS = "XDSDocumentEntryStatus";
var REGISTRYSTOREDQUERY_PARAMETER_STATUS_APPROVED = "urn:oasis:names:tc:ebxml-regrep:StatusType:Approved";

var MIMETYPE_ANY = "*/*";
var MIMETYPE_JSON = "application/json";
var MIMETYPE_ATOM = "application/xml+atom";


function Adapter(registry, repository) {
    this.documentConsumer = new xds.DocumentConsumer(registry, repository);
}

Adapter.prototype = {
    constructor:Adapter
}

//Get Document Dossier [ITI-66]
Adapter.prototype.getDocumentDossier = function (entryUuid, patientId, callback) {
    var xdsQuery = {
        returnType:REGISTRYSTOREDQUERY_RETURNTYPE_LEAFCLASS,
        params:[
            {name:REGISTRYSTOREDQUERY_PARAMETER_PATIENTID, value:sanitize(patientId).entityEncode()},
            {name:REGISTRYSTOREDQUERY_PARAMETER_STATUS, value:[REGISTRYSTOREDQUERY_PARAMETER_STATUS_APPROVED]}
        ]
    };
    this.documentConsumer.registryStoredQuery(xdsQuery, function (err, res) {
        //preconditions
        if (err) {
            callback(err, null);
            return;
        }

        if (res == null) {
            callback("XDS Registry did not return response", null);
            return;
        }

        res.setEncoding('UTF-8');
        var body = "";
        res.on("data", function (chunk) {
            body = body + chunk.toString();
        });
        res.on("end", function () {
            var xml = libxmljs.parseXmlString(body);

            var extrinsicObject = xml.get("//rim:ExtrinsicObject[@id='" + entryUuid + "']", NAMESPACES);

            if (!extrinsicObject) {
                callback("Unknown Document UUID", null);
                return;
            }

            var dossier = makeDossier(extrinsicObject, patientId, entryUuid);
            callback(null, JSON.stringify(dossier));

        });
        res.on("close", function () {
            callback("error", null);
        });
    });
}

//Find Document Dossiers [ITI-67]
Adapter.prototype.findDocumentDossiers = function (params, callback) {
    if (!(params.format == null || params.format == MIMETYPE_ANY || params.format == MIMETYPE_JSON || params.format == MIMETYPE_ATOM )) {
        callback("Unsupported media type", null);
        return;
    }

    var xdsQuery = {
        returnType:REGISTRYSTOREDQUERY_RETURNTYPE_OBJECTREF,
        params:[
            {name:REGISTRYSTOREDQUERY_PARAMETER_PATIENTID, value:sanitize(params.query.PatientID).entityEncode()},
            {name:REGISTRYSTOREDQUERY_PARAMETER_STATUS, value:[REGISTRYSTOREDQUERY_PARAMETER_STATUS_APPROVED]}
        ]
    };
    this.documentConsumer.registryStoredQuery(xdsQuery, function (err, res) {
        if (err) {
            callback(err, null);
            return;
        }

        if (res == null) {
            callback("XDS Registry did not return response", null);
            return;
        }

        res.setEncoding('UTF-8');
        var body = "";
        res.on("data", function (chunk) {
            body = body + chunk.toString();
        });
        res.on("end", function () {
            var objectRefList = libxmljs.parseXmlString(body).find("//rim:ObjectRef", NAMESPACES);

            if (objectRefList.length == 0) {
                callback("No Document Entries found", null);
                return;
            }

            var timestamp = new Date().toString();
            var entries = [];
            for (var i = 0; i < objectRefList.length; i++) {
                entries[i] = makeEntry(objectRefList[i], params, timestamp);
            }

            var result = {
                updated:timestamp,
                self:params.originalUrl,
                entries:entries
            };

            if (params.format == MIMETYPE_ATOM) {
                callback(null, atomise(result));
            }
            else {
                callback(null, JSON.stringify(result));
            }
        });
        res.on("close", function () {
            callback("error", null);
        });
    });
}

//Get Document [ITI-68]
Adapter.prototype.getDocument = function (entryUuid, patientId, callback) {
    var self = this.documentConsumer;
    var registryQuery = {
        returnType:REGISTRYSTOREDQUERY_RETURNTYPE_LEAFCLASS,
        params:[
            {name:REGISTRYSTOREDQUERY_PARAMETER_PATIENTID, value:sanitize(patientId).entityEncode()},
            {name:REGISTRYSTOREDQUERY_PARAMETER_STATUS, value:[REGISTRYSTOREDQUERY_PARAMETER_STATUS_APPROVED]}
        ]
    };
    self.registryStoredQuery(registryQuery, function (err, res) {
        //preconditions
        if (err) {
            callback(err, null);
            return;
        }

        if (res == null) {
            callback("XDS Registry did not return response", null);
            return;
        }

        res.setEncoding('UTF-8');
        var body = "";
        res.on("data", function (chunk) {
            body = body + chunk.toString();
        });
        res.on("end", function () {
            var xml = libxmljs.parseXmlString(body);
            var extrinsicObject = xml.get("//rim:ExtrinsicObject[@id='" + entryUuid + "']", NAMESPACES);

            if (!extrinsicObject) {
                callback("Unknown Document UUID", null);
                return;
            }

            var repositoryQuery = {
                RepositoryUniqueId:extrinsicObject.get("//rim:Slot[@name='repositoryUniqueId']/rim:ValueList/rim:Value", NAMESPACES).text(),
                DocumentUniqueId:extrinsicObject.get("//rim:ExternalIdentifier[rim:Name/rim:LocalizedString[@value='XDSDocumentEntry.uniqueId']]/@value", NAMESPACES).value()
            };

            self.retrieveDocumentSet(repositoryQuery, function (err, res) {
                if (err) {
                    callback(err, null);
                    return;
                }

                if (!res) {
                    callback("XDS Repository did not return response", null);
                    return;
                }

                parseHttp.splitMultipart(res, function (parts) {
                        if (parts.length != 2) {
                            callback("XDS Repository returned single part response");
                            return;
                        }

                        var document = {
                            headers:parts[1].headers,
                            data:parts[1].data
                        };

                        callback(null, document);
                    }
                );
            });
        });
    });
}

function makeDossier(xmlElement, patientId, entryUuid) {
    var dossier = {
        documentEntry:{
            patientID:patientId
        }};

    dossier.documentEntry["classCode"] = getClassificationValue(xmlElement, CLASSIFICATIONSCHEME_CLASSCODE);
    dossier.documentEntry["confidentialityCode"] = getClassificationValue(xmlElement, CLASSIFICATIONSCHEME_CONFIDENTIALITYCODE);
    dossier.documentEntry["formatCode"] = getClassificationValue(xmlElement, CLASSIFICATIONSCHEME_FORMATCODE);
    dossier.documentEntry["typeCode"] = getClassificationValue(xmlElement, CLASSIFICATIONSCHEME_TYPECODE);
    dossier.documentEntry["Author"] = getAuthorValue(xmlElement);
    dossier.documentEntry["practiceSettingCodes"] = getClassificationValue(xmlElement, CLASSIFICATIONSCHEME_PRACTICESETTINGCODES);


    dossier.documentEntry["Title"] = xmlElement.get("//rim:Name/rim:LocalizedString/@value", NAMESPACES).value();
    dossier.documentEntry["creationTime"] = getSlotValue(xmlElement, "creationTime");
    dossier.documentEntry["hash"] = getSlotValue(xmlElement, "hash");
    dossier.documentEntry["Size"] = getSlotValue(xmlElement, "size");
    dossier.documentEntry["languageCode"] = getSlotValue(xmlElement, "languageCode");
    dossier.documentEntry["serviceStartTime"] = getSlotValue(xmlElement, "serviceStartTime");
    dossier.documentEntry["serviceStopTime"] = getSlotValue(xmlElement, "serviceStopTime");
    dossier.documentEntry["sourcePatientId"] = getSlotValue(xmlElement, "sourcePatientId");

    dossier.documentEntry["mimeType"] = getAttributeValue(xmlElement, "@mimeType");
    dossier.documentEntry["uniqueId"] = xmlElement.get("//rim:ExternalIdentifier[rim:Name/rim:LocalizedString[@value='XDSDocumentEntry.uniqueId']]/@value", NAMESPACES).value();
    dossier.documentEntry["entryUUID"] = entryUuid;

    return dossier;
}

function getAttributeValue(xmlElement, name) {
    return xmlElement.get(name, NAMESPACES).value();
}

function getSlotValue(xmlElement, name) {
    var node = xmlElement.get("//rim:Slot[@name='" + name + "']/rim:ValueList/rim:Value", NAMESPACES);
    if (node) {
        return node.text();
    }
    else {
        return "";
    }
}

function getClassificationValue(xmlElement, name) {
    var classification = {code:"", codingScheme:"", codeName:""};
    var classificationNode = xmlElement.get("//rim:Classification[@classificationScheme='" + name + "']", NAMESPACES);
    if (classificationNode) {
        classification["code"] = classificationNode.get("@nodeRepresentation", NAMESPACES).value();
        classification["codingScheme"] = classificationNode.get("rim:Slot[@name='codingScheme']/rim:ValueList/rim:Value", NAMESPACES).text();
        classification["codeName"] = classificationNode.get("rim:Name/rim:LocalizedString/@value", NAMESPACES).value();
    }
    return classification;
}

function getAuthorValue(xmlElement) {
    var author = {authorInstitution:"", authorPerson:"", authorRole:"", authorSpecialty:""};
    var classificationNode = xmlElement.get("//rim:Classification[@classificationScheme='" + CLASSIFICATIONSCHEME_AUTHOR + "']", NAMESPACES);
    if (classificationNode) {
        author["authorInstitution"] = getSlotValue(classificationNode, "authorInstitution");
        author["authorPerson"] = getSlotValue(classificationNode, "authorPerson");
        author["authorRole"] = getSlotValue(classificationNode, "authorRole");
        author["authorSpecialty"] = getSlotValue(classificationNode, "authorSpecialty");
    }
    return author;
}


function atomise(result) {
    var tmp = [];
    tmp.push("<?xml version='1.0' encoding='utf-8'?>");
    tmp.push("<feed xmlns='http://www.w3.org/2005/Atom'>");
    tmp.push("<title>MHD findDocumentDossiers response</title>");
    tmp.push("<updated>" + result.updated + "</updated>");
    tmp.push("<id>" + result.self + "</id>");
    tmp.push("<author>");
    tmp.push("<name>MHD Document Responder</name>");
    tmp.push("</author>");
    tmp.push("<generator uri='https://github.com/Dunmail/mhd.js' version='0.2'>mhd.js</generator>");
    tmp.push("<link rel='self' href='" + result.self + "'/>");

    for (var i = 0; i < result.entries.length; i++) {
        var entry = result.entries[i];
        tmp.push("<entry>");
        tmp.push("<id>" + entry.id + "</id>");
        tmp.push("<title>" + entry.id + "</title>");
        tmp.push("<link rel='self' href='" + entry.self + "'/>");
        tmp.push("<link rel='related' href='" + entry.related + "'/>");
        tmp.push("<updated>" + result.updated + "</updated>");
        tmp.push("</entry>");
    }
    tmp.push("</feed>");


    return tmp.join("");
}
function makeEntry(objectRef, params, timestamp) {
    var entryUuid = objectRef.attr("id").value();

    var entry = {};
    entry.id = entryUuid;
    entry.self = "https://" + params.host + ":" + params.port + "/net.ihe/DocumentDossier/" + entryUuid + "/?PatientID=" + escape(params.query.PatientID);
    entry.related = "https://" + params.host + ":" + params.port + "/net.ihe/Document/" + entryUuid + "/?PatientID=" + escape(params.query.PatientID);
    entry.updated = timestamp;

    return entry;
}

function escape(text) {
    return text.replace(/\^/g, "%5E").replace(/&/g, "%26");
}

exports.Adapter = Adapter;