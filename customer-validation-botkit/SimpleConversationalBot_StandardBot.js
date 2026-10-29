var botId = ["st-2a6974d2-b3c6-5dbd-8ec7-2f2040130d22","st-e4874727-2883-53be-a277-347a9b1ce8aa","st-4cf14bf2-4ec7-5bcb-a760-8a34a69a9ce9","st-c4a17f7f-0554-57ca-afce-a85223cf2e10","st-371d76bf-9abb-51b7-8845-8d6434a5b058","st-9f47bfb5-ca57-57fb-8556-09b2bbcb905a","st-5bd36ba1-3507-5725-96fa-4a3691906976","st-3bf33d22-bf1c-5365-8112-817a6f29b065","st-b474cb4f-a902-50af-a34a-a26774c11641","st-dc2c8eb2-3f80-5da6-a0a3-eba08786ffdb","st-cb98a935-d1ca-519a-a227-a09e98e07bd9","st-7133093b-5aac-5a72-bb5f-834affd7d0fd","st-c71159d7-2f14-5333-b045-dc2622407dc7","st-20da6a4e-43b3-57e0-ad29-67566396ca93","st-dc34bd4a-2e2c-54ab-a125-72c3a1c109a2","st-908f76b2-388b-5c41-8cab-fe634a68e115","st-e1d4ee37-7ce1-5f04-b715-040555d82609","st-305ab328-3d3a-50c2-b5d8-4657c24e844c","st-7fae3ed8-dbe6-5444-801a-4dab03db147e","st-92575b9d-f6a7-555c-8609-e03d2d7c6b2a","st-761c26d9-4af1-5241-bc78-80abfa2aee38","st-cf5e17b6-5090-5d0e-a142-d9823d96d050","st-92d60063-d463-504a-924b-991b89fc1090","st-d30cbde1-1aba-5591-9d93-456bad5ea3fa","st-c9fe6791-0ec1-526f-8634-43717de458af","st-4bf900c6-8701-51b3-99e6-06b537b6d3e0","st-2a4e9a5b-1427-59f9-8c25-bd603556fb05","st-eda6e83f-66b7-5767-a06f-b2adda488ba3","st-fde6f6e5-59cb-5bbc-8bd6-55487a3201c3","st-cffdea81-c8c0-554d-bffb-35494268853c","st-7fb96ae7-a888-5fad-a64d-635bc05fd23e","st-179d8106-10f8-561a-9ea2-54f5346a9495","st-0edf7e91-bed3-5857-8a06-ce62b7a458e7","st-a4d173d8-802a-5049-a8f3-ee39a9e7476d","st-f0cf046b-a5d2-564b-9fad-dc406ab393d5","st-362a7c64-9102-503f-bae3-1d85f31c71ed","st-acc13225-4862-58da-b88b-8756c3c22fd0","st-e5200a2f-9b21-5905-a826-62620f761939"];
var botName = "Customer Validation Bot1";
const { sendBotMessage } = require("./lib/sdk");
var sdk = require("./lib/sdk");

/*
 * This is the most basic example of BotKit.
 *
 * It showcases how the BotKit can intercept the message being sent to the bot or the user.
 *
 * We can either update the message, or chose to call one of 'sendBotMessage' or 'sendUserMessage'
 */
