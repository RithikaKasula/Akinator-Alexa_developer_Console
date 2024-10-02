/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
const Alexa = require('ask-sdk-core');

const AWS = require('aws-sdk');
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');

// are you tracking past celebrities between sessions
const celeb_tracking = true;

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
    //set up our Settings api foundations
    const serviceClientFactory = handlerInput.serviceClientFactory;
    const deviceId = handlerInput.requestEnvelope.context.System.device.deviceId;

    // initialize some variables
    var userTimeZone, greeting;

    // wrap the API call in a try/catch block in case the call fails for
    // whatever reason.
    try {
        const upsServiceClient = serviceClientFactory.getUpsServiceClient();
        userTimeZone = await upsServiceClient.getSystemTimeZone(deviceId);
    } catch (error) {
        userTimeZone = "error";
        console.log('error', error.message);
    }

    // calculate our greeting
    if(userTimeZone === "error"){
        greeting = "Hello.";
    } else {
        // get the hour of the day or night in your customer's time zone
        const cfunctions = await require('./celebrityFunctions.js');
        var hour = cfunctions.getHour(userTimeZone);
        if(0<=hour&&hour<=4){
            greeting = "Hi night-owl!"
        } else if (5<=hour&&hour<=11) {
            greeting = "Good morning!"
        } else if (12<=hour&&hour<=17) {
            greeting = "Good afternoon!"
        } else if (17<=hour&&hour<=23) {
            greeting = "Good evening!"
        } else {
            greeting = "Howdy partner"   
        }
    }
        var speakOutput = "";
const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

if(sessionAttributes.visits === 0){
    speakOutput = `${greeting} Welcome to Cake Time. I'll tell you a celebrity name and
        you try to guess the month and year they were born. See how many you can get!
        Would you like to play?`;
} else {
    speakOutput = `${greeting} Welcome back to Cake Time! Ready to guess some more celebrity
        birthdays?`
}

// increment the number of visits and save the session attributes so the
// ResponseInterceptor will save it persistently.
sessionAttributes.visits += 1;
handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        //====================================================================
// Add a visual with Alexa Layouts
//====================================================================

// Import an Alexa Presentation Language (APL) template
var APL_simple = require('./documents/APL_simple.json');

// Check to make sure the device supports APL
if (
  Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)[
    'Alexa.Presentation.APL'
  ]
) {
  // add a directive to render our simple template
  handlerInput.responseBuilder.addDirective({
    type: 'Alexa.Presentation.APL.RenderDocument',
    document: APL_simple,
    datasources: {
      myData: {
        //====================================================================
        // Set a headline and subhead to display on the screen if there is one
        //====================================================================
        Title: 'Say "yes."',
        Subtitle: 'Play some Cake Time.',
      },
    },
  });
}

return handlerInput.responseBuilder
    .speak(speakOutput)
    .reprompt(speakOutput)
    .getResponse();
    }
};

const PlayGameHandler = {
    canHandle(handlerInput) {
  return (
    Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
    Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
  );
},
    handle(handlerInput) {
  //====================================================================
  // Set your speech output
  //====================================================================

// get the current session attributes, creating an object you can read/update
const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

var speakOutput = '';

//check if there's a current celebrity. If so, repeat the question and exit.
if (
    sessionAttributes.current_celeb !== null
){
    speakOutput = `In what month and year was ${sessionAttributes.current_celeb.name} born?`;
    return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(speakOutput)
        .getResponse();
}


//Import the celebrity functions and get a random celebrity.
const cfunctions = require('./celebrityFunctions.js');
const celeb = cfunctions.getRandomCeleb(sessionAttributes.past_celebs);
var title = celeb.name;
var subtitle = 'What month and year were they born?';

// Check to see if there are any celebrities left.
if (celeb.id === 0) {
    speakOutput = `You have run out of celebrities. Thanks for playing!`;
    title = 'Game Over';
    subtitle = '';
} else {
    //set the "current_celeb" attribute
    sessionAttributes.current_celeb = celeb;

    //save the session attributes
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    //Ask the question
    speakOutput = `In what month and year was ${celeb.name} born?`;
}

  //====================================================================
  // Add a visual with Alexa Layouts
  //====================================================================

  // Import an Alexa Presentation Language (APL) template
  var APL_simple = require('./documents/APL_simple.json');

  // Check to make sure the device supports APL
  if (
    Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)[
      'Alexa.Presentation.APL'
    ]
  ) {
    // add a directive to render the simple template
    handlerInput.responseBuilder.addDirective({
      type: 'Alexa.Presentation.APL.RenderDocument',
      document: APL_simple,
      datasources: {
        myData: {
          //====================================================================
          // Set a headline and subhead to display on the screen if there is one
          //====================================================================
          Title: title,
          Subtitle: subtitle,
        },
      },
    });
  }

  //====================================================================
  // Send the response back to Alexa
  //====================================================================
  return handlerInput.responseBuilder
    .speak(speakOutput)
    .reprompt(speakOutput)
    .getResponse();
}
};

