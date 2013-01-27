var constants=require("../config/constants.js");

//NB: In real implementation need to ensure that these functions are non-blocking

//Get Document Dossier [ITI-66]
function getDocumentDossier(entryUuid, patientId, callback){
	if (entryUuid == constants.unknownDocumentUuid){
	  callback("Unknown Document UUID", null);
	  return;
	}

	if (entryUuid == constants.deprecatedDocumentUuid){
	  callback("Deprecated Document UUID", null);
	  return;
	}

	if (patientId == constants.unknownPatientId){
	  callback("Unknown PatientID", null);
	  return;
	}

	var dossier = {
	documentEntry:{
	patientID: patientId,
        classCode: {
        	code:'34133 -9',
        	codingScheme:'2.16.840.1.113883.6.1',
        	codeName:'Summary of Episode Note'},
        confidentialityCode:{
		code:'N',
		codingScheme:'2.16.840.1.113883.5.25',
		codeName:'Normal sensitivity'},
	formatCode:{
		code:'urn:ihe:lab:xd-lab:2008',
		codingScheme:'1.3.6.1.4.1.19376.1.2.3',
		codeName:'XD-Lab'},
	typeCode:{
		code:'',
		codingScheme:'',
		codeName:''},
	Author:{
		todo:'need to expand this!!!'},
	practiceSettingCodes:{
		code:'394802001',
		codingScheme:'2.16.840.1.113883.6.96',
		codeName:'General Medicine'},
	Title:'document title',
	creationTime:'20061224',
	hash:'e543712c0e10501972de13a5bfcbe826c49feb75',
	Size:'350',
	languageCode:'en-us',
	serviceStartTime:'200612230800',
	serviceStopTime:'200612230900',
	sourcePatientId:'4567856789^^^&3.4.5&ISO',
	mimeType:'text/xml',
	uniqueId:'1.2009.0827.08.33.5074',
	entryUUID:'urn:uuid:' + entryUuid}};
	
	callback(null, JSON.stringify(dossier));
}

//Find Document Dossiers [ITI-67]
function findDocumentDossiers(originalUrl, patientId, query, callback){
	if (patientId == constants.unknownPatientId){
	  callback("Unknown PatientID", null);
	  return;
	}
	
	if (patientId == constants.noDocumentsPatientId){
	  callback("No Document Entries found", null);
	  return;
	}
	
	//TODO: Result to unsupported mediatype error 415, 

	var timestamp = new Date().toString();
	var result = {
	updated:timestamp,
	self:originalUrl,
	entries:[
	  {
	    id:constants.wellformedDocumentUuid, 
	    self: constants.root + "/net.ihe/DocumentDossier/" + constants.wellformedDocumentUuid + "/?PatientID=" + patientId,  
	    related:constants.root + "/net.ihe/Document/" + constants.wellformedDocumentUuid + "/?PatientID=" + patientId,
	    updated:timestamp}, 
	  {
            id:"123456", 
            self:constants.root + "/net.ihe/DocumentDossier/123456/?PatientID=" + patientId,  
            related:constants.root + "/net.ihe/Document/abcxyz/?PatientID=" + patientId,
            updated:timestamp}, 
          {
            id:"9876",
            self:constants.root + "/net.ihe/DocumentDossier/9876/?PatientID=" + patientId,
            related:constants.root + "/net.ihe/Document/werwer?PatientID=" + patientId,
            updated:timestamp}
        ]}
	
	callback(null, JSON.stringify(result));
}

//Get Document [ITI-68]
function getDocument(entryUuid, patientId, callback){
	if (entryUuid == constants.unknownDocumentUuid){
	  callback("Unknown Document UUID", null);
	  return;
	}
	
	if (entryUuid == constants.deprecatedDocumentUuid){
	  callback("Deprecated Document UUID", null);
	  return;
	}
	
	if (patientId == constants.unknownPatientId){
	  callback("Unknown PatientID", null);
	  return;
	}
	
	callback(null, "xdsDocumentConsumerStub.getDocument for " + entryUuid + "[" + patientId + "]");
}

exports.getDocumentDossier = getDocumentDossier;
exports.findDocumentDossiers = findDocumentDossiers;
exports.getDocument = getDocument;
