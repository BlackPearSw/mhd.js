function ErrorRecord(uri, ip, user, outcome, msg) {
    this.EventID = uri;
    this.IP = ip;
    this.User = user;
    this.Outcome = outcome;
    this.Msg = msg;
}

ErrorRecord.prototype = {
    constructor: ErrorRecord,
}

ErrorRecord.prototype.toXml = function(){
    var tmp = [];
    tmp.push("<AuditMessage>");
    tmp.push("<EventIdentification>");
    tmp.push("<EventID EventDateTime='");
    tmp.push((new Date()).toISOString());
    tmp.push("' EventOutcomeIndicator='");
    tmp.push(this.Outcome);
    tmp.push("'>");
    tmp.push(this.EventID);
    tmp.push("</EventID>");
    tmp.push("</EventIdentification>");
    tmp.push("<ActiveParticipant UserID='");
    tmp.push(this.User);
    tmp.push("' NetworkAccessPointID='");
    tmp.push(this.IP);
    tmp.push("' NetworkAccessPointTypeCode='2'/>"); //2=IP Address
    tmp.push("<AuditSourceIdentification>");
    tmp.push("<AuditSourceTypeCode code='3' AuditSourceID='mhd.js' />");  //3=Web server process
    tmp.push("</AuditSourceIdentification>");
    tmp.push("<Description>");
    tmp.push(this.Msg);
    tmp.push("</Description>");
    tmp.push("</AuditMessage>")
    return tmp.join("");
}

exports.ErrorRecord = ErrorRecord;
exports.ERROR_EXCEPTION = 12;
exports.ERROR_WARNING = 8;
exports.ERROR_INFORMATION = 4;
