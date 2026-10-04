export function generateMainFlowContent(
    menuBotAliasArn: string,
    dailyThoughtLambdaArn: string,
    careerQueueArn: string,
    sadhanaQueueArn: string,
    familyQueueArn: string,
    hoursOfOperationArn: string,
): string {
    return JSON.stringify({
        Version: "2019-10-30",
        StartAction: "updateLogging",
        Metadata: {
            entryPointPosition: {x: 20, y: 20},
            ActionMetadata: {
                updateLogging: {position: {x: 40, y: 40}},
                setVoice: {position: {x: 280, y: 40}},
                greeting: {position: {x: 520, y: 40}},
                checkHours: {
                    position: {x: 760, y: 40},
                    parameters: {HoursOfOperationId: {useDynamic: true}},
                    useDynamic: true,
                },
                closedMessage: {position: {x: 760, y: 280}},
                getThought: {
                    position: {x: 1000, y: 40},
                    parameters: {LambdaFunctionARN: {useDynamic: true}},
                    dynamicMetadata: {},
                    useDynamic: true,
                },
                playThought: {position: {x: 1240, y: 40}},
                menu: {
                    position: {x: 1480, y: 40},
                    parameters: {LexV2Bot: {AliasArn: {useDynamic: true}}},
                    useDynamicLexBotArn: true,
                    lexV2BotName: "",
                    conditionMetadata: [
                        {id: "career-cond", operator: {name: "Equals", value: "Equals", shortDisplay: "="}, value: "CareerGuidance"},
                        {id: "sadhana-cond", operator: {name: "Equals", value: "Equals", shortDisplay: "="}, value: "SpiritualSadhana"},
                        {id: "family-cond", operator: {name: "Equals", value: "Equals", shortDisplay: "="}, value: "FamilyGuidance"},
                    ],
                },
                notUnderstood: {position: {x: 1480, y: 280}},
                careerMessage: {position: {x: 1720, y: -200}},
                setCareerQueue: {
                    position: {x: 1960, y: -200},
                    parameters: {QueueId: {useDynamic: true}},
                    useDynamic: true,
                },
                sadhanaMessage: {position: {x: 1720, y: 40}},
                setSadhanaQueue: {
                    position: {x: 1960, y: 40},
                    parameters: {QueueId: {useDynamic: true}},
                    useDynamic: true,
                },
                familyMessage: {position: {x: 1720, y: 280}},
                setFamilyQueue: {
                    position: {x: 1960, y: 280},
                    parameters: {QueueId: {useDynamic: true}},
                    useDynamic: true,
                },
                transferToQueue: {position: {x: 2200, y: 40}},
                queueFullMessage: {position: {x: 2440, y: -200}},
                errorMessage: {position: {x: 2440, y: 280}},
                disconnect: {position: {x: 2680, y: 40}},
            },
            name: "HelplineMainFlow",
            description: "",
            type: "contactFlow",
            status: "published",
            hash: {},
        },
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
                    NextAction: "checkHours",
                    Errors: [{NextAction: "errorMessage", ErrorType: "NoMatchingError"}],
                },
            },
            {
                Identifier: "checkHours",
                Type: "CheckHoursOfOperation",
                Parameters: {HoursOfOperationId: hoursOfOperationArn},
                Transitions: {
                    NextAction: "closedMessage",
                    Conditions: [
                        {NextAction: "getThought", Condition: {Operator: "Equals", Operands: ["True"]}},
                        {NextAction: "closedMessage", Condition: {Operator: "Equals", Operands: ["False"]}},
                    ],
                    Errors: [{NextAction: "errorMessage", ErrorType: "NoMatchingError"}],
                },
            },
            {
                Identifier: "closedMessage",
                Type: "MessageParticipant",
                Parameters: {Text: "Our counselors are available 9 AM to 5 PM, all days. Please call back during those hours."},
                Transitions: {
                    NextAction: "disconnect",
                    Errors: [{NextAction: "disconnect", ErrorType: "NoMatchingError"}],
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
