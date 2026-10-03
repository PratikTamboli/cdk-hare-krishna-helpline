export function generateMainFlowContent(
    menuBotAliasArn: string,
    dailyThoughtLambdaArn: string,
    careerQueueArn: string,
    sadhanaQueueArn: string,
    familyQueueArn: string,
): string {
    return JSON.stringify({
        Version: "2019-10-30",
        StartAction: "updateLogging",
        Actions: [
            {
                Identifier: "updateLogging",
                Type: "UpdateFlowLoggingBehavior",
                Parameters: {FlowLoggingBehavior: "Enabled"},
                Transitions: {NextAction: "setVoice"},
            },
            {
                Identifier: "setVoice",
                Type: "UpdateContactTextToSpeechVoice",
                Parameters: {TextToSpeechVoice: "Matthew"},
                Transitions: {NextAction: "greeting"},
            },
            {
                Identifier: "greeting",
                Type: "MessageParticipant",
                Parameters: {Text: "Welcome to the Hare Krishna Helpline, offering spiritual guidance for career, sadhana, and family life."},
                Transitions: {
                    NextAction: "getThought",
                    Errors: [{NextAction: "errorMessage", ErrorType: "NoMatchingError"}],
                },
            },
            {
                Identifier: "getThought",
                Type: "InvokeLambdaFunction",
                Parameters: {LambdaFunctionARN: dailyThoughtLambdaArn, InvocationTimeLimitSeconds: "3"},
                Transitions: {
                    NextAction: "playThought",
                    Errors: [{NextAction: "menu", ErrorType: "NoMatchingError"}],
                },
            },
            {
                Identifier: "playThought",
                Type: "MessageParticipant",
                Parameters: {Text: "$.External.THOUGHT"},
                Transitions: {
                    NextAction: "menu",
                    Errors: [{NextAction: "menu", ErrorType: "NoMatchingError"}],
                },
            },
            {
                Identifier: "menu",
                Type: "ConnectParticipantWithLexBot",
                Parameters: {
                    Text: "How can we help you today? You can say things like career guidance, spiritual sadhana, or family and relationships.",
                    LexV2Bot: {AliasArn: menuBotAliasArn},
                },
                Transitions: {
                    NextAction: "notUnderstood",
                    Conditions: [
                        {NextAction: "careerMessage", Condition: {Operator: "Equals", Operands: ["CareerGuidance"]}},
                        {NextAction: "sadhanaMessage", Condition: {Operator: "Equals", Operands: ["SpiritualSadhana"]}},
                        {NextAction: "familyMessage", Condition: {Operator: "Equals", Operands: ["FamilyGuidance"]}},
                    ],
                    Errors: [
                        {NextAction: "notUnderstood", ErrorType: "NoMatchingCondition"},
                        {NextAction: "errorMessage", ErrorType: "NoMatchingError"},
                    ],
                },
            },
            {
                Identifier: "notUnderstood",
                Type: "MessageParticipant",
                Parameters: {Text: "Sorry, I didn't quite understand. Let's try again."},
                Transitions: {
                    NextAction: "menu",
                    Errors: [{NextAction: "errorMessage", ErrorType: "NoMatchingError"}],
                },
            },
            {
                Identifier: "careerMessage",
                Type: "MessageParticipant",
                Parameters: {Text: "Connecting you with a counselor for career guidance."},
                Transitions: {
                    NextAction: "setCareerQueue",
                    Errors: [{NextAction: "errorMessage", ErrorType: "NoMatchingError"}],
                },
            },
            {
                Identifier: "setCareerQueue",
                Type: "UpdateContactTargetQueue",
                Parameters: {QueueId: careerQueueArn},
                Transitions: {
                    NextAction: "transferToQueue",
                    Errors: [{NextAction: "errorMessage", ErrorType: "NoMatchingError"}],
                },
            },
            {
                Identifier: "sadhanaMessage",
                Type: "MessageParticipant",
                Parameters: {Text: "Connecting you with a counselor for spiritual sadhana guidance."},
                Transitions: {
                    NextAction: "setSadhanaQueue",
                    Errors: [{NextAction: "errorMessage", ErrorType: "NoMatchingError"}],
                },
            },
            {
                Identifier: "setSadhanaQueue",
                Type: "UpdateContactTargetQueue",
                Parameters: {QueueId: sadhanaQueueArn},
                Transitions: {
                    NextAction: "transferToQueue",
                    Errors: [{NextAction: "errorMessage", ErrorType: "NoMatchingError"}],
                },
            },
            {
                Identifier: "familyMessage",
                Type: "MessageParticipant",
                Parameters: {Text: "Connecting you with a counselor for family and relationship guidance."},
                Transitions: {
                    NextAction: "setFamilyQueue",
                    Errors: [{NextAction: "errorMessage", ErrorType: "NoMatchingError"}],
                },
            },
            {
                Identifier: "setFamilyQueue",
                Type: "UpdateContactTargetQueue",
                Parameters: {QueueId: familyQueueArn},
                Transitions: {
                    NextAction: "transferToQueue",
                    Errors: [{NextAction: "errorMessage", ErrorType: "NoMatchingError"}],
                },
            },
            {
                Identifier: "transferToQueue",
                Type: "TransferContactToQueue",
                Parameters: {},
                Transitions: {
                    NextAction: "disconnect",
                    Errors: [
                        {NextAction: "queueFullMessage", ErrorType: "QueueAtCapacity"},
                        {NextAction: "errorMessage", ErrorType: "NoMatchingError"},
                    ],
                },
            },
            {
                Identifier: "queueFullMessage",
                Type: "MessageParticipant",
                Parameters: {Text: "Sorry, all our counselors are busy right now. Please try again later."},
                Transitions: {
                    NextAction: "disconnect",
                    Errors: [{NextAction: "disconnect", ErrorType: "NoMatchingError"}],
                },
            },
            {
                Identifier: "errorMessage",
                Type: "MessageParticipant",
                Parameters: {Text: "Sorry, there has been an error. The call will now end."},
                Transitions: {
                    NextAction: "disconnect",
                    Errors: [{NextAction: "disconnect", ErrorType: "NoMatchingError"}],
                },
            },
            {
                Identifier: "disconnect",
                Type: "DisconnectParticipant",
                Parameters: {},
                Transitions: {},
            },
        ],
    });
}
