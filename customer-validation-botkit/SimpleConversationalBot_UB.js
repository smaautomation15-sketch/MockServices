var botId = ["st-6c968b02-df8d-55d5-a7ce-779476c4a6cb","st-b534b90e-a38e-5f77-99c7-63a7331ad4f6","st-e098fdc7-69a9-5a12-a819-312c9c002a54"];
var botName = "Customer Validation UB Bot1";
var sdk = require("./lib/sdk");

/*
 * This is the most basic example of BotKit.
 *
 * It showcases how the BotKit can intercept the message being sent to the bot or the user.
 *
 * We can either update the message, or chose to call one of 'sendBotMessage' or 'sendUserMessage'
 */
module.exports = {
    botId   : botId,
    botName : botName,

    on_user_message : function(requestId, data, callback) {
        console.log("From user : "+data.message);
        if (data.message === "TriggerChannelSpecificResponse"){
            data.message = "ResponseOverrideValidation";
            return sdk.sendBotMessage(data, callback);
        }else if (data.message === "SessionClosureBotKit") {
            return sdk.closeConversationSession(data, callback);
            //Sends back 'Hello' to user.
            // return sdk.sendUserMessage(data, callback);
        } else if(data.message === "Send NL Meta"){
            console.log("NL Meta section executed")
            let metaInfo = { 
                "nlMeta" :{
                    "intent": "NLMetaIntentValidation",
                    "childBotName":"Customer Validation Bot1"
            // 'isRefresh': true, 
    	    //  'entities': {
            //     "Name": "John"
            //     },
            //     'interruptionOptions': 'discardAll'
                }
            }
            data.metaInfo = metaInfo;
            return sdk.sendBotMessage(data,callback);
        }else if(data.message === "STOP_AGENT_TRANSFER"){
            sdk.clearAgentSession(data);
            data.message = "Agent transfer disconnected";
            return sdk.sendUserMessage(data, callback);

        } else if(!data.agent_transfer){
            //Forward the message to bot
            return sdk.sendBotMessage(data, callback);
        }else {
            data.message = "Agent Message";
            // console.log(data);
            return sdk.sendUserMessage(data, callback);
        }
    },
    on_bot_message  : function(requestId, data, callback) {
        console.log("From bot : "+data.message);
        if (data.message === 'hello') {
            data.message = 'The Bot says hello!';
        }
        //Sends back the message to user
        
        return sdk.sendUserMessage(data, callback);
    },
    on_agent_transfer : function(requestId, data, callback){
        console.log("on_agent_transfer --> Event triggered");
        return callback(null, data);
    },
    on_event : function (requestId, data, callback) {
        console.log("on_event -->  Event : ", data.event);
        if (data.event.completedTaskName==='esicb1dialog' && data.context.session.BotUserSession.count===0){
            console.log("Navigating to next bot");
            data.context.session.BotUserSession.count++;
            data.metaInfo = {
                'nlMeta': {
                    'intent': 'ESICB2Dialog',
                    'childBotName': 'Customer Validation Bot2'
                }
            } 
            data.message = 'ESICB2Dialog';
          return  sdk.sendBotMessage(data,callback);
        } 
        return callback(null, data);
    },
    on_alert : function (requestId, data, callback) {
        console.log("on_alert --> Event triggered");
        return sdk.sendAlertMessage(data, callback);
    },
    on_variable_update: function(requestId, data, callback) {
       console.log("on_variable_update --> Event triggered");
    }

};