function respondToAsyncWebhook(requestId){
    return new Promise(function(resolve, reject){
        console.log("respondToAsyncWebhook function entered")
        sdk.getSavedData(requestId)
        .then(function(data) {
            setTimeout( () => {
                data.context.AsyncTest = "This message from async webhook";
                sdk.respondToHook(data);
            }, 4000) 
        });
    });
}
module.exports = {
    botId   : botId,
    botName : botName,

    on_user_message : function(requestId, data, callback) {
        console.log("From user : "+data.message);
        if (data.message === "TriggerSkipBotMessage"){
            return sdk.skipBotMessage(data, callback);
        }else if(data.message === "StartAgentSession"){
            sdk.startAgentSession(data, callback);
            data.message = "Started Agent Session";
            return sdk.sendUserMessage(data,callback);
        }else if (data.message === "ResetBot"){
            sdk.resetBot(data,callback);
            if(!data.context || !data.context.test){
                data.message = "Context Cleared successfully";
                return sdk.sendUserMessage(data,callback);
            }else{
                data.message = "Context Not Cleared";
                return sdk.sendUserMessage(data,callback);
            }
        }else if (data.message === "TriggerOnUserMessage"){
            data.message = "On User Message Triggered Successfully";
            return sdk.sendUserMessage(data, callback);
        }else if (data.message === "TriggerChannelSpecificResponse"){
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
                    "intent": "NLMetaIntentValidation"
            // 'isRefresh': true, 
    	    //  'entities': {
            //     "Name": "John"
            //     },
            //     'interruptionOptions': 'discardAll'
                }
            }
            data.metaInfo = metaInfo;
            return sdk.sendBotMessage(data,callback);
        }else if(data.message === "SwitchLanguageEnglish"){
            data.metaInfo={
                setBotLanguage:"en"
                };
            data.message = "LanguageSpecificContentVariableRendering";
            return sdk.sendBotMessage(data, callback);
            
        }else if(data.message === "SwitchLanguageSpanish"){
            data.metaInfo={
                setBotLanguage:"es"
                };
            data.message = "LanguageSpecificContentVariableRendering";
            return sdk.sendBotMessage(data, callback);
            
        }else if(data.message === "OverrideMessagePayloadWithButtonTemplateFromBotkit"){
            var overrideMessagePayload = {
                body : JSON.stringify({
                    "type": "template",
                    "payload": 
                    {
                    "template_type": "button",
                    "text": "This is an example to demonstrate message templates sent from bot kit",
                    "buttons": 
                    [{
                    "type": "postback",
                    "title": "Yes",
                    "payload": "Yes"
                    },
                    {
                    "type": "postback",
                    "title": "No",
                    "payload": "No"
                    }]
                    }
                            
                    }),
                    isTemplate :true
            }
            data.overrideMessagePayload= overrideMessagePayload;
            return sdk.sendUserMessage(data, callback);
        }else if(data.message === "ClearAgentSession"){
            sdk.clearAgentSession(data);
            data.message = "Agent Session Cleared";
            return sdk.sendUserMessage(data, callback);
        }else if(data.message === "SetContextVariablesFromBotkit"){
            data.context.session.BotUserSession.botkitBotUserSessionVariable1 = "botkitBotUserSessionValue1";
            data.message = "ReadContextVariablesGeneratedByBotkit";
            return sdk.sendBotMessage(data,callback);
        }else if (data.message && data.message.toLowerCase() === "Switch Language to English".toLowerCase()){
            data.metaInfo = {
                setBotLanguage: "en"
                };
            data.message = "LanguageSwitch";
            return sdk.sendBotMessage(data,callback);
        }else if (data.message && data.message.toLowerCase() === "Switch Language to Spanish".toLowerCase()){
            data.metaInfo = {
                setBotLanguage: "es"
                };
            data.message = "LanguageSwitch"
            return sdk.sendBotMessage(data,callback);
        }else if(!data.agent_transfer){
            //Forward the message to bot
            return sdk.sendBotMessage(data, callback);
        }else {
            data.message = "Agent Message";
            // console.log(JSON.stringify(data));
            return sdk.sendUserMessage(data, callback);
        }
    },
    on_bot_message  : function(requestId, data, callback) {
        console.log("From bot : "+data.message);
        if (data.message === "Skip User Message validation message2"){
            return sdk.skipUserMessage(data,callback);
        }else if (data.message === "TriggerOnBotMessage"){
            data.message = "On Bot Message Triggered Successfully";
            return sdk.sendUserMessage(data, callback);
        }else if (data.message === 'Setting Meta Tags from BotKit') {
            let context = data.context;
            let random_text =  Math.random().toString(36).slice(2);
            let userLevelTagValue = "userLevelTagValue_"+random_text;
            let sessionLevelTagValue = "sessionLevelTagValue_"+random_text;
            let messageLevelTagValue = "messageLevelTagValue_"+random_text;

            context.session.BotUserSession.userLevelTagValue = userLevelTagValue;
            context.session.BotUserSession.sessionLevelTagValue = sessionLevelTagValue;
            context.session.BotUserSession.messageLevelTagValue = messageLevelTagValue;

            data.metaTags = {
                "userMetaTags":[
                   {
                       "name":"userLevelTagKey1",
                      "value":userLevelTagValue
                  }
               ],
              "sessionMetaTags":[
                 {
                    "name":"sessionLevelTagKey1",
                    "value":sessionLevelTagValue
                 }
               ],
            "messageMetaTags":[
                {
                     "name":"messageLevelTagKey1",
                     "value":messageLevelTagValue
                }
             ]
           }
        }
        //Sends back the message to user
        
        return sdk.sendUserMessage(data, callback);
    },
    on_agent_transfer : function(requestId, data, callback){
        console.log("on_agent_transfer --> Event triggered");
        console.log(JSON.stringify(data));
        if(data.context.intent === "AgentTransferEventForBotkit"){
            data.message = "Agent Transfer event triggered successfully";
            return sdk.sendUserMessage(data,callback);
        }
        return callback(null, data);
    },
    on_event : function (requestId, data, callback) {
        console.log("on_event -->  Event : ", data.event);
        if(data.event.completedTaskName === "triggeronevent"){
            data.message = "On Event Triggered Successfully";
            return sdk.sendUserMessage(data,callback);
        }
        // console.log(JSON.stringify(data));
        return callback(null, data);
    },
    on_alert : function (requestId, data, callback) {
        console.log("on_alert --> Event triggered");
        // console.log(JSON.stringify(data));
        if (data.message.input === "TriggerOnAlertEvent"){
            data.message = "On Alert Event Triggered Successfully";
            return sdk.sendUserMessage(data, callback);
        }
        return sdk.sendAlertMessage(data, callback);
    },
    on_variable_update: function(requestId, data, callback) {
       console.log("on_variable_update --> Event triggered");
    },
    on_webhook      : function(requestId, data, componentName, callback) {
        console.log("Webhook event triggered");
        if(componentName === "TriggerWebhookEvent"){
            data.message = "On Webhook Event Triggered Successfully";
            return sdk.sendUserMessage(data, callback);
        }

        var context = data.context;

        if (componentName === 'SyncWebhook') {
            context.SyncTest = "This message from sync webhook";
            // return sdk.respondToHook(data);
            return callback(null, data);
        } else if (componentName === 'AsyncWebhook') {
            console.log("Async node condition entered")
            sdk.saveData(requestId, data)
                .then(function() {
                    respondToAsyncWebhook(requestId);
                    callback(null, new sdk.AsyncResponse());
                });
        }
    }
    

};
