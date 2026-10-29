
/**
 * @module Key base Autherization Middleware
 */
var _ = require("lodash");
var jwt = require("jwt-simple");
var config = require('../../../../config');
var credentials = config.credentials || {};
var jwtProps = config.jwt || {};

function APIKeyMiddleware() {
    var botIdregex = /(?<botId>st-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-5[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})/;
	// Checking the api key with config
    function isValidAPI(header,url){
        var botIdMatch = typeof url === 'string' && url.match(botIdregex);
        if (!botIdMatch) {
            return false;
        }

        var botId = botIdMatch.groups.botId;
        var cred = credentials[botId] || credentials;
        if (!cred || !cred.apikey) {
            return false;
        }
        var botJwtProps = jwtProps[botId];
        var jwtAlg = (botJwtProps && botJwtProps.jwtAlgorithm) || jwtProps.jwtAlgorithm || "HS256";

        if(_.has(header, 'apikey')){//DEPRECATED::SOON TO BE REMOVED
            if(header.apikey===cred.apikey)
                return true;
        }
        if(_.has(header, 'token')){
            var appId;
            try {
                appId = jwt.decode(header.token, cred.apikey, false, jwtAlg).appId;
            } catch(e){
                console.info("invalid jwt token");
            }
            return appId === cred.appId;
        }
        return false;
    }

    return function(req, res, next) {
		if(isValidAPI(req.headers, req.originalUrl || req.url)){
			return next();
        }
        var error = {
            msg: "Invalid apikey",
            code: 4002
        };
        var errors = [error];
        var resp = {};
        resp.errors = errors;
        res.status(401);
        res.setHeader('response-error-description', JSON.stringify(resp));
        return res.json(resp);
    };
}

module.exports = APIKeyMiddleware;