const GetBirthdayIntentHandler = {
    canHandle(handlerInput) {
  return (
    Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
    Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetBirthdayIntent'
  );
},
    handle(handlerInput) {
    var speakOutput = '';

    // get the current session attributes, creating an object you can read/update
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    // if there's a current_celeb attribute but it's null, or there isn't one
    // error, cue them to say "yes" and end
    // if the current_celeb is empty, error, cue them to say "yes" and end
if (sessionAttributes.current_celeb === null)
{
        speakOutput =
            "I'm sorry, there's no active question right now. Would you like a question?";
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }

    //Get the slot values
var year = handlerInput.requestEnvelope.request.intent.slots.year.value;
var month = handlerInput.requestEnvelope.request.intent.slots.month.value;

//Okay, check the answer
const cfunctions = require('./celebrityFunctions.js');
const winner = cfunctions.checkAnswer(
    sessionAttributes.current_celeb,
    month,
    year
);

// Add the celebrity to the list of past celebs.
// Store the value for the rest of the function,
// and set the current celebrity to null
sessionAttributes.past_celebs.push(sessionAttributes.current_celeb);
const cname = sessionAttributes.current_celeb.name;
sessionAttributes.current_celeb = null;


//We'll need variables for our visual. Let's initialize them.
var title,
    subtitle = '';

//Did they get it?
if (winner) {
    sessionAttributes.score += 1;
    title = 'Congratulations!';
    subtitle = 'Wanna go again?';
    speakOutput = `Yay! You got ${cname}'s birthday right! Your score is now
        ${sessionAttributes.score}. Want to try another?`;
} else {
    title = 'Awww shucks';
    subtitle = 'Another?';
    speakOutput = `Sorry. You didn't get the right month and year for
        ${cname}. Maybe you'll get the next one. Want to try another?`;
}

//store all the updated session data
handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
//====================================================================
// Add a visual with Alexa Layouts
//====================================================================

// Check to make sure the device supports APL
if (
    Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)[
        'Alexa.Presentation.APL'
    ]
) {
    // Import an Alexa Presentation Language (APL) template
    var APL_simple = require('./documents/APL_simple.json');

    // add a directive to render the simple template
    handlerInput.responseBuilder.addDirective({
        type: 'Alexa.Presentation.APL.RenderDocument',
        document: APL_simple,
        datasources: {
            myData: {
                //====================================================================
                // Set a headline and subhead to display on the screen if there is one
                //====================================================================
                Title: title,
                Subtitle: subtitle,
            },
        },
    });
}

//====================================================================
// Send the response back to Alexa
//====================================================================
return handlerInput.responseBuilder
    .speak(speakOutput)
    .reprompt(speakOutput)
    .getResponse();
}
};

const HelloWorldIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'HelloWorldIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Hello World!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const LoadDataInterceptor = {
    async process(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        // get persistent attributes, using await to ensure the data has been returned before
        // continuing execution
        var persistent = await handlerInput.attributesManager.getPersistentAttributes();
        if(!persistent) persistent = {};

        // ensure important variables are initialized so they're used more easily in handlers.
        // This makes sure they're ready to go and makes the handler code a little more readable
        if(!sessionAttributes.hasOwnProperty('current_celeb')) sessionAttributes.current_celeb = null;  
        if(!sessionAttributes.hasOwnProperty('score')) sessionAttributes.score = 0;
        if(!persistent.hasOwnProperty('past_celebs')) persistent.past_celebs = [];  
        if(!sessionAttributes.hasOwnProperty('past_celebs')) sessionAttributes.past_celebs = [];  

        // if you're tracking past_celebs between sessions, use the persistent value
        // set the visits value (either 0 for new, or the persistent value)
        sessionAttributes.past_celebs = (celeb_tracking) ? persistent.past_celebs : sessionAttributes.past_celebs;
        sessionAttributes.visits = (persistent.hasOwnProperty('visits')) ? persistent.visits : 0;

        //set the session attributes so they're available to your handlers
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    }
};
// This request interceptor will log all incoming requests of this lambda
const LoggingRequestInterceptor = {
    process(handlerInput) {
        console.log('----- REQUEST -----');
        console.log(JSON.stringify(handlerInput.requestEnvelope, null, 2));
    }
};

// Response Interceptors run after all skill handlers complete, before the response is
// sent to the Alexa servers.
const SaveDataInterceptor = {
    async process(handlerInput) {
        const persistent = {};
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        // save (or not) the past_celebs & visits
        persistent.past_celebs = (celeb_tracking) ? sessionAttributes.past_celebs : [];
        persistent.visits = sessionAttributes.visits;
        // set and then save the persistent attributes
        handlerInput.attributesManager.setPersistentAttributes(persistent);
        let waiter = await handlerInput.attributesManager.savePersistentAttributes();
    }
};
// This response interceptor will log all outgoing responses of this lambda
const LoggingResponseInterceptor = {
    process(handlerInput, response) {
        console.log('----- RESPONSE -----');
        console.log(JSON.stringify(response, null, 2));
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        PlayGameHandler,
        GetBirthdayIntentHandler,
        HelloWorldIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
        
        .addRequestInterceptors(
    LoadDataInterceptor,
    LoggingRequestInterceptor
)
.addResponseInterceptors(
    SaveDataInterceptor,
    LoggingResponseInterceptor
)
        
    .addErrorHandlers(
        ErrorHandler)
        .withPersistenceAdapter(
    new ddbAdapter.DynamoDbPersistenceAdapter({
        tableName: process.env.DYNAMODB_PERSISTENCE_TABLE_NAME,
        createTable: false,
        dynamoDBClient: new AWS.DynamoDB({apiVersion: 'latest', region: process.env.DYNAMODB_PERSISTENCE_REGION})
    })
)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda();
    