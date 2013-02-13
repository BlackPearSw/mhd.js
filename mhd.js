var express = require("express");
var fs = require("fs");
var atna = require("./lib/atna/atna.js");
var xds = require("./lib/xds/xds.js");
var server = require("./lib/server.js");

//create actors
var auditRecordRepository = new atna.AuditRecordRepository(function (auditRecord) {
    fs.appendFile("./logs/activity.log", auditRecord.toXml() + "\r\n", "utf8", function (err) {
        if (err) throw err;
    });
});

//create adapters
var xdsAdapter = new xds.Adapter({hostname:"192.168.10.65", port:2010, path:"/openxds/services/DocumentRegistry/"},
    {hostname:"192.168.10.65", port:2010, path:"/openxds/services/DocumentRepository/"});

var config = {
    name:"Mobile access to Health Documents (MHD) service",
    port:1337,
    options:{
        key:fs.readFileSync("./cert/key.pem"),
        cert:fs.readFileSync("./cert/cert.pem")
    },
    audit:{
        auditRecordRepository:auditRecordRepository,
        middleware:function (req, res, next) {
            var uri = req.protocol + "://" + req.headers["host"] + req.url;
            var ip = req.header("x-forwarded-for") || req.connection.remoteAddress;
            var user = req.user;
            var outcome = atna.OUTCOME_SUCCESS;

            var record = new atna.AuditRecord(uri, ip, user, outcome);
            auditRecordRepository.recordAuditEvent(record);
            next();
        }},
    xds:xdsAdapter,
    authenticate:function (req, res, next) {
        var f = express.basicAuth(function (user, pass, callback) {
            var result = (user === 'Aladdin' && pass === 'open sesame');
            if (result) {
                callback(null, user)
            }
            else {
                //if authentication fails request will be rejected before reaching audit middleware
                var uri = req.protocol + "://" + req.headers["host"] + req.url;
                var ip = req.header("x-forwarded-for") || req.connection.remoteAddress;
                var user = user;
                var outcome = atna.OUTCOME_MINORFAILURE;
                var record = new atna.AuditRecord(uri, ip, user, outcome);
                auditRecordRepository.recordAuditEvent(record);
                callback(null, false);
            }
        });
        f(req, res, next);
    },
    patientIdPattern:"^[0-9]{9}[\^]{3}[&]2.16.840.1.113883.2.1.3.9.1.0.0&ISO$" //open XDS test system patient identifier
};

server.start(config);
